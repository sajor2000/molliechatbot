import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Ratelimit } from '@upstash/ratelimit';
import { kv } from '@vercel/kv';

/**
 * Rate Limiting Middleware using Upstash Ratelimit
 * Protects endpoints from abuse and brute force attacks
 */

// Rate limiters for different endpoints
const authRateLimiter = new Ratelimit({
  redis: kv,
  limiter: Ratelimit.slidingWindow(5, '15 m'), // 5 attempts per 15 minutes
  analytics: true,
  prefix: 'ratelimit:auth',
});

const chatRateLimiter = new Ratelimit({
  redis: kv,
  limiter: Ratelimit.slidingWindow(30, '1 m'), // 30 messages per minute
  analytics: true,
  prefix: 'ratelimit:chat',
});

const uploadRateLimiter = new Ratelimit({
  redis: kv,
  limiter: Ratelimit.slidingWindow(10, '1 h'), // 10 uploads per hour
  analytics: true,
  prefix: 'ratelimit:upload',
});

/**
 * Get client identifier from request
 * Uses X-Forwarded-For header from Vercel, falls back to X-Real-IP
 */
function getClientIdentifier(req: VercelRequest): string {
  const forwardedFor = req.headers['x-forwarded-for'];
  const realIp = req.headers['x-real-ip'];

  if (typeof forwardedFor === 'string') {
    // X-Forwarded-For can be a comma-separated list, take the first IP
    return forwardedFor.split(',')[0].trim();
  }

  if (typeof realIp === 'string') {
    return realIp;
  }

  return 'unknown';
}

/**
 * Rate limit middleware for authentication endpoints
 * 5 attempts per 15 minutes per IP
 */
export function rateLimitAuth(
  handler: (req: VercelRequest, res: VercelResponse) => Promise<void | VercelResponse>
) {
  return async (req: VercelRequest, res: VercelResponse) => {
    const identifier = getClientIdentifier(req);

    const { success, limit, reset, remaining } = await authRateLimiter.limit(identifier);

    // Set rate limit headers
    res.setHeader('X-RateLimit-Limit', limit.toString());
    res.setHeader('X-RateLimit-Remaining', remaining.toString());
    res.setHeader('X-RateLimit-Reset', new Date(reset).toISOString());

    if (!success) {
      const retryAfter = Math.ceil((reset - Date.now()) / 1000);
      res.setHeader('Retry-After', retryAfter.toString());

      return res.status(429).json({
        error: 'Too many requests',
        message: 'Too many authentication attempts. Please try again later.',
        retryAfter: retryAfter,
      });
    }

    return handler(req, res);
  };
}

/**
 * Rate limit middleware for chat endpoints
 * 30 messages per minute per IP
 */
export function rateLimitChat(
  handler: (req: VercelRequest, res: VercelResponse) => Promise<void | VercelResponse>
) {
  return async (req: VercelRequest, res: VercelResponse) => {
    const identifier = getClientIdentifier(req);

    const { success, limit, reset, remaining } = await chatRateLimiter.limit(identifier);

    // Set rate limit headers
    res.setHeader('X-RateLimit-Limit', limit.toString());
    res.setHeader('X-RateLimit-Remaining', remaining.toString());
    res.setHeader('X-RateLimit-Reset', new Date(reset).toISOString());

    if (!success) {
      const retryAfter = Math.ceil((reset - Date.now()) / 1000);
      res.setHeader('Retry-After', retryAfter.toString());

      return res.status(429).json({
        error: 'Too many requests',
        message: 'You are sending messages too quickly. Please slow down.',
        retryAfter: retryAfter,
      });
    }

    return handler(req, res);
  };
}

/**
 * Rate limit middleware for file upload endpoints
 * 10 uploads per hour per IP
 */
export function rateLimitUpload(
  handler: (req: VercelRequest, res: VercelResponse) => Promise<void | VercelResponse>
) {
  return async (req: VercelRequest, res: VercelResponse) => {
    const identifier = getClientIdentifier(req);

    const { success, limit, reset, remaining } = await uploadRateLimiter.limit(identifier);

    // Set rate limit headers
    res.setHeader('X-RateLimit-Limit', limit.toString());
    res.setHeader('X-RateLimit-Remaining', remaining.toString());
    res.setHeader('X-RateLimit-Reset', new Date(reset).toISOString());

    if (!success) {
      const retryAfter = Math.ceil((reset - Date.now()) / 1000);
      res.setHeader('Retry-After', retryAfter.toString());

      return res.status(429).json({
        error: 'Too many requests',
        message: 'You have reached the upload limit. Please try again later.',
        retryAfter: retryAfter,
      });
    }

    return handler(req, res);
  };
}

/**
 * Generic rate limiter with custom configuration
 */
export function rateLimit(
  requests: number,
  window: `${number} ${'ms' | 's' | 'm' | 'h' | 'd'}`,
  handler: (req: VercelRequest, res: VercelResponse) => Promise<void | VercelResponse>
) {
  const limiter = new Ratelimit({
    redis: kv,
    limiter: Ratelimit.slidingWindow(requests, window),
    analytics: true,
  });

  return async (req: VercelRequest, res: VercelResponse) => {
    const identifier = getClientIdentifier(req);

    const { success, limit, reset, remaining } = await limiter.limit(identifier);

    res.setHeader('X-RateLimit-Limit', limit.toString());
    res.setHeader('X-RateLimit-Remaining', remaining.toString());
    res.setHeader('X-RateLimit-Reset', new Date(reset).toISOString());

    if (!success) {
      const retryAfter = Math.ceil((reset - Date.now()) / 1000);
      res.setHeader('Retry-After', retryAfter.toString());

      return res.status(429).json({
        error: 'Too many requests',
        message: 'Rate limit exceeded. Please try again later.',
        retryAfter: retryAfter,
      });
    }

    return handler(req, res);
  };
}
