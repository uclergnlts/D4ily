import { Hono } from 'hono';
import { db } from '../config/db.js';
import { readingHistory, bookmarks } from '../db/schema/index.js';
import { authMiddleware, AuthUser } from '../middleware/auth.js';
import { eq, desc, and } from 'drizzle-orm';
import { logger } from '../config/logger.js';
import { z } from 'zod';

type Variables = {
    user: AuthUser;
};

const historyRoute = new Hono<{ Variables: Variables }>();

// Apply auth middleware to all routes
historyRoute.use('*', authMiddleware);

/**
 * GET /history
 * Get user's reading history
 */
historyRoute.get('/', async (c) => {
    try {
        const authUser = c.get('user') as AuthUser;
        const page = parseInt(c.req.query('page') ?? '1');
        const limit = parseInt(c.req.query('limit') ?? '20');
        const offset = (page - 1) * limit;

        const history = await db
            .select()
            .from(readingHistory)
            .where(eq(readingHistory.userId, authUser.uid))
            .orderBy(desc(readingHistory.viewedAt))
            .limit(limit)
            .offset(offset);

        return c.json({
            success: true,
            data: history,
            pagination: {
                page,
                limit,
                hasMore: history.length === limit,
            },
        });
    } catch (error) {
        logger.error({ error }, 'Get reading history failed');
        return c.json({
            success: false,
            error: 'Failed to get reading history',
        }, 500);
    }
});

/**
 * POST /history
 * Add article to reading history
 */
historyRoute.post('/', async (c) => {
    try {
        const authUser = c.get('user') as AuthUser;
        const body = await c.req.json();
        
        const schema = z.object({
            articleId: z.string().min(1),
            countryCode: z.enum(['tr', 'de', 'us', 'uk', 'fr', 'es', 'it', 'ru']),
            timeSpentSeconds: z.number().int().min(0).optional(),
        });
        
        const { articleId, countryCode, timeSpentSeconds } = schema.parse(body);

        // Check if already exists
        const existing = await db
            .select()
            .from(readingHistory)
            .where(and(
                eq(readingHistory.userId, authUser.uid),
                eq(readingHistory.articleId, articleId)
            ))
            .get();

        if (existing) {
            // Update time spent
            await db
                .update(readingHistory)
                .set({
                    timeSpentSeconds: (existing.timeSpentSeconds || 0) + (timeSpentSeconds || 0),
                    viewedAt: new Date(),
                })
                .where(eq(readingHistory.id, existing.id));

            return c.json({
                success: true,
                message: 'Reading history updated',
            });
        }

        // Create new entry
        await db.insert(readingHistory).values({
            id: crypto.randomUUID(),
            userId: authUser.uid,
            articleId,
            countryCode,
            viewedAt: new Date(),
            timeSpentSeconds: timeSpentSeconds || 0,
        });

        return c.json({
            success: true,
            message: 'Added to reading history',
        }, 201);
    } catch (error) {
        logger.error({ error }, 'Add to reading history failed');
        return c.json({
            success: false,
            error: 'Failed to add to reading history',
        }, 400);
    }
});

/**
 * DELETE /history/:articleId
 * Remove article from reading history
 */
historyRoute.delete('/:articleId', async (c) => {
    try {
        const authUser = c.get('user') as AuthUser;
        const { articleId } = c.req.param();

        await db
            .delete(readingHistory)
            .where(and(
                eq(readingHistory.userId, authUser.uid),
                eq(readingHistory.articleId, articleId)
            ));

        return c.json({
            success: true,
            message: 'Removed from reading history',
        });
    } catch (error) {
        logger.error({ error }, 'Remove from reading history failed');
        return c.json({
            success: false,
            error: 'Failed to remove from reading history',
        }, 500);
    }
});

/**
 * DELETE /history
 * Clear all reading history
 */
historyRoute.delete('/', async (c) => {
    try {
        const authUser = c.get('user') as AuthUser;

        await db
            .delete(readingHistory)
            .where(eq(readingHistory.userId, authUser.uid));

        logger.info({ userId: authUser.uid }, 'Reading history cleared');

        return c.json({
            success: true,
            message: 'Reading history cleared',
        });
    } catch (error) {
        logger.error({ error }, 'Clear reading history failed');
        return c.json({
            success: false,
            error: 'Failed to clear reading history',
        }, 500);
    }
});

export default historyRoute;
