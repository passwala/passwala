/* eslint-disable */
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import userRoutes from './routes/users.js';
import vendorRoutes from './routes/vendor.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3004;

// Middleware
app.use(cors({ origin: '*' }));
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
      status: '/health'
    }
  });
});

app.get('/health', (req, res) => res.json({ status: 'healthy', database: 'connected' }));

import ridersRoutes from './routes/riders.js';
app.use('/api/users', userRoutes);
app.use('/api/vendor', vendorRoutes);
app.use('/api/riders', ridersRoutes);

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    path: req.originalUrl,
    message: 'The requested endpoint does not exist. Check / for documentation.'
  });
});

// Error Handler
app.use((err, req, res, next) => {
  console.error('🔥 Server Error:', err.stack);
  res.status(err.status || 500).json({ 
    error: 'Backend Failure', 
    message: err.message || 'Internal Server Error'
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Passwala Server running on http://localhost:${PORT}`);
});
