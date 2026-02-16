import cron from 'node-cron';
import { logger } from '../config/logger.js';
import { generateAllDigests } from '../services/digestService.js';
import { sendDigestNotifications } from '../services/digestNotificationService.js';

/**
 * Digest Cron Job
 * Runs at 07:00 and 19:00 every day to generate daily digests
 */
export function startDigestCron() {
    // Morning digest at 07:00
    const morningJob = cron.schedule('0 7 * * *', async () => {
        logger.info('Starting morning digest generation...');

        try {
            const results = await generateAllDigests('morning');
            const successful = results.filter(r => r.success).length;
            const failed = results.filter(r => !r.success).length;

            logger.info({ successful, failed, results }, 'Morning digest generation completed');

            // Send push notifications for morning digest
            if (successful > 0) {
                try {
                    await sendDigestNotifications('morning');
                } catch (notifError) {
                    logger.error({ error: notifError }, 'Failed to send morning digest notifications');
                }
            }
        } catch (error) {
            logger.error({ error }, 'Morning digest generation failed');
        }
    }, {
        timezone: 'Europe/Istanbul',
    });

    // Evening digest at 19:00
    const eveningJob = cron.schedule('0 19 * * *', async () => {
        logger.info('Starting evening digest generation...');

        try {
            const results = await generateAllDigests('evening');
            const successful = results.filter(r => r.success).length;
            const failed = results.filter(r => !r.success).length;

            logger.info({ successful, failed, results }, 'Evening digest generation completed');

            // Send push notifications for evening digest
            if (successful > 0) {
                try {
                    await sendDigestNotifications('evening');
                } catch (notifError) {
                    logger.error({ error: notifError }, 'Failed to send evening digest notifications');
                }
            }
        } catch (error) {
            logger.error({ error }, 'Evening digest generation failed');
        }
    }, {
        timezone: 'Europe/Istanbul',
    });

    logger.info('Digest cron jobs started (07:00 and 19:00 daily)');
    
    // Return cleanup function
    return () => {
        morningJob.stop();
        eveningJob.stop();
        logger.info('Digest cron jobs stopped');
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
