import { Hono } from 'hono';
import { db } from '../config/db.js';
import {
    articleReactions,
    bookmarks,
    readingHistory,
    tr_articles,
    de_articles,
    us_articles,
} from '../db/schema/index.js';
import { authMiddleware, AuthUser } from '../middleware/auth.js';
import { eq, and, desc, sql } from 'drizzle-orm';
import { z } from 'zod';
import { logger } from '../config/logger.js';
import { v4 as uuidv4 } from 'uuid';
import { cacheInvalidate } from '../config/redis.js';

type Variables = {
    user: AuthUser;
};

const reactionRoute = new Hono<{ Variables: Variables }>();

// Country tables mapping
const COUNTRY_TABLES = {
    tr: tr_articles,
    de: de_articles,
    us: us_articles,
} as const;

// Schemas
const reactionSchema = z.object({
    articleId: z.string(),
    countryCode: z.enum(['tr', 'de', 'us']),
    action: z.enum(['like', 'dislike', 'remove']),
});

const bookmarkSchema = z.object({
    articleId: z.string(),
    countryCode: z.enum(['tr', 'de', 'us']),
});

const historySchema = z.object({
    articleId: z.string(),
    countryCode: z.enum(['tr', 'de', 'us']),
    timeSpent: z.number().optional(),
});

/**
 * Helper function to update article reaction counts
 */
async function updateArticleReactionCounts(
    articleId: string,
    countryCode: 'tr' | 'de' | 'us',
    likeChange: number,
    dislikeChange: number
) {
    const table = COUNTRY_TABLES[countryCode];

    // Get current counts
    const article = await db
        .select({ likeCount: table.likeCount, dislikeCount: table.dislikeCount })
        .from(table)
        .where(eq(table.id, articleId))
        .get();

    if (article) {
        await db
            .update(table)
            .set({
                likeCount: Math.max(0, article.likeCount + likeChange),
                dislikeCount: Math.max(0, article.dislikeCount + dislikeChange),
            })
            .where(eq(table.id, articleId));

        // Invalidate cache
        await cacheInvalidate(`article:${countryCode}:${articleId}`);
    }
}

/**
 * POST /reactions/like
 * Toggle like/dislike on an article
 */
reactionRoute.post('/like', authMiddleware, async (c) => {
    try {
        const user = c.get('user') as AuthUser;
        const body = await c.req.json();
        const { articleId, countryCode, action } = reactionSchema.parse(body);

        if (action === 'remove') {
            // Get existing reaction to know what to decrement
            const existing = await db.select()
                .from(articleReactions)
                .where(and(
                    eq(articleReactions.userId, user.uid),
                    eq(articleReactions.articleId, articleId)
                ))
                .get();

            if (existing) {
                // Update article counts
                if (existing.reactionType === 'like') {
                    await updateArticleReactionCounts(articleId, countryCode, -1, 0);
                } else {
                    await updateArticleReactionCounts(articleId, countryCode, 0, -1);
                }

                await db.delete(articleReactions)
                    .where(eq(articleReactions.id, existing.id));
            }

            return c.json({ success: true, message: 'Reaction removed' });
        }

        // Check existing reaction
        const existing = await db.select()
            .from(articleReactions)
            .where(and(
                eq(articleReactions.userId, user.uid),
                eq(articleReactions.articleId, articleId)
            ))
            .get();

        if (existing) {
            if (existing.reactionType === action) {
                // Toggle off if same action
                if (action === 'like') {
                    await updateArticleReactionCounts(articleId, countryCode, -1, 0);
                } else {
                    await updateArticleReactionCounts(articleId, countryCode, 0, -1);
                }

                await db.delete(articleReactions).where(eq(articleReactions.id, existing.id));
                return c.json({ success: true, message: 'Reaction removed', reactionType: null });
            } else {
                // Update if different action (like -> dislike or dislike -> like)
                if (existing.reactionType === 'like') {
                    // Was like, now dislike: -1 like, +1 dislike
                    await updateArticleReactionCounts(articleId, countryCode, -1, 1);
                } else {
                    // Was dislike, now like: +1 like, -1 dislike
                    await updateArticleReactionCounts(articleId, countryCode, 1, -1);
                }

                await db.update(articleReactions)
                    .set({ reactionType: action })
                    .where(eq(articleReactions.id, existing.id));

                return c.json({ success: true, message: `Updated to ${action}`, reactionType: action });
            }
        }

        // Insert new reaction
        await db.insert(articleReactions).values({
            id: uuidv4(),
            userId: user.uid,
            articleId,
            countryCode,
            reactionType: action,
        });

        // Update article counts
        if (action === 'like') {
            await updateArticleReactionCounts(articleId, countryCode, 1, 0);
        } else {
            await updateArticleReactionCounts(articleId, countryCode, 0, 1);
        }

        return c.json({ success: true, message: `${action} added`, reactionType: action });
    } catch (error) {
        logger.error({ error }, 'Reaction failed');
        return c.json({ success: false, error: 'Failed to process reaction' }, 400);
    }
});

/**
 * GET /reactions/status/:countryCode/:articleId
 * Get user's reaction status for an article
 */
