import rateLimit from "express-rate-limit";

const json = (msg: string) => ({ success: false, message: msg });

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: json("Too many attempts. Please wait 15 minutes and try again."),
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
});

export const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: json("Too many registrations from this network. Please try again later."),
  standardHeaders: true,
  legacyHeaders: false,
});

// ─── Custom admin login rate limiter ─────────────────────────────────────────
// express-rate-limit's skipSuccessfulRequests only avoids counting successes —
// it does NOT reset the counter. Once the counter hits max, every request
// (including valid credentials) is blocked before the route handler runs.
// This custom implementation tracks only failed attempts and resets on success.
//
// IP resolution uses req.ip (Express trust-proxy-aware) so x-forwarded-for
// cannot be spoofed when the app sits behind a trusted reverse proxy.

const ADMIN_MAX_ATTEMPTS = 10;
const ADMIN_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const ADMIN_MAX_TRACKED_IPS = 10_000;    // safety cap against memory growth

interface FailRecord { count: number; resetAt: number }
const adminFailedAttempts = new Map<string, FailRecord>();

// Periodic sweep: evict expired entries every 5 minutes so the Map never
// accumulates unbounded state from unique/spoofed IPs.
setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of adminFailedAttempts) {
    if (now >= record.resetAt) adminFailedAttempts.delete(ip);
  }
  // Hard cap: if still too large, drop the oldest half by insertion order.
  if (adminFailedAttempts.size > ADMIN_MAX_TRACKED_IPS) {
    const excess = adminFailedAttempts.size - Math.floor(ADMIN_MAX_TRACKED_IPS / 2);
    let dropped = 0;
    for (const ip of adminFailedAttempts.keys()) {
      if (dropped >= excess) break;
      adminFailedAttempts.delete(ip);
      dropped++;
    }
  }
}, 5 * 60 * 1000).unref(); // unref so it doesn't keep the process alive

function getAdminIp(req: any): string {
  // req.ip is set by Express using the trust-proxy setting (app.set("trust proxy", 1))
  // so it correctly resolves the real client IP without being spoofable.
  return (req.ip as string | undefined) ?? req.socket?.remoteAddress ?? "unknown";
}

// adminLoginLimiter is intentionally NOT used as route middleware.
// A middleware-based check runs before credentials are verified, so a locked
// IP can never succeed even with correct credentials. Instead, the route
// handler calls recordAdminLoginFailure (on wrong creds) and
// resetAdminLoginAttempts (on success) to keep all rate-limit logic in the
// failure branch — correct credentials always pass through.
export const adminLoginLimiter = (_req: any, _res: any, next: any): void => next();

/**
 * Record a failed admin login attempt for this IP.
 * Returns the updated lock state so the caller can send the right response.
 */
export function recordAdminLoginFailure(req: any): { locked: boolean; remainingMin?: number } {
  const ip = getAdminIp(req);
  const now = Date.now();
  const record = adminFailedAttempts.get(ip);

  let newCount: number;
  let resetAt: number;

  if (!record || now >= record.resetAt) {
    newCount = 1;
    resetAt = now + ADMIN_WINDOW_MS;
  } else {
    newCount = record.count + 1;
    resetAt = record.resetAt;
  }

  adminFailedAttempts.set(ip, { count: newCount, resetAt });

  if (newCount >= ADMIN_MAX_ATTEMPTS) {
    return { locked: true, remainingMin: Math.ceil((resetAt - now) / 60_000) };
  }
  return { locked: false };
}

/** Call immediately after a successful admin login to clear any prior lock. */
export function resetAdminLoginAttempts(req: any): void {
  adminFailedAttempts.delete(getAdminIp(req));
}

export const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 300,
  message: json("Too many requests. Please slow down."),
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.path === "/api/healthz",
});
