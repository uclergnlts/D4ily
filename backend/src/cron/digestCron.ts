import cron from 'node-cron';
import { logger } from '../config/logger.js';
import { generateAllDigests } from '../services/digestService.js';

/**
 * Digest Cron Job
 * Runs at 07:00 and 19:00 every day to generate daily digests
 */
export function startDigestCron() {
    // Morning digest at 07:00
    cron.schedule('0 7 * * *', async () => {
        logger.info('Starting morning digest generation...');

        try {
            const results = await generateAllDigests('morning');
            const successful = results.filter(r => r.success).length;
            const failed = results.filter(r => !r.success).length;

            logger.info({ successful, failed, results }, 'Morning digest generation completed');
        } catch (error) {
            logger.error({ error }, 'Morning digest generation failed');
        }
    }, {
        timezone: 'Europe/Istanbul', // Adjust timezone as needed
    });

    // Evening digest at 19:00
    cron.schedule('0 19 * * *', async () => {
        logger.info('Starting evening digest generation...');

        try {
            const results = await generateAllDigests('evening');
            const successful = results.filter(r => r.success).length;
            const failed = results.filter(r => !r.success).length;

            logger.info({ successful, failed, results }, 'Evening digest generation completed');
        } catch (error) {
            logger.error({ error }, 'Evening digest generation failed');
        }
    }, {
        timezone: 'Europe/Istanbul',
    });

    logger.info('Digest cron jobs started (07:00 and 19:00 daily)');
}

/**
 * Manual trigger for testing
 */
export async function triggerDigestManually(period: 'morning' | 'evening') {
    logger.info({ period }, 'Manual digest generation triggered');

    try {
        const results = await generateAllDigests(period);
        return {
            success: true,
            results,
        };
    } catch (error) {
        logger.error({ error }, 'Manual digest generation failed');
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}
