import { describe, it, expect, vi, afterAll } from 'vitest';
import request from 'supertest';
import { Hono } from 'hono';
import { serve } from '@hono/node-server';

// Mock Env
vi.mock('@/config/env.js', () => ({
    env: {
        NODE_ENV: 'test',
        PORT: '3350',
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

// Mock Redis cache
vi.mock('@/config/redis.js', () => ({
    cacheGet: vi.fn().mockResolvedValue(null),
    cacheSet: vi.fn().mockResolvedValue(undefined),
}));

// Mock Database
vi.mock('@/config/db.js', () => {
    const mockArticles = [
        {
            id: 'article-1',
            translatedTitle: 'Test Article About Technology',
            summary: 'This is a test summary about tech news',
            categoryId: 1,
            publishedAt: new Date(),
            viewCount: 100,
            likeCount: 50,
        },
    ];

    const mockSources = [
        {
            id: 1,
            sourceName: 'Hürriyet',
            sourceLogoUrl: 'https://hurriyet.com/logo.png',
            countryCode: 'tr',
            biasScoreSystem: 5.0,
            biasScoreUser: 4.5,
        },
    ];

    const mockTopics = [
        {
            id: 1,
            name: 'Technology',
            hashtag: '#technology',
            articleCount: 50,
            trendingScore: 100,
        },
    ];

    const createQueryBuilder = () => ({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        offset: vi.fn().mockReturnThis(),
        get: vi.fn().mockResolvedValue(mockArticles[0]),
        then: (resolve: any) => resolve(mockArticles),
    });

    return {
        db: {
            select: vi.fn(() => {
                const builder = createQueryBuilder();
                // Return different data based on query
                builder.then = (resolve: any) => resolve([...mockArticles]);
                return builder;
            }),
        }
    };
});

import searchRoute from '@/routes/search.js';

const app = new Hono();
app.route('/search', searchRoute);
const server = serve({
    fetch: app.fetch,
    port: 0,
});

describe('Search API Integration Tests', () => {
    afterAll(async () => {
        await new Promise<void>((resolve) => {
            server.close(() => resolve());
        });
    });

    describe('GET /search', () => {
        it('should return search results for valid query', async () => {
            const response = await request(server)
                .get('/search?q=technology&type=all&country=tr')
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data).toBeDefined();
            expect(response.body.data.query).toBe('technology');
        });

        it('should validate minimum query length', async () => {
            const response = await request(server)
                .get('/search?q=a')
                .expect(400);

            expect(response.body.success).toBe(false);
        });

        it('should support type filter for articles', async () => {
            const response = await request(server)
                .get('/search?q=test&type=articles&country=tr')
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.type).toBe('articles');
        });

        it('should support type filter for sources', async () => {
            const response = await request(server)
                .get('/search?q=hurriyet&type=sources&country=tr')
                .expect(200);

            expect(response.body.success).toBe(true);
        });

        it('should support type filter for topics', async () => {
            const response = await request(server)
                .get('/search?q=tech&type=topics&country=tr')
                .expect(200);

            expect(response.body.success).toBe(true);
        });

        it('should include pagination info', async () => {
            const response = await request(server)
                .get('/search?q=test&page=1&limit=10')
                .expect(200);

            expect(response.body.data.pagination).toBeDefined();
            expect(response.body.data.pagination.page).toBe(1);
            expect(response.body.data.pagination.limit).toBe(10);
        });
    });

    describe('GET /search/suggestions', () => {
        it('should return suggestions for valid query', async () => {
            const response = await request(server)
                .get('/search/suggestions?q=tech')
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(Array.isArray(response.body.data)).toBe(true);
        });

        it('should return empty for short query', async () => {
            const response = await request(server)
                .get('/search/suggestions?q=a')
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data).toEqual([]);
        });
    });

    describe('GET /search/trending', () => {
        it('should return trending searches', async () => {
            const response = await request(server)
                .get('/search/trending')
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(Array.isArray(response.body.data)).toBe(true);
        });

        it('should support country parameter', async () => {
            const response = await request(server)
                .get('/search/trending?country=tr')
                .expect(200);

            expect(response.body.success).toBe(true);
        });
    });
});
