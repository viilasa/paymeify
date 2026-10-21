/**
 * Best-effort sliding window rate limit for serverless.
 * Each instance keeps its own map — enough to blunt casual abuse of public
 * pay/report routes keyed by token + IP.
 */

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

const MAX_KEYS = 5_000;

export type RateLimitResult = {
  ok: boolean;
  remaining: number;
  retryAfterSec: number;
};

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): RateLimitResult {
  const now = Date.now();
  let bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    bucket = { count: 0, resetAt: now + windowMs };
    buckets.set(key, bucket);
    prune(now);
  }

  bucket.count += 1;
  const remaining = Math.max(0, limit - bucket.count);
  const retryAfterSec = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));

  return {
    ok: bucket.count <= limit,
    remaining,
    retryAfterSec,
  };
}

function prune(now: number) {
  if (buckets.size < MAX_KEYS) return;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
  if (buckets.size < MAX_KEYS) return;
  // Drop oldest half if still oversized.
  const keys = [...buckets.keys()].slice(0, Math.floor(buckets.size / 2));
  for (const key of keys) buckets.delete(key);
}

export function clientIp(request: Request): string {
  // Set by Vercel's edge and not client-controllable, unlike X-Forwarded-For's
  // first entry, which a caller can prepend to.
  const platform =
    request.headers.get("x-vercel-forwarded-for") ?? request.headers.get("x-real-ip");
  const fromPlatform = platform?.split(",")[0]?.trim();
  if (fromPlatform) return fromPlatform;

  // Elsewhere, the last hop was added by our own proxy.
  const forwarded = request.headers.get("x-forwarded-for");
  const last = forwarded?.split(",").at(-1)?.trim();
  return last || "unknown";
}
