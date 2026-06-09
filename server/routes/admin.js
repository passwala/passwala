import express from 'express';
import crypto from 'crypto';
import dotenv from 'dotenv';
import fs from 'fs/promises';
import path from 'path';
import supabase from '../supabase.js';
import { authLimiter } from '../utils/rateLimiter.js';

dotenv.config();

if (!process.env.ADMIN_ACCESS_CODE) {
  throw new Error('FATAL Startup Error: ADMIN_ACCESS_CODE environment variable is missing.');
}

const router = express.Router();

const ADMIN_SECRET = process.env.ADMIN_ACCESS_CODE;

const ALLOWED_ADMIN_TABLES = [
  'users',
  'vendors',
  'riders',
  'service_providers',
  'service_bookings',
  'services',
  'products',
  'stores',
  'deals',
  'notifications',
  'posts',
  'orders',
  'product_categories',
  'service_categories',
  'addresses',
  'comments',
  'ai_recommendations',
  'wallet_transactions',
  'reports',
  'service_areas',
  'events',
  'event_bookings',
  'city_routes',
  'city_vehicles',
  'ticket_bookings'
];

function base64urlEncode(strOrBuffer) {
  const buffer = Buffer.isBuffer(strOrBuffer) ? strOrBuffer : Buffer.from(strOrBuffer, 'utf8');
  return buffer.toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function base64urlDecode(str) {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  return Buffer.from(base64, 'base64').toString('utf8');
}

export function signAdminToken(payload) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const headerB64 = base64urlEncode(JSON.stringify(header));
  
  const now = Math.floor(Date.now() / 1000);
  const fullPayload = {
    ...payload,
    iat: now,
    exp: now + (8 * 3600) // 8 hours expiration
  };
  const payloadB64 = base64urlEncode(JSON.stringify(fullPayload));
  
  const hmac = crypto.createHmac('sha256', ADMIN_SECRET);
  hmac.update(`${headerB64}.${payloadB64}`);
  const signatureB64 = base64urlEncode(hmac.digest());
  
  return `${headerB64}.${payloadB64}.${signatureB64}`;
}

export function verifyAdminToken(token) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    
    const [headerB64, payloadB64, signatureB64] = parts;
    
    const hmac = crypto.createHmac('sha256', ADMIN_SECRET);
    hmac.update(`${headerB64}.${payloadB64}`);
    const expectedSignatureB64 = base64urlEncode(hmac.digest());
    
    if (signatureB64 !== expectedSignatureB64) {
      return null;
    }
    
    const payload = JSON.parse(base64urlDecode(payloadB64));
    
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      return null;
    }
    
    return payload;
  } catch (e) {
    return null;
  }
}

// POST /api/admin/login
router.post('/login', authLimiter, async (req, res) => {
  const { accessCode } = req.body;
  
  const secureCode = ADMIN_SECRET;
  
  if (accessCode === secureCode) {
    // Generate a secure JWT session token
    const token = signAdminToken({ role: 'admin' });
    res.status(200).json({ success: true, token });
  } else {
    res.status(401).json({ success: false, error: 'Invalid Access Code' });
  }
});

// Admin Authentication Middleware
export const adminAuth = (req, res, next) => {
    const key = req.headers['x-admin-key'];
    
    if (!key) {
        console.warn('Unauthorized admin access attempt from IP: Missing key', req.ip);
        return res.status(401).json({ success: false, error: 'Unauthorized: Missing Admin Key' });
    }

    // JWT Cryptographic session validation
    const decoded = verifyAdminToken(key);
    if (decoded) {
        req.adminSession = decoded;
        return next();
    }

    console.warn('Unauthorized admin access attempt from IP: Invalid key/token', req.ip);
    return res.status(401).json({ success: false, error: 'Unauthorized: Invalid Admin Key' });
};

// Apply to all admin routes
router.use(adminAuth);

