import cron from 'node-cron';
import { logger } from '../config/logger.js';
import { generateAllDigests, generateDailyDigest, getDigestByDate, getDigestDateString } from '../services/digestService.js';
import { sendDigestNotifications } from '../services/digestNotificationService.js';
import { addCronLog } from '../routes/admin.js';

const DIGEST_COUNTRIES = ['tr', 'de', 'us', 'uk', 'fr', 'es', 'it', 'ru'] as const;
type DigestCountry = typeof DIGEST_COUNTRIES[number];
const DIGEST_TIMEZONE = 'Europe/Istanbul';
let digestJobInProgress = false;

export function isDigestJobRunning() {
    return digestJobInProgress;
}

/**
 * Digest Cron Job
 * Runs at 19:00 every day to generate the daily digest
 */
export function startDigestCron() {
    const runDigest = async () => {
        if (digestJobInProgress) {
            logger.warn('Digest generation already in progress, skipping scheduled run');
            return;
        }

        const period = 'daily';
        logger.info({ period }, 'Starting daily digest generation...');
        digestJobInProgress = true;

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
        } finally {
            digestJobInProgress = false;
        }
    };

    const runRecoveryIfMissing = async (trigger: 'startup' | 'interval') => {
        if (digestJobInProgress) {
            logger.info({ trigger }, 'Digest generation already in progress, skipping recovery check');
            return;
        }

        const digestDate = getDigestDateString(new Date());
        const missingCountries: DigestCountry[] = [];

        for (const country of DIGEST_COUNTRIES) {
            const existing = await getDigestByDate(country, digestDate);
            if (!existing) {
                missingCountries.push(country);
            }
        }

        if (missingCountries.length === 0) {
            if (trigger === 'startup') {
                logger.info({ digestDate }, 'Startup digest recovery check passed: no missing countries');
            }
            return;
        }

        logger.warn({ trigger, digestDate, missingCountries }, 'Missing daily digest detected, starting recovery generation');
        digestJobInProgress = true;

        try {
            const results = [];
            for (let i = 0; i < missingCountries.length; i++) {
                const country = missingCountries[i];
                const result = await generateDailyDigest(country, 'daily');
                results.push({ country, ...result });
                // Brief pause between countries to avoid OpenAI rate limits
                if (i < missingCountries.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 3000));
                }
            }

            const successful = results.filter(r => r.success).length;
            const failed = results.filter(r => !r.success).length;

            logger.info({ trigger, digestDate, successful, failed, results }, 'Digest recovery generation completed');
            addCronLog({
                jobName: 'digest-recovery',
                status: failed === 0 ? 'success' : 'error',
                message: `${successful} successful, ${failed} failed`,
            });
        } catch (error) {
            logger.error({ error, trigger, digestDate }, 'Digest recovery generation failed');
            addCronLog({
                jobName: 'digest-recovery',
                status: 'error',
                message: error instanceof Error ? error.message : 'Unknown error',
            });
        } finally {
            digestJobInProgress = false;
        }
    };

    const dailyJob = cron.schedule('0 19 * * *', async () => {
        await runDigest();
    }, {
        timezone: DIGEST_TIMEZONE,
    });

    const recoveryJob = cron.schedule('*/30 * * * *', async () => {
        await runRecoveryIfMissing('interval');
    }, {
        timezone: DIGEST_TIMEZONE,
    });

    void runRecoveryIfMissing('startup');
    logger.info('Digest cron job started (19:00 daily + 30min recovery check)');

    return () => {
        dailyJob.stop();
        recoveryJob.stop();
        logger.info('Digest cron job stopped');
    };
}

/**
 * Manual trigger for testing
 */
export async function triggerDigestManually(_period: 'morning' | 'evening' | 'daily' = 'daily') {
    const period = 'daily';
    logger.info({ period }, 'Manual digest generation triggered');

    if (digestJobInProgress) {
        logger.warn({ period }, 'Manual digest generation skipped: another run is in progress');
        return {
            success: false,
            error: 'Digest generation already in progress',
        };
    }

    const startedAt = Date.now();
    digestJobInProgress = true;

    try {
        const results = await generateAllDigests(period);
        const successful = results.filter(r => r.success).length;
        const failed = results.filter(r => !r.success).length;
        const duration = Date.now() - startedAt;

        addCronLog({
            jobName: 'digest-manual',
            status: failed === 0 ? 'success' : 'error',
            message: `${successful} successful, ${failed} failed`,
            duration,
        });

        return {
            success: true,
            successful,
            failed,
            duration,
            results,
        };
    } catch (error) {
        logger.error({ error }, 'Manual digest generation failed');
        addCronLog({
            jobName: 'digest-manual',
            status: 'error',
            message: error instanceof Error ? error.message : 'Unknown error',
            duration: Date.now() - startedAt,
        });
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    } finally {
        digestJobInProgress = false;
    }
}
