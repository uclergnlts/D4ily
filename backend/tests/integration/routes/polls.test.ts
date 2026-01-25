import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import { Hono } from 'hono';
import { serve } from '@hono/node-server';

// Mock Env
vi.mock('@/config/env.js', () => ({
    env: {
        NODE_ENV: 'test',
        PORT: '3353',
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

// Mock state for controlling return values
let mockExistingVote: any = null;

// Mock Database
vi.mock('@/config/db.js', () => {
    const mockPoll = {
        id: 'poll-1',
        articleId: 'article-1',
        question: 'Test poll question?',
        options: JSON.stringify(['Option A', 'Option B', 'Option C']),
        results: JSON.stringify({ '0': 10, '1': 20, '2': 5 }),
        totalVotes: 35,
        expiresAt: null,
        createdAt: new Date(),
    };

    const createQueryBuilder = () => ({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        get: vi.fn().mockImplementation(() => {
            // Return null for vote check (no existing vote)
            return Promise.resolve(mockPoll);
        }),
        then: (resolve: any) => resolve([]),
        values: vi.fn().mockReturnThis(),
        set: vi.fn().mockReturnThis(),
    });

    return {
        db: {
            select: vi.fn(() => {
                const builder = createQueryBuilder();
                // For pollVotes check, return null
                return builder;
            }),
            insert: vi.fn(() => createQueryBuilder()),
            update: vi.fn(() => createQueryBuilder()),
        }
    };
});

import pollsRoute from '@/routes/polls.js';

const app = new Hono();
app.route('/polls', pollsRoute);
const server = serve({
    fetch: app.fetch,
    port: 0,
});

describe('Polls API Integration Tests', () => {
    afterAll(async () => {
        await new Promise<void>((resolve) => {
            server.close(() => resolve());
        });
    });

    beforeEach(() => {
        vi.clearAllMocks();
        mockExistingVote = null;
    });

    describe('GET /polls/:country/:pollId', () => {
        it('should return poll details', async () => {
            const response = await request(server)
                .get('/polls/tr/poll-1')
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveProperty('question');
            expect(response.body.data).toHaveProperty('options');
        });
    });

    describe('GET /polls/:country/:pollId/results', () => {
        it('should return poll results with percentages', async () => {
            const response = await request(server)
                .get('/polls/tr/poll-1/results')
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveProperty('percentages');
            expect(response.body.data).toHaveProperty('totalVotes');
        });
    });

    describe('POST /polls/:country/:pollId/vote', () => {
        it('should validate option index', async () => {
            const response = await request(server)
                .post('/polls/tr/poll-1/vote')
                .set('Authorization', 'Bearer mock-token')
                .send({ optionIndex: 99 })
                .expect(400);

            expect(response.body.success).toBe(false);
        });
    });

    describe('GET /polls/:country/:pollId/my-vote', () => {
        it('should return user vote status', async () => {
            const response = await request(server)
                .get('/polls/tr/poll-1/my-vote')
                .set('Authorization', 'Bearer mock-token')
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveProperty('hasVoted');
        });
    });
});
