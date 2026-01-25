import { Hono } from 'hono';
import { db } from '../config/db.js';
import { rss_sources, categories, topics } from '../db/schema/index.js';
import { tr_articles, de_articles, us_articles } from '../db/schema/articles.js';
import { desc, or, sql } from 'drizzle-orm';
import { z } from 'zod';
import { logger } from '../config/logger.js';
import { cacheGet, cacheSet } from '../config/redis.js';

const searchRoute = new Hono();

// Schemas
const searchSchema = z.object({
    q: z.string().min(2).max(100),
    type: z.enum(['all', 'articles', 'sources', 'topics']).default('all'),
    country: z.string().length(2).default('tr'),
    limit: z.number().int().min(1).max(50).default(20),
    page: z.number().int().min(1).default(1),
});

// Helper to get article table by country
function getArticleTable(country: string) {
    switch (country) {
        case 'tr': return tr_articles;
        case 'de': return de_articles;
        case 'us': return us_articles;
        default: return tr_articles;
    }
}

/**
 * GET /search
 * Universal search across articles, sources, and topics
 */
searchRoute.get('/', async (c) => {
    try {
        const query = c.req.query('q') || '';
        const type = c.req.query('type') || 'all';
        const country = c.req.query('country') || 'tr';
        const limit = parseInt(c.req.query('limit') || '20', 10);
        const page = parseInt(c.req.query('page') || '1', 10);

        // Validate
        const validation = searchSchema.safeParse({ q: query, type, country, limit, page });
        if (!validation.success) {
            return c.json({
                success: false,
                error: 'Invalid search parameters',
                details: validation.error.issues,
            }, 400);
        }

        const { q, type: searchType } = validation.data;
        const offset = (page - 1) * limit;
        const searchTerm = `%${q.toLowerCase()}%`;

        // Check cache
        const cacheKey = `search:${country}:${searchType}:${q}:${page}:${limit}`;
        const cached = await cacheGet(cacheKey);
        if (cached) {
            return c.json({
                success: true,
                data: cached,
                cached: true,
            });
        }

        const results: {
            articles: any[];
            sources: any[];
            topics: any[];
        } = {
            articles: [],
            sources: [],
            topics: [],
        };

        // Search Articles
        if (searchType === 'all' || searchType === 'articles') {
            const articleTable = getArticleTable(country);

            const articles = await db
                .select({
                    id: articleTable.id,
                    translatedTitle: articleTable.translatedTitle,
                    summary: articleTable.summary,
                    categoryId: articleTable.categoryId,
                    publishedAt: articleTable.publishedAt,
                    viewCount: articleTable.viewCount,
                    likeCount: articleTable.likeCount,
                })
                .from(articleTable)
                .where(
                    sql`(lower(${articleTable.translatedTitle}) LIKE ${searchTerm} OR lower(${articleTable.summary}) LIKE ${searchTerm})`
                )
                .orderBy(desc(articleTable.publishedAt))
                .limit(searchType === 'articles' ? limit : 5)
                .offset(searchType === 'articles' ? offset : 0);

            results.articles = articles.map(a => ({
                ...a,
                type: 'article',
                country,
            }));
        }

        // Search Sources
        if (searchType === 'all' || searchType === 'sources') {
            const sources = await db
                .select({
                    id: rss_sources.id,
                    sourceName: rss_sources.sourceName,
                    sourceLogoUrl: rss_sources.sourceLogoUrl,
                    countryCode: rss_sources.countryCode,
                    biasScoreSystem: rss_sources.biasScoreSystem,
                    biasScoreUser: rss_sources.biasScoreUser,
                })
                .from(rss_sources)
                .where(
                    sql`lower(${rss_sources.sourceName}) LIKE ${searchTerm}`
                )
                .limit(searchType === 'sources' ? limit : 5)
                .offset(searchType === 'sources' ? offset : 0);

            results.sources = sources.map(s => ({
                ...s,
                type: 'source',
            }));
        }

        // Search Topics
        if (searchType === 'all' || searchType === 'topics') {
            const topicsResult = await db
                .select({
                    id: topics.id,
                    name: topics.name,
                    hashtag: topics.hashtag,
                    articleCount: topics.articleCount,
                    trendingScore: topics.trendingScore,
                })
                .from(topics)
                .where(
                    sql`(lower(${topics.name}) LIKE ${searchTerm} OR lower(${topics.hashtag}) LIKE ${searchTerm})`
                )
                .orderBy(desc(topics.trendingScore))
                .limit(searchType === 'topics' ? limit : 5)
                .offset(searchType === 'topics' ? offset : 0);

            results.topics = topicsResult.map(t => ({
                ...t,
                type: 'topic',
            }));
        }

        // Build response
        const response = {
            query: q,
            type: searchType,
            country,
            results: searchType === 'all' ? results : results[searchType === 'articles' ? 'articles' : searchType === 'sources' ? 'sources' : 'topics'],
            pagination: {
                page,
                limit,
                hasMore: searchType === 'all'
                    ? (results.articles.length >= 5 || results.sources.length >= 5 || results.topics.length >= 5)
                    : (results[searchType === 'articles' ? 'articles' : searchType === 'sources' ? 'sources' : 'topics'].length >= limit),
            },
            totalResults: {
                articles: results.articles.length,
                sources: results.sources.length,
                topics: results.topics.length,
            },
        };

        // Cache for 5 minutes
        await cacheSet(cacheKey, response, 300);

        logger.info({ query: q, type: searchType, country, resultCount: response.totalResults }, 'Search performed');

        return c.json({
            success: true,
            data: response,
        });
    } catch (error) {
        logger.error({ error }, 'Search failed');
        return c.json({
            success: false,
            error: 'Search failed',
        }, 500);
    }
});

