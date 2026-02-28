import { Hono } from 'hono';
import { db } from '../config/db.js';
import { users, userDevices, notifications } from '../db/schema/index.js';
import { notificationCampaigns } from '../db/schema/admin.js';
import { authMiddleware, adminMiddleware, AuthUser } from '../middleware/auth.js';
import { eq, desc, sql, and, inArray } from 'drizzle-orm';
import { logger } from '../config/logger.js';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { sendBulkNotifications } from '../services/expoNotificationService.js';

type Variables = {
    user: AuthUser;
};

const adminCampaigns = new Hono<{ Variables: Variables }>();

adminCampaigns.use('*', authMiddleware, adminMiddleware);

const campaignSchema = z.object({
    name: z.string().min(1),
    title: z.string().min(1),
    body: z.string().min(1),
    targetAudience: z.enum(['all', 'free', 'premium', 'inactive']),
    scheduledAt: z.string().datetime().optional(),
});

// GET /admin/campaigns - List campaigns
adminCampaigns.get('/', async (c) => {
    try {
        const page = parseInt(c.req.query('page') || '1', 10);
        const limit = parseInt(c.req.query('limit') || '20', 10);
        const offset = (page - 1) * limit;

        const results = await db
            .select({
                id: notificationCampaigns.id,
                name: notificationCampaigns.name,
                title: notificationCampaigns.title,
                body: notificationCampaigns.body,
                targetAudience: notificationCampaigns.targetAudience,
                status: notificationCampaigns.status,
                scheduledAt: notificationCampaigns.scheduledAt,
                sentAt: notificationCampaigns.sentAt,
                sentCount: notificationCampaigns.sentCount,
                deliveredCount: notificationCampaigns.deliveredCount,
                openedCount: notificationCampaigns.openedCount,
                createdAt: notificationCampaigns.createdAt,
            })
            .from(notificationCampaigns)
            .orderBy(desc(notificationCampaigns.createdAt))
            .limit(limit)
            .offset(offset);

        const countResult = await db
            .select({ count: sql<number>`count(*)` })
            .from(notificationCampaigns)
            .get();

        return c.json({
            success: true,
            data: {
                campaigns: results,
                pagination: {
                    page,
                    limit,
                    total: countResult?.count || 0,
                    totalPages: Math.ceil((countResult?.count || 0) / limit),
                },
            },
        });
    } catch (error) {
        logger.error({ error }, 'Failed to fetch campaigns');
        return c.json({ success: false, error: 'Failed to fetch campaigns' }, 500);
    }
});

// POST /admin/campaigns - Create new campaign
adminCampaigns.post('/', async (c) => {
    try {
        const adminUser = c.get('user') as AuthUser;
        const body = await c.req.json();

        const { name, title, body: msgBody, targetAudience, scheduledAt } = campaignSchema.parse(body);

        const campaignId = uuidv4();

        await db.insert(notificationCampaigns).values({
            id: campaignId,
            name,
            title,
            body: msgBody,
            targetAudience,
            status: scheduledAt ? 'scheduled' : 'draft',
            scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
            createdBy: adminUser.uid,
            createdAt: new Date(),
        });

        logger.info({ campaignId, createdBy: adminUser.uid }, 'Campaign created');

        return c.json({ success: true, message: 'Campaign created', data: { campaignId } }, 201);
    } catch (error) {
        logger.error({ error }, 'Failed to create campaign');
        return c.json({ success: false, error: 'Failed to create campaign' }, 500);
    }
});

