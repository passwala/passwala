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
    const { data, error } = await supabase
      .from('users')
      .upsert(
        {
          uid,
          email: email ?? null,
          display_name: displayName ?? null,
          photo_url: photoURL ?? null,
          phone_number: phoneNumber ?? null,
          auth_provider: authProvider,
        },
        { onConflict: 'uid', ignoreDuplicates: false }
      )
      .select()
      .single();

    if (error) throw error;

    res.status(200).json({ success: true, user: data });
  } catch (error) {
    console.error('Error saving user:', error);
    res.status(500).json({ error: 'Failed to save user' });
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

export default router;
