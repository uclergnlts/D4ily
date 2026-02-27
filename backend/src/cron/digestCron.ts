import cron from 'node-cron';
import { logger } from '../config/logger.js';
import { generateAllDigests } from '../services/digestService.js';
import { sendDigestNotifications } from '../services/digestNotificationService.js';
import { addCronLog } from '../routes/admin.js';

/**
 * Digest Cron Job
 * Runs at 07:00 every day to generate the daily digest
 */
export function startDigestCron() {
    const runDigest = async () => {
        const period = 'daily';
        logger.info({ period }, 'Starting daily digest generation...');

        try {
            const results = await generateAllDigests(period);
            const successful = results.filter(r => r.success).length;
            const failed = results.filter(r => !r.success).length;

            logger.info({ period, successful, failed, results }, 'Daily digest generation completed');

            addCronLog({
                jobName: 'digest',
                status: failed === 0 ? 'success' : 'error',
                message: `${successful} successful, ${failed} failed`,
            });

            if (successful > 0) {
                try {
                    await sendDigestNotifications();
                } catch (notifError) {
                    logger.error({ error: notifError, period }, 'Failed to send digest notifications');
                }
            }
        } catch (error) {
            logger.error({ error, period }, 'Daily digest generation failed');
            addCronLog({
                jobName: 'digest',
                status: 'error',
                message: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    };

    const dailyJob = cron.schedule('0 19 * * *', async () => {
        await runDigest();
    }, {
        timezone: 'Europe/Istanbul',
    });

    logger.info('Digest cron job started (19:00 daily)');

    return () => {
        dailyJob.stop();
        logger.info('Digest cron job stopped');
    };
}

/**
 * Manual trigger for testing
 */
export async function triggerDigestManually(_period: 'morning' | 'evening' | 'daily' = 'daily') {
    const period = 'daily';
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
