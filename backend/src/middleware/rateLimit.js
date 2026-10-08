const { rateLimit, ipKeyGenerator } = require('express-rate-limit');

// Limits are per client IP. Behind reverse proxies the IP is only correct when
// TRUST_PROXY_HOPS matches the number of proxies (see src/app.js).
//
// A classroom usually shares one public IP, so the per-IP limits are generous and
// tunable through the environment; brute force against a single account is stopped
// by a separate, strict limit on failed logins per IP + email.

// Positive integer from the environment; 0 disables the limit
const limitFromEnv = (name, fallback) => {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 0) {
    console.warn(`⚠️  ${name}=${raw} is not a non-negative integer, using ${fallback}`);
    return fallback;
  }
  return value;
};

const limiter = ({ windowMinutes, limit, message, ...options }) => rateLimit({
  windowMs: windowMinutes * 60 * 1000,
  limit,
  skip: () => limit === 0,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: message },
  ...options
});

const registerLimiter = limiter({
  windowMinutes: 60,
  limit: limitFromEnv('RATE_LIMIT_REGISTER_PER_HOUR', 50),
  message: 'Слишком много регистраций с вашего адреса. Попробуйте позже'
});

// Flood protection: every login attempt from one IP, successful or not
const loginLimiter = limiter({
  windowMinutes: 15,
  limit: limitFromEnv('RATE_LIMIT_LOGIN_PER_15MIN', 100),
  message: 'Слишком много попыток входа с вашего адреса. Попробуйте через 15 минут'
});

// Password guessing: failed logins for one account from one IP. Other students behind
// the same IP are not affected. ipKeyGenerator groups IPv6 addresses by subnet.
const loginFailedLimiter = limiter({
  windowMinutes: 15,
  limit: limitFromEnv('RATE_LIMIT_LOGIN_FAILED_PER_15MIN', 10),
  skipSuccessfulRequests: true,
  keyGenerator: (req) => `${ipKeyGenerator(req.ip)}|${String(req.body?.email || '').trim().toLowerCase()}`,
  message: 'Слишком много неудачных попыток входа в этот аккаунт. Попробуйте через 15 минут'
});

module.exports = { loginLimiter, loginFailedLimiter, registerLimiter };
