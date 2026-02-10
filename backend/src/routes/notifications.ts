import { Hono } from 'hono';
import { db } from '../config/db.js';
import {
    notifications,
    userDevices,
    userNotificationPreferences,
} from '../db/schema/index.js';
import { authMiddleware, adminMiddleware, AuthUser } from '../middleware/auth.js';
import { eq, and, desc, sql } from 'drizzle-orm';
import { logger } from '../config/logger.js';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { messaging } from '../config/firebase.js';

type Variables = {
    user: AuthUser;
};

const notificationsRoute = new Hono<{ Variables: Variables }>();

// Schemas
const registerDeviceSchema = z.object({
    fcmToken: z.string().min(1, 'FCM token is required'),
    deviceType: z.enum(['ios', 'android']),
    deviceName: z.string().optional(),
});

const updatePreferencesSchema = z.object({
    notifFollowedSources: z.boolean().optional(),
    notifDailyDigest: z.boolean().optional(),
    notifWeeklyComparison: z.boolean().optional(),
    notifBreakingNews: z.boolean().optional(),
    notifComments: z.boolean().optional(),
});

// ===========================
// DEVICE MANAGEMENT
// ===========================

/**
 * POST /notifications/register-device
 * Register a device for push notifications
 */
notificationsRoute.post('/register-device', authMiddleware, async (c) => {
    try {
        const user = c.get('user') as AuthUser;
        const body = await c.req.json();
        const { fcmToken, deviceType, deviceName } = registerDeviceSchema.parse(body);

        // Check if device already registered (by fcmToken)
        const existing = await db
            .select()
            .from(userDevices)
            .where(eq(userDevices.fcmToken, fcmToken))
            .get();

        if (existing) {
            // Update existing device
            await db
                .update(userDevices)
                .set({
                    userId: user.uid,
                    deviceType,
                    deviceName: deviceName || null,
                    isActive: true,
                    lastActive: new Date(),
                })
                .where(eq(userDevices.id, existing.id));

            logger.info({ userId: user.uid, deviceId: existing.id }, 'Device updated');

            return c.json({
                success: true,
                message: 'Device updated',
                data: { deviceId: existing.id },
            });
        }

        // Register new device
        const deviceId = uuidv4();
        await db.insert(userDevices).values({
            id: deviceId,
            userId: user.uid,
            fcmToken,
            deviceType,
            deviceName: deviceName || null,
            isActive: true,
            createdAt: new Date(),
            lastActive: new Date(),
        });

        logger.info({ userId: user.uid, deviceId }, 'Device registered');

        return c.json({
            success: true,
            message: 'Device registered',
            data: { deviceId },
        }, 201);
    } catch (error) {
        logger.error({ error }, 'Register device failed');
        return c.json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to register device',
        }, 400);
    }
});

/**
 * GET /notifications/devices
 * Get user's registered devices
 */
notificationsRoute.get('/devices', authMiddleware, async (c) => {
    try {
        const user = c.get('user') as AuthUser;

        const devices = await db
            .select()
            .from(userDevices)
            .where(eq(userDevices.userId, user.uid));

        return c.json({
            success: true,
            data: devices,
        });
    } catch (error) {
        return c.json({
            success: false,
            error: 'Failed to get devices',
        }, 500);
    }
});

/**
 * DELETE /notifications/device/:deviceId
 * Remove a device
 */
notificationsRoute.delete('/device/:deviceId', authMiddleware, async (c) => {
    try {
        const user = c.get('user') as AuthUser;
        const { deviceId } = c.req.param();

        const deleted = await db
            .delete(userDevices)
            .where(and(
                eq(userDevices.id, deviceId),
                eq(userDevices.userId, user.uid)
            ))
            .returning()
            .get();

        if (!deleted) {
            return c.json({
                success: false,
                error: 'Device not found',
            }, 404);
        }

        logger.info({ userId: user.uid, deviceId }, 'Device removed');

        return c.json({
            success: true,
            message: 'Device removed',
        });
    } catch (error) {
        logger.error({ error }, 'Remove device failed');
        return c.json({
            success: false,
            error: 'Failed to remove device',
        }, 500);
    }
});

