import { db } from '../config/db.js';
import { userDevices, userNotificationPreferences } from '../db/schema/index.js';
import { eq, and } from 'drizzle-orm';
import { logger } from '../config/logger.js';

/**
 * Send digest notifications to all users who have daily digest notifications enabled
 */
export async function sendDigestNotifications(): Promise<{ sent: number; skipped: number }> {
    try {
        // Get all active devices
        const devices = await db
            .select({
                userId: userDevices.userId,
                token: userDevices.fcmToken,
            })
            .from(userDevices)
            .where(eq(userDevices.isActive, true));

        if (devices.length === 0) {
            logger.info('No active devices for digest notifications');
            return { sent: 0, skipped: 0 };
        }

        // Get users who opted out of daily digest
        let optedOutSet = new Set<string>();
        try {
            const optedOut = await db
                .select({ userId: userNotificationPreferences.userId })
                .from(userNotificationPreferences)
                .where(eq(userNotificationPreferences.notifDailyDigest, false));
            optedOutSet = new Set(optedOut.map(u => u.userId));
        } catch {
            logger.warn('Could not query notification preferences, sending to all devices');
        }

        // Filter eligible tokens
        const eligibleTokens = devices
            .filter(d => !optedOutSet.has(d.userId))
            .map(d => d.token);

        if (eligibleTokens.length === 0) {
            logger.info('All users opted out of digest notifications');
            return { sent: 0, skipped: devices.length };
        }

        const title = '📰 Günlük Özet Hazır';
        const body = 'Bugünün önemli gelişmeleri özetlendi. Hemen oku!';

        // Send in batches of 100 (Expo Push API limit)
        const BATCH_SIZE = 100;
        let sent = 0;

        for (let i = 0; i < eligibleTokens.length; i += BATCH_SIZE) {
            const batch = eligibleTokens.slice(i, i + BATCH_SIZE);
            const messages = batch.map(token => ({
                to: token,
                sound: 'default' as const,
                title,
                body,
                data: { type: 'digest', period: 'daily' },
            }));

            try {
                const response = await fetch('https://exp.host/--/api/v2/push/send', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        ...(process.env.EXPO_ACCESS_TOKEN
                            ? { 'Authorization': `Bearer ${process.env.EXPO_ACCESS_TOKEN}` }
                            : {}),
                    },
                    body: JSON.stringify(messages),
                });

                if (response.ok) {
                    sent += batch.length;
                } else {
                    logger.error({ status: response.status }, 'Expo Push API batch error');
                }
            } catch (error) {
                logger.error({ error, batchIndex: i }, 'Failed to send digest notification batch');
            }
        }

        logger.info({ sent, skipped: devices.length - eligibleTokens.length, period: 'daily' }, 'Digest notifications sent');
        return { sent, skipped: devices.length - eligibleTokens.length };
    } catch (error) {
        logger.error({ error }, 'Failed to send digest notifications');
        return { sent: 0, skipped: 0 };
    }
}
