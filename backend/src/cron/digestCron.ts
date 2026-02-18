import cron from 'node-cron';
import { logger } from '../config/logger.js';
import { generateAllDigests } from '../services/digestService.js';
import { sendDigestNotifications } from '../services/digestNotificationService.js';

/**
 * Digest Cron Job
 * Runs at 07:00 every day to generate the daily digest
 */
export function startDigestCron() {
    const morningJob = cron.schedule('0 7 * * *', async () => {
        logger.info('Starting daily digest generation...');

        try {
            const results = await generateAllDigests('morning');
            const successful = results.filter(r => r.success).length;
            const failed = results.filter(r => !r.success).length;

            logger.info({ successful, failed, results }, 'Daily digest generation completed');

            if (successful > 0) {
                try {
                    await sendDigestNotifications('morning');
                } catch (notifError) {
                    logger.error({ error: notifError }, 'Failed to send digest notifications');
                }
            }
        } catch (error) {
            logger.error({ error }, 'Daily digest generation failed');
        }
    }, {
        timezone: 'Europe/Istanbul',
    });

    logger.info('Digest cron job started (07:00 daily)');

    return () => {
        morningJob.stop();
        logger.info('Digest cron job stopped');
    };
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
