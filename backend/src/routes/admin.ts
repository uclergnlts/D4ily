import { Hono } from 'hono';
import { db } from '../config/db.js';
import {
    rss_sources, categories, users,
    tr_articles, de_articles, us_articles, uk_articles, fr_articles, es_articles, it_articles, ru_articles,
    tr_article_sources, de_article_sources, us_article_sources,
    tr_daily_digests, de_daily_digests, us_daily_digests, uk_daily_digests, fr_daily_digests, es_daily_digests, it_daily_digests, ru_daily_digests,
    twitter_accounts, notifications, userDevices,
    tr_tweets, de_tweets, us_tweets, uk_tweets, fr_tweets, es_tweets, it_tweets, ru_tweets,
} from '../db/schema/index.js';
import { aiUsageMetrics } from '../db/schema/metrics.js';
import { eq, desc, sql, and, gte, lte, inArray } from 'drizzle-orm';
import { scrapeSource } from '../services/scraper/scraperService.js';
import { sendBulkNotifications } from '../services/expoNotificationService.js';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../config/logger.js';
import { z } from 'zod';
import { adminMiddleware } from '../middleware/auth.js';
import { isDigestJobRunning, triggerDigestManually } from '../cron/digestCron.js';
import { triggerWeeklyManually } from '../cron/weeklyCron.js';
import { scrapeRateLimiter } from '../middleware/rateLimiter.js';

// Country article tables mapping
const articleTables = {
    tr: tr_articles,
    de: de_articles,
    us: us_articles,
    uk: uk_articles,
    fr: fr_articles,
    es: es_articles,
    it: it_articles,
    ru: ru_articles,
};

const articleSourceTables = {
    tr: tr_article_sources,
    de: de_article_sources,
    us: us_article_sources,
};

const digestTables = {
    tr: tr_daily_digests,
    de: de_daily_digests,
    us: us_daily_digests,
    uk: uk_daily_digests,
    fr: fr_daily_digests,
    es: es_daily_digests,
    it: it_daily_digests,
    ru: ru_daily_digests,
} as const;

const tweetTables = {
    tr: tr_tweets,
    de: de_tweets,
    us: us_tweets,
    uk: uk_tweets,
    fr: fr_tweets,
    es: es_tweets,
    it: it_tweets,
    ru: ru_tweets,
} as const;

// In-memory cron log store
interface CronLogEntry {
    id: string;
    jobName: string;
    status: 'success' | 'error';
    message: string;
    duration?: number;
    timestamp: string;
}
const cronLogs: CronLogEntry[] = [];
const MAX_CRON_LOGS = 200;

export function addCronLog(entry: Omit<CronLogEntry, 'id' | 'timestamp'>) {
    cronLogs.unshift({
        ...entry,
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
    });
    if (cronLogs.length > MAX_CRON_LOGS) cronLogs.length = MAX_CRON_LOGS;
}

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
    countryCode: z.enum(['tr', 'de', 'us', 'uk', 'fr', 'es', 'it', 'ru']),
    isActive: z.boolean().default(true),
    scrapeIntervalMinutes: z.number().int().positive().default(30),
});

