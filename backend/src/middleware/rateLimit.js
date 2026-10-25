import rateLimit from 'express-rate-limit';

// Limits are configurable through env vars; defaults apply when a value is missing or invalid
function envInt(name, fallback) {
  const value = Number(process.env[name]);
  return Number.isInteger(value) && value > 0 ? value : fallback;
}

function waitText(ms) {
  const minutes = Math.ceil(ms / 60000);
  return minutes <= 1 ? 'a minute' : `${minutes} minutes`;
}

// Responds with 429 and a { message } body, the same shape as the app's other errors
function createLimiter({ windowMs, limit, message, keyGenerator }) {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    ...(keyGenerator && { keyGenerator }),
    handler: (req, res) => res.status(429).json({ message: `${message} Please try again in ${waitText(windowMs)}.` }),
  });
}

// Keyed by client IP since the user is not known yet
export const loginLimiter = createLimiter({
  windowMs: envInt('LOGIN_RATE_WINDOW_MS', 15 * 60 * 1000),
  limit: envInt('LOGIN_RATE_LIMIT', 5),
  message: 'Too many login attempts.',
});

// These run after requireAuth, so each shop gets its own allowance
const byUser = (req) => req.userId;

export const productCreateLimiter = createLimiter({
  windowMs: envInt('PRODUCT_CREATE_RATE_WINDOW_MS', 60 * 1000),
  limit: envInt('PRODUCT_CREATE_RATE_LIMIT', 20),
  message: 'Too many products added.',
  keyGenerator: byUser,
});

export const billCreateLimiter = createLimiter({
  windowMs: envInt('BILL_CREATE_RATE_WINDOW_MS', 60 * 1000),
  limit: envInt('BILL_CREATE_RATE_LIMIT', 30),
  message: 'Too many bills created.',
  keyGenerator: byUser,
});
