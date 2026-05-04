import express from 'express';
import supabase from '../supabase.js';

const router = express.Router();

// POST /api/admin/login
router.post('/login', async (req, res) => {
  const { accessCode } = req.body;
  
  // In a real production app, this would query the `admins` table and compare hashed passwords.
  // For now, we use a secure environment variable.
  const secureCode = process.env.ADMIN_ACCESS_CODE || 'PASSWALA_SECURE_99';
  
  if (accessCode === secureCode) {
    // Return a simple session token (could be a JWT)
    res.status(200).json({ success: true, token: 'admin_session_token' });
  } else {
    res.status(401).json({ success: false, error: 'Invalid Access Code' });
  }
});

export default router;
