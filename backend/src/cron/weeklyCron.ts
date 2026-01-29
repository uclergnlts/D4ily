import cron from 'node-cron';
import { logger } from '../config/logger.js';
import { generateWeeklyComparison } from '../services/weeklyService.js';

/**
 * Weekly Comparison Cron Job
 * Runs every Sunday at 20:00 to generate weekly comparison
 */
export function startWeeklyCron() {
    // Sunday at 20:00
    const weeklyJob = cron.schedule('0 20 * * 0', async () => {
        logger.info('Starting weekly comparison generation...');

        try {
            const result = await generateWeeklyComparison();

            if (result.success) {
                logger.info({ comparisonId: result.id }, 'Weekly comparison generated successfully');
            } else {
                logger.error({ error: result.error }, 'Weekly comparison generation failed');
            }
        } catch (error) {
            logger.error({ error }, 'Weekly comparison cron job failed');
        }
    }, {
        timezone: 'Europe/Istanbul', // Adjust timezone as needed
    });

    logger.info('Weekly comparison cron job started (Sunday 20:00)');
    
    // Return cleanup function
    return () => {
        weeklyJob.stop();
        logger.info('Weekly cron job stopped');
    };
}

/**
 * Manual trigger for testing
 */
export async function triggerWeeklyManually() {
    logger.info('Manual weekly comparison triggered');

    try {
        const result = await generateWeeklyComparison();
        return result;
    } catch (error) {
        logger.error({ error }, 'Manual weekly generation failed');
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}
