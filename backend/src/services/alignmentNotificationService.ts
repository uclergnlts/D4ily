import { db } from '../config/db.js';
import {
    userFollowedSources,
    userNotificationPreferences,
    userDevices,
    notifications,
    pendingAlignmentNotifications,
    rss_sources,
} from '../db/schema/index.js';
import { eq, and, inArray } from 'drizzle-orm';
import { logger } from '../config/logger.js';
import { v4 as uuidv4 } from 'uuid';
import { getAlignmentLabel } from '../utils/alignment.js';

export interface AlignmentChange {
    sourceId: number;
    sourceName: string;
    oldScore: number | null;
    newScore: number;
    oldLabel: string | null;
    newLabel: string | null;
    reason: string;
}

/**
 * Queue notifications for all users following a source when its alignment changes
 */
export async function queueAlignmentChangeNotifications(change: AlignmentChange): Promise<number> {
    try {
        // Get all users who follow this source
        const followers = await db
            .select({
                userId: userFollowedSources.userId,
            })
            .from(userFollowedSources)
            .where(eq(userFollowedSources.sourceId, change.sourceId));

        if (followers.length === 0) {
            logger.info({ sourceId: change.sourceId }, 'No followers for source, skipping notifications');
            return 0;
        }

        // Get users who have alignment notifications enabled
        const userIds = followers.map(f => f.userId);
        const preferences = await db
            .select()
            .from(userNotificationPreferences)
            .where(inArray(userNotificationPreferences.userId, userIds));

        // Users with notifications enabled (default is true if no preference exists)
        const usersWithPrefMap = new Map(preferences.map(p => [p.userId, p.notifAlignmentChanges]));
        const eligibleUserIds = userIds.filter(uid => {
            const pref = usersWithPrefMap.get(uid);
            return pref === undefined || pref === true;
        });

        if (eligibleUserIds.length === 0) {
            logger.info({ sourceId: change.sourceId }, 'No eligible users for alignment notifications');
            return 0;
        }

        // Queue notifications for each eligible user
        const notificationValues = eligibleUserIds.map(userId => ({
            id: uuidv4(),
            userId,
            sourceId: change.sourceId,
            sourceName: change.sourceName,
            oldScore: change.oldScore,
            newScore: change.newScore,
            oldLabel: change.oldLabel,
            newLabel: change.newLabel,
            changeReason: change.reason,
            status: 'pending' as const,
            createdAt: new Date(),
        }));

        await db.insert(pendingAlignmentNotifications).values(notificationValues);

        logger.info({
            sourceId: change.sourceId,
            sourceName: change.sourceName,
            queuedCount: notificationValues.length,
        }, 'Alignment change notifications queued');

        return notificationValues.length;
    } catch (error) {
        logger.error({ error, change }, 'Failed to queue alignment change notifications');
        throw error;
    }
}

/**
 * Process pending alignment notifications (called by cron)
 * Returns number of notifications sent
 */
