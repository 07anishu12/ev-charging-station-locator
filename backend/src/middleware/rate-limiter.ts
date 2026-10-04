import type { Context, Next } from "hono";
import { RateLimitExceededError } from "../domain/errors";

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

export function createRateLimiter(options: {
  windowMs?: number;
  maxRequests?: number;
  keyGenerator?: (c: Context) => string;
} = {}) {
  const windowMs = options.windowMs || 60 * 1000; // 1 minute
  const maxRequests = options.maxRequests || 120; // 120 req / min
  const clients = new Map<string, RateLimitRecord>();

  // Cleanup old entries every 5 minutes
  setInterval(() => {
    const now = Date.now();
    for (const [key, record] of clients.entries()) {
      if (now > record.resetAt) {
        clients.delete(key);
      }
    }
  }, 5 * 60 * 1000).unref();

  return async function rateLimitMiddleware(c: Context, next: Next) {
    const key =
      options.keyGenerator?.(c) ||
      c.req.header("x-forwarded-for")?.split(",")[0].trim() ||
      c.req.header("cf-connecting-ip") ||
      "anonymous";

    const now = Date.now();
    let record = clients.get(key);

    if (!record || now > record.resetAt) {
      record = {
        count: 1,
        resetAt: now + windowMs,
      };
      clients.set(key, record);
    } else {
      record.count++;
    }

    const remaining = Math.max(0, maxRequests - record.count);
    const resetSeconds = Math.ceil((record.resetAt - now) / 1000);

    c.header("X-RateLimit-Limit", String(maxRequests));
    c.header("X-RateLimit-Remaining", String(remaining));
    c.header("X-RateLimit-Reset", String(resetSeconds));

    if (record.count > maxRequests) {
      throw new RateLimitExceededError();
    }

    await next();
  };
}
