import rateLimit from 'express-rate-limit';

// Standard rate limiter for API endpoints (e.g. 100 requests per 15 minutes)
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per `windowMs`
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
