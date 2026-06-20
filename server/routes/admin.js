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
  'order_items',
  'order_ratings',
  'product_categories',
  'service_categories',
  'addresses',
  'ai_recommendations',
  'wallet_transactions',
  'reports',
  'service_areas',
  'events',
  'event_bookings',
  'event_ticket_tiers',
  'city_routes',
  'city_vehicles',
  'ticket_bookings',
  'event_organizer_requests',
  'promo_codes',
  'promo_redemptions'
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
            selectStr = '*, users(phone, full_name, role)';
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

                        // Determine the target role, but don't demote EVENT_ORGANIZER back to SERVICE_PROVIDER
                        let targetRole;
                        if (table === 'vendors') targetRole = 'VENDOR';
                        else if (table === 'riders') targetRole = 'RIDER';
                        else {
                            // For service_providers: EVENT_ORGANIZERs are stored here too — preserve their role
                            const EVENT_CATEGORIES = [
                              "Music & Concerts", "Comedy & Theatre", "Workshops & Classes",
                              "Parties & Nightlife", "Festivals & Fairs", "Sports & Fitness",
                              "Corporate & Business", "Other Events"
                            ];
                            targetRole = EVENT_CATEGORIES.includes(row.category) ? 'EVENT_ORGANIZER' : 'SERVICE_PROVIDER';
                        }

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
                        } else if (existingUser.role !== targetRole && existingUser.role !== 'EVENT_ORGANIZER') {
                            // Don't downgrade EVENT_ORGANIZER — only update if role is truly wrong
                            await supabase
                                .from('users')
                                .update({ role: targetRole })
                                .eq('id', existingUser.id);
                            existingUser.role = targetRole;
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
                                    full_name: existingUser.full_name,
                                    role: existingUser.role
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
        const { count: serviceCount } = await supabase.from('services').select('*', { count: 'exact', head: true });

        // Calculate pending approvals (apps) from unverified vendors, riders, and service providers
        const { count: unverifiedVendors } = await supabase.from('vendors').select('*', { count: 'exact', head: true }).eq('is_verified', false);
        const { count: unverifiedRiders } = await supabase.from('riders').select('*', { count: 'exact', head: true }).eq('is_verified', false);
        const { count: unverifiedProviders } = await supabase.from('service_providers').select('*', { count: 'exact', head: true }).eq('is_verified', false);
        const pendingApprovals = (unverifiedVendors || 0) + (unverifiedRiders || 0) + (unverifiedProviders || 0);

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
                services: serviceCount || 0,
                apps: pendingApprovals || 0,
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

// POST /api/admin/purge — Purge rejected events and restore stuck PENDING_APPROVAL events
router.post('/purge', async (req, res) => {
    try {
        let purgeLog = [];

        // 1. Delete all REJECTED events (cascade tiers and bookings)
        const { data: rejectedEvents } = await supabase
            .from('events')
            .select('id')
            .eq('status', 'REJECTED');

        if (rejectedEvents && rejectedEvents.length > 0) {
            const rejectedIds = rejectedEvents.map(e => e.id);
            await supabase.from('event_bookings').delete().in('event_id', rejectedIds);
            await supabase.from('event_ticket_tiers').delete().in('event_id', rejectedIds);
            const { error: delErr } = await supabase.from('events').delete().in('id', rejectedIds);
            if (delErr) throw delErr;
            purgeLog.push(`Deleted ${rejectedEvents.length} REJECTED events.`);
        } else {
            purgeLog.push('No REJECTED events to delete.');
        }

        // 2. Restore any remaining PENDING_APPROVAL events back to UPCOMING
        //    (Events stuck in pending state from the migration should be visible to buyers)
        const { data: pendingEvents, error: pendErr } = await supabase
            .from('events')
            .update({ status: 'UPCOMING' })
            .eq('status', 'PENDING_APPROVAL')
            .select('id');

        if (pendErr) throw pendErr;
        const restoredCount = pendingEvents ? pendingEvents.length : 0;
        if (restoredCount > 0) {
            purgeLog.push(`Restored ${restoredCount} PENDING_APPROVAL events to UPCOMING.`);
        } else {
            purgeLog.push('No stuck PENDING_APPROVAL events found.');
        }

        res.status(200).json({ success: true, log: purgeLog });
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
            else if (table === 'service_providers') {
                const EVENT_CATEGORIES = [
                  "Music & Concerts",
                  "Comedy & Theatre",
                  "Workshops & Classes",
                  "Parties & Nightlife",
                  "Festivals & Fairs",
                  "Sports & Fitness",
                  "Corporate & Business",
                  "Other Events"
                ];
                if (EVENT_CATEGORIES.includes(payload.category) || (existingUser && existingUser.role === 'EVENT_ORGANIZER')) {
                    userRole = 'EVENT_ORGANIZER';
                } else {
                    userRole = 'SERVICE_PROVIDER';
                }
            }

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

        // If table is events and status is updated, sync it to all sibling events
        if (table === 'events' && cleanedPayload.status && cleanedPayload.id && !String(cleanedPayload.id).startsWith('temp_')) {
            const { data: targetEvent } = await supabase.from('events').select('title, category, created_by').eq('id', cleanedPayload.id).maybeSingle();
            if (targetEvent) {
                await supabase.from('events')
                    .update({ status: cleanedPayload.status })
                    .eq('title', targetEvent.title)
                    .eq('category', targetEvent.category)
                    .eq('created_by', targetEvent.created_by);
            }
        }

        // Save intercepted starting_price to event_ticket_tiers
        let ticketTiers = null;
        if (table === 'events' && payload.ticket_tiers) {
            ticketTiers = payload.ticket_tiers;
        } else if (table === 'events' && payload.event_ticket_tiers) {
            ticketTiers = payload.event_ticket_tiers;
        }

        // Save intercepted starting_price to event_ticket_tiers if no explicit ticket tiers were provided
        if (table === 'events' && ticketTiers === null && startingPrice !== null && data && data.id) {
            ticketTiers = [{
                tier_name: 'General Admission',
                price: parseFloat(startingPrice) || 0,
                total_seats: 1000,
                available_seats: 1000
            }];
        }

        if (table === 'events' && ticketTiers && data && data.id) {
            // Get existing tiers for this event
            const { data: existingTiers } = await supabase.from('event_ticket_tiers').select('id, tier_name').eq('event_id', data.id);
            const existingTiersMap = {};
            if (existingTiers) {
                existingTiers.forEach(t => { existingTiersMap[t.tier_name] = t.id; });
            }

            const incomingNames = new Set();
            for (const tier of ticketTiers) {
                const price = parseFloat(tier.price) || 0;
                const total_seats = parseInt(tier.total_seats) || 1000;
                const available_seats = tier.available_seats !== undefined ? parseInt(tier.available_seats) : total_seats;
                const tier_name = tier.tier_name || 'General Admission';
                incomingNames.add(tier_name);

                const tierPayload = {
                    event_id: data.id,
                    tier_name,
                    price,
                    total_seats,
                    available_seats
                };

                const existingId = existingTiersMap[tier_name];
                if (existingId) {
                    await supabase.from('event_ticket_tiers').update(tierPayload).eq('id', existingId);
                } else {
                    await supabase.from('event_ticket_tiers').insert([tierPayload]);
                }
            }

            // Clean up old tiers not present in the new set
            if (existingTiers) {
                for (const t of existingTiers) {
                    if (!incomingNames.has(t.tier_name)) {
                        await supabase.from('event_ticket_tiers').delete().eq('id', t.id);
                    }
                }
            }
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
        return res.status(400).json({ success: false, error: 'Table name and id are required' });
    }

    if (!ALLOWED_ADMIN_TABLES.includes(table)) {
        return res.status(400).json({ success: false, error: `Invalid table: ${table} is not whitelisted` });
    }

    try {
        // Pre-delete related references to avoid foreign key constraint errors
        if (table === 'users') {
            await supabase.from('riders').delete().eq('id', id);
            await supabase.from('vendors').delete().eq('id', id);
            await supabase.from('service_providers').delete().eq('id', id);
            await supabase.from('addresses').delete().eq('id', id);
            await supabase.from('service_bookings').delete().eq('user_id', id);
            
            const { data: userOrders } = await supabase.from('orders').select('id').eq('user_id', id);
            if (userOrders && userOrders.length > 0) {
                const orderIds = userOrders.map(o => o.id);
                await supabase.from('order_items').delete().in('order_id', orderIds);
                await supabase.from('orders').delete().in('id', orderIds);
            }
        } else if (table === 'stores') {
            await supabase.from('products').delete().eq('store_id', id);
            await supabase.from('deals').delete().eq('store_id', id);
        } else if (table === 'services') {
            await supabase.from('service_bookings').delete().eq('service_id', id);
        } else if (table === 'orders') {
            await supabase.from('order_items').delete().eq('order_id', id);
        } else if (table === 'vendors') {
            const { data: vendorStores } = await supabase.from('stores').select('id').eq('vendor_id', id);
            if (vendorStores && vendorStores.length > 0) {
                const storeIds = vendorStores.map(s => s.id);
                await supabase.from('products').delete().in('store_id', storeIds);
                await supabase.from('deals').delete().in('store_id', storeIds);
                await supabase.from('stores').delete().in('id', storeIds);
            }
        } else if (table === 'events') {
            const { data: targetEvent } = await supabase.from('events').select('title, category, created_by').eq('id', id).maybeSingle();
            if (targetEvent) {
                const { data: siblings } = await supabase.from('events')
                    .select('id')
                    .eq('title', targetEvent.title)
                    .eq('category', targetEvent.category)
                    .eq('created_by', targetEvent.created_by);
                if (siblings && siblings.length > 0) {
                    const siblingIds = siblings.map(s => s.id);
                    await supabase.from('event_bookings').delete().in('event_id', siblingIds);
                    await supabase.from('event_ticket_tiers').delete().in('event_id', siblingIds);
                    const otherSiblingIds = siblingIds.filter(sid => sid !== id);
                    if (otherSiblingIds.length > 0) {
                        await supabase.from('events').delete().in('id', otherSiblingIds);
                    }
                }
            } else {
                await supabase.from('event_bookings').delete().eq('event_id', id);
                await supabase.from('event_ticket_tiers').delete().eq('event_id', id);
            }
        }

        const { data, error } = await supabase.from(table).delete().eq('id', id).select();
        if (error) throw error;

        res.status(200).json({ success: true, data });
    } catch (error) {
        console.error(`❌ Admin Delete Error [${table}]:`, error.message);
        res.status(500).json({ success: false, error: error.message });
    }
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
            supportEmail: 'passwalaoffcial@gmail.com',
            maintenanceMode: false,
            maxDeliveryRange: 10,
            baseDeliveryFee: 30,
            freeDeliveryThreshold: 499,
            liveSync: true,
            ridePricePerKm: 8,
            shortRidePrice: 30,
            upgradeEventFee: 999,
            upgradeServiceFee: 999,
            upgradeRentalFee: 999,
            upgradeShopFee: 999
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

        // Validate: all fee/price fields must be >= 0
        const feeFields = [
            'upgradeEventFee', 'upgradeServiceFee', 'upgradeRentalFee', 'upgradeShopFee',
            'baseDeliveryFee', 'ridePricePerKm', 'shortRidePrice', 'freeDeliveryThreshold',
            'maxDeliveryRange'
        ];
        for (const field of feeFields) {
            if (settings[field] !== undefined) {
                const val = Number(settings[field]);
                if (isNaN(val) || val < 0) {
                    return res.status(400).json({ error: `${field} must be a number ≥ 0.` });
                }
                settings[field] = val; // normalize to number
            }
        }

        const settingsPath = getSettingsPath();
        await fs.writeFile(settingsPath, JSON.stringify(settings, null, 2), 'utf8');
        res.status(200).json({ success: true, settings });
    } catch (error) {
        console.error('❌ Save Settings Error:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});


// ══════════════════════════════════════════════════════════════════
// EVENT APPROVAL ROUTES (Admin Only)
// ══════════════════════════════════════════════════════════════════

// GET /api/admin/events/pending — All events awaiting approval
router.get('/events/pending', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('events')
            .select('*, event_ticket_tiers(*)')
            .eq('status', 'PENDING_APPROVAL')
            .order('created_at', { ascending: false });

        if (error) throw error;
        res.status(200).json({ success: true, events: data || [] });
    } catch (error) {
        console.error('❌ Pending Events Fetch Error:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST /api/admin/events/approve — Approve event → status = UPCOMING
router.post('/events/approve', async (req, res) => {
    try {
        const { id } = req.body;
        if (!id) return res.status(400).json({ error: 'Event ID is required' });

        if (Array.isArray(id)) {
            const { data, error } = await supabase
                .from('events')
                .update({ status: 'UPCOMING' })
                .in('id', id)
                .select();
            if (error) throw error;
            return res.status(200).json({ success: true, events: data });
        }

        const { data, error } = await supabase
            .from('events')
            .update({ status: 'UPCOMING' })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        res.status(200).json({ success: true, event: data });
    } catch (error) {
        console.error('❌ Event Approve Error:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST /api/admin/events/reject — Reject event → status = REJECTED
router.post('/events/reject', async (req, res) => {
    try {
        const { id, reason } = req.body;
        if (!id) return res.status(400).json({ error: 'Event ID is required' });

        if (Array.isArray(id)) {
            const { data, error } = await supabase
                .from('events')
                .update({ status: 'REJECTED' })
                .in('id', id)
                .select();
            if (error) throw error;
            return res.status(200).json({ success: true, events: data, reason });
        }

        const { data, error } = await supabase
            .from('events')
            .update({ status: 'REJECTED' })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        res.status(200).json({ success: true, event: data, reason });
    } catch (error) {
        console.error('❌ Event Reject Error:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST /api/admin/upgrade/approve — Approve vendor console upgrade request
router.post('/upgrade/approve', async (req, res) => {
    try {
        const { id } = req.body;
        if (!id) return res.status(400).json({ error: 'Request ID is required' });

        // 1. Fetch request details
        const { data: request, error: fetchErr } = await supabase
            .from('event_organizer_requests')
            .select('*')
            .eq('id', id)
            .single();
        if (fetchErr) throw fetchErr;

        // 2. Fetch full name from users
        const { data: userRecord } = await supabase
            .from('users')
            .select('full_name')
            .eq('id', request.user_id)
            .single();

        const targetConsole = request.target_console || 'event';

        if (targetConsole === 'event') {
            // Upsert into service_providers table (used for events category)
            const { error: spError } = await supabase
                .from('service_providers')
                .upsert({
                    user_id: request.user_id,
                    phone: request.phone,
                    full_name: userRecord?.full_name || 'Vendor Partner',
                    business_name: request.business_name,
                    category: 'Comedy & Theatre', // Default category
                    is_verified: true,
                    profile_completed: true
                }, { onConflict: 'user_id' });
            if (spError) throw spError;

            // Update role to EVENT_ORGANIZER
            const { error: userError } = await supabase
                .from('users')
                .update({ role: 'EVENT_ORGANIZER' })
                .eq('id', request.user_id);
            if (userError) throw userError;
        } else if (targetConsole === 'service') {
            // Professional Services
            const { error: spError } = await supabase
                .from('service_providers')
                .upsert({
                    user_id: request.user_id,
                    phone: request.phone,
                    full_name: userRecord?.full_name || 'Vendor Partner',
                    business_name: request.business_name,
                    category: 'Plumbing Services', 
                    is_verified: true,
                    profile_completed: true
                }, { onConflict: 'user_id' });
            if (spError) throw spError;

            // Update role to SERVICE_PROVIDER
            const { error: userError } = await supabase
                .from('users')
                .update({ role: 'SERVICE_PROVIDER' })
                .eq('id', request.user_id);
            if (userError) throw userError;
        } else if (targetConsole === 'rental') {
            // Rental & Vehicles
            const { error: spError } = await supabase
                .from('service_providers')
                .upsert({
                    user_id: request.user_id,
                    phone: request.phone,
                    full_name: userRecord?.full_name || 'Vendor Partner',
                    business_name: request.business_name,
                    category: 'Rental', 
                    is_verified: true,
                    profile_completed: true
                }, { onConflict: 'user_id' });
            if (spError) throw spError;

            // Update role to SERVICE_PROVIDER
            const { error: userError } = await supabase
                .from('users')
                .update({ role: 'SERVICE_PROVIDER' })
                .eq('id', request.user_id);
            if (userError) throw userError;
        } else if (targetConsole === 'shop') {
            // Retail Store
            const { error: vError } = await supabase
                .from('vendors')
                .upsert({
                    user_id: request.user_id,
                    phone: request.phone,
                    name: userRecord?.full_name || 'Vendor Partner',
                    business_name: request.business_name,
                    category: 'Grocery',
                    is_verified: true,
                    profile_completed: true
                }, { onConflict: 'user_id' });
            if (vError) throw vError;

            // Update role to VENDOR
            const { error: userError } = await supabase
                .from('users')
                .update({ role: 'VENDOR' })
                .eq('id', request.user_id);
            if (userError) throw userError;
        }

        // 5. Update request status to APPROVED
        const { data: updatedRequest, error: updateErr } = await supabase
            .from('event_organizer_requests')
            .update({ request_status: 'APPROVED', payment_status: 'PAID' })
            .eq('id', id)
            .select()
            .single();
        if (updateErr) throw updateErr;

        res.status(200).json({ success: true, request: updatedRequest });
    } catch (error) {
        console.error('❌ Upgrade Approve Error:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST /api/admin/upgrade/reject — Reject console upgrade request
router.post('/upgrade/reject', async (req, res) => {
    try {
        const { id } = req.body;
        if (!id) return res.status(400).json({ error: 'Request ID is required' });

        const { data, error } = await supabase
            .from('event_organizer_requests')
            .update({ request_status: 'REJECTED' })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        res.status(200).json({ success: true, request: data });
    } catch (error) {
        console.error('❌ Upgrade Reject Error:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

export default router;
