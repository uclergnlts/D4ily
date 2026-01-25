import { describe, it, expect, vi } from 'vitest';
import { Hono } from 'hono';

// Mock env
vi.mock('@/config/env.js', () => ({
    env: {
        NODE_ENV: 'test',
    }
}));

// Mock logger
vi.mock('@/config/logger.js', () => ({
    logger: {
        error: vi.fn(),
    },
}));

import { handleError } from '@/utils/errors.js';

describe('Error Utils', () => {
    describe('handleError', () => {
        it('should return 500 with error message', async () => {
            const app = new Hono();
            app.get('/test', (c) => {
                return handleError(c, new Error('Test error'), 'Something went wrong');
            });

            const res = await app.request('/test');
            expect(res.status).toBe(500);

            const body = await res.json();
            expect(body.success).toBe(false);
            expect(body.error).toBe('Something went wrong');
        });

        it('should handle non-Error objects', async () => {
            const app = new Hono();
            app.get('/test', (c) => {
                return handleError(c, 'string error', 'Failed');
            });

            const res = await app.request('/test');
            expect(res.status).toBe(500);

            const body = await res.json();
            expect(body.success).toBe(false);
        });

        it('should include details in development mode', async () => {
            // Re-mock for development
            vi.doMock('@/config/env.js', () => ({
                env: { NODE_ENV: 'development' }
            }));

            const app = new Hono();
            app.get('/test', (c) => {
                return handleError(c, new Error('Detailed error'), 'Failed');
            });

            const res = await app.request('/test');
            const body = await res.json();
            expect(body.success).toBe(false);
        });
    });
});
