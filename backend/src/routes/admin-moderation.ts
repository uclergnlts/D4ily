import { Hono } from 'hono';
import { db } from '../config/db.js';
import { blacklistedWords, moderationQueue } from '../db/schema/admin.js';
import { authMiddleware, adminMiddleware, AuthUser } from '../middleware/auth.js';
import { eq, desc, sql } from 'drizzle-orm';
import { logger } from '../config/logger.js';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';

type Variables = {
    user: AuthUser;
};

const adminModeration = new Hono<{ Variables: Variables }>();

adminModeration.use('*', authMiddleware, adminMiddleware);

// Schemas
const blacklistedWordSchema = z.object({
    word: z.string().min(1),
    category: z.enum(['spam', 'offensive', 'political', 'other']).default('other'),
});

const moderationDecisionSchema = z.object({
    action: z.enum(['approve', 'reject', 'escalate']),
    reason: z.string().optional(),
});

// === BLACKLISTED WORDS ===

// GET /admin/moderation/blacklist - List blacklisted words
adminModeration.get('/blacklist', async (c) => {
    try {
        const page = parseInt(c.req.query('page') || '1', 10);
        const limit = parseInt(c.req.query('limit') || '50', 10);
        const category = c.req.query('category');
        const offset = (page - 1) * limit;

        let whereClause = undefined;
        if (category) {
            whereClause = eq(blacklistedWords.category, category);
        }

        const results = await db
            .select({
                id: blacklistedWords.id,
                word: blacklistedWords.word,
                category: blacklistedWords.category,
                createdAt: blacklistedWords.createdAt,
            })
            .from(blacklistedWords)
            .where(whereClause)
            .orderBy(desc(blacklistedWords.createdAt))
            .limit(limit)
            .offset(offset);

        const countResult = await db
            .select({ count: sql<number>`count(*)` })
            .from(blacklistedWords)
            .where(whereClause)
            .get();

        return c.json({
            success: true,
            data: {
                words: results,
                pagination: {
                    page,
                    limit,
                    total: countResult?.count || 0,
                    totalPages: Math.ceil((countResult?.count || 0) / limit),
                },
            },
        });
    } catch (error) {
        logger.error({ error }, 'Failed to fetch blacklisted words');
        return c.json({ success: false, error: 'Failed to fetch blacklisted words' }, 500);
    }
});

// POST /admin/moderation/blacklist - Add word to blacklist
adminModeration.post('/blacklist', async (c) => {
    try {
        const adminUser = c.get('user') as AuthUser;
        const body = await c.req.json();

        const { word, category } = blacklistedWordSchema.parse(body);

        // Check if word already exists
        const existing = await db
            .select({ id: blacklistedWords.id })
            .from(blacklistedWords)
            .where(eq(blacklistedWords.word, word.toLowerCase()))
            .get();

        if (existing) {
            return c.json({ success: false, error: 'Word already in blacklist' }, 409);
        }

        const wordId = uuidv4();

        await db.insert(blacklistedWords).values({
            id: wordId,
            word: word.toLowerCase(),
            category,
            createdBy: adminUser.uid,
            createdAt: new Date(),
        });

        logger.info({ wordId, word, addedBy: adminUser.uid }, 'Word added to blacklist');

        return c.json({ success: true, message: 'Word added to blacklist', data: { wordId } }, 201);
    } catch (error) {
        logger.error({ error }, 'Failed to add word to blacklist');
        return c.json({ success: false, error: 'Failed to add word to blacklist' }, 500);
    }
});

// DELETE /admin/moderation/blacklist/:wordId - Remove word from blacklist
adminModeration.delete('/blacklist/:wordId', async (c) => {
    try {
        const wordId = c.req.param('wordId');

        const result = await db.delete(blacklistedWords).where(eq(blacklistedWords.id, wordId)).returning();

        if (result.length === 0) {
            return c.json({ success: false, error: 'Word not found' }, 404);
        }

        logger.info({ wordId }, 'Word removed from blacklist');

        return c.json({ success: true, message: 'Word removed from blacklist' });
    } catch (error) {
        logger.error({ error }, 'Failed to remove word from blacklist');
        return c.json({ success: false, error: 'Failed to remove word from blacklist' }, 500);
    }
});

// === MODERATION QUEUE ===

// GET /admin/moderation/queue - Get moderation queue
adminModeration.get('/queue', async (c) => {
    try {
        const page = parseInt(c.req.query('page') || '1', 10);
        const limit = parseInt(c.req.query('limit') || '20', 10);
        const status = c.req.query('status') || 'pending';
        const contentType = c.req.query('contentType');
        const offset = (page - 1) * limit;

        let whereClause: any = eq(moderationQueue.status, status);
        
        if (contentType) {
            whereClause = sql`${whereClause} AND ${moderationQueue.contentType} = ${contentType}`;
        }

        const results = await db
            .select({
                id: moderationQueue.id,
                contentType: moderationQueue.contentType,
                contentId: moderationQueue.contentId,
                flaggedBy: moderationQueue.flaggedBy,
                status: moderationQueue.status,
                createdAt: moderationQueue.createdAt,
                reviewedAt: moderationQueue.reviewedAt,
            })
            .from(moderationQueue)
            .where(whereClause)
            .orderBy(desc(moderationQueue.createdAt))
            .limit(limit)
            .offset(offset);

        const countResult = await db
            .select({ count: sql<number>`count(*)` })
            .from(moderationQueue)
            .where(whereClause)
            .get();

        return c.json({
            success: true,
            data: {
                items: results,
                pagination: {
                    page,
                    limit,
                    total: countResult?.count || 0,
                    totalPages: Math.ceil((countResult?.count || 0) / limit),
                },
            },
        });
    } catch (error) {
        logger.error({ error }, 'Failed to fetch moderation queue');
        return c.json({ success: false, error: 'Failed to fetch moderation queue' }, 500);
    }
});

// POST /admin/moderation/queue/:itemId/decision - Make moderation decision
adminModeration.post('/queue/:itemId/decision', async (c) => {
    try {
        const itemId = c.req.param('itemId');
        const adminUser = c.get('user') as AuthUser;
        const body = await c.req.json();

        const { action, reason } = moderationDecisionSchema.parse(body);

        const item = await db
            .select()
            .from(moderationQueue)
            .where(eq(moderationQueue.id, itemId))
            .get();

        if (!item) {
            return c.json({ success: false, error: 'Item not found' }, 404);
        }

        if (item.status !== 'pending') {
            return c.json({ success: false, error: 'Item already reviewed' }, 400);
        }

        await db
            .update(moderationQueue)
            .set({
                status: action === 'escalate' ? 'escalated' : 'resolved',
                reviewedBy: adminUser.uid,
                reviewedAt: new Date(),
            })
            .where(eq(moderationQueue.id, itemId));

        logger.info({ itemId, action, reviewedBy: adminUser.uid }, 'Moderation decision made');

        return c.json({
            success: true,
            message: `Content ${action}ed`,
            data: { action },
        });
    } catch (error) {
        logger.error({ error }, 'Failed to process moderation decision');
        return c.json({ success: false, error: 'Failed to process moderation decision' }, 500);
    }
});

export default adminModeration;
