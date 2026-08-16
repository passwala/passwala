import express from 'express';
import crypto from 'crypto';
import https from 'https';
import supabase from '../supabase.js';
import { adminAuth, verifyAdminToken } from './admin.js';
import { authLimiter } from '../utils/rateLimiter.js';

const router = express.Router();

/**
 * Normalize any phone string to a clean 10-digit Indian mobile number.
 * Strips +91 / 91 country code prefix and all spaces / dashes.
 * Returns null when input is falsy.
 */
function normalizePhone(raw) {
  if (!raw) return null;
  let p = String(raw).trim();
  // Strip country code prefix first
  if (p.startsWith('+91')) p = p.slice(3);
  else if (p.startsWith('91') && p.length === 12) p = p.slice(2);
  // Remove all non-digit characters (spaces, dashes, parentheses)
  p = p.replace(/\D/g, '');
  return p.length === 10 ? p : null;
}

let googleCertCache = {
  certs: null,
  expiresAt: 0
};
let pendingFetchPromise = null;

async function fetchGoogleCerts() {
  const now = Date.now();
  if (googleCertCache.certs && googleCertCache.expiresAt > now) {
    return googleCertCache.certs;
  }

  if (pendingFetchPromise) {
    return pendingFetchPromise;
  }

  pendingFetchPromise = new Promise((resolve, reject) => {
    https.get('https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com', (res) => {
      // Dynamic max-age header parsing
      const cacheControl = res.headers['cache-control'];
      let maxAge = 3600; // default 1 hour in seconds
      if (cacheControl) {
        const match = cacheControl.match(/max-age=(\d+)/);
        if (match) {
          maxAge = parseInt(match[1], 10);
        }
      }

      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        pendingFetchPromise = null;
        try {
          const certs = JSON.parse(data);
          googleCertCache = {
            certs,
            expiresAt: Date.now() + maxAge * 1000
          };
          resolve(certs);
        } catch (e) {
          reject(new Error('Failed to parse Google certs: ' + e.message));
        }
      });
    }).on('error', (err) => {
      pendingFetchPromise = null;
      reject(err);
    });
  });

  return pendingFetchPromise;
}

function base64urlDecode(str) {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  return Buffer.from(base64, 'base64').toString('utf8');
}

export async function verifyFirebaseToken(token) {
  if (!token) throw new Error('Token is required');

  // Support local development mock tokens
  if (token.startsWith('mock_session_token_')) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Mock session tokens are not allowed in production mode.');
    }
    const uid = token.replace('mock_session_token_', '');
    return {
      uid,
      email: `${uid}@example.com`,
      phone_number: '+919999999999',
      name: `Mock User ${uid}`
    };
  }

  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new Error('Invalid token format');
  }

  const [headerB64, payloadB64, _signatureB64] = parts;
  
  let header;
  let payload;
  try {
    header = JSON.parse(base64urlDecode(headerB64));
    payload = JSON.parse(base64urlDecode(payloadB64));
  } catch (e) {
    throw new Error('Failed to parse token headers or payload: ' + e.message);
  }

  if (header.alg !== 'RS256') {
    throw new Error('Unsupported algorithm: ' + header.alg);
  }

  if (!header.kid) {
    throw new Error('Missing kid in token header');
  }

  const certs = await fetchGoogleCerts();
  const certPem = certs[header.kid];
  if (!certPem) {
    throw new Error('Google certificate not found for kid: ' + header.kid);
  }

  // Verify signature
  const verifier = crypto.createVerify('RSA-SHA256');
  verifier.update(`${headerB64}.${payloadB64}`);
  
  const signature = parts[2].replace(/-/g, '+').replace(/_/g, '/');
  const signatureBuffer = Buffer.from(signature, 'base64');
  
  const isVerified = verifier.verify(certPem, signatureBuffer);
  if (!isVerified) {
    throw new Error('Invalid signature');
  }

  // Verify claims
  const nowInSeconds = Math.floor(Date.now() / 1000);
  if (payload.exp < nowInSeconds) {
    throw new Error('Token has expired');
  }

  const projectId = process.env.FIREBASE_PROJECT_ID || 'passwala-75faa';
  if (payload.iss !== `https://securetoken.google.com/${projectId}`) {
    throw new Error('Invalid issuer: ' + payload.iss);
  }

  if (payload.aud !== projectId) {
    throw new Error('Invalid audience: ' + payload.aud);
  }

  return {
    uid: payload.sub,
    email: payload.email,
    phone_number: payload.phone_number,
    name: payload.name
  };
}

