import { NextResponse } from 'next/server';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

/**
 * Rate limiter for API routes.
 * Uses Upstash Redis for global rate limiting across all edge nodes if configured.
 * Automatically falls back to an in-memory Map if Redis environment variables are missing.
 *
 * Usage:
 *   const limited = await rateLimit(request, { maxRequests: 20, windowMs: 60_000 });
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

// In-memory store fallback keyed by IP
const store = new Map<string, RateLimitEntry>();

// Cleanup stale entries every 5 minutes (for in-memory fallback)
setInterval(() => {
  const now = Date.now();
  Array.from(store.entries()).forEach(([key, entry]) => {
    if (now > entry.resetAt) store.delete(key);
  });
}, 5 * 60_000);

// Initialize Upstash Redis & Ratelimit conditionally
let redis: Redis | null = null;
if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
  try {
    redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });
  } catch (error) {
    console.warn('Failed to initialize Upstash Redis, falling back to in-memory rate limiting', error);
  }
}

// Cache of Upstash Ratelimit instances keyed by window configuration
const ratelimiters = new Map<string, Ratelimit>();

export async function rateLimit(
  request: Request,
  options: RateLimitOptions = {}
): Promise<NextResponse | null> {
  const { maxRequests = 30, windowMs = 60_000 } = options;

  // Extract IP from headers (Vercel sets x-forwarded-for)
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded?.split(',')[0]?.trim() || 'unknown';
  const route = new URL(request.url).pathname;
  
  const identifier = `${ip}:${route}`;

  // If Redis is configured, use Upstash Ratelimit
  if (redis) {
    const configKey = `${maxRequests}:${windowMs}`;
    let ratelimit = ratelimiters.get(configKey);
    
    if (!ratelimit) {
      ratelimit = new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(maxRequests, `${Math.ceil(windowMs / 1000)} s`),
        analytics: true,
        prefix: '@upstash/ratelimit',
      });
      ratelimiters.set(configKey, ratelimit);
    }

    try {
      const { success, limit, remaining, reset } = await ratelimit.limit(identifier);
      
      if (!success) {
        const retryAfterSec = Math.ceil((reset - Date.now()) / 1000);
        return NextResponse.json(
          { error: 'Too many requests. Please try again later.' },
          {
            status: 429,
            headers: {
              'Retry-After': String(retryAfterSec),
              'X-RateLimit-Limit': String(limit),
              'X-RateLimit-Remaining': String(remaining),
              'X-RateLimit-Reset': String(Math.ceil(reset / 1000)),
            },
          }
        );
      }
      return null;
    } catch (error) {
      console.warn('Upstash RateLimit failed, falling back to memory limit', error);
      // Fall through to memory store if Redis request fails
    }
  }

  // --- Fallback In-Memory Rate Limiting ---
  const now = Date.now();
  const entry = store.get(identifier);

  if (!entry || now > entry.resetAt) {
    // New window
    store.set(identifier, { count: 1, resetAt: now + windowMs });
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
