import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { captureException, addBreadcrumb } from './sentry';
import { trackEvent } from './posthog';

/**
 * Expo Notifications Configuration
 * Production-ready push notification setup with token registration and listeners
 */

// Configure notification handler
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
    }),
});

/**
 * Initialize push notifications
 */
export async function initNotifications() {
    try {
        // Check if device supports notifications
        if (!Device.isDevice) {
            console.log('⚠️ Push notifications not supported on simulator');
            return null;
        }

        // Request permissions
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;

        if (existingStatus !== 'granted') {
            const { status } = await Notifications.requestPermissionsAsync();
            finalStatus = status;
        }

        if (finalStatus !== 'granted') {
            console.log('⚠️ Failed to get push token for push notification!');
            return null;
        }

        // Get push token
        const tokenData = await Notifications.getExpoPushTokenAsync({
            projectId: '48c5bd0c-f017-4675-a5b1-039df60c199e',
        });

        const pushToken = tokenData.data;
        console.log('✅ Push token obtained:', pushToken);

        // Track token registration
        trackEvent('push_token_registered', {
            platform: Platform.OS,
            token_length: pushToken.length,
        });

        return pushToken;
    } catch (error) {
        console.error('❌ Failed to initialize notifications:', error);
        captureException(error as Error, { context: 'initNotifications' });
        return null;
    }
}

/**
 * Register push token with backend
 */
export async function registerPushToken(
    token: string,
    userId: string,
    authToken: string
): Promise<boolean> {
    try {
        const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/notifications/register-device`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`,
            },
            body: JSON.stringify({
                fcmToken: token,
                deviceType: Platform.OS,
            }),
        });

        if (!response.ok) {
            throw new Error('Failed to register push token');
        }

        console.log('✅ Push token registered successfully');
        trackEvent('push_token_backend_registered', { userId });
        return true;
    } catch (error) {
        console.error('❌ Failed to register push token:', error);
        captureException(error as Error, { context: 'registerPushToken', userId });
        return false;
    }
}

/**
 * Unregister push token from backend
 */
export async function unregisterPushToken(
    token: string,
    authToken: string
): Promise<boolean> {
    try {
        // Get user's devices and find matching one
        const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/notifications/devices`, {
            headers: { 'Authorization': `Bearer ${authToken}` },
        });

        if (!response.ok) return false;

        const { data: devices } = await response.json();
        const device = devices?.find((d: any) => d.fcmToken === token);
        if (!device) return true; // Already gone

        const deleteRes = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/notifications/device/${device.id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${authToken}` },
        });

        if (deleteRes.ok) {
            console.log('✅ Push token unregistered successfully');
            trackEvent('push_token_unregistered');
        }
        return deleteRes.ok;
    } catch (error) {
        console.error('❌ Failed to unregister push token:', error);
        captureException(error as Error, { context: 'unregisterPushToken' });
        return false;
    }
}

/**
 * Set up notification listeners
 */
export function setupNotificationListeners(
    onNotificationReceived?: (notification: Notifications.Notification) => void,
    onNotificationResponse?: (response: Notifications.NotificationResponse) => void
): () => void {
    // Notification received listener
    const receivedSubscription = Notifications.addNotificationReceivedListener(
        (notification) => {
            console.log('📬 Notification received:', notification);
            addBreadcrumb('notifications', 'Notification received', {
                title: notification.request.content.title,
                body: notification.request.content.body,
            });

            if (onNotificationReceived) {
                onNotificationReceived(notification);
            }
        }
    );

    // Notification response listener (user tapped notification)
    const responseSubscription = Notifications.addNotificationResponseReceivedListener(
        (response) => {
            console.log('🔔 Notification response:', response);
            addBreadcrumb('notifications', 'Notification tapped', {
                actionIdentifier: response.actionIdentifier,
                notification: response.notification.request.content.title,
            });

            // Track notification interaction
            trackEvent('notification_tapped', {
                action: response.actionIdentifier,
            });

            if (onNotificationResponse) {
                onNotificationResponse(response);
            }
        }
    );

    // Return cleanup function
    return () => {
        receivedSubscription.remove();
        responseSubscription.remove();
    };
}

/**
 * Schedule local notification
 */
