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

// Simple in-memory queue for async AI processing
const aiProcessingQueue: Array<() => Promise<void>> = [];
let isProcessingQueue = false;

// Process AI queue in background
async function processAIQueue() {
    if (isProcessingQueue || aiProcessingQueue.length === 0) return;
    
    isProcessingQueue = true;
    logger.info({ queueSize: aiProcessingQueue.length }, 'Starting AI processing queue');
    
    while (aiProcessingQueue.length > 0) {
        const task = aiProcessingQueue.shift();
        if (task) {
            try {
                await task();
                // Add delay between AI calls to avoid rate limiting
                await new Promise(resolve => setTimeout(resolve, 500));
            } catch (error) {
                logger.error({ error }, 'AI queue task failed');
            }
        }
    }
    
    isProcessingQueue = false;
    logger.info('AI processing queue completed');
}

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

                // Create article immediately with basic info
                const articleId = nanoid();
                const categoryResult = await db
                    .select()
                    .from(categories)
                    .where(eq(categories.name, 'Dünya'))
                    .limit(1);
                const defaultCategoryId = categoryResult[0]?.id || null;

                // Insert article with default values first
                await db.insert(tables.articles).values({
                    id: articleId,
                    originalTitle: item.title,
                    originalContent: item.content || item.description || '',
                    originalLanguage: countryCode === 'tr' ? 'tr' : countryCode === 'de' ? 'de' : 'en',
                    translatedTitle: item.title, // Will be updated by AI
                    summary: item.description || item.title, // Will be updated by AI
                    detailContent: item.content || item.description || '', // Will be updated by AI
                    imageUrl: item.imageUrl,
                    isClickbait: false, // Will be updated by AI
                    isAd: false, // Will be updated by AI
                    isFiltered: false,
                    sourceCount: 1,
                    sentiment: 'neutral', // Will be updated by AI
                    politicalTone: 0, // Will be updated by AI
                    politicalConfidence: 0, // Will be updated by AI
                    governmentMentioned: false, // Will be updated by AI
                    emotionalTone: null, // Will be updated by AI
                    emotionalIntensity: 0, // Will be updated by AI
                    loadedLanguageScore: 0, // Will be updated by AI
                    sensationalismScore: 0, // Will be updated by AI
                    categoryId: defaultCategoryId,
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
                logger.info({ articleId, title: item.title.substring(0, 50) }, 'Article created (pending AI processing)');

                // Queue AI processing for background execution
                aiProcessingQueue.push(async () => {
                    try {
                        const aiResult = await processArticleWithAI(
                            item.title,
                            item.content || item.description || '',
                            countryCode === 'tr' ? 'tr' : countryCode === 'de' ? 'de' : 'en'
                        );

                        // Check if article should be filtered
                        if (aiResult.isClickbait || aiResult.isAd) {
                            await db
                                .update(tables.articles)
                                .set({ isFiltered: true, isClickbait: aiResult.isClickbait, isAd: aiResult.isAd })
                                .where(eq(tables.articles.id, articleId));
                            logger.info({ articleId, title: item.title.substring(0, 50) }, 'Article filtered by AI');
                            return;
                        }

                        // Get category ID from AI result
                        const aiCategoryResult = await db
                            .select()
                            .from(categories)
                            .where(eq(categories.name, aiResult.category))
                            .limit(1);
                        const aiCategoryId = aiCategoryResult[0]?.id || defaultCategoryId;

                        // Update article with AI results
                        await db
                            .update(tables.articles)
                            .set({
                                translatedTitle: aiResult.translatedTitle,
                                summary: aiResult.summary,
                                detailContent: aiResult.detailContent,
                                isClickbait: aiResult.isClickbait,
                                isAd: aiResult.isAd,
                                sentiment: aiResult.sentiment,
                                politicalTone: aiResult.politicalTone,
                                politicalConfidence: aiResult.politicalConfidence,
                                governmentMentioned: aiResult.governmentMentioned,
                                emotionalTone: aiResult.emotionalTone,
                                emotionalIntensity: aiResult.emotionalIntensity,
                                loadedLanguageScore: aiResult.loadedLanguageScore,
                                sensationalismScore: aiResult.sensationalismScore,
                                categoryId: aiCategoryId,
                            })
                            .where(eq(tables.articles.id, articleId));

                        logger.info({ articleId, title: aiResult.translatedTitle.substring(0, 50) }, 'Article AI processing completed');
                    } catch (error) {
                        logger.error({ error, articleId, title: item.title }, 'AI processing failed for article');
                    }
                });

            } catch (error) {
                logger.error({ error, item: item.title }, 'Failed to process article');
            }
        }

        // Start processing AI queue in background
        setImmediate(processAIQueue);

        logger.info({ sourceId, processed, duplicates, filtered, aiQueueSize: aiProcessingQueue.length }, 'Scrape completed');
        return { processed, duplicates, filtered };
    } catch (error) {
        logger.error({ error, sourceId }, 'Scrape failed');
        throw error;
    }
}
