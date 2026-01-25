import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock OpenAI
vi.mock('@/config/openai.js', () => ({
    openai: {
        chat: {
            completions: {
                create: vi.fn().mockResolvedValue({
                    choices: [{
                        message: {
                            content: JSON.stringify({
                                summary: 'Test digest summary',
                                top_topics: ['#Economy', '#Politics'],
                            }),
                        },
                    }],
                }),
            },
        },
    },
}));

// Mock Logger
vi.mock('@/config/logger.js', () => ({
    logger: {
        info: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
    },
}));

// Mock DB
vi.mock('@/config/db.js', () => {
    const mockDigest = {
        id: 'digest-1',
        countryCode: 'tr',
        period: 'morning',
        digestDate: '2026-01-22',
        summaryText: 'Test summary',
        topTopics: JSON.stringify(['#Test']),
        articleCount: 10,
        createdAt: new Date(),
    };

    const createQueryBuilder = () => ({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        get: vi.fn().mockResolvedValue(mockDigest),
        then: (resolve: any) => resolve([{ translatedTitle: 'Test', summary: 'Summary', categoryId: 1 }]),
        values: vi.fn().mockReturnThis(),
        set: vi.fn().mockReturnThis(),
    });

    return {
        db: {
            select: vi.fn(() => createQueryBuilder()),
            insert: vi.fn(() => createQueryBuilder()),
            update: vi.fn(() => createQueryBuilder()),
        }
    };
});

import { getLatestDigest, getDigestByDateAndPeriod } from '@/services/digestService.js';

describe('Digest Service', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('getLatestDigest', () => {
        it('should return latest digest for TR', async () => {
            const digest = await getLatestDigest('tr');
            expect(digest).toBeDefined();
            expect(digest?.id).toBe('digest-1');
        });

        it('should return latest digest for DE', async () => {
            const digest = await getLatestDigest('de');
            expect(digest).toBeDefined();
        });

        it('should return latest digest for US', async () => {
            const digest = await getLatestDigest('us');
            expect(digest).toBeDefined();
        });
    });

    describe('getDigestByDateAndPeriod', () => {
        it('should return digest for specific date and morning period', async () => {
            const digest = await getDigestByDateAndPeriod('tr', '2026-01-22', 'morning');
            expect(digest).toBeDefined();
        });

        it('should return digest for specific date and evening period', async () => {
            const digest = await getDigestByDateAndPeriod('tr', '2026-01-22', 'evening');
            expect(digest).toBeDefined();
        });
    });
});
