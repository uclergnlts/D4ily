import { Hono } from 'hono';
import { db } from '../config/db.js';
import {
    users,
    userFollowedSources,
    userCategoryPreferences,
    rss_sources,
    categories,
} from '../db/schema/index.js';
import { authMiddleware, AuthUser } from '../middleware/auth.js';
import { eq, and } from 'drizzle-orm';
import { logger } from '../config/logger.js';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { getUserReputation } from '../services/alignmentFeedbackService.js';

type Variables = {
    user: AuthUser;
};

const userRoute = new Hono<{ Variables: Variables }>();

// Apply auth middleware to all routes
userRoute.use('*', authMiddleware);

// Schemas
const updateProfileSchema = z.object({
    name: z.string().min(2).max(50).optional(),
    avatarUrl: z.string().url().nullable().optional(),
});

const categoryPreferencesSchema = z.object({
    categoryIds: z.array(z.number()),
});

// ===========================
// PROFILE
// ===========================

/**
 * GET /user/profile
 * Get current user profile
 */
userRoute.get('/profile', async (c) => {
    try {
        const authUser = c.get('user') as AuthUser;

        const user = await db
            .select()
            .from(users)
            .where(eq(users.id, authUser.uid))
            .get();

        if (!user) {
            return c.json({
                success: false,
                error: 'User not found',
            }, 404);
        }

        return c.json({
            success: true,
            data: {
                id: user.id,
                email: user.email,
                name: user.name,
                avatarUrl: user.avatarUrl,
                userRole: user.userRole,
                subscriptionStatus: user.subscriptionStatus,
                createdAt: user.createdAt,
                updatedAt: user.updatedAt,
            },
        });
    } catch (error) {
        logger.error({ error }, 'Get profile failed');
        return c.json({
            success: false,
            error: 'Failed to get profile',
        }, 500);
    }
});

/**
 * PATCH /user/profile
 * Update user profile
 */
userRoute.patch('/profile', async (c) => {
    try {
        const authUser = c.get('user') as AuthUser;
        const body = await c.req.json();
        const validatedData = updateProfileSchema.parse(body);

        const updatedUser = await db
            .update(users)
            .set({
                ...validatedData,
                updatedAt: new Date(),
            })
            .where(eq(users.id, authUser.uid))
            .returning()
            .get();

        if (!updatedUser) {
            return c.json({
                success: false,
                error: 'User not found',
            }, 404);
        }

        logger.info({ userId: authUser.uid }, 'Profile updated');

        return c.json({
            success: true,
            data: {
                id: updatedUser.id,
                email: updatedUser.email,
                name: updatedUser.name,
                avatarUrl: updatedUser.avatarUrl,
                userRole: updatedUser.userRole,
                subscriptionStatus: updatedUser.subscriptionStatus,
                createdAt: updatedUser.createdAt,
                updatedAt: updatedUser.updatedAt,
            },
        });
    } catch (error) {
        logger.error({ error }, 'Update profile failed');
        return c.json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to update profile',
        }, 400);
    }
});

// ===========================
// FOLLOWED SOURCES
// ===========================

/**
 * GET /user/sources
 * Get user's followed sources
 */
userRoute.get('/sources', async (c) => {
    try {
        const authUser = c.get('user') as AuthUser;

        const followedSources = await db
            .select({
                id: userFollowedSources.id,
                sourceId: userFollowedSources.sourceId,
                createdAt: userFollowedSources.createdAt,
                sourceName: rss_sources.sourceName,
                sourceLogoUrl: rss_sources.sourceLogoUrl,
                countryCode: rss_sources.countryCode,
            })
            .from(userFollowedSources)
            .leftJoin(rss_sources, eq(userFollowedSources.sourceId, rss_sources.id))
            .where(eq(userFollowedSources.userId, authUser.uid));

        return c.json({
            success: true,
            data: followedSources,
        });
    } catch (error) {
        logger.error({ error }, 'Get followed sources failed');
        return c.json({
            success: false,
            error: 'Failed to get followed sources',
        }, 500);
    }
});

/**
 * POST /user/sources/:sourceId
 * Follow a source
 */
