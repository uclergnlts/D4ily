import { db } from '../config/db';
import { userDevices } from '../db/schema';
import { eq, and, lt } from 'drizzle-orm';
import { trackEvent, trackError } from '../config/posthog';
import { addBreadcrumb } from '../config/sentry';

/**
 * Notification Service
 * Handles push notification registration, management, and sending
 */

export interface PushToken {
    id: string;
    userId: string;
    token: string;
    platform: 'ios' | 'android';
    createdAt: Date;
    updatedAt: Date;
}

export interface NotificationPayload {
    userId?: string;
    type: 'new_article' | 'digest' | 'comment' | 'like' | 'reply' | 'premium' | 'system';
    title: string;
    body: string;
    data?: Record<string, any>;
}

/**
 * Register push token for a user
 */
export async function registerPushToken(
    userId: string,
    token: string,
    platform: 'ios' | 'android' | 'web'
): Promise<PushToken | null> {
    // Filter out web platform since userDevices only supports ios and android
    if (platform === 'web') {
        console.log('⚠️ Web platform not supported for push notifications');
        return null;
    }
    try {
        addBreadcrumb('notifications', 'Registering push token', { userId, platform });

        // Check if token already exists
        const existing = await db
            .select()
            .from(userDevices)
            .where(eq(userDevices.fcmToken, token))
            .limit(1);

        if (existing.length > 0) {
            // Update existing token
            const [updated] = await db
                .update(userDevices)
                .set({
                    userId,
                    deviceType: platform,
                    lastActive: new Date(),
                })
                .where(eq(userDevices.fcmToken, token))
                .returning();

            trackEvent(userId, 'push_token_updated', { platform });

            // Map userDevices to PushToken interface
            const updatedToken: PushToken = {
                id: updated.id,
                userId: updated.userId,
                token: updated.fcmToken,
                platform: updated.deviceType,
                createdAt: updated.createdAt,
                updatedAt: updated.lastActive,
            };

            return updatedToken;
        }

        // Insert new token
        const [newDevice] = await db
            .insert(userDevices)
            .values({
                id: crypto.randomUUID(),
                userId,
                fcmToken: token,
                deviceType: platform as 'ios' | 'android',
                createdAt: new Date(),
                lastActive: new Date(),
            })
            .returning();

            trackEvent(userId, 'push_token_registered', { platform });

            // Map userDevices to PushToken interface
            const newToken: PushToken = {
                id: newDevice.id,
                userId: newDevice.userId,
                token: newDevice.fcmToken,
                platform: newDevice.deviceType,
                createdAt: newDevice.createdAt,
                updatedAt: newDevice.lastActive,
            };

            return newToken;
    } catch (error) {
        console.error('❌ Failed to register push token:', error);
        trackError(userId, error as Error, { context: 'registerPushToken', platform });
        return null;
    }
}

/**
 * Unregister push token
 */
export async function unregisterPushToken(
    token: string,
    userId: string
): Promise<boolean> {
    try {
        addBreadcrumb('notifications', 'Unregistering push token', { userId });

        await db
            .delete(userDevices)
            .where(and(eq(userDevices.fcmToken, token), eq(userDevices.userId, userId)));

        trackEvent(userId, 'push_token_unregistered');
        return true;
    } catch (error) {
        console.error('❌ Failed to unregister push token:', error);
        trackError(userId, error as Error, { context: 'unregisterPushToken' });
        return false;
    }
}

/**
 * Get all push tokens for a user
 */
export async function getUserPushTokens(userId: string): Promise<PushToken[]> {
    try {
        const devices = await db
            .select()
            .from(userDevices)
            .where(eq(userDevices.userId, userId));

        // Map userDevices to PushToken interface
        const tokens: PushToken[] = devices.map(device => ({
            id: device.id,
            userId: device.userId,
            token: device.fcmToken,
            platform: device.deviceType,
            createdAt: device.createdAt,
            updatedAt: device.lastActive,
        }));

        return tokens;
    } catch (error) {
        console.error('❌ Failed to get user push tokens:', error);
        trackError(userId, error as Error, { context: 'getUserPushTokens' });
        return [];
    }
}

/**
 * Send push notification to a user
 * Note: This is a placeholder. In production, you would use a service like:
 * - Expo Push Notifications (for Expo apps)
 * - Firebase Cloud Messaging (FCM)
 * - Apple Push Notification Service (APNs)
 * - OneSignal
 * - Amazon SNS
 */
