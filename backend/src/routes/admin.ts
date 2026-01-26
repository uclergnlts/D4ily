import { Hono } from 'hono';
import { db } from '../config/db.js';
import { rss_sources, categories, users, tr_articles, de_articles, us_articles, tr_article_sources, de_article_sources, us_article_sources } from '../db/schema/index.js';
import { eq, desc, sql, and, gte, lte } from 'drizzle-orm';
import { scrapeSource } from '../services/scraper/scraperService.js';
import { logger } from '../config/logger.js';
import { z } from 'zod';
import { adminMiddleware } from '../middleware/auth.js';
import { triggerDigestManually } from '../cron/digestCron.js';
import { triggerWeeklyManually } from '../cron/weeklyCron.js';
import { scrapeRateLimiter } from '../middleware/rateLimiter.js';

// Country article tables mapping
const articleTables = {
    tr: tr_articles,
    de: de_articles,
    us: us_articles,
};

const articleSourceTables = {
    tr: tr_article_sources,
    de: de_article_sources,
    us: us_article_sources,
};

const admin = new Hono();

// Apply admin middleware to all routes
admin.use('*', adminMiddleware);

// Validation schemas
const scrapeSourceSchema = z.object({
    sourceId: z.string().regex(/^\d+$/, 'Source ID must be a number'),
});

const createSourceSchema = z.object({
    sourceName: z.string().min(1, 'Source name is required'),
    sourceLogoUrl: z.string().url('Invalid logo URL').optional().default(''),
    rssUrl: z.string().url('Valid RSS URL is required').optional(),
    countryCode: z.enum(['tr', 'de', 'us']),
    isActive: z.boolean().default(true),
    scrapeIntervalMinutes: z.number().int().positive().default(30),
});

const updateSourceSchema = z.object({
    sourceName: z.string().min(1).optional(),
    sourceLogoUrl: z.string().url().optional(),
    rssUrl: z.string().url().optional(),
    countryCode: z.enum(['tr', 'de', 'us']).optional(),
    isActive: z.boolean().optional(),
    scrapeIntervalMinutes: z.number().int().positive().optional(),
});

// ===========================
// MANUAL SCRAPER TRIGGER
// ===========================

/**
 * POST /admin/scrape/:sourceId
 * Manually trigger scraping for a specific source
 */
admin.post('/scrape/:sourceId', scrapeRateLimiter, async (c) => {
    try {
        const { sourceId } = c.req.param();

        // Validate and convert to number
        scrapeSourceSchema.parse({ sourceId });
        const numericId = parseInt(sourceId, 10);

        // Get source from database
        const source = await db
            .select()
            .from(rss_sources)
            .where(eq(rss_sources.id, numericId))
            .get();

        if (!source) {
            return c.json({
                success: false,
                error: 'Source not found',
            }, 404);
        }

        if (!source.rssUrl) {
            return c.json({
                success: false,
                error: 'Source has no RSS URL',
            }, 400);
        }

        logger.info({ sourceId: numericId }, 'Manual scraping triggered');

        // Trigger scraping
        const result = await scrapeSource(
            source.id,
            source.sourceName,
            source.sourceLogoUrl,
            source.rssUrl,
            source.countryCode as 'tr' | 'de' | 'us'
        );

        return c.json({
            success: true,
            data: {
                source: source.sourceName,
                processed: result.processed,
                duplicates: result.duplicates,
                filtered: result.filtered,
            },
        });
    } catch (error) {
        logger.error({ error }, 'Manual scrape failed');
        return c.json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to scrape source',
        }, 500);
    }
});

import { runScraper } from '../cron/scraperCron.js';

/**
 * POST /admin/scrape-trigger
 * Trigger the main scraper routine (same as cron job)
 */
