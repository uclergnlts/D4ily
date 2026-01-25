import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Logger
vi.mock('@/config/logger.js', () => ({
    logger: {
        info: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
    },
}));

// Mock OpenAI
vi.mock('@/config/openai.js', () => ({
    openai: {
        chat: {
            completions: {
                create: vi.fn().mockResolvedValue({
                    choices: [{
                        message: {
                            content: JSON.stringify({
                                comparison: 'Test comparison',
                                highlights: ['Highlight 1'],
                            }),
                        },
                    }],
                }),
            },
        },
    },
}));

// Mock DB
vi.mock('@/config/db.js', () => {
    const mockWeekly = {
        id: 'weekly-1',
        weekStart: '2026-01-13',
        weekEnd: '2026-01-19',
        countriesData: JSON.stringify({ tr: {}, de: {}, us: {} }),
        createdAt: new Date(),
    };

    const createQueryBuilder = () => ({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        get: vi.fn().mockResolvedValue(mockWeekly),
        then: (resolve: any) => resolve([mockWeekly]),
        values: vi.fn().mockReturnThis(),
    });

    return {
        db: {
            select: vi.fn(() => createQueryBuilder()),
            insert: vi.fn(() => createQueryBuilder()),
        }
    };
});

import { getLatestWeeklyComparison, getWeeklyComparisonByWeek } from '@/services/weeklyService.js';

describe('Weekly Service', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('getLatestWeeklyComparison', () => {
        it('should return latest weekly comparison', async () => {
            const comparison = await getLatestWeeklyComparison();
            expect(comparison).toBeDefined();
            expect(comparison?.id).toBe('weekly-1');
        });
    });

    describe('getWeeklyComparisonByWeek', () => {
        it('should return weekly comparison for specific week', async () => {
            const comparison = await getWeeklyComparisonByWeek('2026-01-13');
            expect(comparison).toBeDefined();
        });
    });
});
