import { Hono } from 'hono';
import { db } from '../config/db.js';
import { users, userDevices } from '../db/schema/index.js';
import { analyticsSnapshots } from '../db/schema/admin.js';
import { authMiddleware, adminMiddleware, AuthUser } from '../middleware/auth.js';
import { eq, desc, sql, gte, lte, and } from 'drizzle-orm';
import { logger } from '../config/logger.js';

type Variables = {
    user: AuthUser;
};

const adminAnalytics = new Hono<{ Variables: Variables }>();

adminAnalytics.use('*', authMiddleware, adminMiddleware);

// Helper to get date N days ago
function subDays(date: Date, days: number): Date {
    const result = new Date(date);
    result.setDate(result.getDate() - days);
    return result;
}

function startOfDay(date: Date): Date {
    const result = new Date(date);
    result.setHours(0, 0, 0, 0);
    return result;
}

function endOfDay(date: Date): Date {
    const result = new Date(date);
    result.setHours(23, 59, 59, 999);
    return result;
}

// GET /admin/analytics/dashboard - Get dashboard overview stats
adminAnalytics.get('/dashboard', async (c) => {
    try {
        const today = new Date();
        const thirtyDaysAgo = subDays(today, 30);

        // Total users
        const totalUsersResult = await db
            .select({ count: sql<number>`count(*)` })
            .from(users)
            .get();

        // New users today
        const todayStart = startOfDay(today);
        const todayEnd = endOfDay(today);
        const newUsersTodayResult = await db
            .select({ count: sql<number>`count(*)` })
            .from(users)
            .where(and(
                gte(users.createdAt, todayStart),
                lte(users.createdAt, todayEnd)
            ))
            .get();

        // Active users (last 30 days)
        const activeUsersResult = await db
            .select({ count: sql<number>`count(distinct ${users.id})` })
            .from(users)
            .innerJoin(userDevices, eq(users.id, userDevices.userId))
            .where(gte(userDevices.lastActive, thirtyDaysAgo))
            .get();

        // Premium users
        const premiumUsersResult = await db
            .select({ count: sql<number>`count(*)` })
            .from(users)
            .where(eq(users.subscriptionStatus, 'premium'))
            .get();

        return c.json({
            success: true,
            data: {
                users: {
                    total: totalUsersResult?.count || 0,
                    newToday: newUsersTodayResult?.count || 0,
                    active30d: activeUsersResult?.count || 0,
                    premium: premiumUsersResult?.count || 0,
                    free: (totalUsersResult?.count || 0) - (premiumUsersResult?.count || 0),
                },
                retention: {
                    dau: 0,
                    mau: activeUsersResult?.count || 0,
                },
            },
        });
    } catch (error) {
        logger.error({ error }, 'Failed to fetch dashboard stats');
        return c.json({ success: false, error: 'Failed to fetch dashboard stats' }, 500);
    }
});

// GET /admin/analytics/users - User analytics over time
adminAnalytics.get('/users', async (c) => {
    try {
        const days = parseInt(c.req.query('days') || '30', 10);
        const startDate = subDays(new Date(), days);

        // Get user signups by day
        const signups = await db
            .select({
                date: sql<string>`date(${users.createdAt})`,
                count: sql<number>`count(*)`,
            })
            .from(users)
            .where(gte(users.createdAt, startDate))
            .groupBy(sql`date(${users.createdAt})`)
            .orderBy(sql`date(${users.createdAt})`);

        return c.json({
            success: true,
            data: {
                signups,
                period: { days, startDate: startDate.toISOString() },
            },
        });
    } catch (error) {
        logger.error({ error }, 'Failed to fetch user analytics');
        return c.json({ success: false, error: 'Failed to fetch user analytics' }, 500);
    }
});

// GET /admin/analytics/retention - Retention metrics
adminAnalytics.get('/retention', async (c) => {
    try {
        const thirtyDaysAgo = subDays(new Date(), 30);

        // Users who joined in the last 30 days
        const newUsers = await db
            .select({ count: sql<number>`count(*)` })
            .from(users)
            .where(gte(users.createdAt, thirtyDaysAgo))
            .get();

        // Of those, how many were active in the last 7 days
        const sevenDaysAgo = subDays(new Date(), 7);
        const retainedUsers = await db
            .select({ count: sql<number>`count(distinct ${users.id})` })
            .from(users)
            .innerJoin(userDevices, eq(users.id, userDevices.userId))
            .where(and(
                gte(users.createdAt, thirtyDaysAgo),
                gte(userDevices.lastActive, sevenDaysAgo)
            ))
            .get();

        const retentionRate = newUsers?.count
            ? ((retainedUsers?.count || 0) / newUsers.count * 100).toFixed(2)
            : '0.00';

        return c.json({
            success: true,
            data: {
                retentionRate: parseFloat(retentionRate),
                newUsers: newUsers?.count || 0,
                retainedUsers: retainedUsers?.count || 0,
                period: '30d',
            },
        });
    } catch (error) {
        logger.error({ error }, 'Failed to fetch retention analytics');
        return c.json({ success: false, error: 'Failed to fetch retention analytics' }, 500);
    }
});

// GET /admin/analytics/snapshots - Get historical snapshots
adminAnalytics.get('/snapshots', async (c) => {
    try {
        const limit = parseInt(c.req.query('limit') || '30', 10);

        const results = await db
            .select({
                id: analyticsSnapshots.id,
                date: analyticsSnapshots.date,
                totalUsers: analyticsSnapshots.totalUsers,
                activeUsers: analyticsSnapshots.activeUsers,
                newUsers: analyticsSnapshots.newUsers,
                premiumUsers: analyticsSnapshots.premiumUsers,
                createdAt: analyticsSnapshots.createdAt,
            })
            .from(analyticsSnapshots)
            .orderBy(desc(analyticsSnapshots.date))
            .limit(limit);

        return c.json({
            success: true,
            data: { snapshots: results },
        });
    } catch (error) {
        logger.error({ error }, 'Failed to fetch analytics snapshots');
        return c.json({ success: false, error: 'Failed to fetch analytics snapshots' }, 500);
    }
});

export default adminAnalytics;
