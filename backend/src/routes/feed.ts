import { Hono } from 'hono';
import { db } from '../config/db.js';
import {
    tr_articles,
    tr_article_sources,
    de_articles,
    de_article_sources,
    us_articles,
    us_article_sources,
    uk_articles,
    uk_article_sources,
    fr_articles,
    fr_article_sources,
    es_articles,
    es_article_sources,
    it_articles,
    it_article_sources,
    ru_articles,
    ru_article_sources,
    categories,
    articleReactions,
    bookmarks,
    rss_sources,
} from '../db/schema/index.js';
import { eq, desc, and, inArray } from 'drizzle-orm';
import { handleError } from '../utils/errors.js';
import { countrySchema, paginationSchema } from '../utils/schemas.js';
import { cacheGet, cacheSet } from '../config/redis.js';
import { logger } from '../config/logger.js';
import type { ApiResponse, EmotionalAnalysisResponse } from '../types/index.js';
import { z } from 'zod';
import { optionalAuthMiddleware, AuthUser } from '../middleware/auth.js';
import { findPerspectives, getBalancedFeed } from '../services/perspectivesService.js';
import { getAlignmentLabel } from '../utils/alignment.js';
import {
    getEmotionLabelTr,
    getIntensityLabelTr,
    getSensationalismLabelTr,
} from '../services/ai/emotionalAnalysisService.js';

// Stale-while-revalidate cache settings
const CACHE_TTL = 1800;           // 30 minutes fresh cache
const STALE_TTL = 3600;           // 60 minutes stale cache (serve while revalidating)
const QUERY_TIMEOUT = 8000;       // 8 seconds query timeout (leaving 2s buffer for 10s request timeout)

/**
 * Execute a database query with timeout protection
 */
async function withQueryTimeout<T>(
    queryFn: () => Promise<T>,
    timeoutMs: number = QUERY_TIMEOUT,
    fallback?: T
): Promise<T> {
    return new Promise((resolve, reject) => {
        const timeoutId = setTimeout(() => {
            if (fallback !== undefined) {
                logger.warn({ timeoutMs }, 'Query timeout, using fallback');
                resolve(fallback);
            } else {
                reject(new Error('Query timeout'));
            }
        }, timeoutMs);

        queryFn()
            .then((result) => {
                clearTimeout(timeoutId);
                resolve(result);
            })
            .catch((error) => {
                clearTimeout(timeoutId);
                reject(error);
            });
    });
}

/**
 * Get cache with stale-while-revalidate support
 * Returns cached data even if stale, and triggers background refresh
 */
async function getCacheWithSWR<T>(
    cacheKey: string,
    fetchFn: () => Promise<T>,
    ttl: number = CACHE_TTL
): Promise<{ data: T; isStale: boolean }> {
    // Try to get from cache first
    const cached = await cacheGet<{ data: T; timestamp: number }>(cacheKey + ':swr');

    if (cached) {
        const age = Date.now() - cached.timestamp;
        const isStale = age > ttl * 1000;

        // If data is stale but within stale TTL, return it and trigger background refresh
        if (isStale && age < STALE_TTL * 1000) {
            // Background refresh (fire and forget)
            fetchFn().then(async (newData) => {
                await cacheSet(cacheKey + ':swr', { data: newData, timestamp: Date.now() }, STALE_TTL);
            }).catch((error) => {
                logger.warn({ cacheKey, error: error.message }, 'Background cache refresh failed');
            });

            return { data: cached.data, isStale: true };
        }

        // Fresh cache
        if (!isStale) {
            return { data: cached.data, isStale: false };
        }
    }

    // No cache or expired, fetch fresh data
    const data = await fetchFn();
    await cacheSet(cacheKey + ':swr', { data, timestamp: Date.now() }, STALE_TTL);
    return { data, isStale: false };
}

type Variables = {
    user?: AuthUser;
};

const app = new Hono<{ Variables: Variables }>();

