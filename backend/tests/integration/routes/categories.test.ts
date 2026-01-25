import { describe, it, expect, vi, afterAll } from 'vitest';
import request from 'supertest';
import { Hono } from 'hono';
import { serve } from '@hono/node-server';

// Mock Env BEFORE imports
vi.mock('@/config/env.js', () => ({
    env: {
        NODE_ENV: 'test',
        PORT: '3341',
        TURSO_DATABASE_URL: 'libsql://test-db',
        TURSO_AUTH_TOKEN: 'test-token',
        FIREBASE_PROJECT_ID: 'test-project',
        UPSTASH_REDIS_REST_URL: 'https://test-redis',
        UPSTASH_REDIS_REST_TOKEN: 'test-token',
        LOG_LEVEL: 'info',
    }
}));

// Mock Database
vi.mock('@/config/db.js', () => {
    const mockCategories = [
        {
            id: 1,
            name: 'Technology',
            slug: 'technology',
            description: 'Tech news and updates',
            iconName: 'laptop',
        },
        {
            id: 2,
            name: 'Sports',
            slug: 'sports',
            description: 'Sports news and updates',
            iconName: 'football',
        },
        {
            id: 3,
            name: 'Business',
            slug: 'business',
            description: 'Business and finance news',
            iconName: 'briefcase',
        },
    ];

    const mockQueryBuilder = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        get: vi.fn().mockResolvedValue(mockCategories[0]),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        offset: vi.fn().mockReturnThis(),
        then: (resolve: any) => resolve(mockCategories),
        all: vi.fn().mockResolvedValue(mockCategories),
        values: vi.fn().mockReturnThis(),
        returning: vi.fn().mockReturnThis(),
        set: vi.fn().mockReturnThis(),
    };

    return {
        db: {
            select: vi.fn().mockReturnValue(mockQueryBuilder),
            insert: vi.fn().mockReturnValue(mockQueryBuilder),
            delete: vi.fn().mockReturnValue(mockQueryBuilder),
            update: vi.fn().mockReturnValue(mockQueryBuilder),
        }
    };
});

vi.mock('@/config/logger.js', () => ({
    logger: {
        info: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
    },
}));

import categoriesRoute from '@/routes/categories.js';

const app = new Hono();
app.route('/categories', categoriesRoute);
const server = serve({
    fetch: app.fetch,
    port: 0, // Random port
});

describe('Categories API Integration Tests', () => {
    afterAll(async () => {
        await new Promise<void>((resolve) => {
            server.close(() => resolve());
        });
    });

    describe('GET /categories', () => {
        it('should return all categories', async () => {
            const response = await request(server)
                .get('/categories')
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data).toBeDefined();
            expect(Array.isArray(response.body.data)).toBe(true);
        });

        it('should include category properties', async () => {
            const response = await request(server)
                .get('/categories')
                .expect(200);

            const categories = response.body.data;
            expect(categories.length).toBeGreaterThan(0);

            const category = categories[0];
            expect(category).toHaveProperty('id');
            expect(category).toHaveProperty('name');
            expect(category).toHaveProperty('slug');
        });

        it('should return categories with correct structure', async () => {
            const response = await request(server)
                .get('/categories')
                .expect(200);

            const categories = response.body.data;
            categories.forEach((category: any) => {
                expect(typeof category.id).toBe('number');
                expect(typeof category.name).toBe('string');
                expect(typeof category.slug).toBe('string');
            });
        });

        it('should return Technology category', async () => {
            const response = await request(server)
                .get('/categories')
                .expect(200);

            const techCategory = response.body.data.find((c: any) => c.slug === 'technology');
            expect(techCategory).toBeDefined();
            expect(techCategory.name).toBe('Technology');
        });
    });
});