const updateSourceSchema = z.object({
    sourceName: z.string().min(1).optional(),
    sourceLogoUrl: z.string().url().optional(),
    rssUrl: z.string().url().optional(),
    countryCode: z.enum(['tr', 'de', 'us', 'uk', 'fr', 'es', 'it', 'ru']).optional(),
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
            source.countryCode as 'tr' | 'de' | 'us' | 'uk' | 'fr' | 'es' | 'it' | 'ru'
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
                    source.countryCode as 'tr' | 'de' | 'us' | 'uk' | 'fr' | 'es' | 'it' | 'ru'
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
        if (isDigestJobRunning()) {
            return c.json({
                success: true,
                data: {
                    accepted: false,
                    message: 'Digest generation is already in progress',
                },
            }, 202);
        }

        logger.info({ period: 'daily' }, 'Manual digest generation accepted by admin');
        void triggerDigestManually('daily').then((result) => {
            if (!result.success) {
                logger.error({ result }, 'Background manual digest generation failed');
            } else {
                const successful = 'successful' in result ? result.successful : undefined;
                const failed = 'failed' in result ? result.failed : undefined;
                const duration = 'duration' in result ? result.duration : undefined;
                logger.info({
                    successful,
                    failed,
                    duration,
                }, 'Background manual digest generation completed');
            }
        }).catch((error) => {
            logger.error({ error }, 'Background manual digest generation crashed');
        });

        return c.json({
            success: true,
            data: {
                accepted: true,
                message: 'Digest generation started in background',
            },
        }, 202);
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
                schedule: '19:00 daily',
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
 * GET /admin/access
 * Lightweight endpoint to verify admin session/access
 */
admin.get('/access', (c) => {
    return c.json({
        success: true,
        data: {
            isAdmin: true,
        },
    });
});

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
        const articleCounts: Record<string, number> = {};
        for (const [cc, table] of Object.entries(articleTables)) {
            const result = await db
                .select({ count: sql<number>`count(*)` })
                .from(table)
                .get();
            articleCounts[cc] = result?.count || 0;
        }

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
                    ...articleCounts,
                    total: Object.values(articleCounts).reduce((sum, c) => sum + c, 0),
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

/**
 * GET /admin/digest-quality
 * Digest quality metrics (importance / uncertainty / coverage)
 */
admin.get('/digest-quality', async (c) => {
    try {
        const country = (c.req.query('country') || 'tr') as keyof typeof digestTables;
        const days = Math.min(Math.max(parseInt(c.req.query('days') || '7', 10), 1), 30);

        if (!(country in digestTables)) {
            return c.json({ success: false, error: 'Invalid country code' }, 400);
        }

        const table = digestTables[country];
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - days);
        const cutoffStr = cutoff.toISOString().split('T')[0];

        const digests = await db
            .select({
                id: table.id,
                digestDate: table.digestDate,
                topTopics: table.topTopics,
                sections: table.sections,
            })
            .from(table)
            .where(gte(table.digestDate, cutoffStr))
            .orderBy(desc(table.createdAt))
            .limit(50);

        let topicCount = 0;
        let importanceSum = 0;
        let withCounterNarrative = 0;
        let withTimeline = 0;
        const uncertainty = { Kesin: 0, Muhtemel: 0, Gelisiyor: 0 } as Record<'Kesin' | 'Muhtemel' | 'Gelisiyor', number>;

        for (const digest of digests) {
            const topics = typeof digest.topTopics === 'string' ? JSON.parse(digest.topTopics || '[]') : (digest.topTopics || []);
            for (const topic of topics) {
                if (!topic || !topic.title) continue;
                topicCount++;
                if (typeof topic.importanceScore === 'number') importanceSum += topic.importanceScore;
                if (topic.counterNarrative || topic.counter_narrative) withCounterNarrative++;
                if (topic.timeline?.before || topic.timeline_before) withTimeline++;
                const level = topic.uncertaintyLevel || topic.uncertainty_level;
                if (level === 'Kesin' || level === 'Muhtemel' || level === 'Gelisiyor') {
                    uncertainty[level as 'Kesin' | 'Muhtemel' | 'Gelisiyor']++;
                }
            }
        }

        return c.json({
            success: true,
            data: {
                country,
                days,
                digests: digests.length,
                topics: topicCount,
                avgImportanceScore: topicCount > 0 ? Number((importanceSum / topicCount).toFixed(3)) : 0,
                counterNarrativeCoverage: topicCount > 0 ? Number((withCounterNarrative / topicCount).toFixed(3)) : 0,
                timelineCoverage: topicCount > 0 ? Number((withTimeline / topicCount).toFixed(3)) : 0,
                uncertaintyDistribution: uncertainty,
            },
        });
    } catch (error) {
        logger.error({ error }, 'Get digest quality failed');
        return c.json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to get digest quality',
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
        const countryParam = c.req.query('country') || 'tr';
        const page = parseInt(c.req.query('page') ?? '1', 10);
        const limit = parseInt(c.req.query('limit') ?? '20', 10);
        const offset = (page - 1) * limit;
        const category = c.req.query('category');
        const sentiment = c.req.query('sentiment');
        const dateFrom = c.req.query('dateFrom');
        const dateTo = c.req.query('dateTo');

        if (!(countryParam in articleTables)) {
            return c.json({
                success: false,
                error: 'Invalid country code',
            }, 400);
        }

        const country = countryParam as keyof typeof articleTables;
        const articlesTable = articleTables[country];
        const sourcesTable = articleSourceTables[country as keyof typeof articleSourceTables];

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

        // Batch fetch sources for all articles
        const articleIds = articles.map(a => a.id);
        const allSources = sourcesTable && articleIds.length > 0
            ? await db.select().from(sourcesTable).where(inArray(sourcesTable.articleId, articleIds))
            : [];
        const sourcesMap = new Map<string, typeof allSources>();
        for (const source of allSources) {
            const existing = sourcesMap.get(source.articleId) || [];
            existing.push(source);
            sourcesMap.set(source.articleId, existing);
        }
        const articlesWithSources = articles.map(article => ({
            ...article,
            sources: sourcesMap.get(article.id) || [],
        }));

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

        if (!(country in articleTables)) {
            return c.json({
                success: false,
                error: 'Invalid country code',
            }, 400);
        }

        const countryKey = country as keyof typeof articleTables;
        const articlesTable = articleTables[countryKey];
        const sourcesTable = articleSourceTables[country as keyof typeof articleSourceTables];

        // Delete article sources first
        if (sourcesTable) {
            await db
                .delete(sourcesTable)
                .where(eq(sourcesTable.articleId, articleId));
        }

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

// ===========================
// DIGEST MANAGEMENT
// ===========================

/**
 * PATCH /admin/digests/:country/:digestId
 * Update a digest (summary, topics)
 */
admin.patch('/digests/:country/:digestId', async (c) => {
    try {
        const { country, digestId } = c.req.param();
        if (!(country in digestTables)) {
            return c.json({ success: false, error: 'Invalid country code' }, 400);
        }
        const table = digestTables[country as keyof typeof digestTables];
        const body = await c.req.json();

        const updateFields: Record<string, any> = {};
        if (body.summaryText !== undefined) updateFields.summaryText = body.summaryText;
        if (body.topTopics !== undefined) updateFields.topTopics = JSON.stringify(body.topTopics);
        if (body.sections !== undefined) updateFields.sections = JSON.stringify(body.sections);

        if (Object.keys(updateFields).length === 0) {
            return c.json({ success: false, error: 'No valid fields to update' }, 400);
        }

        const updated = await db
            .update(table)
            .set(updateFields)
            .where(eq(table.id, digestId))
            .returning()
            .get();

        if (!updated) {
            return c.json({ success: false, error: 'Digest not found' }, 404);
        }

        logger.info({ country, digestId }, 'Digest updated by admin');
        return c.json({ success: true, data: updated });
    } catch (error) {
        logger.error({ error }, 'Update digest failed');
        return c.json({ success: false, error: error instanceof Error ? error.message : 'Failed to update digest' }, 500);
    }
});

/**
 * DELETE /admin/digests/:country/:digestId
 * Delete a digest
 */
admin.delete('/digests/:country/:digestId', async (c) => {
    try {
        const { country, digestId } = c.req.param();
        if (!(country in digestTables)) {
            return c.json({ success: false, error: 'Invalid country code' }, 400);
        }
        const table = digestTables[country as keyof typeof digestTables];

        const deleted = await db
            .delete(table)
            .where(eq(table.id, digestId))
            .returning()
            .get();

        if (!deleted) {
            return c.json({ success: false, error: 'Digest not found' }, 404);
        }

        logger.info({ country, digestId }, 'Digest deleted by admin');
        return c.json({ success: true, message: 'Digest deleted successfully' });
    } catch (error) {
        logger.error({ error }, 'Delete digest failed');
        return c.json({ success: false, error: error instanceof Error ? error.message : 'Failed to delete digest' }, 500);
    }
});

// ===========================
// TWITTER ACCOUNT MANAGEMENT
// ===========================

/**
 * GET /admin/twitter-accounts
 * Get all twitter accounts, optionally filtered by country
 */
admin.get('/twitter-accounts', async (c) => {
    try {
        const country = c.req.query('country');
        const conditions = country ? eq(twitter_accounts.countryCode, country) : undefined;

        const accounts = await db
            .select()
            .from(twitter_accounts)
            .where(conditions)
            .orderBy(desc(twitter_accounts.id));

        return c.json({ success: true, data: accounts });
    } catch (error) {
        logger.error({ error }, 'Get twitter accounts failed');
        return c.json({ success: false, error: error instanceof Error ? error.message : 'Failed to fetch twitter accounts' }, 500);
    }
});

const createTwitterAccountSchema = z.object({
    countryCode: z.enum(['tr', 'de', 'us', 'uk', 'fr', 'es', 'it', 'ru']),
    userName: z.string().min(1),
    displayName: z.string().min(1),
    profileImageUrl: z.string().url().optional().nullable(),
    accountType: z.enum(['government', 'news_agency', 'journalist', 'institution', 'political_party']),
    isActive: z.boolean().default(true),
    description: z.string().optional().nullable(),
    govAlignmentScore: z.number().int().min(-3).max(3).default(0),
});

/**
 * POST /admin/twitter-accounts
 * Create a new twitter account
 */
admin.post('/twitter-accounts', async (c) => {
    try {
        const body = await c.req.json();
        const data = createTwitterAccountSchema.parse(body);

        const [created] = await db
            .insert(twitter_accounts)
            .values(data)
            .returning();

        logger.info({ accountId: created.id }, 'Twitter account created by admin');
        return c.json({ success: true, data: created }, 201);
    } catch (error) {
        logger.error({ error }, 'Create twitter account failed');
        return c.json({ success: false, error: error instanceof Error ? error.message : 'Failed to create twitter account' }, 400);
    }
});

/**
 * PATCH /admin/twitter-accounts/:accountId
 * Update a twitter account
 */
admin.patch('/twitter-accounts/:accountId', async (c) => {
    try {
        const accountId = parseInt(c.req.param('accountId'), 10);
        if (isNaN(accountId)) return c.json({ success: false, error: 'Invalid account ID' }, 400);

        const body = await c.req.json();
        const updateData: Record<string, any> = {};
        if (body.userName !== undefined) updateData.userName = body.userName;
        if (body.displayName !== undefined) updateData.displayName = body.displayName;
        if (body.profileImageUrl !== undefined) updateData.profileImageUrl = body.profileImageUrl;
        if (body.accountType !== undefined) updateData.accountType = body.accountType;
        if (body.isActive !== undefined) updateData.isActive = body.isActive;
        if (body.description !== undefined) updateData.description = body.description;
        if (body.govAlignmentScore !== undefined) updateData.govAlignmentScore = body.govAlignmentScore;
        if (body.countryCode !== undefined) updateData.countryCode = body.countryCode;

        if (Object.keys(updateData).length === 0) {
            return c.json({ success: false, error: 'No valid fields to update' }, 400);
        }

        const updated = await db
            .update(twitter_accounts)
            .set(updateData)
            .where(eq(twitter_accounts.id, accountId))
            .returning()
            .get();

        if (!updated) return c.json({ success: false, error: 'Account not found' }, 404);

        logger.info({ accountId }, 'Twitter account updated by admin');
        return c.json({ success: true, data: updated });
    } catch (error) {
        logger.error({ error }, 'Update twitter account failed');
        return c.json({ success: false, error: error instanceof Error ? error.message : 'Failed to update twitter account' }, 400);
    }
});

/**
 * DELETE /admin/twitter-accounts/:accountId
 * Delete a twitter account
 */
admin.delete('/twitter-accounts/:accountId', async (c) => {
    try {
        const accountId = parseInt(c.req.param('accountId'), 10);
        if (isNaN(accountId)) return c.json({ success: false, error: 'Invalid account ID' }, 400);

        const deleted = await db
            .delete(twitter_accounts)
            .where(eq(twitter_accounts.id, accountId))
            .returning()
            .get();

        if (!deleted) return c.json({ success: false, error: 'Account not found' }, 404);

        logger.info({ accountId }, 'Twitter account deleted by admin');
        return c.json({ success: true, message: 'Twitter account deleted successfully' });
    } catch (error) {
        logger.error({ error }, 'Delete twitter account failed');
        return c.json({ success: false, error: error instanceof Error ? error.message : 'Failed to delete twitter account' }, 500);
    }
});

// ===========================
// CRON LOGS
// ===========================

/**
 * GET /admin/cron/logs
 * Get cron execution history
 */
admin.get('/cron/logs', async (c) => {
    const limit = Math.min(parseInt(c.req.query('limit') || '50', 10), 200);
    const jobName = c.req.query('job');

    let filtered = cronLogs;
    if (jobName) {
        filtered = cronLogs.filter(l => l.jobName === jobName);
    }

    return c.json({
        success: true,
        data: filtered.slice(0, limit),
    });
});

// ===========================
// PUSH NOTIFICATIONS
// ===========================

/**
 * POST /admin/notifications/send
 * Send push notification to all users or specific users
 */
admin.post('/notifications/send', async (c) => {
    try {
        const body = await c.req.json();
        const { title, body: notifBody, type, userIds } = body;

        if (!title || !notifBody) {
            return c.json({ success: false, error: 'Title and body are required' }, 400);
        }

        // Get target users
        let targetUserIds: string[] = userIds || [];

        if (targetUserIds.length === 0) {
            const allUsers = await db.select({ id: users.id }).from(users);
            targetUserIds = allUsers.map(u => u.id);
        }

        if (targetUserIds.length === 0) {
            return c.json({ success: false, error: 'No users found' }, 404);
        }

        // Get active device tokens for target users
        const devices = await db
            .select({ fcmToken: userDevices.fcmToken, userId: userDevices.userId })
            .from(userDevices)
            .where(and(
                eq(userDevices.isActive, true),
                inArray(userDevices.userId, targetUserIds)
            ));
        const tokens = devices.map(d => d.fcmToken).filter(Boolean);

        // Send push notifications via Expo SDK
        let sentCount = 0;
        let failedCount = 0;

        if (tokens.length > 0) {
            const result = await sendBulkNotifications(
                tokens,
                title,
                notifBody,
                { type: type || 'system' }
            );
            sentCount = result.success;
            failedCount = result.failed;
        }

        // Save notification records for each target user
        const notifType = type || 'system';
        const now = new Date();
        for (const userId of targetUserIds) {
            try {
                await db.insert(notifications).values({
                    id: uuidv4(),
                    userId,
                    type: notifType,
                    title,
                    body: notifBody,
                    sentAt: now,
                });
            } catch (err) {
                // Non-critical - don't fail the whole operation
                logger.warn({ userId, error: err instanceof Error ? err.message : String(err) }, 'Failed to save notification record');
            }
        }

        logger.info({ targetCount: targetUserIds.length, tokenCount: tokens.length, sentCount, failedCount }, 'Admin notification sent');
        return c.json({
            success: true,
            data: {
                targetUsers: targetUserIds.length,
                success: sentCount,
                failed: failedCount,
            },
        });
    } catch (error) {
        logger.error({ error }, 'Send notification failed');
        return c.json({ success: false, error: error instanceof Error ? error.message : 'Failed to send notification' }, 500);
    }
});

/**
 * GET /admin/notifications/history
 * Get recent notifications
 */
admin.get('/notifications/history', async (c) => {
    try {
        const limit = Math.min(parseInt(c.req.query('limit') || '50', 10), 200);

        const recent = await db
            .select()
            .from(notifications)
            .orderBy(desc(notifications.sentAt))
            .limit(limit);

        return c.json({ success: true, data: recent });
    } catch (error) {
        logger.error({ error }, 'Get notification history failed');
        return c.json({ success: false, error: error instanceof Error ? error.message : 'Failed to get notifications' }, 500);
    }
});

/**
 * GET /admin/notifications/devices
 * Get registered device count
 */
admin.get('/notifications/devices', async (c) => {
    try {
        const totalResult = await db
            .select({ count: sql<number>`count(*)` })
            .from(userDevices)
            .get();

        const iosResult = await db
            .select({ count: sql<number>`count(*)` })
            .from(userDevices)
            .where(eq(userDevices.deviceType, 'ios'))
            .get();

        const androidResult = await db
            .select({ count: sql<number>`count(*)` })
            .from(userDevices)
            .where(eq(userDevices.deviceType, 'android'))
            .get();

        return c.json({
            success: true,
            data: {
                total: totalResult?.count || 0,
                ios: iosResult?.count || 0,
                android: androidResult?.count || 0,
            },
        });
    } catch (error) {
        logger.error({ error }, 'Get device stats failed');
        return c.json({ success: false, error: error instanceof Error ? error.message : 'Failed to get device stats' }, 500);
    }
});

// ===========================
// SYSTEM HEALTH
// ===========================

/**
 * GET /admin/system/health
 * System health metrics
 */
admin.get('/system/health', async (c) => {
    try {
        const uptime = process.uptime();
        const memUsage = process.memoryUsage();

        // DB sizes per country
        const dbStats: Record<string, any> = {};
        for (const [cc, table] of Object.entries(articleTables)) {
            const articleCount = await db.select({ count: sql<number>`count(*)` }).from(table).get();
            const digestTable = digestTables[cc as keyof typeof digestTables];
            const digestCount = await db.select({ count: sql<number>`count(*)` }).from(digestTable).get();
            const tweetTable = tweetTables[cc as keyof typeof tweetTables];
            const tweetCount = await db.select({ count: sql<number>`count(*)` }).from(tweetTable).get();
            dbStats[cc] = {
                articles: articleCount?.count || 0,
                digests: digestCount?.count || 0,
                tweets: tweetCount?.count || 0,
            };
        }

        const userCount = await db.select({ count: sql<number>`count(*)` }).from(users).get();
        const sourceCount = await db.select({ count: sql<number>`count(*)` }).from(rss_sources).where(eq(rss_sources.isActive, true)).get();
        const deviceCount = await db.select({ count: sql<number>`count(*)` }).from(userDevices).get();

        // AI usage from last 7 days
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        const weekAgoStr = weekAgo.toISOString().split('T')[0];
        const aiMetrics = await db
            .select()
            .from(aiUsageMetrics)
            .where(gte(aiUsageMetrics.date, weekAgoStr))
            .orderBy(desc(aiUsageMetrics.date))
            .limit(7);

        return c.json({
            success: true,
            data: {
                uptime,
                memory: {
                    rss: Math.round(memUsage.rss / 1024 / 1024),
                    heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
                    heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
                },
                database: dbStats,
                users: userCount?.count || 0,
                activeSources: sourceCount?.count || 0,
                registeredDevices: deviceCount?.count || 0,
                aiUsage: aiMetrics,
            },
        });
    } catch (error) {
        logger.error({ error }, 'Get system health failed');
        return c.json({ success: false, error: error instanceof Error ? error.message : 'Failed to get system health' }, 500);
    }
});

// ===========================
// ARTICLE EDITING
// ===========================

/**
 * PATCH /admin/articles/:country/:articleId
 * Update article details
 */
admin.patch('/articles/:country/:articleId', async (c) => {
    try {
        const { country, articleId } = c.req.param();
        if (!(country in articleTables)) {
            return c.json({ success: false, error: 'Invalid country code' }, 400);
        }

        const articlesTable = articleTables[country as keyof typeof articleTables];
        const body = await c.req.json();

        const updateData: Record<string, any> = {};
        if (body.translatedTitle !== undefined) updateData.translatedTitle = body.translatedTitle;
        if (body.summary !== undefined) updateData.summary = body.summary;
        if (body.categoryId !== undefined) updateData.categoryId = body.categoryId;
        if (body.isFiltered !== undefined) updateData.isFiltered = body.isFiltered;
        if (body.sentiment !== undefined) updateData.sentiment = body.sentiment;

        if (Object.keys(updateData).length === 0) {
            return c.json({ success: false, error: 'No valid fields to update' }, 400);
        }

        const updated = await db
            .update(articlesTable)
            .set(updateData)
            .where(eq(articlesTable.id, articleId))
            .returning()
            .get();

        if (!updated) {
            return c.json({ success: false, error: 'Article not found' }, 404);
        }

        logger.info({ country, articleId }, 'Article updated by admin');
        return c.json({ success: true, data: updated });
    } catch (error) {
        logger.error({ error }, 'Update article failed');
        return c.json({ success: false, error: error instanceof Error ? error.message : 'Failed to update article' }, 500);
    }
});

export default admin;
