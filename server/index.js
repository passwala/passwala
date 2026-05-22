import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import os from 'os';
import userRoutes from './routes/users.js';
import vendorRoutes from './routes/vendor.js';
import adminRoutes from './routes/admin.js';
import ridersRoutes from './routes/riders.js';
import orderRoutes from './routes/orders.js';
import planetSoftwebRoutes from './routes/planetSoftweb.js';
import aiRoutes from './routes/ai.js';
import { apiLimiter } from './utils/rateLimiter.js';
import supabase from './supabase.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3004;

// CORS Security Whitelist
const allowedOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:3001',
  'http://127.0.0.1:3001',
  'http://localhost:3002',
  'http://127.0.0.1:3002',
  'http://localhost:3003',
  'http://127.0.0.1:3003',
  'http://localhost:3005',
  'http://127.0.0.1:3005',
  'https://passwala.vercel.app',
  'https://passwala.onrender.com'
];

app.use(cors({ 
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, curl, or Postman during dev)
    if (!origin) return callback(null, true);
    
    // Allow exact matches or any Vercel preview deployments
    const isAllowed = allowedOrigins.includes(origin) || origin.endsWith('.vercel.app');
                      
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
app.use('/api/planet-softweb', planetSoftwebRoutes);
app.use('/api/ai', aiRoutes);

app.get('/api/route', async (req, res) => {
  try {
    const { startLat, startLng, endLat, endLng, profile = 'driving' } = req.query;
    if (!startLat || !startLng || !endLat || !endLng) {
      return res.status(400).json({ error: 'Missing coordinates' });
    }
    const url = `http://router.project-osrm.org/route/v1/${profile}/${startLng},${startLat};${endLng},${endLat}?overview=full&geometries=geojson`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('OSRM API failed');
    const data = await response.json();
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
    const isLocal = !clientIp || clientIp === '127.0.0.1' || clientIp === '::1' || clientIp.startsWith('10.') || clientIp.startsWith('192.168.') || clientIp.startsWith('172.16.');
    const url = isLocal ? 'https://freeipapi.com/api/json' : `https://freeipapi.com/api/json/${clientIp}`;
    const response = await fetch(url);
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

const HOST = '0.0.0.0';
app.listen(PORT, HOST, () => {
  const localIP = getLocalIP();
  console.log(`🚀 Passwala Server running:`);
  console.log(`   - Local:   http://localhost:${PORT}`);
  console.log(`   - Network: http://${localIP}:${PORT}`);
});
