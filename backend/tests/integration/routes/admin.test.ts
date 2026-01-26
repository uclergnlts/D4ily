import { describe, it, expect, vi, afterAll } from 'vitest';
import request from 'supertest';
import { Hono } from 'hono';
import { serve } from '@hono/node-server';

// Test data - defined before mocks
const TEST_ADMIN_USER = {
    id: 'test-admin-uid',
    email: 'admin@test.com',
    name: 'Test Admin',
    userRole: 'admin',
    subscriptionStatus: 'free',
};

const TEST_SOURCE_DATA = {
    id: 123,
    sourceName: 'Test Source',
    rssUrl: 'https://test.com/rss.xml',
    countryCode: 'tr',
    isActive: true,
    sourceLogoUrl: 'https://test.com/logo.png',
};

// Mock Env BEFORE imports
vi.mock('@/config/env.js', () => ({
    env: {
        NODE_ENV: 'test',
        PORT: '3333',
        TURSO_DATABASE_URL: 'libsql://test-db',
        TURSO_AUTH_TOKEN: 'test-token',
        FIREBASE_PROJECT_ID: 'test-project',
        UPSTASH_REDIS_REST_URL: 'https://test-redis',
        UPSTASH_REDIS_REST_TOKEN: 'test-token',
        LOG_LEVEL: 'info',
    }
}));

// Mock Firebase Auth - Admin middleware için gerekli
vi.mock('@/config/firebase.js', () => ({
    adminAuth: {
        verifyIdToken: vi.fn().mockResolvedValue({
            uid: 'test-admin-uid',
            email: 'admin@test.com',
            email_verified: true,
        }),
    },
    isFirebaseEnabled: true,
}));

// Create mock query builder factory
const createMockQueryBuilder = () => {
    let callCount = 0;
    
    return {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        get: vi.fn().mockImplementation(() => {
            callCount++;
            // Odd calls are for admin user check, even calls are for source
            if (callCount % 2 === 1) {
                return Promise.resolve(TEST_ADMIN_USER);
            }
            return Promise.resolve(TEST_SOURCE_DATA);
        }),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        offset: vi.fn().mockReturnThis(),
        then: (resolve: (value: unknown[]) => void) => resolve([]),
        all: vi.fn().mockResolvedValue([]),
        values: vi.fn().mockReturnThis(),
        returning: vi.fn().mockReturnThis(),
        set: vi.fn().mockReturnThis(),
    };
};

const mockQueryBuilder = createMockQueryBuilder();

vi.mock('@/config/db.js', () => ({
    db: {
        select: vi.fn().mockReturnValue(mockQueryBuilder),
        insert: vi.fn().mockReturnValue(mockQueryBuilder),
        delete: vi.fn().mockReturnValue(mockQueryBuilder),
        update: vi.fn().mockReturnValue(mockQueryBuilder),
    }
}));

vi.mock('@/services/scraper/scraperService.js', () => ({
    scrapeSource: vi.fn().mockResolvedValue({
        processed: 5,
        duplicates: 2,
        filtered: 1,
    }),
}));

vi.mock('@/config/logger.js', () => ({
    logger: {
        info: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
        debug: vi.fn(),
    },
}));

// Mock rate limiter to avoid issues in tests
vi.mock('@/middleware/rateLimiter.js', () => ({
    scrapeRateLimiter: vi.fn().mockImplementation(async (_c: unknown, next: () => Promise<void>) => next()),
    authRateLimiter: vi.fn().mockImplementation(async (_c: unknown, next: () => Promise<void>) => next()),
}));

// Import after mocks
import adminRoute from '@/routes/admin.js';
import { db } from '@/config/db.js';

const app = new Hono();
app.route('/admin', adminRoute);
const server = serve({
    fetch: app.fetch,
    port: 0, // Random port
});

// Test için kullanılacak auth token
const TEST_AUTH_TOKEN = 'Bearer test-firebase-token';

describe('Admin API Integration Tests', () => {
    afterAll(async () => {
        await new Promise<void>((resolve) => {
            server.close(() => resolve());
        });
    });

    describe('GET /admin/sources', () => {
        it('should return all RSS sources', async () => {
            const response = await request(server)
                .get('/admin/sources')
                .set('Authorization', TEST_AUTH_TOKEN)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data).toBeDefined();
            expect(Array.isArray(response.body.data)).toBe(true);
        });

        it('should include source details', async () => {
            const response = await request(server)
                .get('/admin/sources')
                .set('Authorization', TEST_AUTH_TOKEN)
                .expect(200);

            const sources = response.body.data;
            if (sources.length > 0) {
                const source = sources[0];
                expect(source).toHaveProperty('id');
                expect(source).toHaveProperty('sourceName');
                expect(source).toHaveProperty('countryCode');
                expect(source).toHaveProperty('rssUrl');
                expect(source).toHaveProperty('isActive');
            }
        });
    });

    describe('GET /admin/categories', () => {
        it('should return all categories', async () => {
            const response = await request(server)
                .get('/admin/categories')
                .set('Authorization', TEST_AUTH_TOKEN)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(Array.isArray(response.body.data)).toBe(true);
        });

        it('should include category properties', async () => {
            const response = await request(server)
                .get('/admin/categories')
                .set('Authorization', TEST_AUTH_TOKEN)
                .expect(200);

            if (response.body.data.length > 0) {
                const category = response.body.data[0];
                expect(category).toHaveProperty('id');
                expect(category).toHaveProperty('name');
                expect(category).toHaveProperty('slug');
            }
        });
    });

    describe('POST /admin/scrape/:sourceId', () => {
        it('should trigger manual scrape', async () => {
            const response = await request(server)
                .post('/admin/scrape/123')
                .set('Authorization', TEST_AUTH_TOKEN)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveProperty('source');
            expect(response.body.data).toHaveProperty('processed');
            expect(response.body.data).toHaveProperty('duplicates');
            expect(response.body.data).toHaveProperty('filtered');
        });

        it('should return 404 for invalid source', async () => {
            // Mock get returns null for source (second call)
            const mockGet = vi.fn()
                .mockResolvedValueOnce(TEST_ADMIN_USER) // First call: admin user check
                .mockResolvedValueOnce(null); // Second call: source not found
            
            (db.select() as ReturnType<typeof createMockQueryBuilder>).get = mockGet;

            const response = await request(server)
                .post('/admin/scrape/999')
                .set('Authorization', TEST_AUTH_TOKEN)
                .expect(404);

            expect(response.body.success).toBe(false);
            expect(response.body).toHaveProperty('error');
        });
    });
});
