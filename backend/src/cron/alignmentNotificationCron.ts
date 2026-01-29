import cron from 'node-cron';
import { logger } from '../config/logger.js';
import {
    processPendingAlignmentNotifications,
    getPendingNotificationCount,
    retryFailedNotifications,
} from '../services/alignmentNotificationService.js';

/**
 * Start the alignment notification cron job
 * Runs every 5 minutes to process pending notifications
 */
export function startAlignmentNotificationCron() {
    // Process pending notifications every 5 minutes
    const processingJob = cron.schedule('*/5 * * * *', async () => {
        logger.info('Starting alignment notification processing...');

        try {
            // Get current counts for logging
            const beforeCounts = await getPendingNotificationCount();
            logger.info({
                pending: beforeCounts.pending,
                failed: beforeCounts.failed,
            }, 'Notification queue status');

            // Process pending notifications
            const result = await processPendingAlignmentNotifications(50);

            logger.info({
                sent: result.sent,
                failed: result.failed,
            }, 'Alignment notification processing completed');
        } catch (error) {
            logger.error({ error }, 'Alignment notification processing failed');
        }
    });

    // Retry failed notifications every hour
    const retryJob = cron.schedule('0 * * * *', async () => {
        logger.info('Retrying failed alignment notifications...');

        try {
            const retried = await retryFailedNotifications(20);
            if (retried > 0) {
                logger.info({ count: retried }, 'Failed notifications queued for retry');
            }
        } catch (error) {
            logger.error({ error }, 'Failed to retry notifications');
        }
    });

    logger.info('Alignment notification cron jobs started (runs every 5 minutes)');
    
    // Return cleanup function
    return () => {
        processingJob.stop();
        retryJob.stop();
        logger.info('Alignment notification cron jobs stopped');
    };
}

/**
 * Manually trigger notification processing (for testing)
 */
export async function triggerNotificationProcessing(): Promise<{
    sent: number;
    failed: number;
}> {
    logger.info('Manual notification processing triggered');
    return await processPendingAlignmentNotifications(100);
}
