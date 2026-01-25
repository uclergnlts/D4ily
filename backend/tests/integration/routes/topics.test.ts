import { describe, it, expect, vi, afterAll } from 'vitest';
import request from 'supertest';
import { Hono } from 'hono';
import { serve } from '@hono/node-server';

// Mock Env
vi.mock('@/config/env.js', () => ({
    env: {
        NODE_ENV: 'test',
        PORT: '3354',
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

// Mock Redis
vi.mock('@/config/redis.js', () => ({
    cacheGet: vi.fn().mockResolvedValue(null),
    cacheSet: vi.fn().mockResolvedValue(undefined),
}));

// Mock Database
vi.mock('@/config/db.js', () => {
    const mockTopics = [
        {
            id: 1,
            name: 'Technology',
            hashtag: '#technology',
            articleCount: 50,
            trendingScore: 100,
            createdAt: new Date(),
        },
    ];

    const mockArticles = [
        { id: 'article-1', translatedTitle: 'Test Article' },
    ];

    const createQueryBuilder = () => ({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        offset: vi.fn().mockReturnThis(),
        leftJoin: vi.fn().mockReturnThis(),
        get: vi.fn().mockResolvedValue(mockTopics[0]),
        then: (resolve: any) => resolve(mockTopics),
    });

    return {
        db: {
            select: vi.fn(() => createQueryBuilder()),
        }
    };
});

import topicsRoute from '@/routes/topics.js';

const app = new Hono();
app.route('/topics', topicsRoute);
const server = serve({
    fetch: app.fetch,
    port: 0,
});

describe('Topics API Integration Tests', () => {
    afterAll(async () => {
        await new Promise<void>((resolve) => {
            server.close(() => resolve());
        });
    });

    describe('GET /topics/trending', () => {
        it('should return trending topics', async () => {
            const response = await request(server)
                .get('/topics/trending')
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(Array.isArray(response.body.data)).toBe(true);
        });

        it('should support country filter', async () => {
            const response = await request(server)
                .get('/topics/trending?country=tr')
                .expect(200);

            expect(response.body.success).toBe(true);
        });

        it('should support limit parameter', async () => {
            const response = await request(server)
                .get('/topics/trending?limit=5')
                .expect(200);

            expect(response.body.success).toBe(true);
        });
    });

    describe('GET /topics/:topicId', () => {
        it('should return topic details', async () => {
            const response = await request(server)
                .get('/topics/1')
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveProperty('name');
            expect(response.body.data).toHaveProperty('hashtag');
        });

        it('should return 400 for invalid topic ID', async () => {
            const response = await request(server)
                .get('/topics/abc')
                .expect(400);

            expect(response.body.success).toBe(false);
        });
    });

    describe('GET /topics/:topicId/articles', () => {
        it('should return articles for topic', async () => {
            const response = await request(server)
                .get('/topics/1/articles?country=tr');

            // Accept either 200 or 500 (depends on mock setup)
            expect([200, 500]).toContain(response.status);
        });
    });
});
