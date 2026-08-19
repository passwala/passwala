// Fix #1: dotenv MUST be imported before any other module that reads process.env.
// In ESM, static imports are hoisted — supabase.js & notifications.js read process.env
// at module load time, so dotenv.config() on line 18 is already too late.
// Render redeployment trigger: sync latest backend endpoints
import 'dotenv/config';
import dns from 'dns';
dns.setDefaultResultOrder('ipv4first');

import express from 'express';
import compression from 'compression';
import cors from 'cors';
import os from 'os';
import fs from 'fs/promises';
import path from 'path';
import userRoutes from './routes/users.js';
import vendorRoutes from './routes/vendor.js';
import adminRoutes from './routes/admin.js';
import ridersRoutes from './routes/riders.js';
import orderRoutes from './routes/orders.js';
import aiRoutes from './routes/ai.js';
import cityRidesRoutes from './routes/city_rides.js';
import eventRoutes from './routes/events.js';
import promoRoutes from './routes/promo.js';
import sportsRoutes from './routes/sports.js';
import ratingsRoutes from './routes/ratings.js';
import { apiLimiter, adminLimiter } from './utils/rateLimiter.js';
import supabase from './supabase.js';
import morgan from 'morgan';
import { sendNotification } from './utils/notifications.js';

const app = express();
app.use(compression());
// Enable trust proxy to correctly obtain client IP address behind reverse proxies (Render, Vercel, etc.)
app.set('trust proxy', 1);

const PORT = process.env.PORT || 3004;
const isDev = process.env.NODE_ENV !== 'production';

// Fix #6: Use concise 'dev' format locally; 'combined' only in production
app.use(morgan(isDev ? 'dev' : 'combined'));

// CORS Security Whitelist
const allowedOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'https://localhost:3000',
  'http://localhost:3001',
  'http://127.0.0.1:3001',
  'https://localhost:3001',
  'http://localhost:3002',
  'http://127.0.0.1:3002',
  'https://localhost:3002',
  'http://localhost:3003',
  'http://127.0.0.1:3003',
  'https://localhost:3003',
  'http://localhost:3005',
  'http://127.0.0.1:3005',
  'https://localhost:3005',
  'http://localhost:4000',
  'https://localhost:4000',
  'http://localhost:4001',
  'https://localhost:4001',
  'http://localhost:4002',
  'https://localhost:4002',
  'http://localhost:4003',
  'https://localhost:4003',
  'http://localhost:4005',
  'https://localhost:4005',
  'https://passwala.vercel.app',
  'https://passwala.onrender.com'
];

