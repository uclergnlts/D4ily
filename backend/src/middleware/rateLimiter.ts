import { Context, Next } from 'hono';
import { logger } from '../config/logger.js';

interface RateLimitEntry {
    count: number;
    resetTime: number;
}

// In-memory store for rate limiting
const rateLimitStore = new Map<string, RateLimitEntry>();

// Cleanup old entries every 5 minutes
setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of rateLimitStore.entries()) {
        if (entry.resetTime < now) {
            rateLimitStore.delete(key);
        }
    }
}, 5 * 60 * 1000);

interface RateLimitOptions {
    windowMs: number;      // Time window in milliseconds
    max: number;           // Max requests per window
    keyGenerator?: (c: Context) => string;  // Custom key generator
    message?: string;      // Custom error message
}

/**
 * Rate limiting middleware for Hono
 */
export function rateLimiter(options: RateLimitOptions) {
    const {
        windowMs,
        max,
        keyGenerator = (c) => {
            // Use IP address or user ID as key
            const user = c.get('user') as { uid?: string } | undefined;
            const ip = c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || 'unknown';
            return user?.uid || ip;
        },
        message = 'Too many requests, please try again later',
    } = options;

    return async (c: Context, next: Next) => {
        const key = keyGenerator(c);
        const now = Date.now();

        let entry = rateLimitStore.get(key);

        if (!entry || entry.resetTime < now) {
            // Create new entry
            entry = {
                count: 1,
                resetTime: now + windowMs,
            };
            rateLimitStore.set(key, entry);
        } else {
            entry.count++;
        }

        // Set rate limit headers
        const remaining = Math.max(0, max - entry.count);
        const reset = Math.ceil(entry.resetTime / 1000);

        c.header('X-RateLimit-Limit', max.toString());
        c.header('X-RateLimit-Remaining', remaining.toString());
        c.header('X-RateLimit-Reset', reset.toString());

        if (entry.count > max) {
            logger.warn({ key, count: entry.count }, 'Rate limit exceeded');

            c.header('Retry-After', Math.ceil((entry.resetTime - now) / 1000).toString());

            return c.json({
                success: false,
                error: message,
            }, 429);
        }

        await next();
    };
}

// Pre-configured rate limiters for common use cases
export const apiRateLimiter = rateLimiter({
    windowMs: 60 * 1000,  // 1 minute
    max: 100,             // 100 requests per minute
});

export const authRateLimiter = rateLimiter({
    windowMs: 15 * 60 * 1000,  // 15 minutes
    max: 10,                    // 10 attempts per 15 minutes
    message: 'Too many authentication attempts, please try again later',
});

export const scrapeRateLimiter = rateLimiter({
    windowMs: 60 * 1000,  // 1 minute
    max: 5,               // 5 scrape requests per minute
    message: 'Too many scrape requests, please wait',
});

export const voteRateLimiter = rateLimiter({
    windowMs: 60 * 1000,  // 1 minute
    max: 30,              // 30 votes per minute
    message: 'Too many votes, please slow down',
});
