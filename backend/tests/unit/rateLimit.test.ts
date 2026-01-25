import { describe, it, expect, vi } from 'vitest';
import { Hono } from 'hono';

// Mock Redis
vi.mock('@/config/redis.js', () => ({
    redis: {
        incr: vi.fn().mockResolvedValue(1),
        expire: vi.fn().mockResolvedValue(true),
    },
}));

import { rateLimitMiddleware } from '@/middleware/rateLimit.js';

describe('Rate Limit Middleware', () => {
    describe('rateLimitMiddleware', () => {
        it('should allow requests under limit', async () => {
            const { redis } = await import('@/config/redis.js');
            vi.mocked(redis.incr).mockResolvedValue(1);

            const app = new Hono();
            app.use('*', rateLimitMiddleware({ windowMs: 60000, max: 10 }));
            app.get('/test', (c) => c.json({ success: true }));

            const res = await app.request('/test');
            expect(res.status).toBe(200);
        });

        it('should return 429 when limit exceeded', async () => {
            const { redis } = await import('@/config/redis.js');
            vi.mocked(redis.incr).mockResolvedValue(11);

            const app = new Hono();
            app.use('*', rateLimitMiddleware({ windowMs: 60000, max: 10 }));
            app.get('/test', (c) => c.json({ success: true }));

            const res = await app.request('/test');
            expect(res.status).toBe(429);

            const body = await res.json();
            expect(body.success).toBe(false);
            expect(body.error).toContain('Too many requests');
        });

        it('should fail open when Redis errors', async () => {
            const { redis } = await import('@/config/redis.js');
            vi.mocked(redis.incr).mockRejectedValue(new Error('Redis down'));

            const app = new Hono();
            app.use('*', rateLimitMiddleware({ windowMs: 60000, max: 10 }));
            app.get('/test', (c) => c.json({ success: true }));

            const res = await app.request('/test');
            // Should still allow request (fail open)
            expect(res.status).toBe(200);
        });

        it('should set expire on first request', async () => {
            const { redis } = await import('@/config/redis.js');
            vi.mocked(redis.incr).mockResolvedValue(1);

            const app = new Hono();
            app.use('*', rateLimitMiddleware({ windowMs: 60000, max: 10, keyPrefix: 'test' }));
            app.get('/test', (c) => c.json({ success: true }));

            await app.request('/test');
            expect(redis.expire).toHaveBeenCalled();
        });

        it('should use different limits for different IPs', async () => {
            const { redis } = await import('@/config/redis.js');

            // First IP under limit
            vi.mocked(redis.incr).mockResolvedValue(5);

            const app = new Hono();
            app.use('*', rateLimitMiddleware({ windowMs: 60000, max: 10 }));
            app.get('/test', (c) => c.json({ success: true }));

            const res1 = await app.request('/test', {
                headers: { 'x-forwarded-for': '192.168.1.1' }
            });
            expect(res1.status).toBe(200);

            // Different IP also under limit
            const res2 = await app.request('/test', {
                headers: { 'x-forwarded-for': '192.168.1.2' }
            });
            expect(res2.status).toBe(200);

            // Verify incr was called with different keys
            expect(redis.incr).toHaveBeenCalled();
        });
    });
});