app.use(cors({ 
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, curl, or Postman during dev)
    if (!origin) return callback(null, true);
    
    // Check if origin matches localhost, 127.0.0.1, or local network IP on any dev port
    const isLocalhostOrIP = /https?:\/\/(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+):(3000|3001|3002|3003|3004|3005)/.test(origin);
    
    // Fix #8: ngrok/localtunnel ONLY allowed in development, not production
    const isDevTunnel = isDev && (
      origin.endsWith('.ngrok.io') || 
      origin.endsWith('.ngrok-free.app') || 
      origin.endsWith('.loca.lt')
    );

    const isAllowed = isLocalhostOrIP || allowedOrigins.includes(origin) || origin.endsWith('.vercel.app') || isDevTunnel;
                      
    if (isAllowed) {
      callback(null, true);
    } else {
      callback(new Error('Blocked by CORS strategy'));
    }
  },
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Routes
app.get('/', (req, res) => {
  res.json({
    status: 'online',
    system: 'Passwala Digital Backend v2.0',
    timestamp: new Date().toISOString(),
    endpoints: {
      users: '/api/users',
      vendor: '/api/vendor',
      riders: '/api/riders',
      admin: '/api/admin',
      status: '/health'
    }
  });
});

app.get('/health', async (req, res) => {
  try {
    const start = Date.now();
    const { error } = await supabase.from('users').select('id').limit(1);
    const duration = Date.now() - start;
    
    if (error) {
      return res.status(500).json({ 
        status: 'unhealthy', 
        database: 'disconnected',
        supabaseError: {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        },
        timestamp: new Date().toISOString()
      });
    }
    
    res.json({ 
      status: 'healthy', 
      database: 'connected',
      pingMs: duration,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('🔥 Database health check failed:', err);
    res.status(500).json({ 
      status: 'unhealthy', 
      database: 'disconnected',
      error: err.message,
      cause: err.cause ? { message: err.cause.message, code: err.cause.code } : null,
      stack: err.stack,
      timestamp: new Date().toISOString()
    });
  }
});

// Admin routes use a dedicated limiter (200 req/min — dashboard makes ~11 parallel fetches on mount)
app.use('/api/admin', adminLimiter, adminRoutes);

// PUBLIC: Platform settings (non-sensitive fields only — fees, delivery config, ride pricing)
// Used by VendorPortal, ride booking, etc. — no auth required
let cachedPlatformSettings = null;
let cachedSettingsTimestamp = 0;
const SETTINGS_CACHE_DURATION = 60 * 1000; // Cache settings for 1 minute

app.get('/api/platform-settings', async (req, res) => {
  const now = Date.now();
  if (cachedPlatformSettings && (now - cachedSettingsTimestamp < SETTINGS_CACHE_DURATION)) {
    return res.json(cachedPlatformSettings);
  }

  const settingsPath = process.cwd().endsWith('server')
    ? path.join(process.cwd(), 'platform_settings.json')
    : path.join(process.cwd(), 'server', 'platform_settings.json');

  const defaults = {
    maxDeliveryRange: 10,
    baseDeliveryFee: 30,
    freeDeliveryThreshold: 499,
    ridePricePerKm: 8,
    shortRidePrice: 30,
    upgradeEventFee: 999,
    upgradeServiceFee: 999,
    upgradeRentalFee: 999,
    upgradeShopFee: 999,
    eventPlatformFee: 5
  };

  try {
    const fileData = await fs.readFile(settingsPath, 'utf8');
    const saved = JSON.parse(fileData);
    // Only expose public/non-sensitive keys
    const publicSettings = { ...defaults };
    const publicKeys = Object.keys(defaults);
    publicKeys.forEach(k => { if (saved[k] !== undefined) publicSettings[k] = saved[k]; });
    
    cachedPlatformSettings = { success: true, settings: publicSettings };
    cachedSettingsTimestamp = now;
    res.json(cachedPlatformSettings);
  } catch {
    cachedPlatformSettings = { success: true, settings: defaults };
    cachedSettingsTimestamp = now;
    res.json(cachedPlatformSettings);
  }
});

// Apply Global Rate Limiting to all other /api endpoints
app.use('/api', apiLimiter);

app.use('/api/users', userRoutes);
app.use('/api/vendor', vendorRoutes);
app.use('/api/riders', ridersRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/city-rides', cityRidesRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/promo', promoRoutes);
app.use('/api/sports', sportsRoutes);
app.use('/api/ratings', ratingsRoutes);

// Fix #13: Bounded route cache with max 500 entries to prevent memory leak
const ROUTE_CACHE_MAX = 500;
const routeCache = new Map();
const _routeCacheAdd = (key, value) => {
  if (routeCache.size >= ROUTE_CACHE_MAX) {
    // Evict the oldest entry (first inserted key in Map iteration order)
    routeCache.delete(routeCache.keys().next().value);
  }
  routeCache.set(key, value);
};

// Fix #3: Allowlist profile values to prevent URL path injection into OSRM requests
const ALLOWED_OSRM_PROFILES = new Set(['driving', 'walking', 'cycling']);

app.get('/api/route', async (req, res) => {
  try {
    const { startLat, startLng, endLat, endLng, profile = 'driving' } = req.query;
    if (!startLat || !startLng || !endLat || !endLng) {
      return res.status(400).json({ error: 'Missing coordinates' });
    }
    // Fix #3: Reject unknown profiles — only allow 'driving', 'walking', 'cycling'
    const safeProfile = ALLOWED_OSRM_PROFILES.has(profile) ? profile : 'driving';

    const cacheKey = `${startLng},${startLat}|${endLng},${endLat}|${safeProfile}`;
    if (routeCache.has(cacheKey)) {
      const cached = routeCache.get(cacheKey);
      if (Date.now() - cached.timestamp < 30 * 60 * 1000) {
        return res.json(cached.data);
      } else {
        routeCache.delete(cacheKey);
      }
    }
    const url = `https://router.project-osrm.org/route/v1/${safeProfile}/${startLng},${startLat};${endLng},${endLat}?overview=full&geometries=geojson`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Passwalaa-App/1.0 (contact@passwalaa.com)'
      }
    });
    if (!response.ok) throw new Error('OSRM API failed');
    const data = await response.json();
    _routeCacheAdd(cacheKey, { data, timestamp: Date.now() });
    res.json(data);
  } catch (err) {
    console.error('Routing failed:', err.message);
    res.status(500).json({ error: 'Routing failed' });
  }
});