const COUNTRY_TABLES = {
    tr: { articles: tr_articles, sources: tr_article_sources },
    de: { articles: de_articles, sources: de_article_sources },
    us: { articles: us_articles, sources: us_article_sources },
    uk: { articles: uk_articles, sources: uk_article_sources },
    fr: { articles: fr_articles, sources: fr_article_sources },
    es: { articles: es_articles, sources: es_article_sources },
    it: { articles: it_articles, sources: it_article_sources },
    ru: { articles: ru_articles, sources: ru_article_sources },
} as const;

// GET /feed/:country - Get articles by country with pagination
// Supports ?balanced=true for balanced feed across political spectrum
app.get('/:country', async (c) => {
    try {
        const countryParam = c.req.param('country');
        const balanced = c.req.query('balanced') === 'true';

        // Validate country
        const countryValidation = countrySchema.safeParse(countryParam);
        if (!countryValidation.success) {
            return c.json({
                success: false,
                error: 'Invalid country code',
            }, 400);
        }

        const country = countryValidation.data as 'tr' | 'de' | 'us' | 'uk' | 'fr' | 'es' | 'it' | 'ru';

        // Validate pagination params
        const pageParam = c.req.query('page') || '1';
        const limitParam = c.req.query('limit') || '20';

        const paginationValidation = paginationSchema.safeParse({
            page: pageParam,
            limit: limitParam,
        });

        if (!paginationValidation.success) {
            return c.json({
                success: false,
                error: 'Invalid pagination parameters',
            }, 400);
        }

        const { page, limit } = paginationValidation.data;
        const offset = (page - 1) * limit;

        // Handle balanced feed with stale-while-revalidate
        if (balanced) {
            const cacheKey = `feed:${country}:balanced:page:${page}:limit:${limit}`;

            try {
                const { data, isStale } = await getCacheWithSWR(
                    cacheKey,
                    async () => {
                        return await withQueryTimeout(
                            () => getBalancedFeed(country, { limit, page }),
                            QUERY_TIMEOUT,
                            { proGov: [], mixed: [], antiGov: [] } // Fallback on timeout
                        );
                    }
                );

                return c.json({
                    success: true,
                    data,
                    cached: true,
                    stale: isStale,
                });
            } catch (error) {
                // Try to get stale cache on error
                const staleCache = await cacheGet<{ data: any }>(cacheKey + ':swr');
                if (staleCache) {
                    logger.warn({ cacheKey }, 'Serving stale cache due to error');
                    return c.json({
                        success: true,
                        data: staleCache.data,
                        cached: true,
                        stale: true,
                    });
                }
                throw error;
            }
        }

        // Normal feed with stale-while-revalidate
        const cacheKey = `feed:${country}:page:${page}:limit:${limit}`;
        const tables = COUNTRY_TABLES[country];

        const fetchFeed = async () => {
            // Get articles with query timeout protection
            const articles = await withQueryTimeout(
                () => db
                    .select({
                        id: tables.articles.id,
                        originalTitle: tables.articles.originalTitle,
                        originalLanguage: tables.articles.originalLanguage,
                        translatedTitle: tables.articles.translatedTitle,
                        summary: tables.articles.summary,
                        imageUrl: tables.articles.imageUrl,
                        isClickbait: tables.articles.isClickbait,
                        isAd: tables.articles.isAd,
                        isFiltered: tables.articles.isFiltered,
                        sourceCount: tables.articles.sourceCount,
                        publishedAt: tables.articles.publishedAt,
                        scrapedAt: tables.articles.scrapedAt,
                        viewCount: tables.articles.viewCount,
                        likeCount: tables.articles.likeCount,
                        dislikeCount: tables.articles.dislikeCount,
                        commentCount: tables.articles.commentCount,
                    })
                    .from(tables.articles)
                    .where(eq(tables.articles.isFiltered, false))
                    .orderBy(desc(tables.articles.publishedAt))
                    .limit(limit)
                    .offset(offset),
                QUERY_TIMEOUT,
                [] // Return empty array on timeout
            );

            // Get article IDs for fetching sources
            const articleIds = articles.map(a => a.id);

            // Fetch sources with timeout protection
            const sourcesWithAlignment = articleIds.length > 0
                ? await withQueryTimeout(
                    () => db
                        .select({
                            articleId: tables.sources.articleId,
                            sourceName: tables.sources.sourceName,
                            sourceUrl: tables.sources.sourceUrl,
                            sourceLogoUrl: tables.sources.sourceLogoUrl,
                            isPrimary: tables.sources.isPrimary,
                            govAlignmentScore: rss_sources.govAlignmentScore,
                            govAlignmentConfidence: rss_sources.govAlignmentConfidence,
                        })
                        .from(tables.sources)
                        .innerJoin(
                            rss_sources,
                            eq(tables.sources.sourceName, rss_sources.sourceName)
                        )
                        .where(and(
                            eq(tables.sources.isPrimary, true),
                            inArray(tables.sources.articleId, articleIds)
                        )),
                    QUERY_TIMEOUT,
                    []
                )
                : [];

            // Create lookup map for sources with alignment
            const sourcesMap = new Map();
            sourcesWithAlignment.forEach(s => {
                if (!sourcesMap.has(s.articleId)) {
                    sourcesMap.set(s.articleId, []);
                }
                sourcesMap.get(s.articleId).push({
                    articleId: s.articleId,
                    sourceName: s.sourceName,
                    sourceUrl: s.sourceUrl,
                    sourceLogoUrl: s.sourceLogoUrl,
                    isPrimary: s.isPrimary,
                });
            });

            // Create alignment lookup map
            const alignmentMap = new Map();
            sourcesWithAlignment.forEach(s => {
                if (!alignmentMap.has(s.sourceName)) {
                    alignmentMap.set(s.sourceName, {
                        govAlignmentScore: s.govAlignmentScore,
                        govAlignmentLabel: getAlignmentLabel(
                            s.govAlignmentScore,
                            s.govAlignmentConfidence ?? 0.5
                        ),
                    });
                }
            });

            // Combine articles with sources and alignment info
            const articlesWithSources = articles.map(article => {
                const sources = sourcesMap.get(article.id) || [];
                const primarySource = sources.find((s: any) => s.isPrimary);
                const alignment = primarySource ? alignmentMap.get(primarySource.sourceName) : null;

                return {
                    ...article,
                    sources,
                    govAlignmentScore: alignment?.govAlignmentScore ?? 0,
                    govAlignmentLabel: alignment?.govAlignmentLabel ?? 'Belirsiz',
                };
            });

            return {
                articles: articlesWithSources,
                pagination: {
                    page,
                    limit,
                    hasMore: articles.length === limit,
                },
            };
        };

        try {
            const { data, isStale } = await getCacheWithSWR(cacheKey, fetchFeed);

            return c.json({
                success: true,
                data,
                cached: isStale ? true : undefined,
                stale: isStale || undefined,
            });
        } catch (error) {
            // Try to get stale cache on error (graceful degradation)
            const staleCache = await cacheGet<{ data: any }>(cacheKey + ':swr');
            if (staleCache) {
                logger.warn({ cacheKey }, 'Serving stale cache due to error');
                return c.json({
                    success: true,
                    data: staleCache.data,
                    cached: true,
                    stale: true,
                });
            }
            throw error;
        }
    } catch (error) {
        return handleError(c, error, 'Failed to fetch feed');
    }
});