userRoute.post('/sources/:sourceId', async (c) => {
    try {
        const authUser = c.get('user') as AuthUser;
        const sourceId = parseInt(c.req.param('sourceId'), 10);

        if (isNaN(sourceId)) {
            return c.json({
                success: false,
                error: 'Invalid source ID',
            }, 400);
        }

        // Check if source exists
        const source = await db
            .select()
            .from(rss_sources)
            .where(eq(rss_sources.id, sourceId))
            .get();

        if (!source) {
            return c.json({
                success: false,
                error: 'Source not found',
            }, 404);
        }

        // Check if already following
        const existing = await db
            .select()
            .from(userFollowedSources)
            .where(and(
                eq(userFollowedSources.userId, authUser.uid),
                eq(userFollowedSources.sourceId, sourceId)
            ))
            .get();

        if (existing) {
            return c.json({
                success: false,
                error: 'Already following this source',
            }, 400);
        }

        // Follow source
        await db.insert(userFollowedSources).values({
            id: uuidv4(),
            userId: authUser.uid,
            sourceId,
            createdAt: new Date(),
        });

        logger.info({ userId: authUser.uid, sourceId }, 'Source followed');

        return c.json({
            success: true,
            message: 'Source followed successfully',
        }, 201);
    } catch (error) {
        logger.error({ error }, 'Follow source failed');
        return c.json({
            success: false,
            error: 'Failed to follow source',
        }, 500);
    }
});

/**
 * DELETE /user/sources/:sourceId
 * Unfollow a source
 */
userRoute.delete('/sources/:sourceId', async (c) => {
    try {
        const authUser = c.get('user') as AuthUser;
        const sourceId = parseInt(c.req.param('sourceId'), 10);

        if (isNaN(sourceId)) {
            return c.json({
                success: false,
                error: 'Invalid source ID',
            }, 400);
        }

        const deleted = await db
            .delete(userFollowedSources)
            .where(and(
                eq(userFollowedSources.userId, authUser.uid),
                eq(userFollowedSources.sourceId, sourceId)
            ))
            .returning()
            .get();

        if (!deleted) {
            return c.json({
                success: false,
                error: 'Not following this source',
            }, 404);
        }

        logger.info({ userId: authUser.uid, sourceId }, 'Source unfollowed');

        return c.json({
            success: true,
            message: 'Source unfollowed successfully',
        });
    } catch (error) {
        logger.error({ error }, 'Unfollow source failed');
        return c.json({
            success: false,
            error: 'Failed to unfollow source',
        }, 500);
    }
});

// ===========================
// CATEGORY PREFERENCES
// ===========================

/**
 * GET /user/categories
 * Get user's category preferences
 */
userRoute.get('/categories', async (c) => {
    try {
        const authUser = c.get('user') as AuthUser;

        const userCategories = await db
            .select({
                id: userCategoryPreferences.id,
                categoryId: userCategoryPreferences.categoryId,
                categoryName: categories.name,
                categorySlug: categories.slug,
                categoryIcon: categories.icon,
                categoryColor: categories.color,
            })
            .from(userCategoryPreferences)
            .leftJoin(categories, eq(userCategoryPreferences.categoryId, categories.id))
            .where(eq(userCategoryPreferences.userId, authUser.uid));

        return c.json({
            success: true,
            data: userCategories,
        });
    } catch (error) {
        logger.error({ error }, 'Get category preferences failed');
        return c.json({
            success: false,
            error: 'Failed to get category preferences',
        }, 500);
    }
});

/**
 * POST /user/categories
 * Set user's category preferences (replaces existing)
 */
userRoute.post('/categories', async (c) => {
    try {
        const authUser = c.get('user') as AuthUser;
        const body = await c.req.json();
        const { categoryIds } = categoryPreferencesSchema.parse(body);

        // Delete existing preferences
        await db
            .delete(userCategoryPreferences)
            .where(eq(userCategoryPreferences.userId, authUser.uid));

        // Insert new preferences
        if (categoryIds.length > 0) {
            const newPreferences = categoryIds.map((categoryId) => ({
                id: uuidv4(),
                userId: authUser.uid,
                categoryId,
            }));

            await db.insert(userCategoryPreferences).values(newPreferences);
        }

        logger.info({ userId: authUser.uid, categoryCount: categoryIds.length }, 'Category preferences updated');

        return c.json({
            success: true,
            message: 'Category preferences updated',
            data: { categoryIds },
        });
    } catch (error) {
        logger.error({ error }, 'Set category preferences failed');
        return c.json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to set category preferences',
        }, 400);
    }
});

