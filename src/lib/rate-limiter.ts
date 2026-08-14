/**
 * In-memory rate limiter — per user, per command, sliding window.
 * Runs inside the serverless function instance. Good enough for a single-instance
 * deployment; for multi-instance add Redis, but this already prevents the most
 * common abuse patterns (spam clicks, retry loops, flooding).
 */

interface Bucket {
  count: number;
  windowStart: number;
}

// key → { count, windowStart }
const store = new Map<string, Bucket>();

// Prune stale entries every 10 minutes to avoid memory leaks
setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of store.entries()) {
    if (now - bucket.windowStart > 5 * 60 * 1000) store.delete(key);
  }
}, 10 * 60 * 1000).unref();

export interface RateLimit {
  /** Max requests allowed in the window */
  limit: number;
  /** Window size in milliseconds */
  windowMs: number;
}

// Per-command limits — expensive AI commands get tighter limits
export const LIMITS: Record<string, RateLimit> = {
  today:       { limit: 3,  windowMs: 60_000 },   // 3/min — calls Groq
  yesterday:   { limit: 3,  windowMs: 60_000 },
  date:        { limit: 3,  windowMs: 60_000 },
  roast:       { limit: 5,  windowMs: 60_000 },   // 5/min — calls Groq
  babiometer:  { limit: 5,  windowMs: 60_000 },
  guess:       { limit: 10, windowMs: 60_000 },
  channel:     { limit: 5,  windowMs: 60_000 },
  subscribe:   { limit: 3,  windowMs: 60_000 },
  unsubscribe: { limit: 3,  windowMs: 60_000 },
  recommend:   { limit: 3,  windowMs: 60_000 },
  start:       { limit: 5,  windowMs: 60_000 },
  excuse:      { limit: 10, windowMs: 60_000 },
  default:     { limit: 15, windowMs: 60_000 },
};

/**
 * Returns true if the request is allowed, false if rate-limited.
 */
export function checkRateLimit(userId: string, command: string): boolean {
  const cfg = LIMITS[command] ?? LIMITS.default;
  const key = `${userId}:${command}`;
  const now = Date.now();

  const bucket = store.get(key);

  if (!bucket || now - bucket.windowStart >= cfg.windowMs) {
    // New window
    store.set(key, { count: 1, windowStart: now });
    return true;
  }

  if (bucket.count >= cfg.limit) return false;

  bucket.count++;
  return true;
}

/**
 * Returns seconds until the rate limit resets for a user+command.
 */
export function retryAfterSeconds(userId: string, command: string): number {
  const cfg = LIMITS[command] ?? LIMITS.default;
  const key = `${userId}:${command}`;
  const bucket = store.get(key);
  if (!bucket) return 0;
  const elapsed = Date.now() - bucket.windowStart;
  return Math.ceil((cfg.windowMs - elapsed) / 1000);
}
