// Simple in-memory fixed-window rate limiter for auth endpoints (register,
// token issuance, credentials login) to blunt credential stuffing / brute
// force attempts.
//
// CAVEAT: this state lives in the Node process's memory only. On serverless
// platforms (e.g. Vercel) each cold start gets a fresh map, and traffic can
// be spread across multiple concurrent instances that don't share this
// state — so a determined attacker distributing requests across instances
// or waiting out cold starts can exceed the nominal limit. This is still a
// meaningful improvement over no rate limiting at all (it stops the common
// case of a single script hammering one endpoint), but it is NOT a
// substitute for a shared store (e.g. Redis/Upstash) if stronger guarantees
// are needed later.

type Bucket = { count: number; resetAt: number }

const buckets = new Map<string, Bucket>()

// Periodically drop expired buckets so the map doesn't grow unbounded for
// long-running processes.
let lastSweep = Date.now()
function sweep(now: number) {
  if (now - lastSweep < 60_000) return
  lastSweep = now
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key)
  }
}

export function getClientIp(req: Request): string {
  const forwardedFor = req.headers.get('x-forwarded-for')
  if (forwardedFor) return forwardedFor.split(',')[0].trim()
  const realIp = req.headers.get('x-real-ip')
  if (realIp) return realIp.trim()
  return 'unknown'
}

/**
 * Fixed-window rate limiter. Returns whether the request is allowed, plus
 * how many seconds until the window resets (useful for a Retry-After
 * header).
 */
export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): { allowed: boolean; retryAfterSeconds: number } {
  const now = Date.now()
  sweep(now)

  const bucket = buckets.get(key)
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    return { allowed: true, retryAfterSeconds: 0 }
  }

  if (bucket.count >= limit) {
    return { allowed: false, retryAfterSeconds: Math.ceil((bucket.resetAt - now) / 1000) }
  }

  bucket.count += 1
  return { allowed: true, retryAfterSeconds: 0 }
}
