import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/config/logger.js', () => ({
    logger: {
        info: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
    },
}));

vi.mock('node-cron', () => ({
    default: {
        schedule: vi.fn(() => ({ stop: vi.fn() })),
    },
}));

const { mockGenerateAllDigests } = vi.hoisted(() => ({
    mockGenerateAllDigests: vi.fn(),
}));
vi.mock('@/services/digestService.js', () => ({
    generateAllDigests: mockGenerateAllDigests,
}));

import { triggerDigestManually, startDigestCron } from '@/cron/digestCron.js';

describe('digestCron', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('triggerDigestManually', () => {
        it('should return success when digest generation succeeds', async () => {
            const mockResults = [
                { success: true, country: 'tr' },
                { success: true, country: 'de' },
            ];
            mockGenerateAllDigests.mockResolvedValue(mockResults);

            const result = await triggerDigestManually('morning');

            expect(result.success).toBe(true);
            expect(result.results).toEqual(mockResults);
            expect(mockGenerateAllDigests).toHaveBeenCalledWith('daily');
        });

        it('should normalize legacy period to daily', async () => {
            mockGenerateAllDigests.mockResolvedValue([{ success: true, country: 'tr' }]);

            await triggerDigestManually('evening');

            expect(mockGenerateAllDigests).toHaveBeenCalledWith('daily');
        });

        it('should return failure when generateAllDigests throws', async () => {
            mockGenerateAllDigests.mockRejectedValue(new Error('OpenAI API error'));

            const result = await triggerDigestManually('morning');

            expect(result.success).toBe(false);
            expect(result.error).toBe('OpenAI API error');
        });

        it('should handle non-Error exceptions', async () => {
            mockGenerateAllDigests.mockRejectedValue('string error');

            const result = await triggerDigestManually('morning');

            expect(result.success).toBe(false);
            expect(result.error).toBe('Unknown error');
        });

        it('should return partial success results from generateAllDigests', async () => {
            const mockResults = [
                { success: true, country: 'tr' },
                { success: false, country: 'de', error: 'AI failed' },
                { success: true, country: 'us' },
            ];
            mockGenerateAllDigests.mockResolvedValue(mockResults);

            const result = await triggerDigestManually('morning');

            expect(result.success).toBe(true);
            expect(result.results).toHaveLength(3);
        });
    });

    describe('startDigestCron', () => {
        it('should schedule one daily cron job', async () => {
            const cron = await import('node-cron');
            const scheduleSpy = vi.spyOn(cron.default, 'schedule');

            startDigestCron();

            expect(scheduleSpy).toHaveBeenCalledTimes(1);
            expect(scheduleSpy).toHaveBeenCalledWith(
                '0 19 * * *',
                expect.any(Function),
                expect.objectContaining({ timezone: 'Europe/Istanbul' })
            );
        });

        it('should return a cleanup function that stops the job', async () => {
            const stopMock = vi.fn();
            const cron = await import('node-cron');
            vi.spyOn(cron.default, 'schedule').mockReturnValue({ stop: stopMock } as any);

            const cleanup = startDigestCron();
            cleanup();

            expect(stopMock).toHaveBeenCalledTimes(1);
        });
    });
});
