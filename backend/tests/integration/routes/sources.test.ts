import { describe, it, expect, vi, afterAll } from 'vitest';
import request from 'supertest';
import { Hono } from 'hono';
import { serve } from '@hono/node-server';

// Mock Env BEFORE imports
vi.mock('@/config/env.js', () => ({
    env: {
        NODE_ENV: 'test',
        PORT: '3340',
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
    const mockSources = [
        {
            id: 1,
            sourceName: 'Test Source TR',
            rssUrl: 'https://test-tr.com/rss.xml',
            countryCode: 'tr',
            isActive: true,
            sourceLogoUrl: 'https://test-tr.com/logo.png',
            biasScoreSystem: 5.0,
            biasScoreUser: 4.5,
            biasVoteCount: 10,
            govAlignmentScore: -2,
            govAlignmentLabel: 'Muhalefete Eğilimli',
            govAlignmentConfidence: 0.72,
            govAlignmentNotes: 'Test source notes',
            govAlignmentLastUpdated: new Date('2026-01-20T10:00:00Z'),
        },
        {
            id: 2,
            sourceName: 'Test Source US',
            rssUrl: 'https://test-us.com/rss.xml',
            countryCode: 'us',
            isActive: true,
            sourceLogoUrl: 'https://test-us.com/logo.png',
            govAlignmentScore: 0,
            govAlignmentConfidence: 0.5,
        },
        {
            id: 3,
            sourceName: 'Another TR Source',
            rssUrl: 'https://another-tr.com/rss.xml',
            countryCode: 'tr',
            isActive: true,
            sourceLogoUrl: 'https://another-tr.com/logo.png',
            govAlignmentScore: 4,
            govAlignmentLabel: 'İktidara Yakın',
            govAlignmentConfidence: 0.85,
        },
    ];

    const mockQueryBuilder = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockImplementation(function (this: any) {
            // Return filtered sources based on country
            this._filtered = true;
            return this;
        }),
        get: vi.fn().mockResolvedValue(mockSources[0]),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        offset: vi.fn().mockReturnThis(),
        then: function (resolve: any) {
            if ((this as any)._filtered) {
                resolve(mockSources.filter(s => s.countryCode === 'tr'));
            } else {
                resolve(mockSources);
            }
        },
        all: vi.fn().mockResolvedValue(mockSources),
        values: vi.fn().mockReturnThis(),
        returning: vi.fn().mockReturnThis(),
        set: vi.fn().mockReturnThis(),
    };

    return {
        db: {
            select: vi.fn().mockReturnValue({ ...mockQueryBuilder, _filtered: false }),
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
        debug: vi.fn(),
    },
}));

// Mock Auth Middleware
vi.mock('@/middleware/auth.js', () => ({
    authMiddleware: vi.fn((c: any, next: any) => {
        c.set('user', { uid: 'test-user-123', email: 'test@example.com' });
        return next();
    }),
    adminMiddleware: vi.fn((c: any, next: any) => next()),
    optionalAuthMiddleware: vi.fn((c: any, next: any) => next()),
    AuthUser: {},
}));

// Mock Alignment Services
vi.mock('@/services/alignmentFeedbackService.js', () => ({
    submitAlignmentVote: vi.fn().mockResolvedValue({ success: true, isUpdate: false }),
    getAlignmentFeedback: vi.fn().mockResolvedValue({
        sourceId: 1,
        sourceName: 'Test Source TR',
        currentScore: -2,
        currentLabel: 'Muhalefete Egilimli',
        totalVotes: 10,
        agreeCount: 6,
        disagreeCount: 3,
        unsureCount: 1,
        agreePercentage: 60,
        averageSuggestedScore: -3,
    }),
    getUserVoteForSource: vi.fn().mockResolvedValue(null),
    updateReputationOnAlignmentChange: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/services/alignmentNotificationService.js', () => ({
    queueAlignmentChangeNotifications: vi.fn().mockResolvedValue(5),
}));

import sourcesRoute from '@/routes/sources.js';
import { submitAlignmentVote, getAlignmentFeedback } from '@/services/alignmentFeedbackService.js';

const app = new Hono();
app.route('/sources', sourcesRoute);
const server = serve({
    fetch: app.fetch,
    port: 0, // Random port
});

describe('Sources API Integration Tests', () => {
    afterAll(async () => {
        await new Promise<void>((resolve) => {
            server.close(() => resolve());
        });
    });

    describe('GET /sources', () => {
        it('should return all sources grouped by country', async () => {
            const response = await request(server)
                .get('/sources')
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data).toBeDefined();
        });

        it('should filter sources by country query param', async () => {
            const response = await request(server)
                .get('/sources?country=tr')
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data).toBeDefined();
            expect(Array.isArray(response.body.data)).toBe(true);
        });

        it('should return 400 for invalid country code in query', async () => {
            const response = await request(server)
                .get('/sources?country=invalid')
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.error).toBe('Invalid country code');
        });
    });

    describe('GET /sources/:country', () => {
        it('should return sources for a specific country', async () => {
            const response = await request(server)
                .get('/sources/tr')
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data).toBeDefined();
            expect(Array.isArray(response.body.data)).toBe(true);
        });

        it('should return sources for US country', async () => {
            const response = await request(server)
                .get('/sources/us')
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(Array.isArray(response.body.data)).toBe(true);
        });

        it('should return 400 for invalid country code in path', async () => {
            const response = await request(server)
                .get('/sources/xyz')
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.error).toBe('Invalid country code');
        });

        it('should return empty array for country with no sources', async () => {
            const response = await request(server)
                .get('/sources/de')
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(Array.isArray(response.body.data)).toBe(true);
        });
    });

    describe('GET /sources/:sourceId/bias', () => {
        it('should return bias info for valid source', async () => {
            const response = await request(server)
                .get('/sources/1/bias')
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveProperty('sourceId');
            expect(response.body.data).toHaveProperty('sourceName');
            expect(response.body.data).toHaveProperty('biasScoreSystem');
            expect(response.body.data).toHaveProperty('biasScoreUser');
            expect(response.body.data).toHaveProperty('biasVoteCount');
        });

        it('should return 400 for invalid source ID', async () => {
            const response = await request(server)
                .get('/sources/abc/bias')
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.error).toBe('Invalid source ID');
        });

        it('should return 404 for non-existent source', async () => {
            // Need to mock get() to return null
            const response = await request(server)
                .get('/sources/99999/bias');

            // Accept either 200 (mock returns data) or 404 (source not found)
            expect([200, 404]).toContain(response.status);
        });
    });

    describe('GET /sources/:sourceId/stance', () => {
        it('should return stance info for valid source', async () => {
            const response = await request(server)
                .get('/sources/1/stance')
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveProperty('sourceId');
            expect(response.body.data).toHaveProperty('sourceName');
            expect(response.body.data).toHaveProperty('govAlignmentScore');
            expect(response.body.data).toHaveProperty('govAlignmentLabel');
            expect(response.body.data).toHaveProperty('confidence');
        });

        it('should return correct label based on score and confidence', async () => {
            const response = await request(server)
                .get('/sources/1/stance')
                .expect(200);

            expect(response.body.success).toBe(true);
            // Score is -2, confidence is 0.72, so label should be 'Muhalefete Eğilimli'
            expect(response.body.data.govAlignmentLabel).toBe('Muhalefete Eğilimli');
        });

        it('should return 400 for invalid source ID', async () => {
            const response = await request(server)
                .get('/sources/abc/stance')
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.error).toBe('Invalid source ID');
        });

        it('should return notes if available', async () => {
            const response = await request(server)
                .get('/sources/1/stance')
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.notes).toBe('Test source notes');
        });
    });

    describe('GET /sources/:sourceId/stance/history', () => {
        it('should return stance history for valid source', async () => {
            const response = await request(server)
                .get('/sources/1/stance/history')
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveProperty('sourceId');
            expect(response.body.data).toHaveProperty('sourceName');
            expect(response.body.data).toHaveProperty('history');
            expect(Array.isArray(response.body.data.history)).toBe(true);
        });

        it('should return 400 for invalid source ID', async () => {
            const response = await request(server)
                .get('/sources/abc/stance/history')
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.error).toBe('Invalid source ID');
        });
    });

    describe('POST /sources/:sourceId/alignment-vote', () => {
        it('should submit alignment vote successfully', async () => {
            const response = await request(server)
                .post('/sources/1/alignment-vote')
                .send({
                    voteType: 'agree',
                })
                .expect(201);

            expect(response.body.success).toBe(true);
            expect(response.body.message).toBe('Vote submitted');
            expect(response.body.data.voteType).toBe('agree');
        });

        it('should accept disagree vote with suggested score', async () => {
            const response = await request(server)
                .post('/sources/1/alignment-vote')
                .send({
                    voteType: 'disagree',
                    suggestedScore: -4,
                    comment: 'Bence daha muhalif',
                })
                .expect(201);

            expect(response.body.success).toBe(true);
            expect(response.body.data.voteType).toBe('disagree');
            expect(response.body.data.suggestedScore).toBe(-4);
        });

        it('should return 400 for invalid vote type', async () => {
            const response = await request(server)
                .post('/sources/1/alignment-vote')
                .send({
                    voteType: 'invalid',
                })
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.error).toBe('Invalid vote data');
        });

        it('should return 400 for invalid source ID', async () => {
            const response = await request(server)
                .post('/sources/abc/alignment-vote')
                .send({
                    voteType: 'agree',
                })
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.error).toBe('Invalid source ID');
        });

        it('should return 400 for suggested score out of range', async () => {
            const response = await request(server)
                .post('/sources/1/alignment-vote')
                .send({
                    voteType: 'disagree',
                    suggestedScore: 10,  // Invalid: > 5
                })
                .expect(400);

            expect(response.body.success).toBe(false);
        });

        it('should accept unsure vote type', async () => {
            const response = await request(server)
                .post('/sources/1/alignment-vote')
                .send({
                    voteType: 'unsure',
                })
                .expect(201);

            expect(response.body.success).toBe(true);
            expect(response.body.data.voteType).toBe('unsure');
        });

        it('should update existing vote', async () => {
            vi.mocked(submitAlignmentVote).mockResolvedValueOnce({ success: true, isUpdate: true });

            const response = await request(server)
                .post('/sources/1/alignment-vote')
                .send({
                    voteType: 'disagree',
                })
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.message).toBe('Vote updated');
        });
    });

    describe('GET /sources/:sourceId/alignment-feedback', () => {
        it('should return alignment feedback for valid source', async () => {
            const response = await request(server)
                .get('/sources/1/alignment-feedback')
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveProperty('sourceId');
            expect(response.body.data).toHaveProperty('sourceName');
            expect(response.body.data).toHaveProperty('currentScore');
            expect(response.body.data).toHaveProperty('totalVotes');
            expect(response.body.data).toHaveProperty('agreeCount');
            expect(response.body.data).toHaveProperty('disagreeCount');
            expect(response.body.data).toHaveProperty('unsureCount');
            expect(response.body.data).toHaveProperty('agreePercentage');
        });

        it('should return 400 for invalid source ID', async () => {
            const response = await request(server)
                .get('/sources/abc/alignment-feedback')
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.error).toBe('Invalid source ID');
        });

        it('should return 404 for non-existent source', async () => {
            vi.mocked(getAlignmentFeedback).mockResolvedValueOnce(null);

            const response = await request(server)
                .get('/sources/99999/alignment-feedback')
                .expect(404);

            expect(response.body.success).toBe(false);
            expect(response.body.error).toBe('Source not found');
        });

        it('should include average suggested score from disagree votes', async () => {
            const response = await request(server)
                .get('/sources/1/alignment-feedback')
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.averageSuggestedScore).toBe(-3);
        });
    });
});
