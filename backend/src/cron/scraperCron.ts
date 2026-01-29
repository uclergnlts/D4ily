import cron from 'node-cron';
import { db } from '../config/db.js';
import { rss_sources } from '../db/schema/index.js';
import { eq } from 'drizzle-orm';
import { scrapeSource } from '../services/scraper/scraperService.js';
import { logger } from '../config/logger.js';

export function startScraperCron() {
    // Run every 30 minutes
    const scraperJob = cron.schedule('*/30 * * * *', async () => {
        logger.info('Starting scheduled scraping...');
        await runScraper();
    });

    logger.info('Scraper cron job started (runs every 30 minutes)');
    
    // Return cleanup function
    return () => {
        scraperJob.stop();
        logger.info('Scraper cron job stopped');
    };
}

export async function runScraper() {
    try {
        // Get all active sources
        const sources = await db
            .select()
            .from(rss_sources)
            .where(eq(rss_sources.isActive, true));

        logger.info({ sourceCount: sources.length }, 'Found active sources');

        let totalProcessed = 0;
        let totalDuplicates = 0;
        let totalFiltered = 0;

        for (const source of sources) {
            if (!source.rssUrl) {
                logger.warn({ sourceId: source.id }, 'Source has no RSS URL, skipping');
                continue;
            }

            try {
                const result = await scrapeSource(
                    source.id,
                    source.sourceName,
                    source.sourceLogoUrl,
                    source.rssUrl,
                    source.countryCode as 'tr' | 'de' | 'us'
                );

                totalProcessed += result.processed;
                totalDuplicates += result.duplicates;
                totalFiltered += result.filtered;

                // Wait 2 seconds between sources to avoid rate limiting
                await new Promise(resolve => setTimeout(resolve, 2000));
            } catch (error) {
                logger.error({ error, sourceId: source.id }, 'Failed to scrape source');
            }
        }

        logger.info({
            totalProcessed,
            totalDuplicates,
            totalFiltered,
        }, 'Scraping cycle completed');
    } catch (error) {
        logger.error({ error }, 'Scraping cycle failed');
    }
}

