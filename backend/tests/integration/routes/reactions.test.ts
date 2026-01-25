import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import { Hono } from 'hono';
import { serve } from '@hono/node-server';

// Mock Env BEFORE imports
vi.mock('@/config/env.js', () => ({
    env: {
        NODE_ENV: 'test',
        PORT: '3343',
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
    cacheInvalidate: vi.fn().mockResolvedValue(undefined),
    cacheGet: vi.fn().mockResolvedValue(null),
    cacheSet: vi.fn().mockResolvedValue(undefined),
}));

// Mock Auth Middleware
vi.mock('@/middleware/auth.js', () => ({
    authMiddleware: async (c: any, next: any) => {
        c.set('user', {
            uid: 'test-user-id',
            email: 'test@example.com',
            emailVerified: true,
            userRole: 'user',
        });
        await next();
    },
    AuthUser: {} as any,
}));

// Mock data state - accessible via global for mock hoisting
const mockState = {
    existingReaction: null as any,
    existingBookmark: null as any,
    article: { id: 'article-123', likeCount: 0, dislikeCount: 0 } as any,
};

// Make mockState accessible globally for the mock
(globalThis as any).__mockState = mockState;

const mockBookmark = {
    id: 'bookmark-1',
    userId: 'test-user-id',
    articleId: 'article-123',
    countryCode: 'tr',
    createdAt: new Date(),
};

// Mock Database with comprehensive state handling
vi.mock('@/config/db.js', () => {
    const getState = () => (globalThis as any).__mockState || { existingReaction: null, existingBookmark: null, article: null };

    // Track call counts to differentiate between queries
    let selectCallCount = 0;

    const createQueryBuilder = () => {
        const builder: any = {
            from: vi.fn(function (this: any) {
                // Track what table we're querying
                this._table = arguments[0];
                return this;
            }),
            where: vi.fn().mockReturnThis(),
            limit: vi.fn().mockReturnThis(),
            offset: vi.fn().mockReturnThis(),
            orderBy: vi.fn().mockReturnThis(),
            leftJoin: vi.fn().mockReturnThis(),
            groupBy: vi.fn().mockReturnThis(),
            values: vi.fn().mockReturnThis(),
            returning: vi.fn().mockReturnThis(),
            set: vi.fn().mockReturnThis(),
            get: vi.fn().mockImplementation(() => null),
            then: (resolve: any) => resolve([]),
            _table: null,
        };
        return builder;
    };

    return {
        db: {
            select: vi.fn((fields?: any) => {
                const state = getState();
                selectCallCount++;
                const currentCallCount = selectCallCount;
                const builder = createQueryBuilder();

                // If selecting specific fields (like likeCount, dislikeCount), it's an article query
                const isArticleCountQuery = fields && (fields.likeCount || fields.dislikeCount);

                builder.get = vi.fn().mockImplementation(() => {
                    const currentState = getState();

                    // If querying for counts, return article data
                    if (isArticleCountQuery) {
                        return currentState.article;
                    }

                    // Otherwise check for existing reaction/bookmark
                    if (currentState.existingReaction) return currentState.existingReaction;
                    if (currentState.existingBookmark) return currentState.existingBookmark;

                    // For queries checking for existing records, return null
                    return null;
                });
                builder.then = (resolve: any) => resolve([]);
                return builder;
            }),
            insert: vi.fn(() => {
                const builder = createQueryBuilder();
                return builder;
            }),
            update: vi.fn(() => createQueryBuilder()),
            delete: vi.fn(() => createQueryBuilder()),
        }
    };
});

import reactionRoute from '@/routes/reactions.js';

const app = new Hono();
app.route('/reactions', reactionRoute);
const server = serve({
    fetch: app.fetch,
    port: 0,
});

describe('Reactions API Integration Tests', () => {
    afterAll(async () => {
        await new Promise<void>((resolve) => {
            server.close(() => resolve());
        });
    });

    beforeEach(() => {
        vi.clearAllMocks();
        mockState.existingReaction = null;
        mockState.existingBookmark = null;
        mockState.article = { id: 'article-123', likeCount: 0, dislikeCount: 0 };
    });

    const testArticleId = 'test-article-123';

    describe('POST /reactions/like', () => {
        it('should add a like to an article', async () => {
            const response = await request(server)
                .post('/reactions/like')
                .set('Authorization', 'Bearer mock-token')
                .send({
                    articleId: testArticleId,
                    countryCode: 'tr',
                    action: 'like'
                })
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.message).toBe('like added');
        });

        it('should add a dislike to an article', async () => {
            const response = await request(server)
                .post('/reactions/like')
                .set('Authorization', 'Bearer mock-token')
                .send({
                    articleId: testArticleId,
                    countryCode: 'tr',
                    action: 'dislike'
                })
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.message).toBe('dislike added');
        });

        it('should remove reaction when action is remove', async () => {
            const response = await request(server)
                .post('/reactions/like')
                .set('Authorization', 'Bearer mock-token')
                .send({
                    articleId: testArticleId,
                    countryCode: 'tr',
                    action: 'remove'
                })
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.message).toBe('Reaction removed');
        });

        it('should toggle off like when same action exists', async () => {
            mockState.existingReaction = {
                id: 'existing-reaction',
                userId: 'test-user-id',
                articleId: testArticleId,
                reactionType: 'like',
            };

            const response = await request(server)
                .post('/reactions/like')
                .set('Authorization', 'Bearer mock-token')
                .send({
                    articleId: testArticleId,
                    countryCode: 'tr',
                    action: 'like'
                })
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.message).toBe('Reaction removed');
        });

        it('should update to dislike when like exists', async () => {
            mockState.existingReaction = {
                id: 'existing-reaction',
                userId: 'test-user-id',
                articleId: testArticleId,
                reactionType: 'like',
            };

            const response = await request(server)
                .post('/reactions/like')
                .set('Authorization', 'Bearer mock-token')
                .send({
                    articleId: testArticleId,
                    countryCode: 'tr',
                    action: 'dislike'
                })
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.message).toBe('Updated to dislike');
        });

        it('should return 400 for invalid country code', async () => {
            const response = await request(server)
                .post('/reactions/like')
                .set('Authorization', 'Bearer mock-token')
                .send({
                    articleId: testArticleId,
                    countryCode: 'invalid',
                    action: 'like'
                })
                .expect(400);

            expect(response.body.success).toBe(false);
        });

        it('should return 400 for invalid action', async () => {
            const response = await request(server)
                .post('/reactions/like')
                .set('Authorization', 'Bearer mock-token')
                .send({
                    articleId: testArticleId,
                    countryCode: 'tr',
                    action: 'invalid'
                })
                .expect(400);

            expect(response.body.success).toBe(false);
        });
    });

    describe('POST /reactions/bookmark', () => {
        it('should bookmark an article', async () => {
            const response = await request(server)
                .post('/reactions/bookmark')
                .set('Authorization', 'Bearer mock-token')
                .send({
                    articleId: testArticleId,
                    countryCode: 'tr'
                })
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.isBookmarked).toBe(true);
        });

        it('should remove bookmark if already bookmarked', async () => {
            mockState.existingBookmark = {
                id: 'existing-bookmark',
                userId: 'test-user-id',
                articleId: testArticleId,
            };

            const response = await request(server)
                .post('/reactions/bookmark')
                .set('Authorization', 'Bearer mock-token')
                .send({
                    articleId: testArticleId,
                    countryCode: 'tr'
                })
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.isBookmarked).toBe(false);
        });

        it('should return 400 for invalid data', async () => {
            const response = await request(server)
                .post('/reactions/bookmark')
                .set('Authorization', 'Bearer mock-token')
                .send({
                    articleId: testArticleId,
                    countryCode: 'invalid'
                })
                .expect(400);

            expect(response.body.success).toBe(false);
        });
    });

    describe('GET /reactions/bookmarks', () => {
        it('should return user bookmarks', async () => {
            const response = await request(server)
                .get('/reactions/bookmarks')
                .set('Authorization', 'Bearer mock-token')
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data).toBeDefined();
        });
    });

    describe('POST /reactions/history', () => {
        it('should record reading history', async () => {
            const response = await request(server)
                .post('/reactions/history')
                .set('Authorization', 'Bearer mock-token')
                .send({
                    articleId: testArticleId,
                    countryCode: 'tr',
                    timeSpent: 120
                })
                .expect(200);

            expect(response.body.success).toBe(true);
        });

        it('should record history without timeSpent', async () => {
            const response = await request(server)
                .post('/reactions/history')
                .set('Authorization', 'Bearer mock-token')
                .send({
                    articleId: testArticleId,
                    countryCode: 'tr'
                })
                .expect(200);

            expect(response.body.success).toBe(true);
        });

        it('should return 400 for invalid data', async () => {
            const response = await request(server)
                .post('/reactions/history')
                .set('Authorization', 'Bearer mock-token')
                .send({
                    articleId: testArticleId,
                    countryCode: 'invalid'
                })
                .expect(400);

            expect(response.body.success).toBe(false);
        });
    });
});
