import cron from 'node-cron';
import { logger } from '../config/logger.js';
import { generateDailyDigest, getDigestByDate, getDigestDateString } from '../services/digestService.js';
import { sendDigestNotifications } from '../services/digestNotificationService.js';
import { addCronLog } from '../routes/admin.js';

const DIGEST_COUNTRIES = ['tr', 'de', 'us', 'uk', 'fr', 'es', 'it', 'ru'] as const;
type DigestCountry = typeof DIGEST_COUNTRIES[number];
const DIGEST_TIMEZONE = 'Europe/Istanbul';
let digestJobInProgress = false;

// Real-time status tracking
interface CountryStatus {
    country: string;
    status: 'pending' | 'running' | 'success' | 'error';
    error?: string;
    startedAt?: number;
    finishedAt?: number;
}

interface DigestJobStatus {
    running: boolean;
    trigger: 'manual' | 'cron' | 'recovery' | null;
    startedAt: number | null;
    currentCountry: string | null;
    countries: CountryStatus[];
    finishedAt: number | null;
    error: string | null;
}

let lastJobStatus: DigestJobStatus = {
    running: false,
    trigger: null,
    startedAt: null,
    currentCountry: null,
    countries: [],
    finishedAt: null,
    error: null,
};

export function isDigestJobRunning() {
    return digestJobInProgress;
}

export function getDigestJobStatus(): DigestJobStatus {
    return { ...lastJobStatus, countries: [...lastJobStatus.countries] };
}

function initJobStatus(trigger: 'manual' | 'cron' | 'recovery', countries: readonly string[]) {
    lastJobStatus = {
        running: true,
        trigger,
        startedAt: Date.now(),
        currentCountry: null,
        countries: countries.map(c => ({ country: c, status: 'pending' })),
        finishedAt: null,
        error: null,
    };
}

function updateCountryStatus(country: string, status: CountryStatus['status'], error?: string) {
    const entry = lastJobStatus.countries.find(c => c.country === country);
    if (entry) {
        entry.status = status;
        if (status === 'running') entry.startedAt = Date.now();
        if (status === 'success' || status === 'error') entry.finishedAt = Date.now();
        if (error) entry.error = error;
    }
    lastJobStatus.currentCountry = status === 'running' ? country : null;
}

function finishJobStatus(error?: string) {
    lastJobStatus.running = false;
    lastJobStatus.finishedAt = Date.now();
    lastJobStatus.currentCountry = null;
    if (error) lastJobStatus.error = error;
}

/**
 * Generate digests for a list of countries with status tracking
 */
async function generateDigestsWithTracking(
    countries: readonly string[],
    trigger: 'manual' | 'cron' | 'recovery'
): Promise<{ country: string; id: string; success: boolean; error?: string }[]> {
    initJobStatus(trigger, countries);
    const results: { country: string; id: string; success: boolean; error?: string }[] = [];

    for (let i = 0; i < countries.length; i++) {
        const country = countries[i] as DigestCountry;
        updateCountryStatus(country, 'running');

        try {
            const result = await generateDailyDigest(country, 'daily', undefined, { skipPrecompute: true });
            if (result.success) {
                updateCountryStatus(country, 'success');
            } else {
                updateCountryStatus(country, 'error', result.error || 'Unknown error');
            }
            results.push({ country, ...result });
        } catch (err) {
            const errMsg = err instanceof Error ? err.message : String(err);
            updateCountryStatus(country, 'error', errMsg);
            results.push({ country, id: '', success: false, error: errMsg });
        }

        // Brief pause between countries to avoid OpenAI rate limits
        if (i < countries.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 3000));
        }
    }

    return results;
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
            const results = await generateDigestsWithTracking(DIGEST_COUNTRIES, 'cron');
            const successful = results.filter(r => r.success).length;
            const failed = results.filter(r => !r.success).length;

            finishJobStatus();
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
            const errMsg = error instanceof Error ? error.message : 'Unknown error';
            finishJobStatus(errMsg);
            logger.error({ error, period }, 'Daily digest generation failed');
            addCronLog({
                jobName: 'digest',
                status: 'error',
                message: errMsg,
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
            const results = await generateDigestsWithTracking(missingCountries, 'recovery');
            const successful = results.filter(r => r.success).length;
            const failed = results.filter(r => !r.success).length;

            finishJobStatus();
            logger.info({ trigger, digestDate, successful, failed, results }, 'Digest recovery generation completed');
            addCronLog({
                jobName: 'digest-recovery',
                status: failed === 0 ? 'success' : 'error',
                message: `${successful} successful, ${failed} failed`,
            });
        } catch (error) {
            const errMsg = error instanceof Error ? error.message : 'Unknown error';
            finishJobStatus(errMsg);
            logger.error({ error, trigger, digestDate }, 'Digest recovery generation failed');
            addCronLog({
                jobName: 'digest-recovery',
                status: 'error',
                message: errMsg,
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
        const results = await generateDigestsWithTracking(DIGEST_COUNTRIES, 'manual');
        const successful = results.filter(r => r.success).length;
        const failed = results.filter(r => !r.success).length;
        const duration = Date.now() - startedAt;

        finishJobStatus();

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
        const errMsg = error instanceof Error ? error.message : 'Unknown error';
        finishJobStatus(errMsg);
        logger.error({ error }, 'Manual digest generation failed');
        addCronLog({
            jobName: 'digest-manual',
            status: 'error',
            message: errMsg,
            duration: Date.now() - startedAt,
        });
        return {
            success: false,
            error: errMsg,
        };
    } finally {
        digestJobInProgress = false;
    }
}