admin.post('/scrape-trigger', scrapeRateLimiter, async (c) => {
    try {
        logger.info('Manual scraper trigger received');

        // Run asynchronously without waiting
        runScraper().catch(err => {
            logger.error({ error: err }, 'Manual triggered scraper failed');
        });

        return c.json({
            success: true,
            message: 'Scraper process started in background',
        });
    } catch (error) {
        logger.error({ error }, 'Failed to trigger scraper');
        return c.json({
            success: false,
            error: 'Failed to start scraper',
        }, 500);
    }
});

/**
 * POST /admin/scrape-all
 * Manually trigger scraping for ALL active sources (waits for completion)
 */
admin.post('/scrape-all', scrapeRateLimiter, async (c) => {
    try {
        logger.info('Manual scraping triggered for all sources (waiting mode)');

        // Get all active sources
        const sources = await db
            .select()
            .from(rss_sources)
            .where(eq(rss_sources.isActive, true));

        let totalProcessed = 0;
        let totalDuplicates = 0;
        let totalFiltered = 0;
        const results = [];

        for (const source of sources) {
            if (!source.rssUrl) {
                logger.warn({ sourceId: source.id }, 'Source has no RSS URL, skipping');
                continue;
            }

            try {
                const result = await scrapeSource(
                    source.id,
                    source.sourceName,
                    source.sourceLogoUrl,
                    source.rssUrl,
                    source.countryCode as 'tr' | 'de' | 'us'
                );

                totalProcessed += result.processed;
                totalDuplicates += result.duplicates;
                totalFiltered += result.filtered;

                results.push({
                    source: source.sourceName,
                    processed: result.processed,
                    duplicates: result.duplicates,
                    filtered: result.filtered,
                });

                // Wait 2 seconds between sources
                await new Promise(resolve => setTimeout(resolve, 2000));
            } catch (error) {
                logger.error({ error, sourceId: source.id }, 'Failed to scrape source');
                results.push({
                    source: source.sourceName,
                    error: error instanceof Error ? error.message : 'Unknown error',
                });
            }
        }

        return c.json({
            success: true,
            data: {
                totalProcessed,
                totalDuplicates,
                totalFiltered,
                sourceResults: results,
            },
        });
    } catch (error) {
        logger.error({ error }, 'Scrape all failed');
        return c.json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to scrape sources',
        }, 500);
    }
});

// ===========================
// RSS SOURCE MANAGEMENT
// ===========================

/**
 * GET /admin/sources
 * Get all RSS sources (including inactive)
 */
admin.get('/sources', async (c) => {
    try {
        const sources = await db.select().from(rss_sources);

        return c.json({
            success: true,
            data: sources,
        });
    } catch (error) {
        logger.error({ error }, 'Get sources failed');
        return c.json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to fetch sources',
        }, 500);
    }
});

/**
 * POST /admin/sources
 * Create a new RSS source
 */
admin.post('/sources', async (c) => {
    try {
        const body = await c.req.json();
        const validatedData = createSourceSchema.parse(body);

        const newSource = await db
            .insert(rss_sources)
            .values({
                ...validatedData,
                sourceLogoUrl: validatedData.sourceLogoUrl || '',
                biasScoreSystem: null,
                biasScoreUser: null,
                biasVoteCount: 0,
            })
            .returning()
            .get();

        logger.info({ sourceId: newSource.id }, 'New RSS source created');

        return c.json({
            success: true,
            data: newSource,
        }, 201);
    } catch (error) {
        logger.error({ error }, 'Create source failed');
        return c.json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to create source',
        }, 400);
    }
});

/**
 * PATCH /admin/sources/:sourceId
 * Update an existing RSS source
 */
admin.patch('/sources/:sourceId', async (c) => {
    try {
        const { sourceId } = c.req.param();
        const numericId = parseInt(sourceId, 10);

        if (isNaN(numericId)) {
            return c.json({
                success: false,
                error: 'Invalid source ID',
            }, 400);
        }

        const body = await c.req.json();
        const validatedData = updateSourceSchema.parse(body);

        const updatedSource = await db
            .update(rss_sources)
            .set(validatedData)
            .where(eq(rss_sources.id, numericId))
            .returning()
            .get();

        if (!updatedSource) {
            return c.json({
                success: false,
                error: 'Source not found',
            }, 404);
        }

        logger.info({ sourceId: numericId }, 'RSS source updated');

        return c.json({
            success: true,
            data: updatedSource,
        });
    } catch (error) {
        logger.error({ error }, 'Update source failed');
        return c.json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to update source',
        }, 400);
    }
});

