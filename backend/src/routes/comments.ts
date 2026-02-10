import { Hono } from 'hono';
import { db } from '../config/db.js';
import { comments, commentLikes } from '../db/schema/index.js';
import { eq, and, desc, isNull, inArray, sql } from 'drizzle-orm';
import { logger } from '../config/logger.js';
import { z } from 'zod';
import { authMiddleware, AuthUser } from '../middleware/auth.js';
import { v4 as uuidv4 } from 'uuid';

type Variables = {
    user: AuthUser;
};

const commentsRoute = new Hono<{ Variables: Variables }>();

// Validation schemas
const countrySchema = z.enum(['tr', 'de', 'us', 'uk', 'fr', 'es', 'it', 'ru']);

const createCommentSchema = z.object({
    articleId: z.string().min(1, 'Article ID is required'),
    content: z.string().min(1, 'Comment content is required').max(1000, 'Comment too long'),
    parentCommentId: z.string().nullable().optional(),
});

// ===========================
// COMMENTS CRUD
// ===========================

/**
 * GET /comments/:country/:articleId
 * Get all comments for an article (public)
 */
commentsRoute.get('/:country/:articleId', async (c) => {
    try {
        const { country, articleId } = c.req.param();
        const validatedCountry = countrySchema.parse(country);

        const page = parseInt(c.req.query('page') ?? '1', 10);
        const limit = Math.min(parseInt(c.req.query('limit') ?? '20', 10), 100);
        const offset = (page - 1) * limit;

        // Get top-level comments (no parent)
        const topLevelComments = await db
            .select()
            .from(comments)
            .where(and(
                eq(comments.targetId, articleId),
                eq(comments.targetType, 'article'),
                eq(comments.countryCode, validatedCountry),
                isNull(comments.parentCommentId)
            ))
            .orderBy(desc(comments.createdAt))
            .limit(limit)
            .offset(offset);

        // Get total count with efficient COUNT query
        const countResult = await db
            .select({ count: sql<number>`count(*)` })
            .from(comments)
            .where(and(
                eq(comments.targetId, articleId),
                eq(comments.targetType, 'article'),
                eq(comments.countryCode, validatedCountry),
                isNull(comments.parentCommentId)
            ))
            .get();
        const totalComments = countResult?.count || 0;

        // Get all replies for top-level comments in a single query (N+1 fix)
        const parentIds = topLevelComments.map(c => c.id);
        const allReplies = parentIds.length > 0 
            ? await db
                .select()
                .from(comments)
                .where(and(
                    eq(comments.countryCode, validatedCountry),
                    inArray(comments.parentCommentId, parentIds)
                ))
                .orderBy(comments.createdAt)
            : [];

        // Group replies by parent comment ID
        const repliesByParent = allReplies.reduce((acc, reply) => {
            if (reply.parentCommentId) {
                if (!acc[reply.parentCommentId]) {
                    acc[reply.parentCommentId] = [];
                }
                acc[reply.parentCommentId].push(reply);
            }
            return acc;
        }, {} as Record<string, typeof allReplies>);

        // Map comments with their replies
        const commentsWithReplies = topLevelComments.map((comment) => ({
            ...comment,
            replies: repliesByParent[comment.id] || [],
            replyCount: (repliesByParent[comment.id] || []).length,
        }));

        return c.json({
            success: true,
            data: {
                comments: commentsWithReplies,
                pagination: {
                    page,
                    limit,
                    total: totalComments,
                    hasMore: offset + limit < totalComments,
                },
            },
        });
    } catch (error) {
        logger.error({ error }, 'Get comments failed');
        return c.json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to fetch comments',
        }, 500);
    }
});

/**
 * POST /comments/:country
 * Create a new comment (requires auth)
 */
commentsRoute.post('/:country', authMiddleware, async (c) => {
    try {
        const user = c.get('user') as AuthUser;
        const { country } = c.req.param();
        const validatedCountry = countrySchema.parse(country);

        const body = await c.req.json();
        const validatedData = createCommentSchema.parse(body);

        const newComment = await db
            .insert(comments)
            .values({
                id: uuidv4(),
                targetType: 'article',
                targetId: validatedData.articleId,
                countryCode: validatedCountry,
                userId: user.uid, // Get from authenticated user
                content: validatedData.content,
                parentCommentId: validatedData.parentCommentId ?? null,
                likeCount: 0,
                createdAt: new Date(),
                updatedAt: null,
            })
            .returning()
            .get();

        logger.info({ commentId: newComment.id, articleId: validatedData.articleId, userId: user.uid }, 'Comment created');

        return c.json({
            success: true,
            data: newComment,
        }, 201);
    } catch (error) {
        logger.error({ error }, 'Create comment failed');
        return c.json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to create comment',
        }, 400);
    }
});

/**
 * PATCH /comments/:country/:commentId
 * Edit a comment (requires auth + ownership)
 */
