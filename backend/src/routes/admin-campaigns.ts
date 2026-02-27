import { Hono } from 'hono';
import { db } from '../config/db.js';
import { users } from '../db/schema/index.js';
import { notificationCampaigns } from '../db/schema/admin.js';
import { authMiddleware, adminMiddleware, AuthUser } from '../middleware/auth.js';
import { eq, desc, sql } from 'drizzle-orm';
import { logger } from '../config/logger.js';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { sendPushNotification } from '../services/expoNotificationService.js';

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

        // Get all users (simplified - in production you'd get push tokens from user_devices table)
        let userQuery = db.select({ id: users.id }).from(users);
        
        if (campaign.targetAudience === 'premium') {
            userQuery = userQuery.where(eq(users.subscriptionStatus, 'premium')) as typeof userQuery;
        } else if (campaign.targetAudience === 'free') {
            userQuery = userQuery.where(eq(users.subscriptionStatus, 'free')) as typeof userQuery;
        }

        const targetUsers = await userQuery;

        // Send notifications (mock - would use actual push tokens)
        let sentCount = 0;
        let failedCount = 0;

        // Update campaign status
        await db
            .update(notificationCampaigns)
            .set({
                status: 'sent',
                sentAt: new Date(),
                sentCount: targetUsers.length,
                deliveredCount: sentCount,
            })
            .where(eq(notificationCampaigns.id, campaignId));

        logger.info({ campaignId, sentCount, failedCount }, 'Campaign sent');

        return c.json({
            success: true,
            message: 'Campaign sent',
            data: { sentCount, failedCount, totalTargets: targetUsers.length },
        });
    } catch (error) {
        logger.error({ error }, 'Failed to send campaign');
        return c.json({ success: false, error: 'Failed to send campaign' }, 500);
    }
});

export default adminCampaigns;
