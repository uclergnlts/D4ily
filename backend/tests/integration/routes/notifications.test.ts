import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import { Hono } from 'hono';
import { serve } from '@hono/node-server';

// Mock Env
vi.mock('@/config/env.js', () => ({
    env: {
        NODE_ENV: 'test',
        PORT: '3356',
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

// Mock auth middleware
vi.mock('@/middleware/auth.js', () => ({
    authMiddleware: vi.fn((c: any, next: any) => {
        c.set('user', {
            uid: 'test-user-id',
            email: 'test@example.com',
            emailVerified: true,
        });
        return next();
    }),
    AuthUser: {},
}));

// Mock Database
vi.mock('@/config/db.js', () => {
    const mockDevice = {
        id: 'device-1',
        userId: 'test-user-id',
        deviceToken: 'test-token-123',
        platform: 'ios',
        createdAt: new Date(),
    };

    const mockPreferences = {
        id: 'pref-1',
        userId: 'test-user-id',
        digestMorning: true,
        digestEvening: true,
        breakingNews: true,
        weeklyReport: true,
    };

    const createQueryBuilder = () => ({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        get: vi.fn().mockResolvedValue(mockPreferences),
        then: (resolve: any) => resolve([mockDevice]),
        values: vi.fn().mockReturnThis(),
        set: vi.fn().mockReturnThis(),
        returning: vi.fn().mockReturnThis(),
    });

    return {
        db: {
            select: vi.fn(() => createQueryBuilder()),
            insert: vi.fn(() => createQueryBuilder()),
            update: vi.fn(() => createQueryBuilder()),
            delete: vi.fn(() => createQueryBuilder()),
        }
    };
});

import notificationsRoute from '@/routes/notifications.js';

const app = new Hono();
app.route('/notifications', notificationsRoute);
const server = serve({
    fetch: app.fetch,
    port: 0,
});

describe('Notifications API Integration Tests', () => {
    afterAll(async () => {
        await new Promise<void>((resolve) => {
            server.close(() => resolve());
        });
    });

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('POST /notifications/register-device', () => {
        it('should validate platform', async () => {
            const response = await request(server)
                .post('/notifications/register-device')
                .set('Authorization', 'Bearer mock-token')
                .send({
                    deviceToken: 'test-device-token',
                    platform: 'invalid',
                })
                .expect(400);

            expect(response.body.success).toBe(false);
        });
    });

    describe('GET /notifications/preferences', () => {
        it('should return notification preferences', async () => {
            const response = await request(server)
                .get('/notifications/preferences')
                .set('Authorization', 'Bearer mock-token')
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveProperty('digestMorning');
            expect(response.body.data).toHaveProperty('breakingNews');
        });
    });

    describe('PUT /notifications/preferences', () => {
        it('should update notification preferences', async () => {
            const response = await request(server)
                .put('/notifications/preferences')
                .set('Authorization', 'Bearer mock-token')
                .send({
                    digestMorning: true,
                    digestEvening: false,
                    breakingNews: true,
                    weeklyReport: true,
                })
                .expect(200);

            expect(response.body.success).toBe(true);
        });
    });
});