commentsRoute.patch('/:country/:commentId', authMiddleware, async (c) => {
    try {
        const user = c.get('user') as AuthUser;
        const { country, commentId } = c.req.param();
        countrySchema.parse(country);

        const body = await c.req.json();
        const { content } = z.object({
            content: z.string().min(1, 'Comment content is required').max(1000, 'Comment too long'),
        }).parse(body);

        // Check if comment exists and belongs to user
        const existingComment = await db
            .select()
            .from(comments)
            .where(eq(comments.id, commentId))
            .get();

        if (!existingComment) {
            return c.json({
                success: false,
                error: 'Comment not found',
            }, 404);
        }

        // Check ownership (only owner can edit)
        if (existingComment.userId !== user.uid) {
            return c.json({
                success: false,
                error: 'Forbidden: You can only edit your own comments',
            }, 403);
        }

        // Check if comment is too old to edit (e.g., 24 hours)
        const commentAge = Date.now() - existingComment.createdAt.getTime();
        const maxEditTimeMs = 24 * 60 * 60 * 1000; // 24 hours
        if (commentAge > maxEditTimeMs) {
            return c.json({
                success: false,
                error: 'Comments can only be edited within 24 hours of posting',
            }, 400);
        }

        // Update the comment
        const updatedComment = await db
            .update(comments)
            .set({
                content,
                updatedAt: new Date(),
            })
            .where(eq(comments.id, commentId))
            .returning()
            .get();

        logger.info({ commentId, userId: user.uid }, 'Comment edited');

        return c.json({
            success: true,
            data: updatedComment,
        });
    } catch (error) {
        logger.error({ error }, 'Edit comment failed');
        return c.json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to edit comment',
        }, 400);
    }
});

/**
 * DELETE /comments/:country/:commentId
 * Delete a comment (requires auth + ownership)
 */
commentsRoute.delete('/:country/:commentId', authMiddleware, async (c) => {
    try {
        const user = c.get('user') as AuthUser;
        const { country, commentId } = c.req.param();
        countrySchema.parse(country);

        // Check if comment exists and belongs to user
        const existingComment = await db
            .select()
            .from(comments)
            .where(eq(comments.id, commentId))
            .get();

        if (!existingComment) {
            return c.json({
                success: false,
                error: 'Comment not found',
            }, 404);
        }

        // Check ownership (allow admin to delete any comment)
        if (existingComment.userId !== user.uid && user.userRole !== 'admin') {
            return c.json({
                success: false,
                error: 'Forbidden: You can only delete your own comments',
            }, 403);
        }

        // Delete the comment (cascade will delete likes and replies)
        await db.delete(comments).where(eq(comments.id, commentId));

        logger.info({ commentId, userId: user.uid }, 'Comment deleted');

        return c.json({
            success: true,
            message: 'Comment deleted successfully',
        });
    } catch (error) {
        logger.error({ error }, 'Delete comment failed');
        return c.json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to delete comment',
        }, 500);
    }
});

/**
 * POST /comments/:country/:commentId/like
 * Toggle like on a comment (requires auth, tracks likes)
 */
commentsRoute.post('/:country/:commentId/like', authMiddleware, async (c) => {
    try {
        const user = c.get('user') as AuthUser;
        const { country, commentId } = c.req.param();
        countrySchema.parse(country);

        // Check if comment exists
        const comment = await db
            .select()
            .from(comments)
            .where(eq(comments.id, commentId))
            .get();

        if (!comment) {
            return c.json({
                success: false,
                error: 'Comment not found',
            }, 404);
        }

        // Check if user already liked this comment
        const existingLike = await db
            .select()
            .from(commentLikes)
            .where(and(
                eq(commentLikes.commentId, commentId),
                eq(commentLikes.userId, user.uid)
            ))
            .get();

        if (existingLike) {
            // Unlike - remove the like
            await db.delete(commentLikes).where(eq(commentLikes.id, existingLike.id));

            // Decrement like count
            await db
                .update(comments)
                .set({ likeCount: Math.max(0, comment.likeCount - 1) })
                .where(eq(comments.id, commentId));

            logger.info({ commentId, userId: user.uid }, 'Comment unliked');

            return c.json({
                success: true,
                data: {
                    liked: false,
                    likeCount: Math.max(0, comment.likeCount - 1),
                },
            });
        }

        // Like - add new like record
        await db.insert(commentLikes).values({
            id: uuidv4(),
            commentId,
            userId: user.uid,
            createdAt: new Date(),
        });

        // Increment like count
        await db
            .update(comments)
            .set({ likeCount: comment.likeCount + 1 })
            .where(eq(comments.id, commentId));

        logger.info({ commentId, userId: user.uid, newLikeCount: comment.likeCount + 1 }, 'Comment liked');

        return c.json({
            success: true,
            data: {
                liked: true,
                likeCount: comment.likeCount + 1,
            },
        });
    } catch (error) {
        logger.error({ error }, 'Like comment failed');
        return c.json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to like comment',
        }, 500);
    }
});

/**
 * GET /comments/:country/:commentId/like-status
 * Check if current user liked a comment (requires auth)
 */
commentsRoute.get('/:country/:commentId/like-status', authMiddleware, async (c) => {
    try {
        const user = c.get('user') as AuthUser;
        const { country, commentId } = c.req.param();
        countrySchema.parse(country);

        const existingLike = await db
            .select()
            .from(commentLikes)
            .where(and(
                eq(commentLikes.commentId, commentId),
                eq(commentLikes.userId, user.uid)
            ))
            .get();

        return c.json({
            success: true,
            data: {
                liked: !!existingLike,
            },
        });
    } catch (error) {
        return c.json({
            success: false,
            error: 'Failed to check like status',
        }, 500);
    }
});

export default commentsRoute;