// ===========================
// NOTIFICATION PREFERENCES
// ===========================

/**
 * GET /notifications/preferences
 * Get user's notification preferences
 */
notificationsRoute.get('/preferences', authMiddleware, async (c) => {
    try {
        const user = c.get('user') as AuthUser;

        let preferences = await db
            .select()
            .from(userNotificationPreferences)
            .where(eq(userNotificationPreferences.userId, user.uid))
            .get();

        // Create default preferences if not exists
        if (!preferences) {
            await db.insert(userNotificationPreferences).values({
                userId: user.uid,
                notifFollowedSources: true,
                notifDailyDigest: true,
                notifWeeklyComparison: true,
                notifBreakingNews: true,
                notifComments: true,
                notifAlignmentChanges: true,
                updatedAt: new Date(),
            });

            preferences = {
                userId: user.uid,
                notifFollowedSources: true,
                notifDailyDigest: true,
                notifWeeklyComparison: true,
                notifBreakingNews: true,
                notifComments: true,
                notifAlignmentChanges: true,
                updatedAt: new Date(),
            };
        }

        return c.json({
            success: true,
            data: preferences,
        });
    } catch (error) {
        logger.error({ error }, 'Get preferences failed');
        return c.json({
            success: false,
            error: 'Failed to get preferences',
        }, 500);
    }
});

/**
 * PUT /notifications/preferences
 * Update notification preferences
 */
notificationsRoute.put('/preferences', authMiddleware, async (c) => {
    try {
        const user = c.get('user') as AuthUser;
        const body = await c.req.json();
        const validatedData = updatePreferencesSchema.parse(body);

        // Check if preferences exist
        const existing = await db
            .select()
            .from(userNotificationPreferences)
            .where(eq(userNotificationPreferences.userId, user.uid))
            .get();

        if (existing) {
            // Update existing
            await db
                .update(userNotificationPreferences)
                .set({
                    ...validatedData,
                    updatedAt: new Date(),
                })
                .where(eq(userNotificationPreferences.userId, user.uid));
        } else {
            // Create new
            await db.insert(userNotificationPreferences).values({
                userId: user.uid,
                notifFollowedSources: validatedData.notifFollowedSources ?? true,
                notifDailyDigest: validatedData.notifDailyDigest ?? true,
                notifWeeklyComparison: validatedData.notifWeeklyComparison ?? true,
                notifBreakingNews: validatedData.notifBreakingNews ?? true,
                notifComments: validatedData.notifComments ?? true,
                updatedAt: new Date(),
            });
        }

        logger.info({ userId: user.uid }, 'Notification preferences updated');

        return c.json({
            success: true,
            message: 'Preferences updated',
        });
    } catch (error) {
        logger.error({ error }, 'Update preferences failed');
        return c.json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to update preferences',
        }, 400);
    }
});

// ===========================
// NOTIFICATION HISTORY
// ===========================

/**
 * GET /notifications/history
 * Get user's notification history
 */
notificationsRoute.get('/history', authMiddleware, async (c) => {
    try {
        const user = c.get('user') as AuthUser;
        const page = parseInt(c.req.query('page') ?? '1');
        const limit = Math.min(parseInt(c.req.query('limit') ?? '20'), 100);
        const offset = (page - 1) * limit;

        const userNotifications = await db
            .select()
            .from(notifications)
            .where(eq(notifications.userId, user.uid))
            .orderBy(desc(notifications.sentAt))
            .limit(limit)
            .offset(offset);

        // Count unread with efficient COUNT query
        const unreadResult = await db
            .select({ count: sql<number>`count(*)` })
            .from(notifications)
            .where(and(eq(notifications.userId, user.uid), eq(notifications.isRead, false)))
            .get();

        const unreadCount = unreadResult?.count || 0;

        return c.json({
            success: true,
            data: {
                notifications: userNotifications,
                unreadCount,
                pagination: {
                    page,
                    limit,
                    hasMore: userNotifications.length === limit,
                },
            },
        });
    } catch (error) {
        logger.error({ error }, 'Get notification history failed');
        return c.json({
            success: false,
            error: 'Failed to get notification history',
        }, 500);
    }
});

