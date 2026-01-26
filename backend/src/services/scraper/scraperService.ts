import { nanoid } from 'nanoid';
import { db } from '../../config/db.js';
import { logger } from '../../config/logger.js';
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
    topics,
} from '../../db/schema/index.js';
import { parseRSSFeed } from './rssParser.js';
import { processArticleWithAI } from '../ai/aiService.js';
import { isDuplicate } from '../../utils/similarity.js';
import { eq, and, gte, sql } from 'drizzle-orm';

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

export async function scrapeSource(
    sourceId: number,
    sourceName: string,
    sourceLogoUrl: string,
    rssUrl: string,
    countryCode: 'tr' | 'de' | 'us' | 'uk' | 'fr' | 'es' | 'it' | 'ru'
) {
    try {
        logger.info({ sourceId, sourceName, countryCode }, 'Starting scrape');

        // Parse RSS feed
        const feed = await parseRSSFeed(rssUrl);

        if (feed.items.length === 0) {
            logger.warn({ sourceId }, 'No items in RSS feed');
            return { processed: 0, duplicates: 0, filtered: 0 };
        }

        const tables = COUNTRY_TABLES[countryCode];
        let processed = 0;
        let duplicates = 0;
        let filtered = 0;

        // Get recent articles for duplicate detection (last 24 hours)
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const recentArticles = await db
            .select()
            .from(tables.articles)
            .where(gte(tables.articles.scrapedAt, oneDayAgo))
            .limit(100);

        for (const item of feed.items.slice(0, 10)) { // Process first 10 items
            try {
                // Check for duplicates
                const duplicate = recentArticles.find((article) =>
                    isDuplicate(item.title, article.originalTitle)
                );

                if (duplicate) {
                    // Add source to existing article
                    await db.insert(tables.sources).values({
                        id: nanoid(),
                        articleId: duplicate.id,
                        sourceName,
                        sourceLogoUrl,
                        sourceUrl: item.link,
                        isPrimary: false,
                        addedAt: new Date(),
                    });

                    // Increment source count
                    await db
                        .update(tables.articles)
                        .set({ sourceCount: sql`${tables.articles.sourceCount} + 1` })
                        .where(eq(tables.articles.id, duplicate.id));

                    duplicates++;
                    logger.info({ articleId: duplicate.id }, 'Duplicate article, source added');
                    continue;
                }

                // Process with OpenAI
                const aiResult = await processArticleWithAI(
                    item.title,
                    item.content || item.description || '',
                    countryCode === 'tr' ? 'tr' : countryCode === 'de' ? 'de' : 'en'
                );

                // Filter clickbait and ads
                if (aiResult.isClickbait || aiResult.isAd) {
                    filtered++;
                    logger.info({ title: item.title.substring(0, 50) }, 'Article filtered');
                    continue;
                }

                // Get category ID
                const categoryResult = await db
                    .select()
                    .from(categories)
                    .where(eq(categories.name, aiResult.category))
                    .limit(1);

                const categoryId = categoryResult[0]?.id || null;

                // Create article
                const articleId = nanoid();
                await db.insert(tables.articles).values({
                    id: articleId,
                    originalTitle: item.title,
                    originalContent: item.content || item.description || '',
                    originalLanguage: countryCode === 'tr' ? 'tr' : countryCode === 'de' ? 'de' : 'en',
                    translatedTitle: aiResult.translatedTitle,
                    summary: aiResult.summary,
                    imageUrl: item.imageUrl,
                    isClickbait: aiResult.isClickbait,
                    isAd: aiResult.isAd,
                    isFiltered: false,
                    sourceCount: 1,
                    sentiment: aiResult.sentiment,
                    politicalTone: aiResult.politicalTone,
                    politicalConfidence: aiResult.politicalConfidence,
                    governmentMentioned: aiResult.governmentMentioned,
                    // AI emotional analysis
                    emotionalTone: aiResult.emotionalTone,
                    emotionalIntensity: aiResult.emotionalIntensity,
                    loadedLanguageScore: aiResult.loadedLanguageScore,
                    sensationalismScore: aiResult.sensationalismScore,
                    categoryId,
                    publishedAt: item.pubDate ? new Date(item.pubDate) : new Date(),
                    scrapedAt: new Date(),
                    viewCount: 0,
                    likeCount: 0,
                    dislikeCount: 0,
                    commentCount: 0,
                });

                // Add source
                await db.insert(tables.sources).values({
                    id: nanoid(),
                    articleId,
                    sourceName,
                    sourceLogoUrl,
                    sourceUrl: item.link,
                    isPrimary: true,
                    addedAt: new Date(),
                });

                processed++;
                logger.info({ articleId, title: aiResult.translatedTitle.substring(0, 50) }, 'Article created');
            } catch (error) {
                logger.error({ error, item: item.title }, 'Failed to process article');
            }
        }

        logger.info({ sourceId, processed, duplicates, filtered }, 'Scrape completed');
        return { processed, duplicates, filtered };
    } catch (error) {
        logger.error({ error, sourceId }, 'Scrape failed');
        throw error;
    }
}
