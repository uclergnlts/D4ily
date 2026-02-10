import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';
import request from 'supertest';
import { serve } from '@hono/node-server';

vi.mock('@/config/logger.js', () => ({
    logger: {
        info: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
    },
}));

import { timeout, createTimeout } from '@/middleware/timeout.js';

function buildApp(timeoutMs: number, handlerDelayMs: number, message?: string) {
    const app = new Hono();
    app.use('*', timeout({ timeout: timeoutMs, message }));
    app.get('/test', async (c) => {
        await new Promise(resolve => setTimeout(resolve, handlerDelayMs));
        return c.json({ ok: true });
    });
    return app;
}

describe('timeout middleware', () => {
    beforeEach(() => vi.clearAllMocks());

    it('should pass through when handler responds in time', async () => {
        const app = buildApp(500, 10); // 500ms timeout, 10ms handler
        const server = serve({ fetch: app.fetch, port: 0 });

        try {
            const res = await request(server).get('/test');
            expect(res.status).toBe(200);
            expect(res.body).toEqual({ ok: true });
        } finally {
            server.close();
        }
    });

    it('should return 408 when handler exceeds timeout', async () => {
        const app = buildApp(50, 300); // 50ms timeout, 300ms handler
        const server = serve({ fetch: app.fetch, port: 0 });

        try {
            const res = await request(server).get('/test');
            expect(res.status).toBe(408);
            expect(res.body.success).toBe(false);
            expect(res.body.code).toBe('REQUEST_TIMEOUT');
        } finally {
            server.close();
        }
    });

    it('should include custom message in timeout response', async () => {
        const app = buildApp(50, 300, 'Custom timeout message');
        const server = serve({ fetch: app.fetch, port: 0 });

        try {
            const res = await request(server).get('/test');
            expect(res.status).toBe(408);
            expect(res.body.error).toBe('Custom timeout message');
        } finally {
            server.close();
        }
    });

    it('should use default message when none provided', async () => {
        const app = buildApp(50, 300);
        const server = serve({ fetch: app.fetch, port: 0 });

        try {
            const res = await request(server).get('/test');
            expect(res.status).toBe(408);
            expect(res.body.error).toBe('Request timeout');
        } finally {
            server.close();
        }
    });

    it('should call onTimeout callback when timeout occurs', async () => {
        const onTimeout = vi.fn();
        const app = new Hono();
        app.use('*', timeout({ timeout: 50, onTimeout }));
        app.get('/test', async (c) => {
            await new Promise(resolve => setTimeout(resolve, 300));
            return c.json({ ok: true });
        });
        const server = serve({ fetch: app.fetch, port: 0 });

        try {
            await request(server).get('/test');
            expect(onTimeout).toHaveBeenCalledOnce();
        } finally {
            server.close();
        }
    });

    it('should propagate non-timeout errors', async () => {
        const app = new Hono();
        app.use('*', timeout({ timeout: 500 }));
        app.get('/test', () => {
            throw new Error('application error');
        });
        const server = serve({ fetch: app.fetch, port: 0 });

        try {
            const res = await request(server).get('/test');
            // Hono returns 500 for unhandled errors
            expect(res.status).toBe(500);
        } finally {
            server.close();
        }
    });
});

describe('createTimeout factory', () => {
    it('should create timeout middleware with specified ms', async () => {
        const mw = createTimeout(50);
        const app = new Hono();
        app.use('*', mw);
        app.get('/test', async (c) => {
            await new Promise(resolve => setTimeout(resolve, 300));
            return c.json({ ok: true });
        });
        const server = serve({ fetch: app.fetch, port: 0 });

        try {
            const res = await request(server).get('/test');
            expect(res.status).toBe(408);
        } finally {
            server.close();
        }
    });

    it('should use custom message in createTimeout', async () => {
        const mw = createTimeout(50, 'My custom msg');
        const app = new Hono();
        app.use('*', mw);
        app.get('/test', async (c) => {
            await new Promise(resolve => setTimeout(resolve, 300));
            return c.json({ ok: true });
        });
        const server = serve({ fetch: app.fetch, port: 0 });

        try {
            const res = await request(server).get('/test');
            expect(res.body.error).toBe('My custom msg');
        } finally {
            server.close();
        }
    });
});
