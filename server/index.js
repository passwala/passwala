import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import os from 'os';
import userRoutes from './routes/users.js';
import vendorRoutes from './routes/vendor.js';
import adminRoutes from './routes/admin.js';
import ridersRoutes from './routes/riders.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3004;

// CORS Security Whitelist
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
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

app.get('/health', (req, res) => res.json({ status: 'healthy', database: 'connected' }));

app.use('/api/users', userRoutes);
app.use('/api/vendor', vendorRoutes);
app.use('/api/riders', ridersRoutes);
app.use('/api/admin', adminRoutes);

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
