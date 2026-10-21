const WINDOW_MS = Number(process.env.LOGIN_RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000);
const MAX_ATTEMPTS = Number(process.env.LOGIN_RATE_LIMIT_MAX || 10);
const CLEANUP_INTERVAL_MS = Math.max(WINDOW_MS, 60 * 1000);

const attempts = new Map();

function getClientKey(req) {
  const ip = req.ip || req.connection?.remoteAddress || 'unknown-ip';
  const email = String(req.body?.email || '').trim().toLowerCase();
  return `${ip}:${email || 'no-email'}`;
}

function cleanupExpiredAttempts() {
  const now = Date.now();
  for (const [key, entry] of attempts.entries()) {
    if (entry.resetAt <= now) attempts.delete(key);
  }
}

setInterval(cleanupExpiredAttempts, CLEANUP_INTERVAL_MS).unref?.();

module.exports = (req, res, next) => {
  const key = getClientKey(req);
  const now = Date.now();
  const current = attempts.get(key);

  if (!current || current.resetAt <= now) {
    attempts.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return next();
  }

  current.count += 1;
  attempts.set(key, current);

  if (current.count > MAX_ATTEMPTS) {
    const retryAfterSeconds = Math.ceil((current.resetAt - now) / 1000);
    res.set('Retry-After', String(retryAfterSeconds));
    return res.status(429).json({
      message: 'Terlalu banyak percobaan login. Coba lagi beberapa menit lagi.',
      retry_after_seconds: retryAfterSeconds,
    });
  }

  next();
};
