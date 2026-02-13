import cron from 'node-cron';
import { logger } from '../config/logger.js';
import { scrapeAllTwitterAccounts } from '../services/scraper/tweetScraperService.js';

/**
 * Tweet Cron Job
 * Runs 30 minutes before digest generation to ensure fresh tweet data:
 * - 06:30 (before 07:00 morning digest)
 * - 18:30 (before 19:00 evening digest)
 */
export function startTweetCron() {
    // Morning tweet fetch at 06:30
    const morningJob = cron.schedule('30 6 * * *', async () => {
        logger.info('Starting morning tweet scraping...');
        try {
            await scrapeAllTwitterAccounts();
            logger.info('Morning tweet scraping completed');
        } catch (error) {
            logger.error({ error }, 'Morning tweet scraping failed');
        }
    }, {
        timezone: 'Europe/Istanbul',
    });

    // Evening tweet fetch at 18:30
    const eveningJob = cron.schedule('30 18 * * *', async () => {
        logger.info('Starting evening tweet scraping...');
        try {
            await scrapeAllTwitterAccounts();
            logger.info('Evening tweet scraping completed');
        } catch (error) {
            logger.error({ error }, 'Evening tweet scraping failed');
        }
    }, {
        timezone: 'Europe/Istanbul',
    });

    logger.info('Tweet cron jobs started (06:30 and 18:30 daily)');

    return () => {
        morningJob.stop();
        eveningJob.stop();
        logger.info('Tweet cron jobs stopped');
    };
}