export async function sendPushNotification(
    userId: string,
    payload: NotificationPayload
): Promise<boolean> {
    try {
        addBreadcrumb('notifications', 'Sending push notification', {
            userId,
            type: payload.type,
        });

        // Get user's push tokens
        const tokens = await getUserPushTokens(userId);

        if (tokens.length === 0) {
            console.log('⚠️ No push tokens found for user:', userId);
            return false;
        }

        // Send via Expo Push API
        const messages = tokens.map(token => ({
            to: token.token,
            sound: 'default' as const,
            title: payload.title,
            body: payload.body,
            data: payload.data || {},
        }));

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
            console.error('❌ Expo Push API error:', response.status, await response.text());
            return false;
        }

        console.log(`✅ Push notification sent to ${tokens.length} device(s) for user:`, userId);
        trackEvent(userId, 'push_notification_sent', { type: payload.type, deviceCount: tokens.length });
        return true;
    } catch (error) {
        console.error('❌ Failed to send push notification:', error);
        trackError(userId, error as Error, { context: 'sendPushNotification', type: payload.type });
        return false;
    }
}

/**
 * Send push notification to multiple users
 */
export async function sendBulkPushNotifications(
    userIds: string[],
    payload: Omit<NotificationPayload, 'userId'>
): Promise<{ success: number; failed: number }> {
    let success = 0;
    let failed = 0;

    for (const userId of userIds) {
        const result = await sendPushNotification(userId, { ...payload, userId });
        if (result) {
            success++;
        } else {
            failed++;
        }
    }

    trackEvent('system', 'bulk_push_notifications_sent', {
        totalUsers: userIds.length,
        success,
        failed,
    });

    return { success, failed };
}

/**
 * Clean up old push tokens (tokens older than 30 days)
 */
export async function cleanupOldPushTokens(): Promise<number> {
    try {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const result = await db
            .delete(userDevices)
            .where(lt(userDevices.lastActive, thirtyDaysAgo))
            .returning();

        const deletedCount = result.length || 0;
        console.log(`✅ Cleaned up ${deletedCount} old push tokens`);
        trackEvent('system', 'old_push_tokens_cleaned', { count: deletedCount });
        return deletedCount;
    } catch (error) {
        console.error('❌ Failed to cleanup old push tokens:', error);
        trackError('system', error as Error, { context: 'cleanupOldPushTokens' });
        return 0;
    }
}

/**
 * Notification templates
 */
export const NotificationTemplates = {
    newArticle: (articleTitle: string, source: string): NotificationPayload => ({
        type: 'new_article',
        title: 'Yeni Haber',
        body: `${source}: ${articleTitle}`,
        data: { type: 'article' },
    }),

    digest: (date: string, articleCount: number): NotificationPayload => ({
        type: 'digest',
        title: 'Günlük Özet',
        body: `${date} tarihli ${articleCount} haber özeti hazır`,
        data: { type: 'digest' },
    }),

    comment: (commenterName: string, articleTitle: string): NotificationPayload => ({
        type: 'comment',
        title: 'Yeni Yorum',
        body: `${commenterName} senin haberine yorum yaptı: ${articleTitle}`,
        data: { type: 'comment' },
    }),

    like: (likerName: string, articleTitle: string): NotificationPayload => ({
        type: 'like',
        title: 'Beğeni',
        body: `${likerName} senin haberini beğendi: ${articleTitle}`,
        data: { type: 'like' },
    }),

    reply: (replierName: string, commentPreview: string): NotificationPayload => ({
        type: 'reply',
        title: 'Yanıt',
        body: `${replierName} senin yorumuna yanıt verdi: ${commentPreview}`,
        data: { type: 'reply' },
    }),

    premium: (planName: string): NotificationPayload => ({
        type: 'premium',
        title: 'Premium Üyelik',
        body: `Tebrikler! ${planName} planına geçtin`,
        data: { type: 'premium' },
    }),

    system: (message: string): NotificationPayload => ({
        type: 'system',
        title: 'Sistem Bildirimi',
        body: message,
        data: { type: 'system' },
    }),
};

/**
 * Example usage:
 * 
 * import { registerPushToken, sendPushNotification, NotificationTemplates } from '../services/notificationService';
 * 
 * // Register push token
 * await registerPushToken('user-id', 'expo-push-token', 'ios');
 * 
 * // Send notification
 * await sendPushNotification('user-id', NotificationTemplates.newArticle('Haber Başlığı', 'CNN'));
 * 
 * // Send bulk notifications
 * await sendBulkPushNotifications(['user-1', 'user-2'], {
 *     type: 'digest',
 *     title: 'Günlük Özet',
 *     body: 'Bugünün haber özeti hazır',
 * });
 */
