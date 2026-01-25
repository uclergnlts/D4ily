import { describe, it, expect, vi, afterAll } from 'vitest';
import request from 'supertest';
import { Hono } from 'hono';
import { serve } from '@hono/node-server';

// Mock Env
vi.mock('@/config/env.js', () => ({
    env: {
        NODE_ENV: 'test',
        PORT: '3352',
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

// Mock digest service
vi.mock('@/services/digestService.js', () => ({
    getLatestDigest: vi.fn().mockResolvedValue({
        id: 'digest-1',
        countryCode: 'tr',
        period: 'morning',
        digestDate: '2026-01-22',
        summaryText: 'Günün özeti...',
        topTopics: ['Economy', 'Politics'],
        articleCount: 10,
        createdAt: new Date(),
    }),
    getDigestByDateAndPeriod: vi.fn().mockResolvedValue({
        id: 'digest-1',
        countryCode: 'tr',
        period: 'morning',
        digestDate: '2026-01-22',
        summaryText: 'Günün özeti...',
        topTopics: ['Economy', 'Politics'],
        articleCount: 10,
        createdAt: new Date(),
    }),
}));

// Mock Database
vi.mock('@/config/db.js', () => {
    const mockDigest = {
        id: 'digest-1',
        countryCode: 'tr',
        period: 'morning',
        digestDate: '2026-01-22',
        summaryText: 'Günün özeti...',
        topTopics: JSON.stringify(['Economy', 'Politics']),
        articleCount: 10,
        createdAt: new Date(),
    };

    const createQueryBuilder = () => ({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        get: vi.fn().mockResolvedValue(mockDigest),
        then: (resolve: any) => resolve([mockDigest]),
    });

    return {
        db: {
            select: vi.fn(() => createQueryBuilder()),
        }
    };
});

import digestRoute from '@/routes/digest.js';

const app = new Hono();
app.route('/digest', digestRoute);
const server = serve({
    fetch: app.fetch,
    port: 0,
});

describe('Digest API Integration Tests', () => {
    afterAll(async () => {
        await new Promise<void>((resolve) => {
            server.close(() => resolve());
        });
    });

    describe('GET /digest/:country/latest', () => {
        it('should return latest digest for TR', async () => {
            const response = await request(server)
                .get('/digest/tr/latest')
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveProperty('summaryText');
            expect(response.body.data).toHaveProperty('topTopics');
        });

        it('should return latest digest for DE', async () => {
            const response = await request(server)
                .get('/digest/de/latest')
                .expect(200);

            expect(response.body.success).toBe(true);
        });
    });

    describe('GET /digest/:country', () => {
        it('should return digests list', async () => {
            const response = await request(server)
                .get('/digest/tr')
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(Array.isArray(response.body.data)).toBe(true);
        });

        it('should return specific digest by date and period', async () => {
            const response = await request(server)
                .get('/digest/tr?date=2026-01-22&period=morning')
                .expect(200);

            expect(response.body.success).toBe(true);
        });
    });

    describe('GET /digest/:country/:digestId', () => {
        it('should return digest with comments', async () => {
            const response = await request(server)
                .get('/digest/tr/digest-1')
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveProperty('id');
        });
    });
});
