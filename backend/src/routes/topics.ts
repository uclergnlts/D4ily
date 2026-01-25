import { Hono } from 'hono';
import { db } from '../config/db.js';
import {
    topics,
    tr_articles,
    tr_article_topics,
    de_articles,
    de_article_topics,
    us_articles,
    us_article_topics,
} from '../db/schema/index.js';
import { eq, desc, inArray } from 'drizzle-orm';
import { logger } from '../config/logger.js';
import { z } from 'zod';

const topicsRoute = new Hono();

// Validation schemas
const countrySchema = z.enum(['tr', 'de', 'us']);

const COUNTRY_TABLES = {
    tr: { articles: tr_articles, articleTopics: tr_article_topics },
    de: { articles: de_articles, articleTopics: de_article_topics },
    us: { articles: us_articles, articleTopics: us_article_topics },
} as const;

/**
 * GET /topics/trending
 * Get trending topics (based on trending score)
 */
topicsRoute.get('/trending', async (c) => {
    try {
        const limit = parseInt(c.req.query('limit') ?? '10');

        const trendingTopics = await db
            .select()
            .from(topics)
            .orderBy(desc(topics.trendingScore))
            .limit(limit);

        return c.json({
            success: true,
            data: trendingTopics,
        });
    } catch (error) {
        logger.error({ error }, 'Get trending topics failed');
        return c.json({
            success: false,
            error: 'Failed to get trending topics',
        }, 500);
    }
});

/**
 * GET /topics
 * Get all topics
 */
topicsRoute.get('/', async (c) => {
    try {
        const allTopics = await db
            .select()
            .from(topics)
            .orderBy(desc(topics.articleCount));

        return c.json({
            success: true,
            data: allTopics,
        });
    } catch (error) {
        logger.error({ error }, 'Get topics failed');
        return c.json({
            success: false,
            error: 'Failed to get topics',
        }, 500);
    }
});

/**
 * GET /topics/:topicId
 * Get topic by ID
 */
topicsRoute.get('/:topicId', async (c) => {
    try {
        const topicId = parseInt(c.req.param('topicId'), 10);

        if (isNaN(topicId)) {
            return c.json({
                success: false,
                error: 'Invalid topic ID',
            }, 400);
        }

        const topic = await db
            .select()
            .from(topics)
            .where(eq(topics.id, topicId))
            .get();

        if (!topic) {
            return c.json({
                success: false,
                error: 'Topic not found',
            }, 404);
        }

        return c.json({
            success: true,
            data: topic,
        });
    } catch (error) {
        logger.error({ error }, 'Get topic failed');
        return c.json({
            success: false,
            error: 'Failed to get topic',
        }, 500);
    }
});

/**
 * GET /topics/:topicId/articles
 * Get articles by topic
 */
topicsRoute.get('/:topicId/articles', async (c) => {
    try {
        const topicId = parseInt(c.req.param('topicId'), 10);
        const country = c.req.query('country') || 'tr';
        const page = parseInt(c.req.query('page') ?? '1');
        const limit = parseInt(c.req.query('limit') ?? '20');
        const offset = (page - 1) * limit;

        if (isNaN(topicId)) {
            return c.json({
                success: false,
                error: 'Invalid topic ID',
            }, 400);
        }

        // Validate country
        const validatedCountry = countrySchema.safeParse(country);
        if (!validatedCountry.success) {
            return c.json({
                success: false,
                error: 'Invalid country code',
            }, 400);
        }

        const tables = COUNTRY_TABLES[validatedCountry.data as 'tr' | 'de' | 'us'];

        // Get article IDs for this topic
        const articleTopics = await db
            .select({ articleId: tables.articleTopics.articleId })
            .from(tables.articleTopics)
            .where(eq(tables.articleTopics.topicId, topicId));

        if (articleTopics.length === 0) {
            return c.json({
                success: true,
                data: {
                    articles: [],
                    pagination: {
                        page,
                        limit,
                        total: 0,
                        hasMore: false,
                    },
                },
            });
        }

        const articleIds = articleTopics.map(at => at.articleId);

        // Get articles
        const articles = await db
            .select()
            .from(tables.articles)
            .where(inArray(tables.articles.id, articleIds))
            .orderBy(desc(tables.articles.publishedAt))
            .limit(limit)
            .offset(offset);

        return c.json({
            success: true,
            data: {
                articles,
                pagination: {
                    page,
                    limit,
                    total: articleIds.length,
                    hasMore: offset + limit < articleIds.length,
                },
            },
        });
    } catch (error) {
        logger.error({ error }, 'Get articles by topic failed');
        return c.json({
            success: false,
            error: 'Failed to get articles',
        }, 500);
    }
});

/**
 * GET /topics/hashtag/:hashtag
 * Get topic by hashtag
 */
topicsRoute.get('/hashtag/:hashtag', async (c) => {
    try {
        let { hashtag } = c.req.param();

        // Add # if not present
        if (!hashtag.startsWith('#')) {
            hashtag = '#' + hashtag;
        }

        const topic = await db
            .select()
            .from(topics)
            .where(eq(topics.hashtag, hashtag))
            .get();

        if (!topic) {
            return c.json({
                success: false,
                error: 'Topic not found',
            }, 404);
        }

        return c.json({
            success: true,
            data: topic,
        });
    } catch (error) {
        logger.error({ error }, 'Get topic by hashtag failed');
        return c.json({
            success: false,
            error: 'Failed to get topic',
        }, 500);
    }
});

export default topicsRoute;
