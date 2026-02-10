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
            expect(mockGenerateAllDigests).toHaveBeenCalledWith('morning');
        });

        it('should trigger evening period correctly', async () => {
            mockGenerateAllDigests.mockResolvedValue([{ success: true, country: 'tr' }]);

            await triggerDigestManually('evening');

            expect(mockGenerateAllDigests).toHaveBeenCalledWith('evening');
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
        it('should schedule two cron jobs (morning and evening)', async () => {
            const cron = await import('node-cron');
            const scheduleSpy = vi.spyOn(cron.default, 'schedule');

            startDigestCron();

            expect(scheduleSpy).toHaveBeenCalledTimes(2);
            // Morning at 07:00
            expect(scheduleSpy).toHaveBeenCalledWith(
                '0 7 * * *',
                expect.any(Function),
                expect.objectContaining({ timezone: 'Europe/Istanbul' })
            );
            // Evening at 19:00
            expect(scheduleSpy).toHaveBeenCalledWith(
                '0 19 * * *',
                expect.any(Function),
                expect.objectContaining({ timezone: 'Europe/Istanbul' })
            );
        });

        it('should return a cleanup function that stops both jobs', async () => {
            const stopMock = vi.fn();
            const cron = await import('node-cron');
            vi.spyOn(cron.default, 'schedule').mockReturnValue({ stop: stopMock } as any);

            const cleanup = startDigestCron();
            cleanup();

            expect(stopMock).toHaveBeenCalledTimes(2);
        });
    });
});