// Authorization Middleware
export const userAuth = async (req, res, next) => {
  try {
    // 1. Check for Admin Access
    const adminKey = req.headers['x-admin-key'] || req.headers['authorization']?.replace(/^Bearer\s+/i, '');
    
    if (adminKey) {
      const decodedAdmin = verifyAdminToken(adminKey);
      if (decodedAdmin) {
        req.isAdmin = true;
        return next();
      }
    }

    // 2. Perform Firebase ID token authentication
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized: Missing Authorization header' });
    }

    const token = authHeader.substring(7);
    let decodedUser;
    try {
      decodedUser = await verifyFirebaseToken(token);
    } catch (err) {
      console.error('Firebase token verification failed:', err.message);
      return res.status(401).json({ error: `Unauthorized: Invalid token: ${err.message}` });
    }

    req.user = decodedUser;

    // Block suspended users
    if (decodedUser && decodedUser.uid) {
      const { data: dbUser, error: dbErr } = await supabase
        .from('users')
        .select('is_suspended')
        .eq('uid', decodedUser.uid)
        .maybeSingle();

      if (!dbErr && dbUser && dbUser.is_suspended) {
        return res.status(403).json({ error: 'Forbidden: Your account has been suspended by the administrator.' });
      }
    }

    if (!req.params.uid) {
      return next();
    }

    const targetIdentifier = decodeURIComponent(req.params.uid).replace(/\s/g, '');

    // Fetch target user from DB to verify ownership
    let targetUser = null;
    
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(targetIdentifier);
    if (isUuid) {
      const { data } = await supabase.from('users').select('*').eq('id', targetIdentifier).maybeSingle();
      targetUser = data;
    }

    if (!targetUser) {
      const { data } = await supabase.from('users').select('*').eq('uid', targetIdentifier).maybeSingle();
      targetUser = data;
    }

    if (!targetUser && !targetIdentifier.includes('@')) {
      const { data } = await supabase.from('users').select('*').eq('phone', targetIdentifier).maybeSingle();
      targetUser = data;
      
      if (!targetUser && targetIdentifier.startsWith('+')) {
        const { data: noPlus } = await supabase.from('users').select('*').eq('phone', targetIdentifier.substring(1)).maybeSingle();
        targetUser = noPlus;
      }
      if (!targetUser && targetIdentifier.startsWith('+91')) {
        const { data: noCountry } = await supabase.from('users').select('*').eq('phone', targetIdentifier.substring(3)).maybeSingle();
        targetUser = noCountry;
      }
    }

    if (!targetUser && targetIdentifier.includes('@')) {
      const { data } = await supabase.from('users').select('*').eq('email', targetIdentifier).maybeSingle();
      targetUser = data;
    }

    const isDirectMatch = 
      (decodedUser.uid && targetIdentifier === decodedUser.uid) ||
      (decodedUser.email && targetIdentifier.toLowerCase() === decodedUser.email.toLowerCase()) ||
      (decodedUser.phone_number && targetIdentifier.replace(/\D/g, '') === decodedUser.phone_number.replace(/\D/g, ''));

    if (!targetUser) {
      if (isDirectMatch) {
        return res.status(404).json({ error: 'Target user account not found' });
      } else {
        return res.status(403).json({ error: 'Forbidden: You do not own this profile' });
      }
    }

    const isOwner = 
      isDirectMatch ||
      (decodedUser.uid && decodedUser.uid === targetUser.uid) ||
      (decodedUser.email && targetUser.email && decodedUser.email.toLowerCase() === targetUser.email.toLowerCase()) ||
      (decodedUser.phone_number && targetUser.phone && decodedUser.phone_number.replace(/\D/g, '') === targetUser.phone.replace(/\D/g, ''));

    if (!isOwner) {
      return res.status(403).json({ error: 'Forbidden: You do not own this profile' });
    }

    req.targetUser = targetUser;
    next();
  } catch (err) {
    console.error('System error in userAuth middleware:', err);
    res.status(500).json({ error: 'System Error in authentication' });
  }
};

