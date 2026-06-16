/**
 * Simple in-memory rate limiter (sliding window counter).
 *
 * Best-effort protection against brute force on /api/auth/*.
 *
 * LIMITATIONS (acceptable for demo + single-instance Railway):
 * - In-memory: doesn't share state across multiple server instances
 * - State lost on server restart
 *
 * PRODUCTION UPGRADE: replace with Upstash Ratelimit or Redis-backed
 * counter. The interface stays the same:
 *   const rl = rateLimit(key, max, windowMs);
 *
 * @example
 *   const rl = rateLimit(`login:${email}`, 5, 15 * 60 * 1000);
 *   if (!rl.ok) throw new Error("Too many attempts");
 */

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

export interface RateLimitResult {
  ok: boolean;
  /** Number of remaining attempts in the current window. */
  remaining: number;
  /** Seconds until the window resets. Only set when ok=false. */
  retryAfter?: number;
}

export function rateLimit(
  key: string,
  max: number,
  windowMs: number
): RateLimitResult {
  const now = Date.now();
  const bucket = buckets.get(key);

  // No bucket or expired window — start fresh
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: max - 1 };
  }

  // Window still active
  if (bucket.count >= max) {
    return {
      ok: false,
      remaining: 0,
      retryAfter: Math.ceil((bucket.resetAt - now) / 1000),
    };
  }

  bucket.count++;
  return { ok: true, remaining: max - bucket.count };
}

// Cleanup expired buckets every 5 minutes (prevents memory leak)
const CLEANUP_INTERVAL = 5 * 60 * 1000;
const cleanup = setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}, CLEANUP_INTERVAL);
// Don't keep Node.js process alive just for this timer
if (typeof cleanup.unref === "function") cleanup.unref();