export async function processPendingAlignmentNotifications(batchSize: number = 50): Promise<{
    sent: number;
    failed: number;
}> {
    try {
        // Get pending notifications
        const pending = await db
            .select()
            .from(pendingAlignmentNotifications)
            .where(eq(pendingAlignmentNotifications.status, 'pending'))
            .limit(batchSize);

        if (pending.length === 0) {
            return { sent: 0, failed: 0 };
        }

        let sent = 0;
        let failed = 0;

        for (const notification of pending) {
            try {
                // Get user's active devices
                const devices = await db
                    .select()
                    .from(userDevices)
                    .where(and(
                        eq(userDevices.userId, notification.userId),
                        eq(userDevices.isActive, true)
                    ));

                // Create notification title and body
                const title = 'Kaynak Durumu Güncellendi';
                const body = notification.newLabel
                    ? `${notification.sourceName} kaynağının editoryal durumu "${notification.newLabel}" olarak güncellendi.`
                    : `${notification.sourceName} kaynağının editoryal durumu güncellendi.`;

                // Store in notifications table
                await db.insert(notifications).values({
                    id: uuidv4(),
                    userId: notification.userId,
                    type: 'alignment',
                    title,
                    body,
                    data: JSON.stringify({
                        sourceId: notification.sourceId,
                        sourceName: notification.sourceName,
                        oldScore: notification.oldScore,
                        newScore: notification.newScore,
                        oldLabel: notification.oldLabel,
                        newLabel: notification.newLabel,
                        reason: notification.changeReason,
                    }),
                    isRead: false,
                    sentAt: new Date(),
                });

                // Send push notifications to devices
                if (devices.length > 0) {
                    await sendPushNotifications(devices, title, body, {
                        type: 'alignment_change',
                        sourceId: notification.sourceId.toString(),
                    });
                }

                // Mark as sent
                await db
                    .update(pendingAlignmentNotifications)
                    .set({
                        status: 'sent',
                        sentAt: new Date(),
                    })
                    .where(eq(pendingAlignmentNotifications.id, notification.id));

                sent++;
            } catch (error) {
                logger.error({
                    error,
                    notificationId: notification.id,
                }, 'Failed to send alignment notification');

                // Mark as failed
                await db
                    .update(pendingAlignmentNotifications)
                    .set({ status: 'failed' })
                    .where(eq(pendingAlignmentNotifications.id, notification.id));

                failed++;
            }
        }

        logger.info({ sent, failed }, 'Alignment notifications processed');
        return { sent, failed };
    } catch (error) {
        logger.error({ error }, 'Failed to process alignment notifications');
        throw error;
    }
}

/**
 * Send push notifications to devices using Expo Push API
 */
async function sendPushNotifications(
    devices: Array<{ fcmToken: string; deviceType: string }>,
    title: string,
    body: string,
    data: Record<string, string>
): Promise<void> {
    if (devices.length === 0) {
        return;
    }

    const messages = devices.map(d => ({
        to: d.fcmToken,
        sound: 'default' as const,
        title,
        body,
        data,
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

        if (!response.ok) {
            logger.error({ status: response.status }, 'Expo Push API error');
            return;
        }

        const result = await response.json();
        logger.info({ title, deviceCount: devices.length, result }, 'Push notifications sent via Expo');
    } catch (error) {
        logger.error({ error }, 'Expo Push API request failed');
    }
}

/**
 * Get pending notification count for monitoring
 */
export async function getPendingNotificationCount(): Promise<{
    pending: number;
    failed: number;
}> {
    try {
        const pendingCount = await db
            .select()
            .from(pendingAlignmentNotifications)
            .where(eq(pendingAlignmentNotifications.status, 'pending'));

        const failedCount = await db
            .select()
            .from(pendingAlignmentNotifications)
            .where(eq(pendingAlignmentNotifications.status, 'failed'));

        return {
            pending: pendingCount.length,
            failed: failedCount.length,
        };
    } catch (error) {
        logger.error({ error }, 'Failed to get pending notification count');
        return { pending: 0, failed: 0 };
    }
}

/**
 * Retry failed notifications
 */
export async function retryFailedNotifications(limit: number = 20): Promise<number> {
    try {
        const failed = await db
            .select()
            .from(pendingAlignmentNotifications)
            .where(eq(pendingAlignmentNotifications.status, 'failed'))
            .limit(limit);

        if (failed.length === 0) {
            return 0;
        }

        // Reset status to pending
        const ids = failed.map(f => f.id);
        for (const id of ids) {
            await db
                .update(pendingAlignmentNotifications)
                .set({ status: 'pending' })
                .where(eq(pendingAlignmentNotifications.id, id));
        }

        logger.info({ count: ids.length }, 'Failed notifications reset for retry');
        return ids.length;
    } catch (error) {
        logger.error({ error }, 'Failed to retry failed notifications');
        return 0;
    }
}