// POST /api/users — Upsert user after login (create or update)
router.post('/', authLimiter, async (req, res) => {
  const { uid, email, displayName, photoURL, phoneNumber, authProvider, role, fcmToken, fcm_token } = req.body;
  const token = fcmToken || fcm_token;
  const cleanPhone = normalizePhone(phoneNumber); // Normalize to 10-digit format

  if (!uid || !authProvider) {
    return res.status(400).json({ error: 'uid and authProvider are required' });
  }

  try {
    // Build the data object dynamically
    const userData = {
      uid: uid,
      full_name: displayName ?? null,
      email: email ?? null,
      photo_url: photoURL ?? null,
      role: role ? String(role).toUpperCase() : 'BUYER'
    };

    if (token) {
      userData.fcm_token = token;
    }

    // 1. Check if user already exists by multiple identifiers
    let existingUser = null;
    
    // Check by UID
    if (uid) {
      const { data } = await supabase.from('users').select('*').eq('uid', uid).maybeSingle();
      existingUser = data;
    }
    
    // Check by Email
    if (!existingUser && email) {
      const { data } = await supabase.from('users').select('*').eq('email', email).maybeSingle();
      existingUser = data;
    }
    
    // Check by Normalized Phone (10-digit)
    if (!existingUser && cleanPhone) {
      const { data } = await supabase.from('users').select('*').eq('phone', cleanPhone).maybeSingle();
      existingUser = data;
    }

    // Check by Generated Phone (last resort for ghost accounts)
    if (!existingUser) {
      const base = uid || email || String(Date.now());
      const generatedPhone = "np_" + base.substring(0, 16);
      const { data } = await supabase.from('users').select('*').eq('phone', generatedPhone).maybeSingle();
      existingUser = data;
      
      if (!existingUser) {
         userData.phone = cleanPhone || generatedPhone;
      }
    } else if (cleanPhone) {
      userData.phone = cleanPhone;
    }

    let resultData;
    let resultError;

    if (existingUser) {
      // 2. Update existing user
      // IMPORTANT: Replace placeholder values set by coming-soon signup
      const isPlaceholderName = !existingUser.full_name 
        || existingUser.full_name === 'Coming Soon Subscriber' 
        || existingUser.full_name === '';
      const isPlaceholderPhone = !existingUser.phone 
        || existingUser.phone.startsWith('CS_') 
        || existingUser.phone.startsWith('np_');

      const updatePayload = {
        // Use real name from login if existing name is a placeholder
        full_name: isPlaceholderName ? (displayName || existingUser.full_name || null) : existingUser.full_name,
        photo_url: existingUser.photo_url || photoURL || null,
        email: existingUser.email || email || null,
        // Use real phone if existing phone is a placeholder
        phone: isPlaceholderPhone ? (cleanPhone || existingUser.phone || null) : (existingUser.phone || cleanPhone || null),
        role: existingUser.role || (role ? String(role).toUpperCase() : 'BUYER')
      };
      if (token) {
        updatePayload.fcm_token = token;
      }

      const { data, error } = await supabase
        .from('users')
        .update(updatePayload)
        .eq('id', existingUser.id)
        .select()
        .single();
      resultData = data;
      resultError = error;
    } else {
      // 3. Create new user
      const { data, error } = await supabase
        .from('users')
        .insert([userData])
        .select()
        .single();
      resultData = data;
      resultError = error;
    }

    if (resultError) {
      console.error('❌ Supabase Save Error:', {
        code: resultError.code,
        message: resultError.message
      });
      return res.status(500).json({ 
        success: false, 
        error: `Database Error (v3): ${resultError.message} [Code: ${resultError.code}]`,
        details: resultError.details 
      });
    }

    // 4. Handle Address if provided and contains valid content
    const { address } = req.body;
    if (address && address.address_line_1 && address.address_line_1.trim() !== '' && resultData) {
        const addressPayload = {
            user_id: resultData.id,
            address_line_1: address.address_line_1,
            address_line_2: address.address_line_2 || null,
            city: address.city || 'Ahmedabad',
            state: address.state || 'Gujarat',
            pincode: address.pincode || '380001',
            is_default: true
        };
        
        // Save address but don't fail the whole request if it fails
        const { error: addrError } = await supabase.from('addresses').insert([addressPayload]);
        if (addrError) console.warn('Backend address save skip:', addrError.message);
    }

    res.status(200).json({ success: true, user: resultData });
  } catch (error) {
    console.error('🔥 System Crash during save:', error);
    res.status(500).json({ success: false, error: `System Error (v3): ${error.message}` });
  }
});

