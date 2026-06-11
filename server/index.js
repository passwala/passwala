import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import os from 'os';
import userRoutes from './routes/users.js';
import vendorRoutes from './routes/vendor.js';
import adminRoutes from './routes/admin.js';
import ridersRoutes from './routes/riders.js';
import orderRoutes from './routes/orders.js';
import aiRoutes from './routes/ai.js';
import cityRidesRoutes from './routes/city_rides.js';
import eventRoutes from './routes/events.js';
import { apiLimiter } from './utils/rateLimiter.js';
import supabase from './supabase.js';
import morgan from 'morgan';
import { sendNotification } from './utils/notifications.js';
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3004;

app.use(morgan('combined'));

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
  'https://passwala.vercel.app',
  'https://passwala.onrender.com'
];

app.use(cors({ 
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, curl, or Postman during dev)
    if (!origin) return callback(null, true);
    
    // Check if origin matches localhost, 127.0.0.1, or local network IP on any dev port
    const isLocalhostOrIP = /https?:\/\/(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+):(3000|3001|3002|3003|3004|3005)/.test(origin);
    
    // Allow exact matches, local environments, or any Vercel/localtunnel preview deployments
    const isAllowed = isLocalhostOrIP || allowedOrigins.includes(origin) || origin.endsWith('.vercel.app') || origin.endsWith('.loca.lt') || origin.endsWith('.ngrok.io') || origin.endsWith('.ngrok-free.app');
                      
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
    
    if (error) throw error;
    
    res.json({ 
      status: 'healthy', 
      database: 'connected',
      pingMs: duration,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('🔥 Database health check failed:', err.message);
    res.status(500).json({ 
      status: 'unhealthy', 
      database: 'disconnected',
      error: err.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Register Admin Portal routes first to bypass global rate limits (secured by cryptographic JWT keys)
app.use('/api/admin', adminRoutes);

// Apply Global Rate Limiting to all other /api endpoints
app.use('/api', apiLimiter);

app.use('/api/users', userRoutes);
app.use('/api/vendor', vendorRoutes);
app.use('/api/riders', ridersRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/city-rides', cityRidesRoutes);
app.use('/api/events', eventRoutes);

const routeCache = new Map();

app.get('/api/route', async (req, res) => {
  try {
    const { startLat, startLng, endLat, endLng, profile = 'driving' } = req.query;
    if (!startLat || !startLng || !endLat || !endLng) {
      return res.status(400).json({ error: 'Missing coordinates' });
    }
    const cacheKey = `${startLng},${startLat}|${endLng},${endLat}|${profile}`;
    if (routeCache.has(cacheKey)) {
      const cached = routeCache.get(cacheKey);
      if (Date.now() - cached.timestamp < 30 * 60 * 1000) {
        return res.json(cached.data);
      } else {
        routeCache.delete(cacheKey);
      }
    }
    const url = `https://router.project-osrm.org/route/v1/${profile}/${startLng},${startLat};${endLng},${endLat}?overview=full&geometries=geojson`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Passwalaa-App/1.0 (contact@passwalaa.com)'
      }
    });
    if (!response.ok) throw new Error('OSRM API failed');
    const data = await response.json();
    routeCache.set(cacheKey, { data, timestamp: Date.now() });
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

// Auto-Cancel Cron Job: Cancel orders stuck in PENDING/PLACED/ORDERED for over 15 mins
const AUTO_CANCEL_MINUTES = 15;
setInterval(async () => {
  try {
    const cutoffTime = new Date(Date.now() - AUTO_CANCEL_MINUTES * 60000).toISOString();
    
    const { data: stuckOrders, error: fetchErr } = await supabase
      .from('orders')
      .select('id, user_id')
      .in('status', ['PENDING', 'PLACED', 'ORDERED'])
      .lt('created_at', cutoffTime);

    if (fetchErr) {
      console.error('Auto-cancel fetch error:', fetchErr.message);
      return;
    }

    if (stuckOrders && stuckOrders.length > 0) {
      const orderIds = stuckOrders.map(o => o.id);
      console.log(`Auto-canceling ${orderIds.length} stuck orders...`);
      
      const { error: updateErr } = await supabase
        .from('orders')
        .update({ status: 'CANCELLED' })
        .in('id', orderIds);

      if (updateErr) {
        console.error('Auto-cancel update error:', updateErr.message);
      } else {
        console.log('Auto-canceled orders successfully:', orderIds);
        for (const order of stuckOrders) {
          if (order.user_id) {
            await sendNotification(order.user_id, 'ORDER_CANCELLED', 'Your order was cancelled (no vendor response).');
          }
        }
      }
    }
  } catch (err) {
    console.error('Auto-cancel job error:', err.message);
  }
}, 60000); // Run every 1 minute

const HOST = '0.0.0.0';
app.listen(PORT, HOST, () => {
  const localIP = getLocalIP();
  console.log(`🚀 Passwala Server running:`);
  console.log(`   - Local:   http://localhost:${PORT}`);
  console.log(`   - Network: http://${localIP}:${PORT}`);
});
