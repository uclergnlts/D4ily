import { Expo } from 'expo-server-sdk';
import { logger } from '../config/logger.js';

// Create a new Expo SDK client
const expo = new Expo({
    accessToken: process.env.EXPO_ACCESS_TOKEN,
});

interface NotificationPayload {
    to: string;
    title: string;
    body: string;
    data?: Record<string, unknown>;
    badge?: number;
    sound?: 'default' | null;
}

/**
 * Send push notification via Expo
 */
export async function sendPushNotification(
    expoPushToken: string,
    title: string,
    body: string,
    data?: Record<string, unknown>
): Promise<boolean> {
    try {
        // Check if token is valid
        if (!Expo.isExpoPushToken(expoPushToken)) {
            logger.error({ token: expoPushToken }, 'Invalid Expo push token');
            return false;
        }

        const message: NotificationPayload = {
            to: expoPushToken,
            title,
            body,
            sound: 'default',
            data: data || {},
        };

        const chunks = expo.chunkPushNotifications([message]);
        const tickets = [];

        for (const chunk of chunks) {
            try {
                const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
                tickets.push(...ticketChunk);
            } catch (error) {
                logger.error({ error }, 'Error sending push notification chunk');
            }
        }

        // Check for errors in tickets
        for (const ticket of tickets) {
            if (ticket.status === 'error') {
                logger.error({
                    ticket,
                    token: expoPushToken,
                }, 'Push notification failed');
                return false;
            }
        }

        logger.info({
            token: expoPushToken.substring(0, 20) + '...',
            title,
        }, 'Push notification sent successfully');

        return true;
    } catch (error) {
        logger.error({ error, token: expoPushToken }, 'Failed to send push notification');
        return false;
    }
}

/**
 * Send bulk push notifications
 */
export async function sendBulkNotifications(
    tokens: string[],
    title: string,
    body: string,
    data?: Record<string, unknown>
): Promise<{ success: number; failed: number }> {
    const messages: NotificationPayload[] = [];

    for (const token of tokens) {
        if (!Expo.isExpoPushToken(token)) {
            logger.warn({ token }, 'Skipping invalid Expo push token');
            continue;
        }

        messages.push({
            to: token,
            title,
            body,
            sound: 'default',
            data: data || {},
        });
    }

    const chunks = expo.chunkPushNotifications(messages);
    let successCount = 0;
    let failedCount = 0;

    for (const chunk of chunks) {
        try {
            const ticketChunk = await expo.sendPushNotificationsAsync(chunk);

            for (const ticket of ticketChunk) {
                if (ticket.status === 'ok') {
                    successCount++;
                } else {
                    failedCount++;
                    logger.error({ ticket }, 'Push notification failed');
                }
            }
        } catch (error) {
            logger.error({ error }, 'Error sending push notification chunk');
            failedCount += chunk.length;
        }
    }

    logger.info({
        success: successCount,
        failed: failedCount,
        total: tokens.length,
    }, 'Bulk push notifications completed');

    return { success: successCount, failed: failedCount };
}

/**
 * Send daily digest notification
 */
export async function sendDailyDigestNotification(
    tokens: string[],
    countryName: string,
    summary: string
): Promise<{ success: number; failed: number }> {
    return sendBulkNotifications(
        tokens,
        `📰 ${countryName} Günlük Özet`,
        summary.length > 100 ? summary.substring(0, 100) + '...' : summary,
        { type: 'daily_digest', country: countryName }
    );
}

/**
 * Send breaking news notification
 */
export async function sendBreakingNewsNotification(
    tokens: string[],
    title: string,
    topic: string
): Promise<{ success: number; failed: number }> {
    return sendBulkNotifications(
        tokens,
        `🚨 Son Dakika: ${topic}`,
        title,
        { type: 'breaking_news', topic }
    );
}

/**
 * Send weekly comparison notification
 */
export async function sendWeeklyComparisonNotification(
    tokens: string[],
    weekRange: string
): Promise<{ success: number; failed: number }> {
    return sendBulkNotifications(
        tokens,
        `📊 Haftalık Analiz ${weekRange}`,
        'Bu haftanın karşılaştırmalı medya analizi hazır!',
        { type: 'weekly_comparison', weekRange }
    );
}

export { expo };