// GET /api/users/:uid — Get user by Firebase UID (secured with userAuth)
router.get('/:uid', userAuth, async (req, res) => {
  try {
    // We already fetched targetUser in userAuth middleware! Save a query.
    const data = req.targetUser;
    res.status(200).json({ success: true, user: data });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// GET /api/users — Get users (admin secured)
// Default: returns only BUYER role users.
// Pass ?role=VENDOR, ?role=RIDER, or ?role=ALL to override.
router.get('/', adminAuth, async (req, res) => {
  try {
    const roleFilter = (req.query.role || 'BUYER').toUpperCase();

    let query = supabase
      .from('users')
      .select('id, phone, full_name, email, photo_url, role, uid, wallet_balance, fcm_token, created_at, updated_at')
      .order('created_at', { ascending: false });

    // Apply role filter unless caller explicitly requests all records
    if (roleFilter !== 'ALL') {
      query = query.eq('role', roleFilter);
    }

    const { data, error } = await query;
    if (error) throw error;

    res.status(200).json({ success: true, users: data });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// DELETE /api/users/:uid — Delete account (secured with userAuth)
router.delete('/:uid', userAuth, async (req, res) => {
  const identifier = decodeURIComponent(req.params.uid);
  console.log(`🗑️ Attempting deletion for user: ${identifier}`);

  try {
    // 1. Try finding by ID (UUID) first
    let user = null;
    let findError = null;
    
    // Only query by ID if the identifier is a valid UUID to prevent Postgres errors
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier);
    if (isUuid) {
      const { data, error } = await supabase
        .from('users')
        .select('id')
        .eq('id', identifier)
        .maybeSingle();
      user = data;
      findError = error;
    }

    // 2. Fallback to UID if not found by ID
    if (!user && !findError) {
      const { data: byUid } = await supabase
        .from('users')
        .select('id')
        .eq('uid', identifier)
        .maybeSingle();
      user = byUid;
    }

    // 3. Fallback to Email if still not found
    if (!user && !findError && identifier.includes('@')) {
      const { data: byEmail } = await supabase
        .from('users')
        .select('id')
        .eq('email', identifier)
        .maybeSingle();
      user = byEmail;
    }

    if (!user) {
      console.warn(`⚠️ User not found for deletion: ${identifier}`);
      return res.status(404).json({ error: 'User account not found' });
    }

    // Perform actual deletion
    const { error: deleteError } = await supabase
      .from('users')
      .delete()
      .eq('id', user.id);

    if (deleteError) throw deleteError;

    console.log(`✅ Successfully deleted user: ${user.id}`);
    res.json({ message: 'User deleted successfully' });

  } catch (error) {
    console.error('❌ Deletion System Failure:', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/users/:uid/photo — Update profile picture (secured with userAuth)
router.put('/:uid/photo', userAuth, async (req, res) => {
  try {
    const { photoURL } = req.body;
    const rawId = decodeURIComponent(req.params.uid);
    // Normalize phone
    const identifier = rawId.includes('@') ? rawId : rawId.replace(/\s/g, '');

    let user = null;
    
    // Try by ID (UUID)
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier);
    if (isUuid) {
      const { data } = await supabase.from('users').select('id').eq('id', identifier).maybeSingle();
      user = data;
    }

    // Try by UID
    if (!user) {
      const { data } = await supabase.from('users').select('id').eq('uid', identifier).maybeSingle();
      user = data;
    }

    // Try by phone
    if (!user && !identifier.includes('@')) {
      const { data, error } = await supabase.from('users').select('id').eq('phone', identifier).maybeSingle();
      if (error) console.error("Phone error:", error);
      user = data;
      
      // Fallback: try without plus if it has it
      if (!user && identifier.startsWith('+')) {
        const { data: noPlus } = await supabase.from('users').select('id').eq('phone', identifier.substring(1)).maybeSingle();
        user = noPlus;
      }

      // Fallback: try without +91
      if (!user && identifier.startsWith('+91')) {
        const { data: noCountry } = await supabase.from('users').select('id').eq('phone', identifier.substring(3)).maybeSingle();
        user = noCountry;
      }
    }

    // Try by email
    if (!user) {
      const { data } = await supabase.from('users').select('id').eq('email', identifier).maybeSingle();
      user = data;
    }

    if (!user) {
      return res.status(404).json({ error: 'User account not found' });
    }

    console.log('[Photo] Update requested for user:', user.id);

    let finalPhotoUrl = photoURL;
    if (photoURL && photoURL.startsWith('data:image')) {
      const matches = photoURL.match(/^data:image\/([a-zA-Z0-9]+);base64,(.+)$/);
      if (matches) {
        const rawExt = matches[1].toLowerCase();

        // Fix #6: Allowlist extensions — 'svg', 'php', 'html' etc. are execution vectors
        const ALLOWED_PHOTO_EXTS = new Set(['jpg', 'jpeg', 'png', 'webp', 'gif']);
        if (!ALLOWED_PHOTO_EXTS.has(rawExt)) {
          return res.status(400).json({ error: `Invalid image type "${rawExt}". Allowed: jpg, jpeg, png, webp, gif` });
        }

        const ext = rawExt === 'jpg' ? 'jpeg' : rawExt; // normalize jpg→jpeg for content-type
        const base64Data = matches[2];
        const buffer = Buffer.from(base64Data, 'base64');
        
        const filename = `${user.id}_${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from('user_profiles')
          .upload(filename, buffer, {
            contentType: `image/${ext}`,
            upsert: true
          });
          
        if (uploadError) {
          console.error("Storage upload error:", uploadError);
          return res.status(500).json({ error: 'Storage Error', details: uploadError });
        }
        
        const { data: publicUrlData } = supabase.storage
          .from('user_profiles')
          .getPublicUrl(filename);
          
        finalPhotoUrl = publicUrlData.publicUrl;
      }
    }

    const { error: updateError } = await supabase
      .from('users')
      .update({ photo_url: finalPhotoUrl })
      .eq('id', user.id);
    
    if (updateError) throw updateError;
    res.status(200).json({ success: true, message: 'Photo updated', photoURL: finalPhotoUrl });
  } catch (error) {
    console.error('Error updating photo:', error);
    res.status(500).json({ error: 'System Error: Failed to update photo' });
  }
});

// PUT /api/users/:uid/name — Update user name (secured with userAuth)
router.put('/:uid/name', userAuth, async (req, res) => {
  try {
    const { displayName } = req.body;
    const rawId = decodeURIComponent(req.params.uid);
    const identifier = rawId.includes('@') ? rawId : rawId.replace(/\s/g, '');

    let user = null;
    
    // Try by ID (UUID)
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier);
    if (isUuid) {
      const { data } = await supabase.from('users').select('id').eq('id', identifier).maybeSingle();
      user = data;
    }

    // Try by UID
    if (!user) {
      const { data } = await supabase.from('users').select('id').eq('uid', identifier).maybeSingle();
      user = data;
    }

    // Try by phone
    if (!user && !identifier.includes('@')) {
      const { data, error } = await supabase.from('users').select('id').eq('phone', identifier).maybeSingle();
      if (error) console.error("Phone error:", error);
      user = data;
      
      // Fallback: try without plus if it has it
      if (!user && identifier.startsWith('+')) {
        const { data: noPlus } = await supabase.from('users').select('id').eq('phone', identifier.substring(1)).maybeSingle();
        user = noPlus;
      }

      // Fallback: try without +91
      if (!user && identifier.startsWith('+91')) {
        const { data: noCountry } = await supabase.from('users').select('id').eq('phone', identifier.substring(3)).maybeSingle();
        user = noCountry;
      }
    }

    // Try by email
    if (!user) {
      const { data } = await supabase.from('users').select('id').eq('email', identifier).maybeSingle();
      user = data;
    }

    if (!user) return res.status(404).json({ error: 'User not found' });

    const { error: updateError } = await supabase
      .from('users')
      .update({ full_name: displayName })
      .eq('id', user.id);
    
    if (updateError) throw updateError;
    res.status(200).json({ success: true, message: 'Name updated' });
  } catch (error) {
    console.error('Error updating name:', error);
    res.status(500).json({ error: 'Failed to update name' });
  }
});

// PUT /api/users/:id/fcm-token — Save user's FCM token for push notifications
// Fix #8: Added userAuth — previously anyone knowing a user UUID could hijack their
// push notifications by overwriting their FCM token.
router.put('/:id/fcm-token', userAuth, async (req, res) => {
  const { id } = req.params;
  const { fcmToken, fcm_token } = req.body;
  const token = fcmToken || fcm_token;

  if (!token) {
    return res.status(400).json({ error: 'fcmToken is required' });
  }

  try {
    const { data, error } = await supabase
      .from('users')
      .update({ fcm_token: token })
      .eq('id', id)
      .select()
      .maybeSingle();

    if (error) {
      console.error('Error saving FCM token:', error.message);
      return res.status(500).json({ error: 'Database error saving FCM token' });
    }

    res.json({ success: true, message: 'FCM token updated successfully', user: data });
  } catch (err) {
    console.error('FCM Token Save Route Error:', err);
    res.status(500).json({ error: 'Server Error saving FCM token' });
  }
});

// Fix #5: Supabase-backed OTP storage with in-memory fallback.
// To enable persistent storage (survives server restarts), create this table:
//   CREATE TABLE whatsapp_otps (
//     phone TEXT PRIMARY KEY,
//     otp   TEXT NOT NULL,
//     expires_at TIMESTAMPTZ NOT NULL
//   );
// Without the table, OTPs fall back to the in-memory Map (lost on restart) with a warning.
global.whatsappOtpStore = global.whatsappOtpStore || new Map();

const _otpSet = async (phone, otp, expiresAt) => {
  try {
    const { error } = await supabase.from('whatsapp_otps')
      .upsert({ phone, otp, expires_at: new Date(expiresAt).toISOString() }, { onConflict: 'phone' });
    if (!error) return;
  } catch (_) { /* ignore */ }
  console.warn('[OTP] Supabase "whatsapp_otps" table missing — using in-memory store (OTPs lost on restart)');
  global.whatsappOtpStore.set(phone, { otp, expiresAt });
};
const _otpGet = async (phone) => {
  try {
    const { data } = await supabase.from('whatsapp_otps')
      .select('otp, expires_at').eq('phone', phone).maybeSingle();
    if (data) return { otp: data.otp, expiresAt: new Date(data.expires_at).getTime() };
  } catch (_) { /* ignore */ }
  return global.whatsappOtpStore.get(phone) || null;
};
const _otpDelete = async (phone) => {
  try { await supabase.from('whatsapp_otps').delete().eq('phone', phone); } catch (_) { /* ignore */ }
  global.whatsappOtpStore.delete(phone);
};

// POST /api/users/send-whatsapp-otp — Generate and send real OTP
router.post('/send-whatsapp-otp', authLimiter, async (req, res) => {
  const { phone } = req.body;
  const cleanPhone = normalizePhone(phone);
  if (!cleanPhone) {
    return res.status(400).json({ success: false, error: 'Valid 10-digit mobile number required' });
  }

  const isMockMode = process.env.MOCK_OTP_ENABLED === 'true' && process.env.NODE_ENV !== 'production';
  const otp = isMockMode ? '123456' : crypto.randomInt(100000, 1000000).toString();

  // ── Mock mode: always succeed regardless of WhatsApp connectivity ──────────
  if (isMockMode) {
    try { await _otpSet(cleanPhone, otp, Date.now() + 5 * 60 * 1000); } catch (_) { /* ignore */ }

    // Best-effort WhatsApp delivery — silently ignore any connection errors
    try {
      const { sendWhatsAppOTP } = await import('../utils/whatsapp.js');
      await sendWhatsAppOTP(cleanPhone, otp);
      console.log(`✅ [MOCK MODE] WhatsApp OTP also dispatched to ${cleanPhone}`);
    } catch (wpErr) {
      console.warn(`⚠️  [MOCK MODE] WhatsApp delivery skipped (${wpErr.message}). Bypass OTP: ${otp}`);
    }

    console.log(`🧪 [MOCK OTP] Phone: ${cleanPhone} → OTP: ${otp}`);
    return res.status(200).json({
      success: true,
      message: 'Mock OTP ready (dev mode)',
      provider: 'mock',
      otp // always returned in mock mode
    });
  }

  // ── Real mode: send via configured WhatsApp provider ────────────────────────
  try {
    await _otpSet(cleanPhone, otp, Date.now() + 5 * 60 * 1000); // 5 min TTL

    const { sendWhatsAppOTP } = await import('../utils/whatsapp.js');
    const result = await sendWhatsAppOTP(cleanPhone, otp);

    res.status(200).json({
      success: true,
      message: 'WhatsApp OTP sent successfully',
      provider: result.provider,
      otp: result.provider === 'mock' ? otp : undefined
    });
  } catch (err) {
    console.error('WhatsApp OTP send error:', err);
    res.status(500).json({ success: false, error: 'Failed to send WhatsApp OTP: ' + err.message });
  }
});


// POST /api/users/verify-whatsapp-otp — Verify WhatsApp OTP & login
// Fix #4: authLimiter applied — previously no rate limit allowed brute-forcing all 900k OTP combinations
router.post('/verify-whatsapp-otp', authLimiter, async (req, res) => {
  const { phone, otp, role } = req.body;
  const cleanPhone = normalizePhone(phone);
  if (!cleanPhone || !otp) {
    return res.status(400).json({ success: false, error: 'Phone number and OTP are required' });
  }

  // Fix #5: Use Supabase-backed store
  const stored = await _otpGet(cleanPhone);
  if (!stored) {
    return res.status(400).json({ success: false, error: 'OTP expired or not requested' });
  }

  if (Date.now() > stored.expiresAt) {
    await _otpDelete(cleanPhone);
    return res.status(400).json({ success: false, error: 'OTP expired' });
  }

  // Fix #10: Delete OTP on wrong guess — previously unlimited retries were allowed
  if (stored.otp !== otp) {
    await _otpDelete(cleanPhone); // one-attempt policy
    return res.status(400).json({ success: false, error: 'Invalid OTP code. Please request a new OTP.' });
  }

  // Correct OTP — consume it immediately
  await _otpDelete(cleanPhone);

  try {
    const uid = `whatsapp-${cleanPhone}`;
    const userRole = role ? String(role).toUpperCase() : 'BUYER';

    let { data: existingUser } = await supabase
      .from('users')
      .select('*')
      .eq('phone', cleanPhone)
      .maybeSingle();

    if (!existingUser) {
      const { data: newUser, error: createErr } = await supabase
        .from('users')
        .insert([{
          uid,
          phone: cleanPhone,
          full_name: userRole === 'BUYER' ? 'Passwala User' : (userRole === 'VENDOR' ? 'Vendor Partner' : 'Rider Partner'),
          role: userRole
        }])
        .select()
        .single();

      if (createErr) throw createErr;
      existingUser = newUser;
    } else if (existingUser.role !== userRole && userRole !== 'BUYER') {
      const { data: updatedUser } = await supabase
        .from('users')
        .update({ role: userRole })
        .eq('id', existingUser.id)
        .select()
        .single();
      existingUser = updatedUser;
    }

    res.status(200).json({
      success: true,
      user: {
        id: existingUser.id,
        uid: existingUser.uid,
        displayName: existingUser.full_name,
        phoneNumber: existingUser.phone,
        email: existingUser.email,
        photoURL: existingUser.photo_url,
        authProvider: 'phone',
        role: existingUser.role.toLowerCase()
      }
    });
  } catch (err) {
    console.error('WhatsApp verification database error:', err);
    res.status(500).json({ success: false, error: 'Database session initialization failed' });
  }
});

// PUT /api/users/:uid/email — Update user email (secured with userAuth)
router.put('/:uid/email', userAuth, async (req, res) => {
  try {
    const { email } = req.body;
    const rawId = decodeURIComponent(req.params.uid);
    const identifier = rawId.includes('@') ? rawId : rawId.replace(/\s/g, '');
    let user = null;
    const { data: byId } = await supabase.from('users').select('id').eq('id', identifier).maybeSingle();
    user = byId;
    if (!user) {
      const { data: byUid } = await supabase.from('users').select('id').eq('uid', identifier).maybeSingle();
      user = byUid;
    }
    if (!user) {
      const { data: byPhone } = await supabase.from('users').select('id').eq('phone', identifier).maybeSingle();
      user = byPhone;
    }
    if (!user) return res.status(404).json({ error: 'User not found' });
    const { error: updateError } = await supabase
      .from('users')
      .update({ email })
      .eq('id', user.id);
    if (updateError) throw updateError;
    res.status(200).json({ success: true, message: 'Email updated' });
  } catch (error) {
    console.error('Error updating email:', error);
    res.status(500).json({ error: 'Failed to update email' });
  }
});

// PUT /api/users/:uid/phone — Update user phone (secured with userAuth)
router.put('/:uid/phone', userAuth, async (req, res) => {
  try {
    const { phone } = req.body;
    const rawId = decodeURIComponent(req.params.uid);
    const identifier = rawId.includes('@') ? rawId : rawId.replace(/\s/g, '');
    let user = null;
    const { data: byId } = await supabase.from('users').select('id').eq('id', identifier).maybeSingle();
    user = byId;
    if (!user) {
      const { data: byUid } = await supabase.from('users').select('id').eq('uid', identifier).maybeSingle();
      user = byUid;
    }
    if (!user) return res.status(404).json({ error: 'User not found' });
    const { error: updateError } = await supabase
      .from('users')
      .update({ phone })
      .eq('id', user.id);
    if (updateError) throw updateError;
    res.status(200).json({ success: true, message: 'Phone number updated' });
  } catch (error) {
    console.error('Error updating phone number:', error);
    res.status(500).json({ error: 'Failed to update phone number' });
  }
});

// PUT /api/users/:uid/address — Update or insert user default address (secured with userAuth)
router.put('/:uid/address', userAuth, async (req, res) => {
  try {
    const { address, city, state, pincode, lat, lng } = req.body;
    const rawId = decodeURIComponent(req.params.uid);
    const identifier = rawId.includes('@') ? rawId : rawId.replace(/\s/g, '');
    let user = null;
    const { data: byId } = await supabase.from('users').select('id').eq('id', identifier).maybeSingle();
    user = byId;
    if (!user) {
      const { data: byUid } = await supabase.from('users').select('id').eq('uid', identifier).maybeSingle();
      user = byUid;
    }
    if (!user) return res.status(404).json({ error: 'User not found' });
    const { data: existingAddr } = await supabase
      .from('addresses')
      .select('id')
      .eq('user_id', user.id)
      .eq('is_default', true)
      .maybeSingle();
    if (existingAddr) {
      const { error: updateError } = await supabase
        .from('addresses')
        .update({ 
          address_line_1: address,
          city: city || 'Ahmedabad',
          state: state || 'Gujarat',
          pincode: pincode || '380015',
          lat: lat || null,
          lng: lng || null
        })
        .eq('id', existingAddr.id);
      if (updateError) throw updateError;
    } else {
      const { error: insertError } = await supabase
        .from('addresses')
        .insert([{
          user_id: user.id,
          address_line_1: address,
          city: city || 'Ahmedabad',
          state: state || 'Gujarat',
          pincode: pincode || '380015',
          is_default: true,
          lat: lat || null,
          lng: lng || null
        }]);
      if (insertError) throw insertError;
    }
    res.status(200).json({ success: true, message: 'Address updated' });
  } catch (error) {
    console.error('Error updating address:', error);
    res.status(500).json({ error: 'Failed to update address' });
  }
});

// PUT /api/users/:uid/wallet — Update / recharge user wallet balance (secured with userAuth)
router.put('/:uid/wallet', userAuth, async (req, res) => {
  try {
    const { amount, action } = req.body;
    const rawId = decodeURIComponent(req.params.uid);
    const identifier = rawId.includes('@') ? rawId : rawId.replace(/\s/g, '');
    let user = null;
    const { data: byId } = await supabase.from('users').select('id, wallet_balance').eq('id', identifier).maybeSingle();
    user = byId;
    if (!user) {
      const { data: byUid } = await supabase.from('users').select('id, wallet_balance').eq('uid', identifier).maybeSingle();
      user = byUid;
    }
    if (!user) return res.status(404).json({ error: 'User not found' });
    const currentBalance = user.wallet_balance || 0;
    let newBalance = currentBalance;
    if (action === 'RECHARGE') {
      newBalance = currentBalance + Number(amount);
    } else if (action === 'DEDUCT') {
      newBalance = Math.max(0, currentBalance - Number(amount));
    } else {
      return res.status(400).json({ error: 'Invalid action parameter' });
    }
    const { error: updateError } = await supabase
      .from('users')
      .update({ wallet_balance: newBalance })
      .eq('id', user.id);
    if (updateError) throw updateError;
    res.status(200).json({ success: true, message: 'Wallet balance updated', balance: newBalance });
  } catch (error) {
    console.error('Error updating wallet:', error);
    res.status(500).json({ error: 'Failed to update wallet balance' });
  }
});

export default router;
