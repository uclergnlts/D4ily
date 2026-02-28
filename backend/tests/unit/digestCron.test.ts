import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@/config/logger.js', () => ({
    logger: {
        info: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
    },
}));

const {
    mockSchedule,
    mockStop,
    mockGenerateDailyDigest,
    mockGetDigestByDate,
    mockGetDigestDateString,
    mockAddCronLog,
} = vi.hoisted(() => ({
    mockSchedule: vi.fn(() => ({ stop: vi.fn() })),
    mockStop: vi.fn(),
    mockGenerateDailyDigest: vi.fn(),
    mockGetDigestByDate: vi.fn(() => Promise.resolve({ id: 'existing-digest' })),
    mockGetDigestDateString: vi.fn(() => '2026-02-28'),
    mockAddCronLog: vi.fn(),
}));

vi.mock('node-cron', () => ({
    default: {
        schedule: mockSchedule,
    },
}));

vi.mock('@/routes/admin.js', () => ({
    addCronLog: mockAddCronLog,
}));

vi.mock('@/services/digestNotificationService.js', () => ({
    sendDigestNotifications: vi.fn(),
}));

vi.mock('@/services/digestService.js', () => ({
    generateAllDigests: vi.fn(),
    generateDailyDigest: mockGenerateDailyDigest,
    getDigestByDate: mockGetDigestByDate,
    getDigestDateString: mockGetDigestDateString,
}));

describe('digestCron', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.clearAllMocks();
        vi.resetModules();
        mockGetDigestByDate.mockResolvedValue({ id: 'existing-digest' });
        mockGenerateDailyDigest.mockResolvedValue({ id: 'generated-digest', success: true });
        mockSchedule.mockReturnValue({ stop: vi.fn() });
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    describe('triggerDigestManually', () => {
        it('should return success when all countries generate successfully', async () => {
            const { triggerDigestManually } = await import('@/cron/digestCron.js');

            const promise = triggerDigestManually('morning');
            await vi.advanceTimersByTimeAsync(30000);
            const result = await promise;

            expect(result.success).toBe(true);
            // Generates for all 8 countries (tr, de, us, uk, fr, es, it, ru)
            expect(mockGenerateDailyDigest).toHaveBeenCalledTimes(8);
        });

        it('should normalize legacy period to daily', async () => {
            const { triggerDigestManually } = await import('@/cron/digestCron.js');

            const promise = triggerDigestManually('evening');
            await vi.advanceTimersByTimeAsync(30000);
            await promise;

            // All calls should use 'daily' period regardless of input
            for (const call of mockGenerateDailyDigest.mock.calls) {
                expect(call[1]).toBe('daily');
            }
        });

        it('should handle per-country errors gracefully', async () => {
            const { triggerDigestManually } = await import('@/cron/digestCron.js');
            mockGenerateDailyDigest.mockRejectedValue(new Error('OpenAI API error'));

            const promise = triggerDigestManually('morning');
            await vi.advanceTimersByTimeAsync(30000);
            const result = await promise;

            // Function catches per-country errors and continues
            expect(result.success).toBe(true);
            expect(mockGenerateDailyDigest).toHaveBeenCalledTimes(8);
            if ('failed' in result) {
                expect(result.failed).toBe(8);
            }
        });

        it('should handle non-Error exceptions per country', async () => {
            const { triggerDigestManually } = await import('@/cron/digestCron.js');
            mockGenerateDailyDigest.mockRejectedValue('string error');

            const promise = triggerDigestManually('morning');
            await vi.advanceTimersByTimeAsync(30000);
            const result = await promise;

            expect(result.success).toBe(true);
            if ('failed' in result) {
                expect(result.failed).toBe(8);
            }
        });

        it('should return partial success with mixed results', async () => {
            const { triggerDigestManually } = await import('@/cron/digestCron.js');

            let callCount = 0;
            mockGenerateDailyDigest.mockImplementation(async () => {
                callCount++;
                if (callCount <= 3) {
                    return { id: `digest-${callCount}`, success: true };
                }
                return { id: '', success: false, error: 'AI failed' };
            });

            const promise = triggerDigestManually('morning');
            await vi.advanceTimersByTimeAsync(30000);
            const result = await promise;

            expect(result.success).toBe(true);
            if ('successful' in result && 'failed' in result) {
                expect(result.successful).toBe(3);
                expect(result.failed).toBe(5);
            }
        });

        it('should reject concurrent runs', async () => {
            const { triggerDigestManually } = await import('@/cron/digestCron.js');

            // Slow mock that takes 1s per country
            mockGenerateDailyDigest.mockImplementation(
                () => new Promise(resolve => setTimeout(() => resolve({ id: 'x', success: true }), 1000))
            );

            const firstRun = triggerDigestManually('daily');
            // Advance a bit so first run is in progress
            await vi.advanceTimersByTimeAsync(500);

            // Second run should be rejected
            const secondResult = await triggerDigestManually('daily');
            expect(secondResult.success).toBe(false);
            expect(secondResult.error).toBe('Digest generation already in progress');

            // Let first run complete
            await vi.advanceTimersByTimeAsync(60000);
            await firstRun;
        });
    });

    describe('startDigestCron', () => {
        it('should schedule daily and recovery cron jobs', async () => {
            const { startDigestCron } = await import('@/cron/digestCron.js');

            startDigestCron();

            expect(mockSchedule).toHaveBeenCalledTimes(2);
            expect(mockSchedule).toHaveBeenNthCalledWith(
                1,
                '0 19 * * *',
                expect.any(Function),
                expect.objectContaining({ timezone: 'Europe/Istanbul' })
            );
            expect(mockSchedule).toHaveBeenNthCalledWith(
                2,
                '*/30 * * * *',
                expect.any(Function),
                expect.objectContaining({ timezone: 'Europe/Istanbul' })
            );
        });

        it('should return a cleanup function that stops both jobs', async () => {
            const stopMock = vi.fn();
            mockSchedule.mockReturnValue({ stop: stopMock });
            const { startDigestCron } = await import('@/cron/digestCron.js');

            const cleanup = startDigestCron();
            cleanup();

            expect(stopMock).toHaveBeenCalledTimes(2);
        });
    });
});