export async function scheduleLocalNotification(
    title: string,
    body: string,
    data?: Record<string, any>,
    trigger?: Notifications.NotificationTriggerInput
): Promise<string | null> {
    try {
        const notificationId = await Notifications.scheduleNotificationAsync({
            content: {
                title,
                body,
                data: data || {},
                sound: true,
                badge: 1,
            },
            trigger: trigger || null,
        });

        console.log('✅ Local notification scheduled:', notificationId);
        trackEvent('local_notification_scheduled', { title });
        return notificationId;
    } catch (error) {
        console.error('❌ Failed to schedule local notification:', error);
        captureException(error as Error, { context: 'scheduleLocalNotification', title });
        return null;
    }
}

/**
 * Cancel scheduled notification
 */
export async function cancelNotification(notificationId: string): Promise<boolean> {
    try {
        await Notifications.cancelScheduledNotificationAsync(notificationId);
        console.log('✅ Notification cancelled:', notificationId);
        return true;
    } catch (error) {
        console.error('❌ Failed to cancel notification:', error);
        captureException(error as Error, { context: 'cancelNotification', notificationId });
        return false;
    }
}

/**
 * Cancel all scheduled notifications
 */
export async function cancelAllNotifications(): Promise<boolean> {
    try {
        await Notifications.cancelAllScheduledNotificationsAsync();
        console.log('✅ All notifications cancelled');
        trackEvent('all_notifications_cancelled');
        return true;
    } catch (error) {
        console.error('❌ Failed to cancel all notifications:', error);
        captureException(error as Error, { context: 'cancelAllNotifications' });
        return false;
    }
}

/**
 * Get badge count
 */
export async function getBadgeCount(): Promise<number> {
    try {
        return await Notifications.getBadgeCountAsync();
    } catch (error) {
        console.error('❌ Failed to get badge count:', error);
        return 0;
    }
}

/**
 * Set badge count
 */
export async function setBadgeCount(count: number): Promise<boolean> {
    try {
        await Notifications.setBadgeCountAsync(count);
        console.log('✅ Badge count set:', count);
        return true;
    } catch (error) {
        console.error('❌ Failed to set badge count:', error);
        captureException(error as Error, { context: 'setBadgeCount', count });
        return false;
    }
}

/**
 * Clear badge count
 */
export async function clearBadgeCount(): Promise<boolean> {
    try {
        await Notifications.setBadgeCountAsync(0);
        console.log('✅ Badge count cleared');
        return true;
    } catch (error) {
        console.error('❌ Failed to clear badge count:', error);
        captureException(error as Error, { context: 'clearBadgeCount' });
        return false;
    }
}

/**
 * Notification types
 */
export type NotificationType =
    | 'new_article'
    | 'digest'
    | 'comment'
    | 'like'
    | 'reply'
    | 'premium'
    | 'system';

/**
 * Send notification to specific user (via backend)
 */
export async function sendNotificationToUser(
    userId: string,
    type: NotificationType,
    title: string,
    body: string,
    data?: Record<string, any>,
    authToken: string
): Promise<boolean> {
    try {
        const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/notifications/send`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`,
            },
            body: JSON.stringify({
                userId,
                type,
                title,
                body,
                data,
            }),
        });

        if (!response.ok) {
            throw new Error('Failed to send notification');
        }

        console.log('✅ Notification sent to user:', userId);
        trackEvent('notification_sent', { userId, type });
        return true;
    } catch (error) {
        console.error('❌ Failed to send notification:', error);
        captureException(error as Error, { context: 'sendNotificationToUser', userId, type });
        return false;
    }
}

/**
 * Example usage:
 * 
 * // Initialize notifications
 * const pushToken = await initNotifications();
 * if (pushToken && user?.uid && token) {
 *     await registerPushToken(pushToken, user.uid, token);
 * }
 * 
 * // Set up listeners
 * useEffect(() => {
 *     const cleanup = setupNotificationListeners(
 *         (notification) => {
 *             // Handle received notification
 *             console.log('Notification received:', notification);
 *         },
 *         (response) => {
 *             // Handle notification tap
 *             console.log('Notification tapped:', response);
 *             // Navigate to relevant screen
 *         }
 *     );
 *     return cleanup;
 * }, []);
 * 
 * // Schedule local notification
 * await scheduleLocalNotification(
 *     'Yeni Haber',
 *     'Gündemdeki son haberleri gör',
 *     { articleId: '123' },
 *     { seconds: 60 } // 1 minute from now
 * );
 * 
 * // Send notification to user
 * await sendNotificationToUser(
 *     'user-id',
 *     'new_article',
 *     'Yeni Haber',
 *     'Gündemdeki son haberleri gör',
 *     { articleId: '123' },
 *     authToken
 * );
 */
