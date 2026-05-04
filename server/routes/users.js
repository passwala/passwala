import express from 'express';
import supabase from '../supabase.js';

const router = express.Router();

// POST /api/users — Upsert user after login (create or update)
router.post('/', async (req, res) => {
  const { uid, email, displayName, photoURL, phoneNumber, authProvider } = req.body;

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
    };

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
    
    // Check by Provided Phone
    if (!existingUser && phoneNumber) {
      const { data } = await supabase.from('users').select('*').eq('phone', phoneNumber).maybeSingle();
      existingUser = data;
    }

    // Check by Generated Phone (last resort for ghost accounts)
    if (!existingUser) {
      const base = uid || email || String(Date.now());
      const generatedPhone = "np_" + base.substring(0, 16);
      const { data } = await supabase.from('users').select('*').eq('phone', generatedPhone).maybeSingle();
      existingUser = data;
      
      if (!existingUser) {
         userData.phone = phoneNumber || generatedPhone;
      }
    } else if (phoneNumber) {
      userData.phone = phoneNumber;
    }

    let resultData;
    let resultError;

    if (existingUser) {
      // 2. Update existing user
      const { data, error } = await supabase
        .from('users')
        .update(userData)
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

    // 4. Handle Address if provided
    const { address } = req.body;
    if (address && resultData) {
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

// GET /api/users/:uid — Get user by Firebase UID
router.get('/:uid', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('uid', req.params.uid)
      .single();

    if (error && error.code === 'PGRST116') {
      return res.status(404).json({ error: 'User not found' });
    }
    if (error) throw error;

    res.status(200).json({ success: true, user: data });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// GET /api/users — Get all users (admin)
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.status(200).json({ success: true, users: data });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// DELETE /api/users/:uid — Delete account
router.delete('/:uid', async (req, res) => {
  const identifier = decodeURIComponent(req.params.uid);
  console.log(`🗑️ Attempting deletion for user: ${identifier}`);

  try {
    // 1. Try finding by ID (UUID) first
    let { data: user, error: findError } = await supabase
      .from('users')
      .select('id')
      .eq('id', identifier)
      .maybeSingle();

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

// PUT /api/users/:uid/photo — Update profile picture
router.put('/:uid/photo', async (req, res) => {
  try {
    const { photoURL } = req.body;
    const rawId = decodeURIComponent(req.params.uid);
    // Normalize phone
    const identifier = rawId.includes('@') ? rawId : rawId.replace(/\s/g, '');

    // 1. Try to find user by phone
    let { data: user } = await supabase
      .from('users')
      .select('id')
      .eq('phone', identifier)
      .maybeSingle();

    // 2. If not found by phone, try email
    if (!user) {
      const { data: emailUser } = await supabase
        .from('users')
        .select('id')
        .eq('email', identifier)
        .maybeSingle();
      user = emailUser;
    }

    if (!user) {
      return res.status(404).json({ error: 'User account not found' });
    }

    const { error: updateError } = await supabase
      .from('users')
      .update({ photo_url: photoURL })
      .eq('id', user.id);
    
    if (updateError) throw updateError;
    res.status(200).json({ success: true, message: 'Photo updated' });
  } catch (error) {
    console.error('Error updating photo:', error);
    res.status(500).json({ error: 'System Error: Failed to update photo' });
  }
});

// PUT /api/users/:uid/name — Update user name
router.put('/:uid/name', async (req, res) => {
  try {
    const { displayName } = req.body;
    const rawId = decodeURIComponent(req.params.uid);
    const identifier = rawId.includes('@') ? rawId : rawId.replace(/\s/g, '');

    // Normalize variations
    const numericOnly = identifier.replace(/\D/g, '');

    let orFilters = [`phone.eq.${identifier}`, `email.eq.${identifier}`, `uid.eq.${identifier}`];
    if (numericOnly) {
       orFilters.push(`phone.eq.${numericOnly}`);
    }

    const { data: user } = await supabase
      .from('users')
      .select('id')
      .or(orFilters.join(','))
      .maybeSingle();

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

export default router;
