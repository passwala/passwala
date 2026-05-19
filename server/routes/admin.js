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

// Admin Authentication Middleware
const adminAuth = (req, res, next) => {
    const key = req.headers['x-admin-key'];
    const validKey = process.env.ADMIN_SECRET || process.env.VITE_ADMIN_ACCESS_CODE || 'PASSWALA99';
    
    if (!key || key !== validKey) {
        console.warn('Unauthorized admin access attempt from IP:', req.ip);
        return res.status(401).json({ success: false, error: 'Unauthorized: Invalid Admin Key' });
    }
    next();
};

// Apply to all admin routes
router.use(adminAuth);

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

        // Backend Self-Healing: For any row missing user_id, check if user exists by phone
        if (data && (table === 'vendors' || table === 'service_providers' || table === 'riders')) {
            for (let i = 0; i < data.length; i++) {
                const row = data[i];
                if (!row.user_id && row.phone) {
                    try {
                        let { data: existingUser } = await supabase
                            .from('users')
                            .select('id, full_name')
                            .eq('phone', row.phone)
                            .maybeSingle();

                        if (!existingUser) {
                            const userPayload = {
                                phone: row.phone,
                                full_name: row.name || row.business_name || 'Partner',
                                role: table === 'vendors' ? 'VENDOR' : (table === 'riders' ? 'RIDER' : 'SERVICE_PROVIDER')
                            };
                            const { data: newUser, error: insErr } = await supabase
                                .from('users')
                                .insert([userPayload])
                                .select()
                                .single();

                            if (!insErr && newUser) {
                                existingUser = newUser;
                            }
                        }

                        if (existingUser) {
                            const { error: updErr } = await supabase
                                .from(table)
                                .update({ user_id: existingUser.id })
                                .eq('id', row.id);

                            if (!updErr) {
                                row.user_id = existingUser.id;
                                row.users = {
                                    id: existingUser.id,
                                    phone: row.phone,
                                    full_name: existingUser.full_name
                                };
                            }
                        }
                    } catch (healErr) {
                        console.error('Self-healing failed for row', row.id, healErr);
                    }
                }
            }
        }

        res.status(200).json({ success: true, data });
    } catch (error) {
        console.error(`❌ Admin Fetch Error [${table}]:`, error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});


