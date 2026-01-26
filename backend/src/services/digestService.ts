import { db } from '../config/db.js';
import { openai } from '../config/openai.js';
import { logger } from '../config/logger.js';
import {
    tr_articles,
    tr_daily_digests,
    de_articles,
    de_daily_digests,
    us_articles,
    us_daily_digests,
    uk_articles,
    uk_daily_digests,
    fr_articles,
    fr_daily_digests,
    es_articles,
    es_daily_digests,
    it_articles,
    it_daily_digests,
    ru_articles,
    ru_daily_digests,
} from '../db/schema/index.js';
import { gte, lte, eq, desc, and } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

const COUNTRY_TABLES = {
    tr: { articles: tr_articles, digests: tr_daily_digests },
    de: { articles: de_articles, digests: de_daily_digests },
    us: { articles: us_articles, digests: us_daily_digests },
    uk: { articles: uk_articles, digests: uk_daily_digests },
    fr: { articles: fr_articles, digests: fr_daily_digests },
    es: { articles: es_articles, digests: es_daily_digests },
    it: { articles: it_articles, digests: it_daily_digests },
    ru: { articles: ru_articles, digests: ru_daily_digests },
} as const;

type CountryCode = keyof typeof COUNTRY_TABLES;
type Period = 'morning' | 'evening';

interface DigestResult {
    summaryText: string;
    topTopics: string[];
    articleCount: number;
}

/**
 * Generate daily digest summary using OpenAI
 */
async function generateDigestWithAI(
    articles: { translatedTitle: string; summary: string; categoryId: number | null }[],
    period: Period,
    countryCode: CountryCode
): Promise<DigestResult> {
    try {
        const articleSummaries = articles
            .map((a, i) => `${i + 1}. ${a.translatedTitle}: ${a.summary}`)
            .join('\n');

        const prompt = `Aşağıdaki ${articles.length} haberi analiz et ve ${period === 'morning' ? 'sabah' : 'akşam'} özeti oluştur:

${articleSummaries}

Lütfen şunları sağla:
1. summary: Günün önemli gelişmelerini özetleyen 2-3 paragraf (Türkçe, 150-200 kelime)
2. top_topics: En çok konuşulan 3-5 konu (hashtag formatında, örn: ["#Ekonomi", "#Siyaset"])

Sadece JSON formatında cevap ver.`;

        const response = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                {
                    role: 'system',
                    content: 'Sen bir haber analisti AI\'sısın. Günlük haber özetleri oluşturuyorsun. Sadece JSON formatında cevap ver.',
                },
                {
                    role: 'user',
                    content: prompt,
                },
            ],
            response_format: { type: 'json_object' },
            temperature: 0.5,
        });

        const result = JSON.parse(response.choices[0].message.content || '{}');

        return {
            summaryText: result.summary || 'Günün özeti oluşturulamadı.',
            topTopics: result.top_topics || [],
            articleCount: articles.length,
        };
    } catch (error) {
        logger.error({ error }, 'Digest AI generation failed');

        // Fallback
        return {
            summaryText: `Bugün ${articles.length} haber işlendi. Önemli gelişmeler için haberleri inceleyiniz.`,
            topTopics: [],
            articleCount: articles.length,
        };
    }
}

/**
 * Generate daily digest for a specific country and period
 */
export async function generateDailyDigest(
    countryCode: CountryCode,
    period: Period,
    date?: Date
): Promise<{ id: string; success: boolean; error?: string }> {
    try {
        const tables = COUNTRY_TABLES[countryCode];
        const targetDate = date || new Date();

        // Calculate time range based on period
        let startTime: Date;
        let endTime: Date;

        if (period === 'morning') {
            // Morning digest: 19:00 previous day to 07:00 today
            startTime = new Date(targetDate);
            startTime.setHours(7, 0, 0, 0);
            startTime.setDate(startTime.getDate() - 1);
            startTime.setHours(19, 0, 0, 0);

            endTime = new Date(targetDate);
            endTime.setHours(7, 0, 0, 0);
        } else {
            // Evening digest: 07:00 to 19:00 today
            startTime = new Date(targetDate);
            startTime.setHours(7, 0, 0, 0);

            endTime = new Date(targetDate);
            endTime.setHours(19, 0, 0, 0);
        }

        // Get articles in time range
        const articles = await db
            .select({
                translatedTitle: tables.articles.translatedTitle,
                summary: tables.articles.summary,
                categoryId: tables.articles.categoryId,
            })
            .from(tables.articles)
            .where(and(
                gte(tables.articles.publishedAt, startTime),
                lte(tables.articles.publishedAt, endTime),
                eq(tables.articles.isFiltered, false)
            ))
            .limit(50);

        if (articles.length === 0) {
            logger.warn({ countryCode, period }, 'No articles found for digest');
            return { id: '', success: false, error: 'No articles found' };
        }

        // Generate digest with AI
        const digestResult = await generateDigestWithAI(articles, period, countryCode);

        // Format date string
        const digestDate = targetDate.toISOString().split('T')[0];

        // Check if digest already exists
        const existing = await db
            .select()
            .from(tables.digests)
            .where(and(
                eq(tables.digests.digestDate, digestDate),
                eq(tables.digests.period, period)
            ))
            .get();

        if (existing) {
            // Update existing
            await db
                .update(tables.digests)
                .set({
                    summaryText: digestResult.summaryText,
                    topTopics: JSON.stringify(digestResult.topTopics),
                    articleCount: digestResult.articleCount,
                })
                .where(eq(tables.digests.id, existing.id));

            logger.info({ countryCode, period, digestId: existing.id }, 'Digest updated');
            return { id: existing.id, success: true };
        }

        // Create new digest
        const digestId = uuidv4();
        await db.insert(tables.digests).values({
            id: digestId,
            countryCode,
            period,
            digestDate,
            summaryText: digestResult.summaryText,
            topTopics: JSON.stringify(digestResult.topTopics),
            articleCount: digestResult.articleCount,
            commentCount: 0,
            createdAt: new Date(),
        });

        logger.info({ countryCode, period, digestId, articleCount: digestResult.articleCount }, 'Digest created');
        return { id: digestId, success: true };
    } catch (error) {
        logger.error({ error, countryCode, period }, 'Generate digest failed');
        return { id: '', success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
}

/**
 * Get latest digest for a country
 */
export async function getLatestDigest(countryCode: CountryCode) {
    const tables = COUNTRY_TABLES[countryCode];

    const digest = await db
        .select()
        .from(tables.digests)
        .orderBy(desc(tables.digests.createdAt))
        .limit(1)
        .get();

    return digest;
}

/**
 * Get digest by date and period
 */
export async function getDigestByDateAndPeriod(
    countryCode: CountryCode,
    date: string,
    period: Period
) {
    const tables = COUNTRY_TABLES[countryCode];

    const digest = await db
        .select()
        .from(tables.digests)
        .where(and(
            eq(tables.digests.digestDate, date),
            eq(tables.digests.period, period)
        ))
        .get();

    return digest;
}

/**
 * Generate digests for all countries
 */
export async function generateAllDigests(period: Period) {
    const countries: CountryCode[] = ['tr', 'de', 'us'];
    const results = [];

    for (const country of countries) {
        const result = await generateDailyDigest(country, period);
        results.push({ country, ...result });
    }

    return results;
}
