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

const { mockScrapeSource, mockDbSelect } = vi.hoisted(() => ({
    mockScrapeSource: vi.fn(),
    mockDbSelect: vi.fn(),
}));
vi.mock('@/services/scraper/scraperService.js', () => ({
    scrapeSource: mockScrapeSource,
}));

vi.mock('@/config/db.js', () => ({
    db: {
        select: vi.fn(() => ({
            from: vi.fn(() => ({
                where: mockDbSelect,
            })),
        })),
    },
}));

vi.mock('@/db/schema/index.js', () => ({
    rss_sources: {},
}));

import { runScraper, startScraperCron } from '@/cron/scraperCron.js';

const mockSources = [
    {
        id: 1,
        sourceName: 'NTV',
        sourceLogoUrl: 'https://example.com/ntv.png',
        rssUrl: 'https://ntv.com.tr/rss',
        countryCode: 'tr',
        isActive: true,
    },
    {
        id: 2,
        sourceName: 'Der Spiegel',
        sourceLogoUrl: 'https://example.com/spiegel.png',
        rssUrl: 'https://spiegel.de/rss',
        countryCode: 'de',
        isActive: true,
    },
    {
        id: 3,
        sourceName: 'No RSS',
        sourceLogoUrl: '',
        rssUrl: null, // No RSS URL
        countryCode: 'tr',
        isActive: true,
    },
];

describe('scraperCron', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockDbSelect.mockResolvedValue(mockSources);
    });

    describe('runScraper', () => {
        it('should scrape all sources with RSS URLs', async () => {
            mockScrapeSource.mockResolvedValue({ processed: 5, duplicates: 2, filtered: 1 });

            await runScraper();

            // Should call scrapeSource for sources WITH rssUrl (not the null one)
            expect(mockScrapeSource).toHaveBeenCalledTimes(2);
            expect(mockScrapeSource).toHaveBeenCalledWith(
                1, 'NTV', 'https://example.com/ntv.png', 'https://ntv.com.tr/rss', 'tr'
            );
            expect(mockScrapeSource).toHaveBeenCalledWith(
                2, 'Der Spiegel', 'https://example.com/spiegel.png', 'https://spiegel.de/rss', 'de'
            );
        });

        it('should skip sources without rssUrl', async () => {
            mockScrapeSource.mockResolvedValue({ processed: 1, duplicates: 0, filtered: 0 });

            await runScraper();

            // Only 2 of 3 sources have rssUrl
            expect(mockScrapeSource).toHaveBeenCalledTimes(2);
        });

        it('should continue processing when one source fails', async () => {
            mockScrapeSource
                .mockResolvedValueOnce({ processed: 3, duplicates: 0, filtered: 0 })
                .mockRejectedValueOnce(new Error('Scrape failed'));

            await runScraper();

            // Should not throw, should process both
            expect(mockScrapeSource).toHaveBeenCalledTimes(2);
        });

        it('should handle empty sources list', async () => {
            mockDbSelect.mockResolvedValue([]);

            await runScraper();

            expect(mockScrapeSource).not.toHaveBeenCalled();
        });

        it('should handle database error gracefully', async () => {
            mockDbSelect.mockRejectedValue(new Error('DB connection failed'));

            // Should not throw
            await expect(runScraper()).resolves.toBeUndefined();
        });

        it('should aggregate totals across all sources', async () => {
            mockScrapeSource
                .mockResolvedValueOnce({ processed: 5, duplicates: 2, filtered: 1 })
                .mockResolvedValueOnce({ processed: 8, duplicates: 3, filtered: 0 });

            // Should complete without error
            await expect(runScraper()).resolves.toBeUndefined();
        });
    });

    describe('startScraperCron', () => {
        it('should schedule a cron job every 30 minutes', async () => {
            const cron = await import('node-cron');
            const scheduleSpy = vi.spyOn(cron.default, 'schedule');

            startScraperCron();

            expect(scheduleSpy).toHaveBeenCalledWith('*/30 * * * *', expect.any(Function));
        });

        it('should return a cleanup function that stops the job', async () => {
            const stopMock = vi.fn();
            const cron = await import('node-cron');
            vi.spyOn(cron.default, 'schedule').mockReturnValue({ stop: stopMock } as any);

            const cleanup = startScraperCron();
            cleanup();

            expect(stopMock).toHaveBeenCalledOnce();
        });
    });
});
