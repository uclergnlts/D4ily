import { db } from '../config/db';
import { pushTokens } from '../db/schema';
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
    platform: 'ios' | 'android' | 'web';
    createdAt: Date;
    updatedAt: Date;
}

export interface NotificationPayload {
    userId: string;
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
    try {
        addBreadcrumb('notifications', 'Registering push token', { userId, platform });

        // Check if token already exists
        const existing = await db
            .select()
            .from(pushTokens)
            .where(eq(pushTokens.token, token))
            .limit(1);

        if (existing.length > 0) {
            // Update existing token
            const [updated] = await db
                .update(pushTokens)
                .set({
                    userId,
                    platform,
                    updatedAt: new Date(),
                })
                .where(eq(pushTokens.token, token))
                .returning();

            trackEvent('push_token_updated', { userId, platform });
            return updated;
        }

        // Insert new token
        const [newToken] = await db
            .insert(pushTokens)
            .values({
                userId,
                token,
                platform,
                createdAt: new Date(),
                updatedAt: new Date(),
            })
            .returning();

        trackEvent('push_token_registered', { userId, platform });
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
            .delete(pushTokens)
            .where(and(eq(pushTokens.token, token), eq(pushTokens.userId, userId)));

        trackEvent('push_token_unregistered', { userId });
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
        const tokens = await db
            .select()
            .from(pushTokens)
            .where(eq(pushTokens.userId, userId));

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

        // Send notification to all tokens
        // This is where you would integrate with your push notification service
        // Example with Expo Push Notifications:
        /*
        const messages = tokens.map(token => ({
            to: token.token,
            sound: 'default',
            title: payload.title,
            body: payload.body,
            data: payload.data || {},
        }));

        const response = await fetch('https://exp.host/--/api/v2/push/send', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.EXPO_ACCESS_TOKEN}`,
            },
            body: JSON.stringify(messages),
        });
        */

        console.log(`✅ Push notification sent to ${tokens.length} device(s) for user:`, userId);
        trackEvent('push_notification_sent', { userId, type: payload.type, deviceCount: tokens.length });
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

    trackEvent('bulk_push_notifications_sent', {
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
            .delete(pushTokens)
            .where(lt(pushTokens.updatedAt, thirtyDaysAgo));

        console.log(`✅ Cleaned up ${result.rowCount || 0} old push tokens`);
        trackEvent('old_push_tokens_cleaned', { count: result.rowCount || 0 });
        return result.rowCount || 0;
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