/**
 * DELETE /admin/sources/:sourceId
 * Delete an RSS source
 */
admin.delete('/sources/:sourceId', async (c) => {
    try {
        const { sourceId } = c.req.param();
        const numericId = parseInt(sourceId, 10);

        if (isNaN(numericId)) {
            return c.json({
                success: false,
                error: 'Invalid source ID',
            }, 400);
        }

        const deletedSource = await db
            .delete(rss_sources)
            .where(eq(rss_sources.id, numericId))
            .returning()
            .get();

        if (!deletedSource) {
            return c.json({
                success: false,
                error: 'Source not found',
            }, 404);
        }

        logger.info({ sourceId: numericId }, 'RSS source deleted');

        return c.json({
            success: true,
            message: 'Source deleted successfully',
        });
    } catch (error) {
        logger.error({ error }, 'Delete source failed');
        return c.json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to delete source',
        }, 500);
    }
});

// ===========================
// CATEGORY MANAGEMENT
// ===========================

/**
 * GET /admin/categories
 * Get all categories
 */
admin.get('/categories', async (c) => {
    try {
        const allCategories = await db.select().from(categories);

        return c.json({
            success: true,
            data: allCategories,
        });
    } catch (error) {
        logger.error({ error }, 'Get categories failed');
        return c.json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to fetch categories',
        }, 500);
    }
});

// ===========================
// CRON JOB MANAGEMENT
// ===========================

/**
 * POST /admin/cron/digest/run
 * Manually trigger digest generation
 */
admin.post('/cron/digest/run', async (c) => {
    try {
        const body = await c.req.json().catch(() => ({}));
        const period = body.period || 'morning';

        if (period !== 'morning' && period !== 'evening') {
            return c.json({
                success: false,
                error: 'Invalid period. Use "morning" or "evening"',
            }, 400);
        }

        logger.info({ period }, 'Manual digest generation triggered by admin');

        const result = await triggerDigestManually(period);

        return c.json({
            success: true,
            data: result,
        });
    } catch (error) {
        logger.error({ error }, 'Manual digest trigger failed');
        return c.json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to trigger digest',
        }, 500);
    }
});

/**
 * POST /admin/cron/weekly/run
 * Manually trigger weekly comparison
 */
admin.post('/cron/weekly/run', async (c) => {
    try {
        logger.info('Manual weekly comparison triggered by admin');

        const result = await triggerWeeklyManually();

        return c.json({
            success: true,
            data: result,
        });
    } catch (error) {
        logger.error({ error }, 'Manual weekly trigger failed');
        return c.json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to trigger weekly',
        }, 500);
    }
});

/**
 * GET /admin/cron/status
 * Get cron job status
 */
admin.get('/cron/status', async (c) => {
    return c.json({
        success: true,
        data: {
            scraper: {
                schedule: 'Every 30 minutes',
                status: 'active',
            },
            digest: {
                schedule: '07:00 and 19:00 daily',
                status: 'active',
            },
            weekly: {
                schedule: 'Sunday 20:00',
                status: 'active',
            },
        },
    });
});

// ===========================
// STATS & DASHBOARD
// ===========================

/**
 * GET /admin/stats
 * Get dashboard statistics
 */