reactionRoute.get('/status/:countryCode/:articleId', authMiddleware, async (c) => {
    try {
        const user = c.get('user') as AuthUser;
        const { countryCode, articleId } = c.req.param();

        const reaction = await db.select()
            .from(articleReactions)
            .where(and(
                eq(articleReactions.userId, user.uid),
                eq(articleReactions.articleId, articleId)
            ))
            .get();

        const bookmark = await db.select()
            .from(bookmarks)
            .where(and(
                eq(bookmarks.userId, user.uid),
                eq(bookmarks.articleId, articleId)
            ))
            .get();

        return c.json({
            success: true,
            data: {
                reactionType: reaction?.reactionType || null,
                isBookmarked: !!bookmark,
            },
        });
    } catch (error) {
        return c.json({ success: false, error: 'Failed to get status' }, 500);
    }
});

/**
 * POST /reactions/bookmark
 * Toggle bookmark
 */
reactionRoute.post('/bookmark', authMiddleware, async (c) => {
    try {
        const user = c.get('user') as AuthUser;
        const body = await c.req.json();
        const { articleId, countryCode } = bookmarkSchema.parse(body);

        const existing = await db.select()
            .from(bookmarks)
            .where(and(
                eq(bookmarks.userId, user.uid),
                eq(bookmarks.articleId, articleId)
            ))
            .get();

        if (existing) {
            await db.delete(bookmarks).where(eq(bookmarks.id, existing.id));
            return c.json({ success: true, isBookmarked: false });
        }

        await db.insert(bookmarks).values({
            id: uuidv4(),
            userId: user.uid,
            articleId,
            countryCode,
        });

        return c.json({ success: true, isBookmarked: true });
    } catch (error) {
        logger.error({ error }, 'Bookmark failed');
        return c.json({ success: false, error: 'Failed to bookmark' }, 400);
    }
});

/**
 * GET /reactions/bookmarks
 * Get user bookmarks with article details
 */
reactionRoute.get('/bookmarks', authMiddleware, async (c) => {
    try {
        const user = c.get('user') as AuthUser;
        const page = parseInt(c.req.query('page') ?? '1');
        const limit = parseInt(c.req.query('limit') ?? '20');
        const offset = (page - 1) * limit;

        const userBookmarks = await db.select()
            .from(bookmarks)
            .where(eq(bookmarks.userId, user.uid))
            .orderBy(desc(bookmarks.createdAt))
            .limit(limit)
            .offset(offset);

        // Fetch article details for each bookmark
        const bookmarksWithArticles = await Promise.all(
            userBookmarks.map(async (bookmark) => {
                const table = COUNTRY_TABLES[bookmark.countryCode as 'tr' | 'de' | 'us'];
                if (!table) return { ...bookmark, article: null };

                const article = await db
                    .select()
                    .from(table)
                    .where(eq(table.id, bookmark.articleId))
                    .get();

                return {
                    ...bookmark,
                    article: article || null,
                };
            })
        );

        return c.json({
            success: true,
            data: {
                bookmarks: bookmarksWithArticles,
                pagination: {
                    page,
                    limit,
                    hasMore: userBookmarks.length === limit,
                },
            },
        });
    } catch (error) {
        return c.json({ success: false, error: 'Failed to fetch bookmarks' }, 500);
    }
});

/**
 * POST /reactions/history
 * Record reading history
 */
reactionRoute.post('/history', authMiddleware, async (c) => {
    try {
        const user = c.get('user') as AuthUser;
        const body = await c.req.json();
        const { articleId, countryCode, timeSpent } = historySchema.parse(body);

        await db.insert(readingHistory).values({
            id: uuidv4(),
            userId: user.uid,
            articleId,
            countryCode,
            timeSpentSeconds: timeSpent || 0,
            viewedAt: new Date(),
        });

        return c.json({ success: true });
    } catch (error) {
        return c.json({ success: false, error: 'Failed to record history' }, 400);
    }
});

/**
 * GET /reactions/history
 * Get user reading history
 */
reactionRoute.get('/history', authMiddleware, async (c) => {
    try {
        const user = c.get('user') as AuthUser;
        const page = parseInt(c.req.query('page') ?? '1');
        const limit = parseInt(c.req.query('limit') ?? '20');
        const offset = (page - 1) * limit;

        const history = await db.select()
            .from(readingHistory)
            .where(eq(readingHistory.userId, user.uid))
            .orderBy(desc(readingHistory.viewedAt))
            .limit(limit)
            .offset(offset);

        // Fetch article details
        const historyWithArticles = await Promise.all(
            history.map(async (item) => {
                const table = COUNTRY_TABLES[item.countryCode as 'tr' | 'de' | 'us'];
                if (!table) return { ...item, article: null };

                const article = await db
                    .select()
                    .from(table)
                    .where(eq(table.id, item.articleId))
                    .get();

                return {
                    ...item,
                    article: article || null,
                };
            })
        );

        return c.json({
            success: true,
            data: {
                history: historyWithArticles,
                pagination: {
                    page,
                    limit,
                    hasMore: history.length === limit,
                },
            },
        });
    } catch (error) {
        return c.json({ success: false, error: 'Failed to fetch history' }, 500);
    }
});

export default reactionRoute;