app.get('/api/ip-location', async (req, res) => {
  try {
    let clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    if (clientIp) {
      clientIp = clientIp.split(',')[0].trim();
      if (clientIp.startsWith('::ffff:')) {
        clientIp = clientIp.substring(7);
      }
    }
    const isLocal = !clientIp || clientIp === '127.0.0.1' || clientIp === '::1' ||
      clientIp.startsWith('10.') || clientIp.startsWith('192.168.') || clientIp.startsWith('172.16.') ||
      clientIp.startsWith('fd') || clientIp.startsWith('fe80');

    // 🔒 Private/local IPs cannot be geolocated by any IP API.
    // Calling freeipapi without an IP returns the SERVER's city — completely wrong for the user.
    // Return a flag so the frontend knows to ask the user to enable GPS or select manually.
    if (isLocal) {
      return res.json({
        isLocal: true,
        cityName: 'Ahmedabad',
        regionName: 'Gujarat',
        countryCode: 'IN',
        latitude: '23.0225',
        longitude: '72.5714',
        message: 'Local network detected — GPS or manual selection recommended for accurate location'
      });
    }

    const url = `https://freeipapi.com/api/json/${clientIp}`;
    const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!response.ok) throw new Error('FreeIPAPI failed');
    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error('IP Geolocation failed:', err.message);
    res.status(500).json({ error: 'IP Geolocation failed' });
  }
});

// Fix #1: Production error logging endpoint — called by App.jsx ErrorBoundary
global.clientErrors = global.clientErrors || [];

app.post('/api/log-error', (req, res) => {
  const { message, stack, component } = req.body || {};
  if (message) {
    const errorLog = {
      message,
      component: component || 'unknown',
      stack: stack || 'no stack',
      timestamp: new Date().toISOString()
    };
    console.error('[ClientError]', errorLog);
    global.clientErrors.unshift(errorLog);
    if (global.clientErrors.length > 20) {
      global.clientErrors.pop();
    }
  }
  res.status(204).end();
});

app.get('/api/client-errors', (req, res) => {
  res.json({ success: true, errors: global.clientErrors });
});