admin.get('/stats', async (c) => {
    try {
        // Get user count
        const userCount = await db
            .select({ count: sql<number>`count(*)` })
            .from(users)
            .get();

        // Get source count
        const sourceCount = await db
            .select({ count: sql<number>`count(*)` })
            .from(rss_sources)
            .get();

        // Get active source count
        const activeSourceCount = await db
            .select({ count: sql<number>`count(*)` })
            .from(rss_sources)
            .where(eq(rss_sources.isActive, true))
            .get();

        // Get category count
        const categoryCount = await db
            .select({ count: sql<number>`count(*)` })
            .from(categories)
            .get();

        // Get article counts per country
        const trArticleCount = await db
            .select({ count: sql<number>`count(*)` })
            .from(tr_articles)
            .get();
        const deArticleCount = await db
            .select({ count: sql<number>`count(*)` })
            .from(de_articles)
            .get();
        const usArticleCount = await db
            .select({ count: sql<number>`count(*)` })
            .from(us_articles)
            .get();

        return c.json({
            success: true,
            data: {
                users: {
                    total: userCount?.count || 0,
                },
                sources: {
                    total: sourceCount?.count || 0,
                    active: activeSourceCount?.count || 0,
                },
                categories: {
                    total: categoryCount?.count || 0,
                },
                articles: {
                    tr: trArticleCount?.count || 0,
                    de: deArticleCount?.count || 0,
                    us: usArticleCount?.count || 0,
                    total: (trArticleCount?.count || 0) + (deArticleCount?.count || 0) + (usArticleCount?.count || 0),
                },
                serverUptime: process.uptime(),
            },
        });
    } catch (error) {
        logger.error({ error }, 'Get stats failed');
        return c.json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to get stats',
        }, 500);
    }
});

// ===========================
// USER MANAGEMENT
// ===========================

/**
 * GET /admin/users
 * Get all users (paginated)
 */
admin.get('/users', async (c) => {
    try {
        const page = parseInt(c.req.query('page') ?? '1', 10);
        const limit = parseInt(c.req.query('limit') ?? '20', 10);
        const offset = (page - 1) * limit;

        const allUsers = await db
            .select()
            .from(users)
            .orderBy(desc(users.createdAt))
            .limit(limit)
            .offset(offset);

        return c.json({
            success: true,
            data: {
                users: allUsers,
                pagination: {
                    page,
                    limit,
                    hasMore: allUsers.length === limit,
                },
            },
        });
    } catch (error) {
        logger.error({ error }, 'Get users failed');
        return c.json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to get users',
        }, 500);
    }
});

/**
 * GET /admin/users/:userId
 * Get user details
 */
admin.get('/users/:userId', async (c) => {
    try {
        const { userId } = c.req.param();

        const user = await db
            .select()
            .from(users)
            .where(eq(users.id, userId))
            .get();

        if (!user) {
            return c.json({
                success: false,
                error: 'User not found',
            }, 404);
        }

        return c.json({
            success: true,
            data: user,
        });
    } catch (error) {
        logger.error({ error }, 'Get user failed');
        return c.json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to get user',
        }, 500);
    }
});

/**
 * PATCH /admin/users/:userId
 * Update user (role, subscription)
 */
admin.patch('/users/:userId', async (c) => {
    try {
        const { userId } = c.req.param();
        const body = await c.req.json();

        const updateData: any = {};
        if (body.userRole && ['user', 'admin'].includes(body.userRole)) {
            updateData.userRole = body.userRole;
        }
        if (body.subscriptionStatus && ['free', 'premium'].includes(body.subscriptionStatus)) {
            updateData.subscriptionStatus = body.subscriptionStatus;
        }

        if (Object.keys(updateData).length === 0) {
            return c.json({
                success: false,
                error: 'No valid fields to update',
            }, 400);
        }

        updateData.updatedAt = new Date();

        const updatedUser = await db
            .update(users)
            .set(updateData)
            .where(eq(users.id, userId))
            .returning()
            .get();

        if (!updatedUser) {
            return c.json({
                success: false,
                error: 'User not found',
            }, 404);
        }

        logger.info({ userId, updates: updateData }, 'User updated by admin');

        return c.json({
            success: true,
            data: updatedUser,
        });
    } catch (error) {
        logger.error({ error }, 'Update user failed');
        return c.json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to update user',
        }, 500);
    }
});