// GET /feed/:country/:articleId - Get article detail
app.get('/:country/:articleId', optionalAuthMiddleware, async (c) => {
    try {
        const countryParam = c.req.param('country');
        const articleId = c.req.param('articleId');
        const user = c.get('user') as AuthUser | undefined;

        // Validate country
        const countryValidation = countrySchema.safeParse(countryParam);
        if (!countryValidation.success) {
            return c.json({
                success: false,
                error: 'Invalid country code',
            }, 400);
        }

        const country = countryValidation.data as 'tr' | 'de' | 'us' | 'uk' | 'fr' | 'es' | 'it' | 'ru';

        // Get article with detailContent (don't cache to ensure fresh view count)
        const tables = COUNTRY_TABLES[country];
        const articles = await db
            .select({
                id: tables.articles.id,
                originalTitle: tables.articles.originalTitle,
                originalContent: tables.articles.originalContent,
                originalLanguage: tables.articles.originalLanguage,
                translatedTitle: tables.articles.translatedTitle,
                summary: tables.articles.summary,
                detailContent: tables.articles.detailContent,
                imageUrl: tables.articles.imageUrl,
                isClickbait: tables.articles.isClickbait,
                isAd: tables.articles.isAd,
                isFiltered: tables.articles.isFiltered,
                sourceCount: tables.articles.sourceCount,
                sentiment: tables.articles.sentiment,
                politicalTone: tables.articles.politicalTone,
                politicalConfidence: tables.articles.politicalConfidence,
                governmentMentioned: tables.articles.governmentMentioned,
                emotionalTone: tables.articles.emotionalTone,
                emotionalIntensity: tables.articles.emotionalIntensity,
                loadedLanguageScore: tables.articles.loadedLanguageScore,
                sensationalismScore: tables.articles.sensationalismScore,
                categoryId: tables.articles.categoryId,
                publishedAt: tables.articles.publishedAt,
                scrapedAt: tables.articles.scrapedAt,
                viewCount: tables.articles.viewCount,
                likeCount: tables.articles.likeCount,
                dislikeCount: tables.articles.dislikeCount,
                commentCount: tables.articles.commentCount,
            })
            .from(tables.articles)
            .where(eq(tables.articles.id, articleId))
            .limit(1);

        if (articles.length === 0) {
            return c.json({
                success: false,
                error: 'Article not found',
            }, 404);
        }

        const article = articles[0];

        // Get sources
        const sources = await db
            .select()
            .from(tables.sources)
            .where(eq(tables.sources.articleId, articleId));

        // Get category
        let categoryInfo = null;
        if (article.categoryId) {
            const categoryResult = await db
                .select()
                .from(categories)
                .where(eq(categories.id, article.categoryId))
                .limit(1);

            if (categoryResult.length > 0) {
                categoryInfo = categoryResult[0];
            }
        }

        // Get user reaction status if authenticated
        let userReaction = null;
        let isBookmarked = false;

        if (user) {
            const reaction = await db
                .select()
                .from(articleReactions)
                .where(and(
                    eq(articleReactions.userId, user.uid),
                    eq(articleReactions.articleId, articleId)
                ))
                .get();

            const bookmark = await db
                .select()
                .from(bookmarks)
                .where(and(
                    eq(bookmarks.userId, user.uid),
                    eq(bookmarks.articleId, articleId)
                ))
                .get();

            userReaction = reaction?.reactionType || null;
            isBookmarked = !!bookmark;
        }

        // Increment view count
        await db.update(tables.articles)
            .set({ viewCount: article.viewCount + 1 })
            .where(eq(tables.articles.id, articleId));

        // Ensure detailContent is populated - fallback to summary if null (backward compatibility)
        const articleWithDetail = {
            ...article,
            detailContent: article.detailContent || article.summary,
        };

        const response = {
            ...articleWithDetail,
            viewCount: article.viewCount + 1, // Return updated count
            sources,
            category: categoryInfo,
            userReaction,
            isBookmarked,
        };

        return c.json({
            success: true,
            data: response,
        });
    } catch (error) {
        return handleError(c, error, 'Failed to fetch article');
    }
});

