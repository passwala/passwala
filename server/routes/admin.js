import express from 'express';
import supabase from '../supabase.js';

const router = express.Router();

// GET /api/admin/fetch — Securely fetch data for Admin Panel
router.get('/fetch', async (req, res) => {
    const { table } = req.query;
    if (!table) return res.status(400).json({ error: 'Table name is required' });

    try {
        let query = supabase.from(table).select(
            table === 'riders' || table === 'vendors' || table === 'service_providers'
                ? '*, users(phone, full_name)'
                : '*'
        );
        
        const { data, error } = await query.order('created_at', { ascending: false });
        
        if (error) throw error;
        res.status(200).json({ success: true, data });
    } catch (error) {
        console.error(`❌ Admin Fetch Error [${table}]:`, error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

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
        let finalPayload = { ...payload };

        // 1. Handle User-Linked Tables (riders, vendors, service_providers)
        // If payload contains 'phone', we should ensure a user exists and link it
        const userLinkedTables = ['riders', 'vendors', 'service_providers'];
        if (userLinkedTables.includes(table) && payload.phone) {
            console.log(`🔗 Linking user for ${table} via phone: ${payload.phone}`);
            const { data: user, error: userError } = await supabase
                .from('users')
                .upsert({ 
                    phone: payload.phone, 
                    full_name: payload.full_name || 'Admin Created'
                }, { onConflict: 'phone' })
                .select()
                .single();
            
            if (userError) {
                console.error('❌ Failed to link user:', userError.message);
            } else {
                finalPayload.user_id = user.id;
            }
        }

        // 2. Discover valid columns from information_schema
        const { data: columnsData, error: colsError } = await supabase
            .from('information_schema.columns')
            .select('column_name')
            .eq('table_name', table)
            .eq('table_schema', 'public');
        
        let cleanedPayload = {};
        if (!colsError && columnsData && columnsData.length > 0) {
            const validCols = columnsData.map(c => c.column_name);
            Object.keys(finalPayload).forEach(key => {
                if (validCols.includes(key)) cleanedPayload[key] = finalPayload[key];
            });
        } else {
            cleanedPayload = finalPayload; // Fallback
        }

        // 3. Perform the Upsert
        // For service_areas, we allow upserting on area_name to prevent duplicate errors
        const conflictTarget = table === 'service_areas' ? 'area_name' : 'id';
        
        const { data, error } = await supabase
            .from(table)
            .upsert(cleanedPayload, { onConflict: conflictTarget })
            .select()
            .single();

        if (error) {
            console.error(`❌ Admin Upsert Error [${table}]:`, error.message);
            return res.status(500).json({ success: false, error: error.message });
        }

        res.status(200).json({ success: true, data });
    } catch (error) {
        console.error(`🔥 System Failure during admin upsert:`, error);
        res.status(500).json({ error: `Cloud Sync Failed: ${error.message}` });
    }
});

// DELETE /api/admin/delete — Securely delete any record
router.delete('/delete', async (req, res) => {
    const { table, id } = req.body;
    
    if (!table || !id) {
        return res.status(400).json({ error: 'Table name and ID are required' });
    }

    try {
        const { error } = await supabase
            .from(table)
            .delete()
            .eq('id', id);

        if (error) throw error;
        res.status(200).json({ success: true, message: 'Deleted successfully' });
    } catch (error) {
        console.error(`❌ Admin Delete Error [${table}]:`, error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

export default router;
