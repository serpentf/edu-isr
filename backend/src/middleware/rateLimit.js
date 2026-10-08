const { rateLimit } = require('express-rate-limit');

// Limits are per client IP. Behind reverse proxies the IP is only correct when
// TRUST_PROXY_HOPS matches the number of proxies (see src/app.js).
const limiter = (windowMinutes, limit, message) => rateLimit({
  windowMs: windowMinutes * 60 * 1000,
  limit,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: message }
});

// Failed and successful logins count alike: brute force is the threat here
const loginLimiter = limiter(15, 10, 'Слишком много попыток входа. Попробуйте через 15 минут');
const registerLimiter = limiter(60, 5, 'Слишком много регистраций с вашего адреса. Попробуйте позже');

module.exports = { loginLimiter, registerLimiter };
