import { describe, it, expect, vi, afterAll } from 'vitest';
import request from 'supertest';
import { Hono } from 'hono';
import { serve } from '@hono/node-server';

// Mock Env
vi.mock('@/config/env.js', () => ({
    env: {
        NODE_ENV: 'test',
        PORT: '3355',
        TURSO_DATABASE_URL: 'libsql://test-db',
        TURSO_AUTH_TOKEN: 'test-token',
        FIREBASE_PROJECT_ID: 'test-project',
        UPSTASH_REDIS_REST_URL: 'https://test-redis',
        UPSTASH_REDIS_REST_TOKEN: 'test-token',
        LOG_LEVEL: 'info',
    }
}));

// Mock Logger
vi.mock('@/config/logger.js', () => ({
    logger: {
        info: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
    },
}));

// Mock weekly service
vi.mock('@/services/weeklyService.js', () => ({
    getLatestWeeklyComparison: vi.fn().mockResolvedValue({
        id: 'weekly-1',
        weekStart: '2026-01-13',
        weekEnd: '2026-01-19',
        countriesData: JSON.stringify({ tr: {}, de: {}, us: {} }),
        createdAt: new Date(),
    }),
    getWeeklyComparisonByWeek: vi.fn().mockResolvedValue({
        id: 'weekly-1',
        weekStart: '2026-01-13',
        weekEnd: '2026-01-19',
        countriesData: JSON.stringify({ tr: {}, de: {}, us: {} }),
        createdAt: new Date(),
    }),
}));

// Mock Database
vi.mock('@/config/db.js', () => {
    const mockWeekly = {
        id: 'weekly-1',
        weekStart: '2026-01-13',
        weekEnd: '2026-01-19',
        countriesData: JSON.stringify({ tr: {}, de: {}, us: {} }),
        createdAt: new Date(),
    };

    const createQueryBuilder = () => ({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        get: vi.fn().mockResolvedValue(mockWeekly),
        then: (resolve: any) => resolve([mockWeekly]),
    });

    return {
        db: {
            select: vi.fn(() => createQueryBuilder()),
        }
    };
});

import weeklyRoute from '@/routes/weekly.js';

const app = new Hono();
app.route('/weekly', weeklyRoute);
const server = serve({
    fetch: app.fetch,
    port: 0,
});

describe('Weekly API Integration Tests', () => {
    afterAll(async () => {
        await new Promise<void>((resolve) => {
            server.close(() => resolve());
        });
    });

    describe('GET /weekly/latest', () => {
        it('should return latest weekly comparison', async () => {
            const response = await request(server)
                .get('/weekly/latest')
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveProperty('weekStart');
            expect(response.body.data).toHaveProperty('weekEnd');
        });
    });

    describe('GET /weekly', () => {
        it('should return weekly comparisons list', async () => {
            const response = await request(server)
                .get('/weekly')
                .expect(200);

            expect(response.body.success).toBe(true);
        });

        it('should return specific week by query param', async () => {
            const response = await request(server)
                .get('/weekly?week=2026-01-13')
                .expect(200);

            expect(response.body.success).toBe(true);
        });
    });

    describe('GET /weekly/:comparisonId', () => {
        it('should return weekly by ID', async () => {
            const response = await request(server)
                .get('/weekly/weekly-1')
                .expect(200);

            expect(response.body.success).toBe(true);
        });
    });
});
