import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const { mockGenerateWeeklyComparison, mockSchedule } = vi.hoisted(() => ({
    mockGenerateWeeklyComparison: vi.fn(),
    mockSchedule: vi.fn(),
}));

vi.mock('@/services/weeklyService.js', () => ({
    generateWeeklyComparison: mockGenerateWeeklyComparison,
}));

vi.mock('node-cron', () => ({
    default: {
        schedule: mockSchedule,
    },
}));

vi.mock('@/config/logger.js', () => ({
    logger: {
        info: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
        debug: vi.fn(),
    },
}));

import { startWeeklyCron, triggerWeeklyManually } from '@/cron/weeklyCron.js';

describe('Weekly Cron', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockSchedule.mockReturnValue({ stop: vi.fn() });
    });

    describe('startWeeklyCron', () => {
        it('should schedule a weekly cron job', () => {
            startWeeklyCron();

            expect(mockSchedule).toHaveBeenCalledTimes(1);
            expect(mockSchedule).toHaveBeenCalledWith(
                '0 20 * * 0',
                expect.any(Function),
                expect.objectContaining({ timezone: 'Europe/Istanbul' })
            );
        });

        it('should return a cleanup function', () => {
            const stopMock = vi.fn();
            mockSchedule.mockReturnValue({ stop: stopMock });

            const cleanup = startWeeklyCron();
            expect(typeof cleanup).toBe('function');

            cleanup();
            expect(stopMock).toHaveBeenCalled();
        });

        it('should handle successful weekly generation in cron callback', async () => {
            mockGenerateWeeklyComparison.mockResolvedValue({
                success: true,
                id: 'weekly-123',
            });

            let cronCallback: Function;
            mockSchedule.mockImplementation((_pattern: string, cb: Function) => {
                cronCallback = cb;
                return { stop: vi.fn() };
            });

            startWeeklyCron();
            await cronCallback!();

            expect(mockGenerateWeeklyComparison).toHaveBeenCalledTimes(1);
        });

        it('should handle failed weekly generation in cron callback', async () => {
            mockGenerateWeeklyComparison.mockResolvedValue({
                success: false,
                error: 'Generation failed',
            });

            let cronCallback: Function;
            mockSchedule.mockImplementation((_pattern: string, cb: Function) => {
                cronCallback = cb;
                return { stop: vi.fn() };
            });

            startWeeklyCron();
            await cronCallback!();

            expect(mockGenerateWeeklyComparison).toHaveBeenCalledTimes(1);
        });

        it('should handle errors in cron callback', async () => {
            mockGenerateWeeklyComparison.mockRejectedValue(new Error('Unexpected error'));

            let cronCallback: Function;
            mockSchedule.mockImplementation((_pattern: string, cb: Function) => {
                cronCallback = cb;
                return { stop: vi.fn() };
            });

            startWeeklyCron();
            // Should not throw
            await cronCallback!();
        });
    });

    describe('triggerWeeklyManually', () => {
        it('should trigger weekly comparison and return result', async () => {
            const mockResult = { success: true, id: 'weekly-456' };
            mockGenerateWeeklyComparison.mockResolvedValue(mockResult);

            const result = await triggerWeeklyManually();

            expect(result).toEqual(mockResult);
            expect(mockGenerateWeeklyComparison).toHaveBeenCalledTimes(1);
        });

        it('should return error on failure', async () => {
            mockGenerateWeeklyComparison.mockRejectedValue(new Error('Service failed'));

            const result = await triggerWeeklyManually();

            expect(result.success).toBe(false);
            expect(result.error).toBe('Service failed');
        });

        it('should handle non-Error exceptions', async () => {
            mockGenerateWeeklyComparison.mockRejectedValue('string error');

            const result = await triggerWeeklyManually();

            expect(result.success).toBe(false);
            expect(result.error).toBe('Unknown error');
        });
    });
});