// GET /feed/:country/:articleId/perspectives - Get different perspectives on the same story
app.get('/:country/:articleId/perspectives', async (c) => {
    try {
        const countryParam = c.req.param('country');
        const articleId = c.req.param('articleId');

        // Validate country
        const countryValidation = countrySchema.safeParse(countryParam);
        if (!countryValidation.success) {
            return c.json({
                success: false,
                error: 'Invalid country code',
            }, 400);
        }

        const country = countryValidation.data as 'tr' | 'de' | 'us' | 'uk' | 'fr' | 'es' | 'it' | 'ru';

        // Check cache first
        const cacheKey = `perspectives:${country}:${articleId}`;
        const cached = await cacheGet<any>(cacheKey);

        if (cached) {
            return c.json({
                success: true,
                data: cached,
                cached: true,
            });
        }

        // Find perspectives
        const perspectives = await findPerspectives(articleId, country);

        if (!perspectives) {
            return c.json({
                success: false,
                error: 'Article not found',
            }, 404);
        }

        // Cache for 30 minutes (perspectives don't change often)
        await cacheSet(cacheKey, perspectives, 1800);

        return c.json({
            success: true,
            data: perspectives,
        });
    } catch (error) {
        return handleError(c, error, 'Failed to fetch perspectives');
    }
});

