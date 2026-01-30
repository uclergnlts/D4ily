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
import { cacheGet, cacheSet, cacheInvalidate } from '../config/redis.js';
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

        // Handle balanced feed
        if (balanced) {
            const cacheKey = `feed:${country}:balanced:page:${page}:limit:${limit}`;
            const cached = await cacheGet<any>(cacheKey);

            if (cached) {
                return c.json({
                    success: true,
                    data: cached,
                    cached: true,
                });
            }

            const balancedData = await getBalancedFeed(country, { limit, page });

            // Cache for 1 minute for fresher data
            await cacheSet(cacheKey, balancedData, 60);

            return c.json({
                success: true,
                data: balancedData,
            });
        }

        // Check cache for normal feed
        const cacheKey = `feed:${country}:page:${page}:limit:${limit}`;
        const cached = await cacheGet<any>(cacheKey);

        if (cached) {
            return c.json({
                success: true,
                data: cached,
                cached: true,
            });
        }

        // Get articles - exclude detailContent for list performance
        const tables = COUNTRY_TABLES[country];
        const articles = await db
            .select({
                id: tables.articles.id,
                originalTitle: tables.articles.originalTitle,
                // originalContent: tables.articles.originalContent, // PERFORMANCE: Excluded for list view
                originalLanguage: tables.articles.originalLanguage,
                // translatedTitle: tables.articles.translatedTitle,
                // summary: tables.articles.summary, // TESTING: Excluded to debug hang
                // detailContent intentionally excluded for list performance
                imageUrl: tables.articles.imageUrl,
                isClickbait: tables.articles.isClickbait,
                isAd: tables.articles.isAd,
                isFiltered: tables.articles.isFiltered,
                sourceCount: tables.articles.sourceCount,
                /*
                sentiment: tables.articles.sentiment,
                politicalTone: tables.articles.politicalTone,
                politicalConfidence: tables.articles.politicalConfidence,
                governmentMentioned: tables.articles.governmentMentioned,
                emotionalTone: tables.articles.emotionalTone,
                emotionalIntensity: tables.articles.emotionalIntensity,
                loadedLanguageScore: tables.articles.loadedLanguageScore,
                sensationalismScore: tables.articles.sensationalismScore,
                categoryId: tables.articles.categoryId,
                */
                publishedAt: tables.articles.publishedAt,
                // scrapedAt: tables.articles.scrapedAt,
                viewCount: tables.articles.viewCount,
                likeCount: tables.articles.likeCount,
                dislikeCount: tables.articles.dislikeCount,
                commentCount: tables.articles.commentCount,
            })
            .from(tables.articles)
            .where(eq(tables.articles.isFiltered, false))
            .orderBy(desc(tables.articles.publishedAt))
            .limit(limit)
            .offset(offset);

        // Create lookup map for sources
        console.log('[DEBUG] Articles fetched, count:', articles.length);
        const articleIds = articles.map(a => a.id);

        console.log('[DEBUG] Fetching sources for articleIds count:', articleIds.length);

        const allSources = articleIds.length > 0
            ? await db
                .select({
                    articleId: tables.sources.articleId,
                    sourceName: tables.sources.sourceName,
                    sourceUrl: tables.sources.sourceUrl,
                    isPrimary: tables.sources.isPrimary,
                })
                .from(tables.sources)
                .where(and(
                    eq(tables.sources.isPrimary, true),
                    inArray(tables.sources.articleId, articleIds)
                ))
            : [];

        // Create lookup map for sources
        const sourcesMap = new Map();
        allSources.forEach(s => {
            if (!sourcesMap.has(s.articleId)) {
                sourcesMap.set(s.articleId, []);
            }
            sourcesMap.get(s.articleId).push(s);
        });

        // Get alignment info for all primary sources in one query
        const primarySourceNames = [...new Set(allSources.map(s => s.sourceName))];
        const sourceInfos = primarySourceNames.length > 0
            ? await db
                .select({
                    sourceName: rss_sources.sourceName,
                    govAlignmentScore: rss_sources.govAlignmentScore,
                    govAlignmentConfidence: rss_sources.govAlignmentConfidence,
                })
                .from(rss_sources)
                .where(inArray(rss_sources.sourceName, primarySourceNames))
            : [];

        // Create alignment lookup map
        const alignmentMap = new Map();
        sourceInfos.forEach(s => {
            alignmentMap.set(s.sourceName, {
                govAlignmentScore: s.govAlignmentScore,
                govAlignmentLabel: getAlignmentLabel(
                    s.govAlignmentScore,
                    s.govAlignmentConfidence ?? 0.5
                ),
            });
        });

        // Combine articles with sources and alignment info
        const articlesWithSources = articles.map(article => {
            const sources = sourcesMap.get(article.id) || [];
            const primarySource = sources.find((s: any) => s.isPrimary);
            const alignment = primarySource ? alignmentMap.get(primarySource.sourceName) : null;

            return {
                ...article,
                // Placeholder for summary
                summary: '',
                // Placeholder defaults for excluded columns
                translatedTitle: '',
                scrapedAt: new Date().toISOString(),

                sources,
                govAlignmentScore: alignment?.govAlignmentScore ?? 0,
                govAlignmentLabel: alignment?.govAlignmentLabel ?? 'Belirsiz',
            };
        });

        const response = {
            articles: articlesWithSources,
            pagination: {
                page,
                limit,
                hasMore: articles.length === limit,
            },
        };

        // Cache for 1 minute for fresher data
        await cacheSet(cacheKey, response, 60);

        return c.json({
            success: true,
            data: response,
        });
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
