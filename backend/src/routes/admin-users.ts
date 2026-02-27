import { Hono } from 'hono';
import { db } from '../config/db.js';
import { users, userDevices, userNotificationPreferences } from '../db/schema/index.js';
import { userActivityLogs, userBans } from '../db/schema/admin.js';
import { authMiddleware, adminMiddleware, AuthUser } from '../middleware/auth.js';
import { eq, desc, sql, and } from 'drizzle-orm';
import { logger } from '../config/logger.js';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';

type Variables = {
    user: AuthUser;
};

const adminUsers = new Hono<{ Variables: Variables }>();

adminUsers.use('*', authMiddleware, adminMiddleware);

const banUserSchema = z.object({
    reason: z.string().min(1, 'Reason is required'),
    durationDays: z.number().int().min(1).optional(),
});

// GET /admin/users - List users
adminUsers.get('/', async (c) => {
    try {
        const page = parseInt(c.req.query('page') || '1', 10);
        const limit = parseInt(c.req.query('limit') || '20', 10);
        const search = c.req.query('search');
        const offset = (page - 1) * limit;

        let whereClause = undefined;
        if (search) {
            whereClause = sql`(${users.name} LIKE ${`%${search}%`} OR ${users.email} LIKE ${`%${search}%`})`;
        }

        const results = await db
            .select({
                id: users.id,
                email: users.email,
                name: users.name,
                userRole: users.userRole,
                subscriptionStatus: users.subscriptionStatus,
                avatarUrl: users.avatarUrl,
                createdAt: users.createdAt,
            })
            .from(users)
            .where(whereClause)
            .orderBy(desc(users.createdAt))
            .limit(limit)
            .offset(offset);

        const countResult = await db
            .select({ count: sql<number>`count(*)` })
            .from(users)
            .where(whereClause)
            .get();

        return c.json({
            success: true,
            data: {
                users: results,
                pagination: {
                    page,
                    limit,
                    total: countResult?.count || 0,
                    totalPages: Math.ceil((countResult?.count || 0) / limit),
                },
            },
        });
    } catch (error) {
        logger.error({ error }, 'Failed to fetch users');
        return c.json({ success: false, error: 'Failed to fetch users' }, 500);
    }
});

// GET /admin/users/:userId - Get user details
adminUsers.get('/:userId', async (c) => {
    try {
        const userId = c.req.param('userId');

        const user = await db
            .select({
                id: users.id,
                email: users.email,
                name: users.name,
                userRole: users.userRole,
                subscriptionStatus: users.subscriptionStatus,
                avatarUrl: users.avatarUrl,
                createdAt: users.createdAt,
            })
            .from(users)
            .where(eq(users.id, userId))
            .get();

        if (!user) {
            return c.json({ success: false, error: 'User not found' }, 404);
        }

        const devices = await db
            .select({
                id: userDevices.id,
                deviceType: userDevices.deviceType,
                isActive: userDevices.isActive,
                lastActive: userDevices.lastActive,
            })
            .from(userDevices)
            .where(eq(userDevices.userId, userId));

        const activeBan = await db
            .select({
                id: userBans.id,
                reason: userBans.reason,
                bannedAt: userBans.bannedAt,
                expiresAt: userBans.expiresAt,
            })
            .from(userBans)
            .where(and(eq(userBans.userId, userId), eq(userBans.isActive, true)))
            .get();

        return c.json({
            success: true,
            data: { user, devices, banStatus: activeBan || null },
        });
    } catch (error) {
        logger.error({ error }, 'Failed to fetch user details');
        return c.json({ success: false, error: 'Failed to fetch user details' }, 500);
    }
});

// POST /admin/users/:userId/ban - Ban user
adminUsers.post('/:userId/ban', async (c) => {
    try {
        const userId = c.req.param('userId');
        const adminUser = c.get('user') as AuthUser;
        const body = await c.req.json();

        const { reason, durationDays } = banUserSchema.parse(body);

        const user = await db.select({ id: users.id }).from(users).where(eq(users.id, userId)).get();
        if (!user) {
            return c.json({ success: false, error: 'User not found' }, 404);
        }

        await db.update(userBans).set({ isActive: false }).where(eq(userBans.userId, userId));

        const banId = uuidv4();
        const expiresAt = durationDays ? new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000) : null;

        await db.insert(userBans).values({
            id: banId,
            userId,
            reason,
            bannedBy: adminUser.uid,
            bannedAt: new Date(),
            expiresAt,
            isActive: true,
        });

        logger.info({ userId, bannedBy: adminUser.uid }, 'User banned');

        return c.json({ success: true, message: 'User banned successfully', data: { banId, expiresAt } });
    } catch (error) {
        logger.error({ error }, 'Failed to ban user');
        return c.json({ success: false, error: 'Failed to ban user' }, 500);
    }
});

// POST /admin/users/:userId/unban - Unban user
adminUsers.post('/:userId/unban', async (c) => {
    try {
        const userId = c.req.param('userId');
        const adminUser = c.get('user') as AuthUser;

        const result = await db
            .update(userBans)
            .set({ isActive: false, unbannedAt: new Date(), unbannedBy: adminUser.uid })
            .where(and(eq(userBans.userId, userId), eq(userBans.isActive, true)))
            .returning();

        if (result.length === 0) {
            return c.json({ success: false, error: 'No active ban found' }, 404);
        }

        logger.info({ userId, unbannedBy: adminUser.uid }, 'User unbanned');

        return c.json({ success: true, message: 'User unbanned successfully' });
    } catch (error) {
        logger.error({ error }, 'Failed to unban user');
        return c.json({ success: false, error: 'Failed to unban user' }, 500);
    }
});

export default adminUsers;