/**
 * POST /user/categories/:categoryId
 * Add a single category preference
 */
userRoute.post('/categories/:categoryId', async (c) => {
    try {
        const authUser = c.get('user') as AuthUser;
        const categoryId = parseInt(c.req.param('categoryId'), 10);

        if (isNaN(categoryId)) {
            return c.json({
                success: false,
                error: 'Invalid category ID',
            }, 400);
        }

        // Check if category exists
        const category = await db
            .select()
            .from(categories)
            .where(eq(categories.id, categoryId))
            .get();

        if (!category) {
            return c.json({
                success: false,
                error: 'Category not found',
            }, 404);
        }

        // Check if already added
        const existing = await db
            .select()
            .from(userCategoryPreferences)
            .where(and(
                eq(userCategoryPreferences.userId, authUser.uid),
                eq(userCategoryPreferences.categoryId, categoryId)
            ))
            .get();

        if (existing) {
            return c.json({
                success: false,
                error: 'Category already in preferences',
            }, 400);
        }

        await db.insert(userCategoryPreferences).values({
            id: uuidv4(),
            userId: authUser.uid,
            categoryId,
        });

        return c.json({
            success: true,
            message: 'Category added to preferences',
        }, 201);
    } catch (error) {
        logger.error({ error }, 'Add category preference failed');
        return c.json({
            success: false,
            error: 'Failed to add category preference',
        }, 500);
    }
});

/**
 * DELETE /user/categories/:categoryId
 * Remove a single category preference
 */
userRoute.delete('/categories/:categoryId', async (c) => {
    try {
        const authUser = c.get('user') as AuthUser;
        const categoryId = parseInt(c.req.param('categoryId'), 10);

        if (isNaN(categoryId)) {
            return c.json({
                success: false,
                error: 'Invalid category ID',
            }, 400);
        }

        const deleted = await db
            .delete(userCategoryPreferences)
            .where(and(
                eq(userCategoryPreferences.userId, authUser.uid),
                eq(userCategoryPreferences.categoryId, categoryId)
            ))
            .returning()
            .get();

        if (!deleted) {
            return c.json({
                success: false,
                error: 'Category not in preferences',
            }, 404);
        }

        return c.json({
            success: true,
            message: 'Category removed from preferences',
        });
    } catch (error) {
        logger.error({ error }, 'Remove category preference failed');
        return c.json({
            success: false,
            error: 'Failed to remove category preference',
        }, 500);
    }
});

// ===========================
// ALIGNMENT REPUTATION
// ===========================

/**
 * GET /user/alignment-reputation
 * Get user's alignment voting reputation score
 */
userRoute.get('/alignment-reputation', async (c) => {
    try {
        const authUser = c.get('user') as AuthUser;

        const reputation = await getUserReputation(authUser.uid);

        // Calculate reputation level based on score and total votes
        let level = 'Yeni';
        if (reputation.totalVotes >= 50 && reputation.reputationScore >= 0.8) {
            level = 'Uzman';
        } else if (reputation.totalVotes >= 20 && reputation.reputationScore >= 0.6) {
            level = 'Deneyimli';
        } else if (reputation.totalVotes >= 5) {
            level = 'Aktif';
        }

        return c.json({
            success: true,
            data: {
                totalVotes: reputation.totalVotes,
                accurateVotes: reputation.accurateVotes,
                reputationScore: Math.round(reputation.reputationScore * 100) / 100,
                accuracyPercentage: reputation.totalVotes > 0
                    ? Math.round((reputation.accurateVotes / reputation.totalVotes) * 100)
                    : 0,
                level,
                lastVoteAt: reputation.lastVoteAt?.toISOString() || null,
            },
        });
    } catch (error) {
        logger.error({ error }, 'Get alignment reputation failed');
        return c.json({
            success: false,
            error: 'Failed to get alignment reputation',
        }, 500);
    }
});

export default userRoute;