/**
 * GET /search/suggestions
 * Get search suggestions based on partial query
 */
searchRoute.get('/suggestions', async (c) => {
    try {
        const query = c.req.query('q') || '';
        const country = c.req.query('country') || 'tr';

        if (query.length < 2) {
            return c.json({
                success: true,
                data: [],
            });
        }

        const searchTerm = `%${query.toLowerCase()}%`;
        const suggestions: string[] = [];

        // Get topic suggestions
        const topicSuggestions = await db
            .select({ name: topics.name })
            .from(topics)
            .where(sql`lower(${topics.name}) LIKE ${searchTerm}`)
            .orderBy(desc(topics.trendingScore))
            .limit(5);

        suggestions.push(...topicSuggestions.map(t => t.name));

        // Get source suggestions
        const sourceSuggestions = await db
            .select({ name: rss_sources.sourceName })
            .from(rss_sources)
            .where(sql`lower(${rss_sources.sourceName}) LIKE ${searchTerm}`)
            .limit(3);

        suggestions.push(...sourceSuggestions.map(s => s.name));

        // Dedupe and limit
        const uniqueSuggestions = [...new Set(suggestions)].slice(0, 8);

        return c.json({
            success: true,
            data: uniqueSuggestions,
        });
    } catch (error) {
        logger.error({ error }, 'Suggestions failed');
        return c.json({
            success: false,
            error: 'Failed to get suggestions',
        }, 500);
    }
});

/**
 * GET /search/trending
 * Get trending search terms
 */
searchRoute.get('/trending', async (c) => {
    try {
        const country = c.req.query('country') || 'tr';

        // Check cache
        const cacheKey = `search:trending:${country}`;
        const cached = await cacheGet(cacheKey);
        if (cached) {
            return c.json({
                success: true,
                data: cached,
                cached: true,
            });
        }

        // Get trending topics as trending searches
        const trendingTopics = await db
            .select({
                id: topics.id,
                name: topics.name,
                hashtag: topics.hashtag,
                articleCount: topics.articleCount,
            })
            .from(topics)
            .orderBy(desc(topics.trendingScore))
            .limit(10);

        const trending = trendingTopics.map(t => ({
            term: t.name,
            hashtag: t.hashtag,
            articleCount: t.articleCount,
        }));

        // Cache for 15 minutes
        await cacheSet(cacheKey, trending, 900);

        return c.json({
            success: true,
            data: trending,
        });
    } catch (error) {
        logger.error({ error }, 'Trending search failed');
        return c.json({
            success: false,
            error: 'Failed to get trending searches',
        }, 500);
    }
});

export default searchRoute;
