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

// POST /api/admin/upsert — Securely sync any table data from Admin Panel
router.post('/upsert', async (req, res) => {
    const { table, payload } = req.body;
    
    if (!table || !payload) {
        return res.status(400).json({ error: 'Table name and payload are required' });
    }

    try {
        // Use the service role supabase client to bypass RLS
        const { data, error } = await supabase
            .from(table)
            .upsert(payload, { onConflict: 'id' })
            .select()
            .single();

        if (error) {
            console.error(`❌ Admin Upsert Error [${table}]:`, error);
            throw error;
        }

        res.status(200).json({ success: true, data });
    } catch (error) {
        console.error(`🔥 System Failure during admin upsert:`, error);
        res.status(500).json({ error: `Cloud Sync Failed: ${error.message}` });
    }
});

export default router;