// POST /admin/campaigns/:campaignId/send - Send campaign immediately
adminCampaigns.post('/:campaignId/send', async (c) => {
    try {
        const campaignId = c.req.param('campaignId');
        const adminUser = c.get('user') as AuthUser;

        const campaign = await db
            .select()
            .from(notificationCampaigns)
            .where(eq(notificationCampaigns.id, campaignId))
            .get();

        if (!campaign) {
            return c.json({ success: false, error: 'Campaign not found' }, 404);
        }

        if (campaign.status === 'sent') {
            return c.json({ success: false, error: 'Campaign already sent' }, 400);
        }

        // Get target user IDs based on audience
        let whereClause = undefined;
        if (campaign.targetAudience === 'premium') {
            whereClause = eq(users.subscriptionStatus, 'premium');
        } else if (campaign.targetAudience === 'free') {
            whereClause = eq(users.subscriptionStatus, 'free');
        } else if (campaign.targetAudience === 'inactive') {
            // Users with no device activity in last 30 days
            const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
            const activeUserIds = await db
                .select({ userId: userDevices.userId })
                .from(userDevices)
                .where(and(
                    eq(userDevices.isActive, true),
                    sql`${userDevices.lastActive} > ${Math.floor(thirtyDaysAgo.getTime() / 1000)}`
                ));
            const activeSet = new Set(activeUserIds.map(u => u.userId));
            const allUsers = await db.select({ id: users.id }).from(users);
            const inactiveIds = allUsers.filter(u => !activeSet.has(u.id)).map(u => u.id);

            if (inactiveIds.length === 0) {
                await db.update(notificationCampaigns).set({ status: 'sent', sentAt: new Date(), sentCount: 0, deliveredCount: 0 }).where(eq(notificationCampaigns.id, campaignId));
                return c.json({ success: true, message: 'No inactive users found', data: { sentCount: 0, failedCount: 0, totalTargets: 0 } });
            }

            // Use inactive user IDs directly
            const devices = await db
                .select({ fcmToken: userDevices.fcmToken })
                .from(userDevices)
                .where(and(eq(userDevices.isActive, true), inArray(userDevices.userId, inactiveIds)));
            const tokens = devices.map(d => d.fcmToken).filter(Boolean);

            let sentCount = 0;
            let failedCount = 0;
            if (tokens.length > 0) {
                const result = await sendBulkNotifications(tokens, campaign.title, campaign.body, { type: 'campaign', campaignId });
                sentCount = result.success;
                failedCount = result.failed;
            }

            // Save notification records
            const now = new Date();
            for (const userId of inactiveIds) {
                try {
                    await db.insert(notifications).values({ id: uuidv4(), userId, type: 'campaign', title: campaign.title, body: campaign.body, data: JSON.stringify({ campaignId }), sentAt: now });
                } catch (_) { /* non-critical */ }
            }

            await db.update(notificationCampaigns).set({ status: 'sent', sentAt: now, sentCount: tokens.length, deliveredCount: sentCount }).where(eq(notificationCampaigns.id, campaignId));
            logger.info({ campaignId, sentCount, failedCount, totalTokens: tokens.length, audience: 'inactive' }, 'Campaign sent');
            return c.json({ success: true, message: 'Campaign sent', data: { sentCount, failedCount, totalTargets: tokens.length } });
        }
        // 'all', 'premium', 'free' paths
        const targetUsers = await db
            .select({ id: users.id })
            .from(users)
            .where(whereClause);

        const userIds = targetUsers.map(u => u.id);

        // Get active device tokens for target users
        let tokens: string[] = [];
        if (userIds.length > 0) {
            const devices = await db
                .select({ fcmToken: userDevices.fcmToken })
                .from(userDevices)
                .where(and(
                    eq(userDevices.isActive, true),
                    inArray(userDevices.userId, userIds)
                ));
            tokens = devices.map(d => d.fcmToken).filter(Boolean);
        }

        // Send actual push notifications
        let sentCount = 0;
        let failedCount = 0;

        if (tokens.length > 0) {
            const result = await sendBulkNotifications(
                tokens,
                campaign.title,
                campaign.body,
                { type: 'campaign', campaignId }
            );
            sentCount = result.success;
            failedCount = result.failed;
        }

        // Save notification records for each target user
        const now = new Date();
        for (const userId of userIds) {
            try {
                await db.insert(notifications).values({
                    id: uuidv4(),
                    userId,
                    type: 'campaign',
                    title: campaign.title,
                    body: campaign.body,
                    data: JSON.stringify({ campaignId }),
                    sentAt: now,
                });
            } catch (_) { /* non-critical */ }
        }

        // Update campaign status
        await db
            .update(notificationCampaigns)
            .set({
                status: 'sent',
                sentAt: now,
                sentCount: tokens.length,
                deliveredCount: sentCount,
            })
            .where(eq(notificationCampaigns.id, campaignId));

        logger.info({ campaignId, sentCount, failedCount, totalTokens: tokens.length }, 'Campaign sent');

        return c.json({
            success: true,
            message: 'Campaign sent',
            data: { sentCount, failedCount, totalTargets: tokens.length },
        });
    } catch (error) {
        logger.error({ error }, 'Failed to send campaign');
        return c.json({ success: false, error: 'Failed to send campaign' }, 500);
    }
});

export default adminCampaigns;
