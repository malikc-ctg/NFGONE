import { NextResponse } from 'next/server';

/**
 * Simple in-memory rate limiter for API routes.
 * Note: This resets on server restart and is per-instance (not shared across
 * Vercel serverless functions). For production-grade rate limiting, use
 * Vercel's WAF or Upstash Redis.
 *
 * Usage:
 *   const limited = rateLimit(request, { maxRequests: 20, windowMs: 60_000 });
 *   if (limited) return limited;
 */

interface RateLimitOptions {
  maxRequests?: number;  // Max requests per window (default: 30)
  windowMs?: number;     // Window duration in ms (default: 60_000 = 1 min)
}

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

// In-memory store keyed by IP
const store = new Map<string, RateLimitEntry>();

// Cleanup stale entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  Array.from(store.entries()).forEach(([key, entry]) => {
    if (now > entry.resetAt) store.delete(key);
  });
}, 5 * 60_000);

export function rateLimit(
  request: Request,
  options: RateLimitOptions = {}
): NextResponse | null {
  const { maxRequests = 30, windowMs = 60_000 } = options;

  // Extract IP from headers (Vercel sets x-forwarded-for)
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded?.split(',')[0]?.trim() || 'unknown';
  const key = `${ip}:${new URL(request.url).pathname}`;

  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now > entry.resetAt) {
    // New window
    store.set(key, { count: 1, resetAt: now + windowMs });
    return null;
  }

  entry.count++;

  if (entry.count > maxRequests) {
    const retryAfterSec = Math.ceil((entry.resetAt - now) / 1000);
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(retryAfterSec),
          'X-RateLimit-Limit': String(maxRequests),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(Math.ceil(entry.resetAt / 1000)),
        },
      }
    );
  }

  return null;
}