/**
 * PUT /notifications/:id/read
 * Mark notification as read
 */
notificationsRoute.put('/:notificationId/read', authMiddleware, async (c) => {
    try {
        const user = c.get('user') as AuthUser;
        const { notificationId } = c.req.param();

        const updated = await db
            .update(notifications)
            .set({ isRead: true })
            .where(and(
                eq(notifications.id, notificationId),
                eq(notifications.userId, user.uid)
            ))
            .returning()
            .get();

        if (!updated) {
            return c.json({
                success: false,
                error: 'Notification not found',
            }, 404);
        }

        return c.json({
            success: true,
            message: 'Notification marked as read',
        });
    } catch (error) {
        logger.error({ error }, 'Mark notification read failed');
        return c.json({
            success: false,
            error: 'Failed to mark notification as read',
        }, 500);
    }
});

/**
 * PUT /notifications/read-all
 * Mark all notifications as read
 */
notificationsRoute.put('/read-all', authMiddleware, async (c) => {
    try {
        const user = c.get('user') as AuthUser;

        await db
            .update(notifications)
            .set({ isRead: true })
            .where(eq(notifications.userId, user.uid));

        logger.info({ userId: user.uid }, 'All notifications marked as read');

        return c.json({
            success: true,
            message: 'All notifications marked as read',
        });
    } catch (error) {
        logger.error({ error }, 'Mark all read failed');
        return c.json({
            success: false,
            error: 'Failed to mark all as read',
        }, 500);
    }
});

/**
 * POST /notifications/send
 * Send push notification to user (admin only)
 */
notificationsRoute.post('/send', adminMiddleware, async (c) => {
    try {
        const body = await c.req.json();
        const schema = z.object({
            userId: z.string().min(1),
            title: z.string().min(1).max(100),
            body: z.string().min(1).max(500),
            data: z.record(z.string(), z.any()).optional(),
        });
        
        const { userId, title, body: data } = schema.parse(body);

        // Get user's FCM tokens
        const devices = await db
            .select()
            .from(userDevices)
            .where(and(
                eq(userDevices.userId, userId),
                eq(userDevices.isActive, true)
            ));

        if (devices.length === 0) {
            return c.json({
                success: false,
                error: 'No active devices found for user',
            }, 404);
        }

        // Store notification in database
        const notificationId = crypto.randomUUID();
        await db.insert(notifications).values({
            id: notificationId,
            userId,
            type: 'news',
            title,
            body,
            data: data ? JSON.stringify(data) : null,
            isRead: false,
            sentAt: new Date(),
        });

        // Send push notifications via Firebase
        if (messaging) {
            const fcmTokens = devices.map(d => d.fcmToken);
            
            const message = {
                notification: {
                    title,
                    body,
                },
                data: data || {},
                tokens: fcmTokens,
            };

            await messaging.sendMulticast(message);
            logger.info({ notificationId, userId, deviceCount: fcmTokens.length }, 'Push notification sent');
        }

        return c.json({
            success: true,
            message: 'Notification sent',
            data: {
                notificationId,
                deviceCount: devices.length,
            },
        }, 201);
    } catch (error) {
        logger.error({ error }, 'Send notification failed');
        return c.json({
            success: false,
            error: 'Failed to send notification',
        }, 500);
    }
});

export default notificationsRoute;