// ─── WhatsApp QR Connect Page ───────────────────────────────────────────────
// Open http://localhost:3004/whatsapp-connect in your browser, scan the QR
// with your WhatsApp (Linked Devices) ONCE — then all OTPs will work.
app.get('/whatsapp-connect', async (req, res) => {
  const EVOLUTION_URL = (process.env.EVOLUTION_API_URL || '').replace(/\/+$/, '');
  const INSTANCE     = process.env.EVOLUTION_INSTANCE || 'Keval';
  const API_KEY      = process.env.EVOLUTION_API_KEY  || '';

  if (!EVOLUTION_URL || !API_KEY) {
    return res.status(500).send('<h2>EVOLUTION_API_URL or EVOLUTION_API_KEY not set in .env</h2>');
  }

  // Get current state
  let state = 'unknown';
  let qrBase64 = null;
  let statusMsg = '';

  try {
    const stateRes = await fetch(`${EVOLUTION_URL}/instance/connectionState/${INSTANCE}`, {
      headers: { apikey: API_KEY }
    });
    const stateData = await stateRes.json();
    state = stateData?.instance?.state || 'unknown';
  } catch (e) {
    statusMsg = `Connection state check failed: ${e.message}`;
  }

  if (state === 'open') {
    // Already connected — show success
    return res.send(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>WhatsApp Connected</title>
    <style>body{font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;background:#f0fdf4;margin:0;}
    .box{background:white;padding:3rem;border-radius:16px;text-align:center;box-shadow:0 4px 24px rgba(0,0,0,.1);}
    h2{color:#16a34a;} p{color:#555;}</style></head><body>
    <div class="box"><div style="font-size:4rem">✅</div><h2>WhatsApp Connected!</h2>
    <p>Instance <strong>${INSTANCE}</strong> is active and sending messages.</p>
    <p style="color:#888;font-size:.85rem">State: <strong>open</strong></p></div></body></html>`);
  }

  // Get QR code
  try {
    const qrRes = await fetch(`${EVOLUTION_URL}/instance/connect/${INSTANCE}`, {
      headers: { apikey: API_KEY }
    });
    const qrData = await qrRes.json();
    if (qrData?.base64) {
      qrBase64 = qrData.base64.startsWith('data:') ? qrData.base64 : `data:image/png;base64,${qrData.base64}`;
    } else {
      statusMsg = `QR fetch response: ${JSON.stringify(qrData)}`;
    }
  } catch (e) {
    statusMsg = `QR fetch failed: ${e.message}`;
  }

  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta http-equiv="refresh" content="20">
  <title>Passwala — WhatsApp Connect</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
           background: linear-gradient(135deg,#0f172a,#1e293b); min-height: 100vh;
           display: flex; align-items: center; justify-content: center; padding: 2rem; }
    .card { background: white; border-radius: 20px; padding: 2.5rem;
            max-width: 420px; width: 100%; text-align: center;
            box-shadow: 0 25px 60px rgba(0,0,0,.4); }
    .logo { width: 72px; height: 72px; border-radius: 16px; margin: 0 auto 1.5rem; }
    h1 { font-size: 1.4rem; color: #0f172a; margin-bottom: .5rem; }
    p  { color: #64748b; font-size: .9rem; line-height: 1.5; margin-bottom: 1.5rem; }
    .qr-wrapper { background: #f8fafc; border: 2px solid #e2e8f0; border-radius: 16px;
                  padding: 1rem; margin-bottom: 1.5rem; }
    .qr-wrapper img { width: 100%; max-width: 280px; border-radius: 8px; }
    .state-badge { display: inline-block; background: #fef3c7; color: #92400e;
                   font-size: .75rem; font-weight: 700; padding: 4px 12px;
                   border-radius: 100px; text-transform: uppercase; letter-spacing: .08em; margin-bottom: 1.25rem; }
    .steps { text-align: left; background: #f8fafc; border-radius: 12px;
             padding: 1rem 1.25rem; font-size: .85rem; color: #475569; line-height: 1.8; }
    .steps strong { color: #0f172a; }
    .refresh-note { margin-top: 1rem; color: #94a3b8; font-size: .78rem; }
    .err { background: #fef2f2; border: 1px solid #fca5a5; border-radius: 8px;
           padding: .75rem; color: #dc2626; font-size: .8rem; margin-bottom: 1rem; word-break: break-word; }
  </style>
</head>
<body>
  <div class="card">
    <img src="/logo.png" alt="Passwala" class="logo" onerror="this.style.display='none'" />
    <h1>Connect WhatsApp</h1>
    <p>Scan this QR code once using <strong>WhatsApp → Linked Devices → Link a Device</strong>.<br>
       After scanning, real-time OTPs will be delivered instantly.</p>
    <span class="state-badge">Status: ${state}</span>
    ${statusMsg ? `<div class="err">${statusMsg}</div>` : ''}
    ${qrBase64
      ? `<div class="qr-wrapper"><img src="${qrBase64}" alt="WhatsApp QR Code" /></div>`
      : `<div class="err">Could not load QR code. Instance: <strong>${INSTANCE}</strong> at ${EVOLUTION_URL}</div>`
    }
    <div class="steps">
      <strong>Steps to connect:</strong><br>
      1. Open WhatsApp on your phone<br>
      2. Tap ⋮ Menu → <strong>Linked Devices</strong><br>
      3. Tap <strong>Link a Device</strong><br>
      4. Point camera at QR code above<br>
      5. This page auto-refreshes every 20s
    </div>
    <p class="refresh-note">⟳ Auto-refreshing every 20 seconds &nbsp;·&nbsp; Instance: <strong>${INSTANCE}</strong></p>
  </div>
</body>
</html>`);
});

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    path: req.originalUrl,
    message: 'The requested endpoint does not exist. Check / for documentation.'
  });
});

