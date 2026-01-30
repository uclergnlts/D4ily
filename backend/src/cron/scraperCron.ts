import cron from 'node-cron';
import { db } from '../config/db.js';
import { rss_sources } from '../db/schema/index.js';
import { eq } from 'drizzle-orm';
import { scrapeSource } from '../services/scraper/scraperService.js';
import { logger } from '../config/logger.js';

// Process sources in parallel batches to improve performance
const BATCH_SIZE = 5;

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

        logger.info({ sourceCount: sources.length, batchSize: BATCH_SIZE }, 'Found active sources');

        let totalProcessed = 0;
        let totalDuplicates = 0;
        let totalFiltered = 0;

        // Process sources in parallel batches
        for (let i = 0; i < sources.length; i += BATCH_SIZE) {
            const batch = sources.slice(i, i + BATCH_SIZE);
            
            logger.info({
                batchIndex: Math.floor(i / BATCH_SIZE) + 1,
                totalBatches: Math.ceil(sources.length / BATCH_SIZE),
                batchSize: batch.length
            }, 'Processing batch');

            // Process batch in parallel
            const batchResults = await Promise.allSettled(
                batch.map(async (source) => {
                    if (!source.rssUrl) {
                        logger.warn({ sourceId: source.id }, 'Source has no RSS URL, skipping');
                        return { processed: 0, duplicates: 0, filtered: 0 };
                    }

                    try {
                        const result = await scrapeSource(
                            source.id,
                            source.sourceName,
                            source.sourceLogoUrl,
                            source.rssUrl,
                            source.countryCode as 'tr' | 'de' | 'us' | 'uk' | 'fr' | 'es' | 'it' | 'ru'
                        );

                        logger.info({
                            sourceId: source.id,
                            sourceName: source.sourceName,
                            ...result
                        }, 'Source scraped successfully');

                        return result;
                    } catch (error) {
                        logger.error({ error, sourceId: source.id, sourceName: source.sourceName }, 'Failed to scrape source');
                        return { processed: 0, duplicates: 0, filtered: 0 };
                    }
                })
            );

            // Aggregate results from batch
            for (const result of batchResults) {
                if (result.status === 'fulfilled') {
                    totalProcessed += result.value.processed;
                    totalDuplicates += result.value.duplicates;
                    totalFiltered += result.value.filtered;
                }
            }

            // Small delay between batches to avoid overwhelming the system
            if (i + BATCH_SIZE < sources.length) {
                await new Promise(resolve => setTimeout(resolve, 1000));
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