// GET /feed/:country/:articleId/analysis - Get emotional analysis of an article
app.get('/:country/:articleId/analysis', async (c) => {
    try {
        const countryParam = c.req.param('country');
        const articleId = c.req.param('articleId');

        // Validate country
        const countryValidation = countrySchema.safeParse(countryParam);
        if (!countryValidation.success) {
            return c.json({
                success: false,
                error: 'Invalid country code',
            }, 400);
        }

        const country = countryValidation.data as 'tr' | 'de' | 'us' | 'uk' | 'fr' | 'es' | 'it' | 'ru';

        // Check cache first
        const cacheKey = `analysis:${country}:${articleId}`;
        const cached = await cacheGet<EmotionalAnalysisResponse>(cacheKey);

        if (cached) {
            return c.json({
                success: true,
                data: cached,
                cached: true,
            });
        }

        // Get article
        const tables = COUNTRY_TABLES[country];
        const articles = await db
            .select()
            .from(tables.articles)
            .where(eq(tables.articles.id, articleId))
            .limit(1);

        if (articles.length === 0) {
            return c.json({
                success: false,
                error: 'Article not found',
            }, 404);
        }

        const article = articles[0] as any;

        // Build analysis response from stored data
        const emotionalTone = article.emotionalTone as {
            anger: number;
            fear: number;
            joy: number;
            sadness: number;
            surprise: number;
        } | null;

        // Determine dominant emotion
        let dominantEmotion = 'neutral';
        if (emotionalTone) {
            const emotions = [
                { name: 'anger', value: emotionalTone.anger },
                { name: 'fear', value: emotionalTone.fear },
                { name: 'joy', value: emotionalTone.joy },
                { name: 'sadness', value: emotionalTone.sadness },
                { name: 'surprise', value: emotionalTone.surprise },
            ];
            const maxEmotion = emotions.reduce((max, curr) =>
                curr.value > max.value ? curr : max
            );
            if (maxEmotion.value >= 0.2) {
                dominantEmotion = maxEmotion.name;
            }
        }

        const analysisResponse: EmotionalAnalysisResponse = {
            articleId: article.id,
            emotionalTone: emotionalTone || { anger: 0, fear: 0, joy: 0, sadness: 0, surprise: 0 },
            emotionalIntensity: article.emotionalIntensity ?? 0,
            loadedLanguageScore: article.loadedLanguageScore ?? 0,
            sensationalismScore: article.sensationalismScore ?? 0,
            dominantEmotion,
            dominantEmotionLabel: getEmotionLabelTr(dominantEmotion),
            intensityLabel: getIntensityLabelTr(article.emotionalIntensity ?? 0),
            sensationalismLabel: getSensationalismLabelTr(article.sensationalismScore ?? 0),
            politicalTone: article.politicalTone ?? 0,
            politicalConfidence: article.politicalConfidence ?? 0,
        };

        // Cache for 1 hour (analysis doesn't change)
        await cacheSet(cacheKey, analysisResponse, 3600);

        return c.json({
            success: true,
            data: analysisResponse,
        });
    } catch (error) {
        return handleError(c, error, 'Failed to fetch article analysis');
    }
});

export default app;