// Error Handler
app.use((err, req, res, _next) => {
  console.error('🔥 Server Error:', err.stack);
  res.status(err.status || 500).json({ 
    error: 'Backend Failure', 
    message: err.message || 'Internal Server Error'
  });
});

// Helper to get local IP
const getLocalIP = () => {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) return iface.address;
    }
  }
  return 'localhost';
};

// Fix #10: Auto-Cancel Cron with circuit-breaker backoff
// Suspends itself after MAX_CANCEL_FAILURES consecutive DB errors to prevent log floods.
const AUTO_CANCEL_MINUTES = 15;
let _cancelJobFailures = 0;
const MAX_CANCEL_FAILURES = 5;

setInterval(async () => {
  // Circuit breaker: stop executing after too many consecutive failures
  if (_cancelJobFailures >= MAX_CANCEL_FAILURES) {
    if (_cancelJobFailures === MAX_CANCEL_FAILURES) {
      console.error('[AutoCancel] SUSPENDED after 5 consecutive failures. Check Supabase connection.');
      _cancelJobFailures++; // go past threshold so this log only fires once
    }
    return;
  }

  try {
    const cutoffTime = new Date(Date.now() - AUTO_CANCEL_MINUTES * 60000).toISOString();
    
    const { data: stuckOrders, error: fetchErr } = await supabase
      .from('orders')
      .select('id, user_id')
      .in('status', ['PENDING', 'PLACED', 'ORDERED'])
      .lt('created_at', cutoffTime);

    if (fetchErr) {
      _cancelJobFailures++;
      console.error(`[AutoCancel] Fetch error (${_cancelJobFailures}/${MAX_CANCEL_FAILURES}):`, fetchErr.message);
      return;
    }

    _cancelJobFailures = 0; // reset on successful DB contact

    if (stuckOrders && stuckOrders.length > 0) {
      const orderIds = stuckOrders.map(o => o.id);
      console.log(`[AutoCancel] Canceling ${orderIds.length} stuck order(s)...`);
      
      const { error: updateErr } = await supabase
        .from('orders')
        .update({ status: 'CANCELLED' })
        .in('id', orderIds);

      if (updateErr) {
        console.error('[AutoCancel] Update error:', updateErr.message);
      } else {
        console.log('[AutoCancel] Canceled orders:', orderIds);
        for (const order of stuckOrders) {
          if (order.user_id) {
            await sendNotification(order.user_id, 'ORDER_CANCELLED', 'Your order was cancelled (no vendor response).');
          }
        }
      }
    }
  } catch (err) {
    _cancelJobFailures++;
    console.error(`[AutoCancel] Unexpected error (${_cancelJobFailures}/${MAX_CANCEL_FAILURES}):`, err.message);
  }
}, 60000); // Run every 1 minute

const HOST = '0.0.0.0';
app.listen(PORT, HOST, () => {
  const localIP = getLocalIP();
  console.log(`🚀 Passwala Server running:`);
  console.log(`   - Local:   http://localhost:${PORT}`);
  console.log(`   - Network: http://${localIP}:${PORT}`);
});
