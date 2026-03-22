const rateLimit = require('express-rate-limit');

function createLimiter({ windowMs, max }) {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests, please try again later' },
  });
}

const FIFTEEN_MINUTES = 15 * 60 * 1000;

const apiLimiter = createLimiter({ windowMs: FIFTEEN_MINUTES, max: 1000 });
const authLimiter = createLimiter({ windowMs: FIFTEEN_MINUTES, max: 20 });

module.exports = { createLimiter, apiLimiter, authLimiter };
