import { createMiddleware } from 'hono/factory';
import { redis } from '../config/redis.js';

export const rateLimitMiddleware = (options: {
    windowMs: number;
    max: number;
    keyPrefix?: string;
}) => {
    return createMiddleware(async (c, next) => {
        const ip = c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || 'unknown';
        const key = `${options.keyPrefix || 'rate-limit'}:${ip}`;

        try {
            const current = await redis.incr(key);

            if (current === 1) {
                await redis.expire(key, Math.floor(options.windowMs / 1000));
            }

            if (current > options.max) {
                return c.json({
                    success: false,
                    error: 'Too many requests, please try again later.',
                }, 429);
            }

            await next();
        } catch (error) {
            // If Redis fails, allow the request (fail open)
            await next();
        }
    });
};

// Predefined rate limiters
export const apiLimiter = rateLimitMiddleware({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 300, // Increased from 100 to 300 for better mobile app experience
    keyPrefix: 'api',
});

export const searchLimiter = rateLimitMiddleware({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 20,
    keyPrefix: 'search',
});
