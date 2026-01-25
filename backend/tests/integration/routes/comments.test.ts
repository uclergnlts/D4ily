import { describe, it, expect, beforeAll, vi, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { Hono } from 'hono';
import { serve } from '@hono/node-server';

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

// Mock Logger
vi.mock('@/config/logger.js', () => ({
    logger: {
        info: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
    },
}));

// Mock Auth Middleware - provides user from token
vi.mock('@/middleware/auth.js', () => ({
    authMiddleware: async (c: any, next: any) => {
        c.set('user', {
            uid: 'test-user-integration',
            email: 'test@example.com',
            emailVerified: true,
            userRole: 'user',
        });
        await next();
    },
    AuthUser: {} as any,
}));

// Mock data
const testCommentId = 'test-comment-id';
let mockComment: any = {
    id: testCommentId,
    content: 'This is a test comment from integration tests',
    userId: 'test-user-integration',
    targetId: 'test-article-integration',
    targetType: 'article',
    countryCode: 'tr',
    likeCount: 0,
    createdAt: new Date(),
    updatedAt: null,
    parentCommentId: null,
};

let mockExistingLike: any = null;

// Mock Database
vi.mock('@/config/db.js', () => {
    const createQueryBuilder = () => ({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        offset: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        leftJoin: vi.fn().mockReturnThis(),
        groupBy: vi.fn().mockReturnThis(),
        then: (resolve: any) => resolve([]),
        get: vi.fn().mockImplementation(() => mockComment),
        all: vi.fn().mockResolvedValue([]),
        values: vi.fn().mockReturnThis(),
        returning: vi.fn().mockReturnThis(),
        set: vi.fn().mockReturnThis(),
    });

    return {
        db: {
            select: vi.fn(() => {
                const builder = createQueryBuilder();
                // For commentLikes check (existingLike)
                builder.get = vi.fn().mockImplementation(() => {
                    // Return mockExistingLike for comment likes queries
                    // Return mockComment for comment queries
                    return mockComment;
                });
                return builder;
            }),
            insert: vi.fn(() => {
                const builder = createQueryBuilder();
                builder.get = vi.fn().mockResolvedValue(mockComment);
                return builder;
            }),
            delete: vi.fn(() => {
                const builder = createQueryBuilder();
                builder.get = vi.fn().mockResolvedValue(mockComment);
                return builder;
            }),
            update: vi.fn(() => createQueryBuilder()),
        }
    };
});

import commentsRoute from '@/routes/comments.js';

const app = new Hono();
app.route('/comments', commentsRoute);
const server = serve({
    fetch: app.fetch,
    port: 0, // Random port
});

describe('Comments API Integration Tests', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockComment = {
            id: testCommentId,
            content: 'This is a test comment from integration tests',
            userId: 'test-user-integration',
            targetId: 'test-article-integration',
            targetType: 'article',
            countryCode: 'tr',
            likeCount: 0,
            createdAt: new Date(),
            updatedAt: null,
            parentCommentId: null,
        };
        mockExistingLike = null;
    });

    afterAll(async () => {
        await new Promise<void>((resolve) => {
            server.close(() => resolve());
        });
    });

    const testArticleId = 'test-article-integration';

    describe('POST /comments/:country', () => {
        it('should create a new comment', async () => {
            const response = await request(server)
                .post('/comments/tr')
                .set('Authorization', 'Bearer mock-token')
                .send({
                    articleId: testArticleId,
                    content: 'This is a test comment from integration tests'
                })
                .expect(201);

            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveProperty('id');
            expect(response.body.data.content).toBe('This is a test comment from integration tests');
            expect(response.body.data.userId).toBe('test-user-integration');
            expect(response.body.data.likeCount).toBe(0);
        });

        it('should require articleId', async () => {
            const response = await request(server)
                .post('/comments/tr')
                .set('Authorization', 'Bearer mock-token')
                .send({
                    content: 'Missing articleId'
                })
                .expect(400);

            expect(response.body.success).toBe(false);
        });

        it('should require content', async () => {
            const response = await request(server)
                .post('/comments/tr')
                .set('Authorization', 'Bearer mock-token')
                .send({
                    articleId: testArticleId,
                })
                .expect(400);

            expect(response.body.success).toBe(false);
        });

        it('should create nested reply', async () => {
            const response = await request(server)
                .post('/comments/tr')
                .set('Authorization', 'Bearer mock-token')
                .send({
                    articleId: testArticleId,
                    content: 'This is a reply',
                    parentCommentId: testCommentId
                })
                .expect(201);

            expect(response.body.success).toBe(true);
        });
    });

    describe('GET /comments/:country/:articleId', () => {
        it('should return comments for an article', async () => {
            const response = await request(server)
                .get(`/comments/tr/${testArticleId}`)
                .expect(200);

            expect(response.body.success).toBe(true);
        });

        it('should include replies in comments', async () => {
            const response = await request(server)
                .get(`/comments/tr/${testArticleId}`)
                .expect(200);
        });

        it('should support pagination', async () => {
            const response = await request(server)
                .get(`/comments/tr/${testArticleId}?page=1&limit=5`)
                .expect(200);
        });
    });

    describe('POST /comments/:country/:commentId/like', () => {
        it('should toggle like on a comment', async () => {
            const response = await request(server)
                .post(`/comments/tr/${testCommentId}/like`)
                .set('Authorization', 'Bearer mock-token')
                .expect(200);

            expect(response.body.success).toBe(true);
        });

        it('should return 404 for non-existent comment', async () => {
            // Mock get to return null
            mockComment = null;

            const response = await request(server)
                .post('/comments/tr/non-existent-id/like')
                .set('Authorization', 'Bearer mock-token')
                .expect(404);

            expect(response.body.success).toBe(false);
        });
    });

    describe('DELETE /comments/:country/:commentId', () => {
        it('should delete a comment', async () => {
            const response = await request(server)
                .delete(`/comments/tr/${testCommentId}`)
                .set('Authorization', 'Bearer mock-token')
                .expect(200);

            expect(response.body.success).toBe(true);
        });

        it('should return 404 for non-existent comment', async () => {
            mockComment = null;

            const response = await request(server)
                .delete('/comments/tr/non-existent-id')
                .set('Authorization', 'Bearer mock-token')
                .expect(404);

            expect(response.body.success).toBe(false);
        });
    });
});