// ===========================
// ARTICLE MANAGEMENT
// ===========================

/**
 * GET /admin/articles
 * Get articles with pagination and filters
 */
admin.get('/articles', async (c) => {
    try {
        const country = c.req.query('country') as 'tr' | 'de' | 'us' || 'tr';
        const page = parseInt(c.req.query('page') ?? '1', 10);
        const limit = parseInt(c.req.query('limit') ?? '20', 10);
        const offset = (page - 1) * limit;
        const category = c.req.query('category');
        const sentiment = c.req.query('sentiment');
        const dateFrom = c.req.query('dateFrom');
        const dateTo = c.req.query('dateTo');

        const articlesTable = articleTables[country];
        const sourcesTable = articleSourceTables[country];

        if (!articlesTable) {
            return c.json({
                success: false,
                error: 'Invalid country code',
            }, 400);
        }

        // Build conditions
        const conditions = [];
        if (category) {
            const categoryId = parseInt(category, 10);
            if (!isNaN(categoryId)) {
                conditions.push(eq(articlesTable.categoryId, categoryId));
            }
        }
        if (sentiment && ['positive', 'neutral', 'negative'].includes(sentiment)) {
            conditions.push(eq(articlesTable.sentiment, sentiment as 'positive' | 'neutral' | 'negative'));
        }
        if (dateFrom) {
            conditions.push(gte(articlesTable.publishedAt, new Date(dateFrom)));
        }
        if (dateTo) {
            conditions.push(lte(articlesTable.publishedAt, new Date(dateTo)));
        }

        // Get total count
        const countResult = await db
            .select({ count: sql<number>`count(*)` })
            .from(articlesTable)
            .where(conditions.length > 0 ? and(...conditions) : undefined)
            .get();

        // Get articles
        const articles = await db
            .select()
            .from(articlesTable)
            .where(conditions.length > 0 ? and(...conditions) : undefined)
            .orderBy(desc(articlesTable.publishedAt))
            .limit(limit)
            .offset(offset);

        // Get sources for each article
        const articlesWithSources = await Promise.all(
            articles.map(async (article) => {
                const sources = await db
                    .select()
                    .from(sourcesTable)
                    .where(eq(sourcesTable.articleId, article.id));
                return { ...article, sources };
            })
        );

        return c.json({
            success: true,
            data: {
                articles: articlesWithSources,
                pagination: {
                    page,
                    limit,
                    total: countResult?.count || 0,
                    hasMore: articles.length === limit,
                },
            },
        });
    } catch (error) {
        logger.error({ error }, 'Get articles failed');
        return c.json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to get articles',
        }, 500);
    }
});

/**
 * DELETE /admin/articles/:country/:articleId
 * Delete an article
 */
admin.delete('/articles/:country/:articleId', async (c) => {
    try {
        const { country, articleId } = c.req.param();

        if (!['tr', 'de', 'us'].includes(country)) {
            return c.json({
                success: false,
                error: 'Invalid country code',
            }, 400);
        }

        const articlesTable = articleTables[country as 'tr' | 'de' | 'us'];
        const sourcesTable = articleSourceTables[country as 'tr' | 'de' | 'us'];

        // Delete article sources first
        await db
            .delete(sourcesTable)
            .where(eq(sourcesTable.articleId, articleId));

        // Delete article
        const deletedArticle = await db
            .delete(articlesTable)
            .where(eq(articlesTable.id, articleId))
            .returning()
            .get();

        if (!deletedArticle) {
            return c.json({
                success: false,
                error: 'Article not found',
            }, 404);
        }

        logger.info({ country, articleId }, 'Article deleted by admin');

        return c.json({
            success: true,
            message: 'Article deleted successfully',
        });
    } catch (error) {
        logger.error({ error }, 'Delete article failed');
        return c.json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to delete article',
        }, 500);
    }
});

export default admin;
