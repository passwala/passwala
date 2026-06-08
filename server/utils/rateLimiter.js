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

// Stricter rate limiter for sensitive routes like auth and admin login (e.g. 10 requests per 15 minutes)
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 logins/registrations per `windowMs`
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many attempts',
    message: 'Too many authentication attempts from this IP. Please try again after 15 minutes.'
  }
});