// GET /api/admin/stats — Securely fetch system stats for Dashboard
router.get('/stats', async (req, res) => {
    try {
        const { count: userCount } = await supabase.from('users').select('*', { count: 'exact', head: true });
        const { count: vendorCount } = await supabase.from('vendors').select('*', { count: 'exact', head: true });
        const { count: orderCount } = await supabase.from('orders').select('*', { count: 'exact', head: true });
        const { count: productCount } = await supabase.from('products').select('*', { count: 'exact', head: true });

        res.status(200).json({
            success: true,
            stats: {
                users: userCount || 0,
                vendors: vendorCount || 0,
                orders: orderCount || 0,
                activeItems: productCount || 0
            }
        });
    } catch (error) {
        console.error('❌ Admin Stats Error:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST /api/admin/purge — Perform deep purge of mock residue securely
router.post('/purge', async (req, res) => {
    try {
        const mockUserIds = [
            '00000000-0000-0000-0000-000000000001', 
            '00000000-0000-0000-0000-000000000002',
            '00000000-0000-0000-0000-000000000003',
            '00000000-0000-0000-0000-000000000004'
        ];

        // 1. Delete by specific IDs
        await supabase.from('services').delete().in('id', ['88888888-8888-8888-8888-888888888888']);
        await supabase.from('products').delete().in('id', ['55555555-5555-5555-5555-555555555555']);
        await supabase.from('product_categories').delete().in('id', ['44444444-4444-4444-4444-444444444444']);
        await supabase.from('service_categories').delete().in('id', ['77777777-7777-7777-7777-777777777777']);
        await supabase.from('stores').delete().in('id', ['22222222-2222-2222-2222-222222222222']);
        await supabase.from('service_providers').delete().in('id', ['66666666-6666-6666-6666-666666666666']);
        await supabase.from('riders').delete().in('id', ['33333333-3333-3333-3333-333333333333']);
        await supabase.from('vendors').delete().in('id', ['11111111-1111-1111-1111-111111111111']);
        await supabase.from('users').delete().in('id', mockUserIds);

        // 2. Delete by suspicious names and gibberish patterns
        const suspiciousWords = [
            'test', 'fake', 'nnknn', 'nzbsh', 'dummy', 'asdf', 
            'bjkb', 'mmmmm', 'nmnm', 'nmn', 'kevall', 'plumber',
            '99999', '66666', '88888', '77777', '11111', '00000',
            'sample', 'demo', 'example', 'xyz', 'test', 'admin'
        ];
        
        const tablesToClean = ['vendors', 'users', 'service_providers', 'stores', 'riders', 'services', 'products'];
        
        for (const word of suspiciousWords) {
            for (const table of tablesToClean) {
                const nameField = (table === 'users') ? 'full_name' : (table === 'products' || table === 'services' || table === 'stores') ? 'name' : 'business_name';
                await supabase.from(table).delete().ilike(nameField, `%${word}%`);
                
                if (table !== 'products' && table !== 'services' && table !== 'product_categories' && table !== 'service_categories') {
                    await supabase.from(table).delete().ilike('phone', `%${word}%`);
                }
            }
        }

        // 3. Delete exact duplicates or specific mock entries
        await supabase.from('service_providers').delete().eq('business_name', 'Super Plumber');
        await supabase.from('service_providers').delete().eq('phone', '6666666666');
        await supabase.from('users').delete().eq('full_name', 'Kevallll');
        await supabase.from('users').delete().eq('phone', '9999999999');

        res.status(200).json({ success: true, message: 'Purge completed successfully' });
    } catch (error) {
        console.error('❌ Admin Purge Error:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET /api/admin/people_map — Fetch coordinates for all community roles
router.get('/people_map', async (req, res) => {
    try {
        const [
            { data: usersList, error: uErr },
            { data: vendorsList, error: vErr },
            { data: ridersList, error: rErr },
            { data: providersList, error: pErr },
            { data: storesList, error: sErr }
        ] = await Promise.all([
            supabase.from('users').select('*'),
            supabase.from('vendors').select('*'),
            supabase.from('riders').select('*'),
            supabase.from('service_providers').select('*'),
            supabase.from('stores').select('*')
        ]);

        if (uErr) throw uErr;
        if (vErr) throw vErr;
        if (rErr) throw rErr;
        if (pErr) throw pErr;
        if (sErr) throw sErr;

        res.status(200).json({
            success: true,
            data: {
                usersList,
                vendorsList,
                ridersList,
                providersList,
                storesList
            }
        });
    } catch (error) {
        console.error('❌ Admin People Map Error:', error.message);
        res.status(500).json({ success: false, error: error.message });
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
            // 1. Check if user exists by phone
            const { data: existingUser } = await supabase
                .from('users')
                .select('*')
                .eq('phone', payload.phone)
                .maybeSingle();

            let user = existingUser;
            const userPayload = {
                phone: payload.phone,
                full_name: payload.full_name || 'Admin Created'
            };

            if (existingUser) {
                const { data, error } = await supabase
                    .from('users')
                    .update(userPayload)
                    .eq('id', existingUser.id)
                    .select()
                    .single();
                if (!error && data) user = data;
            } else {
                const { data, error } = await supabase
                    .from('users')
                    .insert([userPayload])
                    .select()
                    .single();
                if (!error && data) user = data;
            }

            if (user) {
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
            // Robust fallback: keep only scalar values to prevent database crashes on relation objects/arrays
            cleanedPayload = {};
            Object.keys(finalPayload).forEach(key => {
                const val = finalPayload[key];
                if (val === null || (typeof val !== 'object' && !Array.isArray(val))) {
                    cleanedPayload[key] = val;
                }
            });
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
