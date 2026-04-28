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
      full_name: displayName ?? null,
      email: email ?? null,
      photo_url: photoURL ?? null,
    };

    // 1. Check if user already exists
    let existingUser = null;
    if (phoneNumber) {
      const { data } = await supabase.from('users').select('*').eq('phone', phoneNumber).maybeSingle();
      existingUser = data;
    }
    if (!existingUser && email) {
      const { data } = await supabase.from('users').select('*').eq('email', email).maybeSingle();
      existingUser = data;
    }

    if (!existingUser) {
      if (phoneNumber) {
        userData.phone = phoneNumber;
      } else {
        // Needs a unique phone <= 20 chars
        // Using 'np_' + first 16 chars of uid or email
        const base = uid || email || String(Date.now());
        userData.phone = "np_" + base.substring(0, 16);
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
  try {
    const rawId = decodeURIComponent(req.params.uid);
    const cleanId = rawId.replace(/\s/g, ''); // No spaces
    const numericOnly = rawId.replace(/\D/g, ''); // Numbers only
    
    // Search strategy: try all variations
    const { data: users, error: findError } = await supabase
      .from('users')
      .select('id')
      .or(`phone.eq.${cleanId},phone.eq.${numericOnly},phone.ilike.%${numericOnly},email.eq.${rawId}`);

    if (findError || !users?.length) {
      console.error('Delete search failed for:', rawId);
      return res.status(404).json({ error: 'User account not found' });
    }

    const { error: deleteError } = await supabase
      .from('users')
      .delete()
      .eq('id', users[0].id);
    
    if (deleteError) throw deleteError;

    res.status(200).json({ success: true, message: 'Account deleted' });
  } catch (error) {
    console.error('Error deleting account:', error);
    res.status(500).json({ error: 'Failed to delete account' });
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

    const { data: user } = await supabase
      .from('users')
      .select('id')
      .or(`phone.eq.${identifier},phone.eq.${numericOnly},email.eq.${identifier}`)
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
