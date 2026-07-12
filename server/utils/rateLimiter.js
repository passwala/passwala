import rateLimit from 'express-rate-limit';

// Standard rate limiter for API endpoints (allowing higher limit for real-time polling)
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5000, // Limit each IP to 5000 requests per `windowMs` to support real-time polling
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: {
    error: 'Too many requests',
    message: 'Too many requests from this IP. Please try again after 15 minutes.'
  }
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 30 : 100, // Limit each IP to 30 in prod, 100 in dev for testing
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many attempts',
    message: 'Too many authentication attempts from this IP. Please try again after 15 minutes.'
  }
});

// Fix: Admin dashboard makes ~11 parallel requests on mount (8 reference tables
// + stats + settings + data fetch) and re-fires on every tab switch.
// 20 req/min is an auth-endpoint limit — far too tight for a single-operator admin panel.
// Raised to 200 req/min with a clear descriptive comment.
export const adminLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 200,            // 200 requests/min per IP — admin dashboard is heavy on parallel fetches
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many admin requests, please slow down.'
  }
});