// GET /api/admin/fetch — Securely fetch data for Admin Panel
router.get('/fetch', async (req, res) => {
    const { table } = req.query;
    if (!table) return res.status(400).json({ error: 'Table name is required' });

    if (!ALLOWED_ADMIN_TABLES.includes(table)) {
        return res.status(400).json({ error: `Invalid table: ${table} is not whitelisted` });
    }

    try {
        let selectStr = '*';
        if (table === 'riders' || table === 'vendors' || table === 'service_providers') {
            selectStr = '*, users(phone, full_name)';
        } else if (table === 'service_bookings') {
            selectStr = '*, users(phone, full_name), services(title, price), service_providers(business_name), addresses(address_line_1, city)';
        } else if (table === 'services') {
            selectStr = '*, service_providers(business_name), service_categories(name)';
        } else if (table === 'products') {
            selectStr = '*, stores(name), product_categories(name)';
        } else if (table === 'stores') {
            selectStr = '*, vendors(phone, is_verified)';
        } else if (table === 'deals') {
            selectStr = '*, stores(name)';
        } else if (table === 'notifications' || table === 'posts') {
            selectStr = '*, users(phone, full_name)';
        } else if (table === 'events') {
            selectStr = '*, event_ticket_tiers(price)';
        } else if (table === 'orders') {
            selectStr = '*, order_items(id, products(description))';
        }

        let query = supabase.from(table).select(selectStr);
        
        const { data, error } = await query.order('created_at', { ascending: false });
        
        if (error) throw error;

        // Filter out service bookings from the orders table response
        if (data && table === 'orders') {
            const productOrdersOnly = data.filter(order => {
                const hasServiceItem = order.order_items?.some(oi => 
                    oi.products?.description === 'Service item auto-registered'
                );
                return !hasServiceItem;
            });
            productOrdersOnly.forEach(order => {
                delete order.order_items;
            });
            return res.status(200).json({ success: true, data: productOrdersOnly });
        }

        // Backend Self-Healing for riders/vendors/providers
        if (data && (table === 'vendors' || table === 'service_providers' || table === 'riders')) {
            for (let i = 0; i < data.length; i++) {
                const row = data[i];
                if (!row.user_id && row.phone) {
                    try {
                        let { data: existingUser } = await supabase
                            .from('users')
                            .select('id, full_name, role')
                            .eq('phone', row.phone)
                            .maybeSingle();

                        const targetRole = table === 'vendors' ? 'VENDOR' : (table === 'riders' ? 'RIDER' : 'SERVICE_PROVIDER');

                        if (!existingUser) {
                            const userPayload = {
                                phone: row.phone,
                                full_name: row.name || row.business_name || 'Partner',
                                role: targetRole
                            };
                            const { data: newUser, error: insErr } = await supabase
                                .from('users')
                                .insert([userPayload])
                                .select()
                                .single();

                            if (!insErr && newUser) {
                                existingUser = newUser;
                            }
                        } else if (existingUser.role !== targetRole) {
                            await supabase
                                .from('users')
                                .update({ role: targetRole })
                                .eq('id', existingUser.id);
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

        // Backend Self-Healing: For service_bookings, if total_amount is incorrect or zero, sync with service price
        if (data && table === 'service_bookings') {
            for (let i = 0; i < data.length; i++) {
                const booking = data[i];
                // Extract society from address_line_1 if not explicitly present
                if (booking.addresses && !booking.addresses.society && booking.addresses.address_line_1) {
                    const parts = booking.addresses.address_line_1.split(',');
                    booking.addresses.society = parts[parts.length - 1]?.trim() || '';
                }
                const correctPrice = booking.services?.price;
                if (booking.service_id && correctPrice && booking.total_amount !== correctPrice) {
                    try {
                        const { error: updErr } = await supabase
                            .from('service_bookings')
                            .update({ total_amount: correctPrice })
                            .eq('id', booking.id);
                        if (!updErr) {
                            booking.total_amount = correctPrice;
                        }
                    } catch (healErr) {
                        console.error('Self-healing failed for booking price', booking.id, healErr);
                    }
                }
            }
        }

        // Map event_ticket_tiers back to starting_price for Admin Panel
        if (data && table === 'events') {
            for (let i = 0; i < data.length; i++) {
                const ev = data[i];
                if (ev.event_ticket_tiers && ev.event_ticket_tiers.length > 0) {
                    ev.starting_price = Math.min(...ev.event_ticket_tiers.map(t => t.price));
                } else {
                    ev.starting_price = 0;
                }
                delete ev.event_ticket_tiers;
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

        // Calculate real revenue and order stats
        const { data: allOrders } = await supabase
            .from('orders')
            .select(`
                id,
                total_amount,
                status,
                created_at,
                stores (
                    id,
                    name,
                    vendors (
                        id,
                        business_name,
                        category
                    )
                )
            `);

        let totalRevenue = 0;
        let ordersCompleted = 0;
        let weeklyMap = { 'Mon': 0, 'Tue': 0, 'Wed': 0, 'Thu': 0, 'Fri': 0, 'Sat': 0, 'Sun': 0 };

        let groceryRevenue = 0;
        let servicesRevenue = 0;
        let foodRevenue = 0;
        
        if (allOrders) {
            allOrders.forEach(order => {
                if (order.status === 'DELIVERED') {
                    const amount = order.total_amount || 0;
                    totalRevenue += amount;
                    ordersCompleted++;

                    // Categorize the order based on its store / vendor category
                    let category = 'Grocery & Essentials'; // Default fallback

                    const store = order.stores;
                    if (store) {
                        const vendor = store.vendors;
                        if (!vendor) {
                            // No vendor info means it's a service provider store
                            category = 'Expert Services';
                        } else {
                            const rawCat = vendor.category || '';
                            const storeName = store.name || '';
                            const bizName = vendor.business_name || '';
                            
                            const foodKeywords = ['restaurant', 'cafe', 'pizza', 'bakery', 'sweets', 'burger', 'food', 'kitchen', 'canteen', 'dhaba', 'dining', 'eats', 'munchies', 'beverage', 'beverages', 'bites', 'grill'];
                            const isFood = rawCat.toLowerCase().includes('beverages') || 
                                           rawCat.toLowerCase().includes('munchies') ||
                                           rawCat.toLowerCase().includes('food') ||
                                           foodKeywords.some(keyword => storeName.toLowerCase().includes(keyword) || bizName.toLowerCase().includes(keyword));

                            const isService = rawCat.toLowerCase().includes('service') || 
                                              rawCat.toLowerCase().includes('repair') || 
                                              rawCat.toLowerCase().includes('cleaning') || 
                                              rawCat.toLowerCase().includes('plumbing') || 
                                              rawCat.toLowerCase().includes('electrical') || 
                                              rawCat.toLowerCase().includes('pest') || 
                                              rawCat.toLowerCase().includes('painting');

                            if (isService) {
                                category = 'Expert Services';
                            } else if (isFood) {
                                category = 'Food Delivery';
                            } else {
                                category = 'Grocery & Essentials';
                            }
                        }
                    }

                    if (category === 'Expert Services') {
                        servicesRevenue += amount;
                    } else if (category === 'Food Delivery') {
                        foodRevenue += amount;
                    } else {
                        groceryRevenue += amount;
                    }
                }
                
                // Weekly trend (simplified to day of week mapping)
                const d = new Date(order.created_at);
                const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
                if (weeklyMap[dayName] !== undefined && order.total_amount) {
                    weeklyMap[dayName] += order.total_amount;
                }
            });
        }
        
        let averageOrderValue = ordersCompleted > 0 ? Math.round(totalRevenue / ordersCompleted) : 0;
        
        const weeklyRevenue = Object.keys(weeklyMap).map(key => ({
            label: key,
            val: weeklyMap[key]
        }));

        const totalCategorizedRevenue = groceryRevenue + servicesRevenue + foodRevenue;
        const groceryPercent = totalCategorizedRevenue > 0 ? Math.round((groceryRevenue / totalCategorizedRevenue) * 100) : 0;
        const servicesPercent = totalCategorizedRevenue > 0 ? Math.round((servicesRevenue / totalCategorizedRevenue) * 100) : 0;
        const foodPercent = totalCategorizedRevenue > 0 ? Math.round((foodRevenue / totalCategorizedRevenue) * 100) : 0;
        
        const salesByCategory = [
            { name: 'Grocery & Essentials', percent: groceryPercent, color: '#10b981' },
            { name: 'Expert Services', percent: servicesPercent, color: '#6366f1' },
            { name: 'Food Delivery', percent: foodPercent, color: '#f59e0b' }
        ];

        res.status(200).json({
            success: true,
            stats: {
                users: userCount || 0,
                vendors: vendorCount || 0,
                orders: orderCount || 0,
                activeItems: productCount || 0,
                totalRevenue,
                ordersCompleted,
                averageOrderValue,
                weeklyRevenue,
                salesByCategory
            }
        });
    } catch (error) {
        console.error('❌ Admin Stats Error:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST /api/admin/purge — Perform deep purge of mock residue securely (DISABLED)
router.post('/purge', async (req, res) => {
    return res.status(403).json({ 
        success: false, 
        error: 'Database purge is disabled on this platform to protect data safety.' 
    });
});

// GET /api/admin/people_map — Fetch coordinates for all community roles
router.get('/people_map', async (req, res) => {
    try {
        const [
            { data: usersList, error: uErr },
            { data: vendorsList, error: vErr },
            { data: ridersList, error: rErr },
            { data: providersList, error: pErr },
            { data: storesList, error: sErr },
            { data: addressesList, error: addrErr },
            { data: riderLocationsList, error: rLocErr }
        ] = await Promise.all([
            supabase.from('users').select('*'),
            supabase.from('vendors').select('*'),
            supabase.from('riders').select('*'),
            supabase.from('service_providers').select('*'),
            supabase.from('stores').select('*'),
            supabase.from('addresses').select('*'),
            supabase.from('rider_locations').select('*')
        ]);

        if (uErr) throw uErr;
        if (vErr) throw vErr;
        if (rErr) throw rErr;
        if (pErr) throw pErr;
        if (sErr) throw sErr;
        if (addrErr) throw addrErr;
        if (rLocErr) throw rLocErr;

        res.status(200).json({
            success: true,
            data: {
                usersList,
                vendorsList,
                ridersList,
                providersList,
                storesList,
                addressesList,
                riderLocationsList
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

    if (!ALLOWED_ADMIN_TABLES.includes(table)) {
        return res.status(400).json({ error: `Invalid table: ${table} is not whitelisted` });
    }

    try {
        let finalPayload = { ...payload };

        // 1. Handle User-Linked Tables (riders, vendors, service_providers)
        // If payload contains 'phone', we should ensure a user exists and link it
        const userLinkedTables = ['riders', 'vendors', 'service_providers'];
        if (userLinkedTables.includes(table) && payload.phone) {
            console.log(`🔗 Linking user for ${table} via phone: ${payload.phone}`);
            // 1. Check if user exists by user_id first, then fallback to phone
            let existingUser = null;
            if (payload.user_id) {
                const { data: ud } = await supabase.from('users').select('*').eq('id', payload.user_id).maybeSingle();
                existingUser = ud;
            }
            if (!existingUser) {
                const { data: ud } = await supabase.from('users').select('*').eq('phone', payload.phone).maybeSingle();
                existingUser = ud;
            }

            let user = existingUser;
            // Use existing name if we don't have a new one in the payload
            const newName = payload.full_name || payload.name || payload.business_name || (existingUser && existingUser.full_name) || 'Admin Created';
            
            let userRole = 'BUYER';
            if (table === 'vendors') userRole = 'VENDOR';
            else if (table === 'riders') userRole = 'RIDER';
            else if (table === 'service_providers') userRole = 'SERVICE_PROVIDER';

            const userPayload = {
                phone: payload.phone,
                full_name: newName,
                role: userRole
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

        // Clean empty strings to null to avoid invalid input syntax (e.g. UUID, Timestamp, Numeric)
        Object.keys(cleanedPayload).forEach(key => {
            if (cleanedPayload[key] === '') {
                cleanedPayload[key] = null;
            }
        });

        // Intercept starting_price to save to event_ticket_tiers
        let startingPrice = null;
        if (table === 'events' && cleanedPayload.starting_price !== undefined) {
            startingPrice = cleanedPayload.starting_price;
            delete cleanedPayload.starting_price;
        }

        // 3. Perform the Upsert/Update
        let dbQuery;
        
        // If ID is provided and not a temporary frontend ID, we should do a partial update.
        // This avoids Postgres 'NOT NULL' constraint errors when doing partial updates on existing records.
        if (cleanedPayload.id && !String(cleanedPayload.id).startsWith('temp_')) {
            const updatePayload = { ...cleanedPayload };
            delete updatePayload.id; // Optional, but cleaner
            dbQuery = supabase.from(table).update(updatePayload).eq('id', cleanedPayload.id).select().single();
        } else {
            // It's an insert. Remove temp ID so the database can generate a proper UUID.
            if (cleanedPayload.id && String(cleanedPayload.id).startsWith('temp_')) {
                delete cleanedPayload.id;
            }
            dbQuery = supabase.from(table).insert([cleanedPayload]).select().single();
        }
        
        const { data, error } = await dbQuery;

        if (error) {
            console.error(`❌ Admin Upsert Error [${table}]:`, error.message);
            return res.status(500).json({ success: false, error: error.message });
        }

        // Save intercepted starting_price to event_ticket_tiers
        if (table === 'events' && startingPrice !== null && data && data.id) {
            const tierPayload = {
                event_id: data.id,
                tier_name: 'General Admission',
                price: parseFloat(startingPrice) || 0,
                total_seats: 1000,
                available_seats: 1000
            };
            const { data: existingTier } = await supabase.from('event_ticket_tiers').select('id').eq('event_id', data.id).eq('tier_name', 'General Admission').maybeSingle();
            
            if (existingTier) {
                await supabase.from('event_ticket_tiers').update({ price: tierPayload.price }).eq('id', existingTier.id);
            } else {
                await supabase.from('event_ticket_tiers').insert([tierPayload]);
            }
        }

        res.status(200).json({ success: true, data });
    } catch (error) {
        console.error(`🔥 System Failure during admin upsert:`, error);
        res.status(500).json({ error: `Cloud Sync Failed: ${error.message}` });
    }
});

// DELETE /api/admin/delete — Securely delete any record (DISABLED)
router.delete('/delete', async (req, res) => {
    return res.status(403).json({
        success: false,
        error: 'Database deletion is disabled on this platform to protect data safety.'
    });
});

// Helper to get platform settings path regardless of process.cwd()
const getSettingsPath = () => {
    return process.cwd().endsWith('server')
        ? path.join(process.cwd(), 'platform_settings.json')
        : path.join(process.cwd(), 'server', 'platform_settings.json');
};

// GET /api/admin/settings - load platform settings from server/platform_settings.json
router.get('/settings', async (req, res) => {
    try {
        const settingsPath = getSettingsPath();
        let settings = {
            appName: 'Passwala',
            supportEmail: 'ops@passwala.com',
            maintenanceMode: false,
            maxDeliveryRange: 10,
            baseDeliveryFee: 30,
            freeDeliveryThreshold: 499,
            liveSync: true,
            ridePricePerKm: 8
        };
        try {
            const fileData = await fs.readFile(settingsPath, 'utf8');
            settings = JSON.parse(fileData);
        } catch (e) {
            // File doesn't exist yet, return defaults
        }
        res.status(200).json({ success: true, settings });
    } catch (error) {
        console.error('❌ Get Settings Error:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST /api/admin/settings - save platform settings to server/platform_settings.json
router.post('/settings', async (req, res) => {
    try {
        const { settings } = req.body;
        if (!settings) {
            return res.status(400).json({ error: 'Settings payload is required' });
        }
        const settingsPath = getSettingsPath();
        await fs.writeFile(settingsPath, JSON.stringify(settings, null, 2), 'utf8');
        res.status(200).json({ success: true, settings });
    } catch (error) {
        console.error('❌ Save Settings Error:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

export default router;
