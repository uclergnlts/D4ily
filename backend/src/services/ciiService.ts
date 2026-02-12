import { db } from '../config/db.js';
import { logger } from '../config/logger.js';
import {
    tr_articles, de_articles, us_articles, uk_articles,
    fr_articles, es_articles, it_articles, ru_articles,
} from '../db/schema/index.js';
import { gte, eq, and, count, avg, sql } from 'drizzle-orm';

const COUNTRY_ARTICLE_TABLES = {
    tr: tr_articles, de: de_articles, us: us_articles, uk: uk_articles,
    fr: fr_articles, es: es_articles, it: it_articles, ru: ru_articles,
} as const;

type CountryCode = keyof typeof COUNTRY_ARTICLE_TABLES;

export interface CIIResult {
    score: number;
    level: 'low' | 'medium' | 'high';
    breakdown: {
        negativeSentimentRatio: number;
        avgEmotionalIntensity: number;
        newsVelocityScore: number;
        avgLoadedLanguage: number;
        avgSensationalism: number;
    };
    articleCount24h: number;
    anomaly: {
        zScore: number;
        level: 'NORMAL' | 'ELEVATED' | 'HIGH' | 'CRITICAL';
        articleCountToday: number;
        avgDailyCount: number;
    };
}

/**
 * Calculate Country Instability Index for a specific country.
 * CII = 0.30 * negativeSentimentRatio
 *     + 0.25 * avgEmotionalIntensity
 *     + 0.20 * newsVelocityScore
 *     + 0.15 * avgLoadedLanguage
 *     + 0.10 * avgSensationalism
 * Result: 0-100 score
 */
export async function calculateCII(countryCode: CountryCode): Promise<CIIResult> {
    const table = COUNTRY_ARTICLE_TABLES[countryCode];
    const now = new Date();

    // 24 hours ago
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Get articles from last 24 hours
    const recentArticles = await db
        .select({
            totalCount: count(),
            negativeCount: count(
                sql`CASE WHEN ${table.sentiment} = 'negative' THEN 1 END`
            ),
            avgEmotionalIntensity: avg(table.emotionalIntensity),
            avgLoadedLanguage: avg(table.loadedLanguageScore),
            avgSensationalism: avg(table.sensationalismScore),
        })
        .from(table)
        .where(and(
            gte(table.publishedAt, last24h),
            eq(table.isFiltered, false)
        ))
        .get();

    const totalCount = recentArticles?.totalCount ?? 0;
    const negativeCount = recentArticles?.negativeCount ?? 0;

    // Calculate news velocity: today's count vs 7-day average
    const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const weekArticles = await db
        .select({ totalCount: count() })
        .from(table)
        .where(and(
            gte(table.publishedAt, last7d),
            eq(table.isFiltered, false)
        ))
        .get();

    const weekTotal = weekArticles?.totalCount ?? 0;
    const avgDaily = weekTotal / 7;

    // News velocity: ratio of today vs average, capped at 1
    const newsVelocityScore = avgDaily > 0
        ? Math.min(totalCount / avgDaily, 3) / 3  // normalize: 3x average = 1.0
        : 0;

    // Anomaly detection using z-score (30-day window)
    const anomaly = await detectAnomaly(countryCode, totalCount);

    // Component scores (all 0-1)
    const negativeSentimentRatio = totalCount > 0 ? negativeCount / totalCount : 0;
    const avgEmotionalIntensity = Number(recentArticles?.avgEmotionalIntensity ?? 0);
    const avgLoadedLanguage = Number(recentArticles?.avgLoadedLanguage ?? 0);
    const avgSensationalism = Number(recentArticles?.avgSensationalism ?? 0);

    // CII formula (0-1, then scale to 0-100)
    const rawScore =
        0.30 * negativeSentimentRatio +
        0.25 * avgEmotionalIntensity +
        0.20 * newsVelocityScore +
        0.15 * avgLoadedLanguage +
        0.10 * avgSensationalism;

    const score = Math.round(rawScore * 100);

    const level: CIIResult['level'] =
        score < 30 ? 'low' :
        score < 60 ? 'medium' : 'high';

    return {
        score,
        level,
        breakdown: {
            negativeSentimentRatio: Math.round(negativeSentimentRatio * 100) / 100,
            avgEmotionalIntensity: Math.round(avgEmotionalIntensity * 100) / 100,
            newsVelocityScore: Math.round(newsVelocityScore * 100) / 100,
            avgLoadedLanguage: Math.round(avgLoadedLanguage * 100) / 100,
            avgSensationalism: Math.round(avgSensationalism * 100) / 100,
        },
        articleCount24h: totalCount,
        anomaly,
    };
}

/**
 * Detect anomaly in news velocity using z-score over 30-day rolling window.
 * Uses Welford's online algorithm for computing mean and standard deviation.
 */
async function detectAnomaly(
    countryCode: CountryCode,
    todayCount: number
): Promise<CIIResult['anomaly']> {
    const table = COUNTRY_ARTICLE_TABLES[countryCode];
    const now = new Date();

    // Get daily article counts for the last 30 days
    const last30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const dailyCounts = await db
        .select({
            day: sql<string>`date(${table.publishedAt}, 'unixepoch')`.as('day'),
            count: count(),
        })
        .from(table)
        .where(and(
            gte(table.publishedAt, last30d),
            eq(table.isFiltered, false)
        ))
        .groupBy(sql`date(${table.publishedAt}, 'unixepoch')`);

    if (dailyCounts.length < 3) {
        return {
            zScore: 0,
            level: 'NORMAL',
            articleCountToday: todayCount,
            avgDailyCount: todayCount,
        };
    }

    // Welford's online algorithm
    let mean = 0;
    let m2 = 0;
    let n = 0;

    for (const day of dailyCounts) {
        n++;
        const x = day.count;
        const delta = x - mean;
        mean += delta / n;
        const delta2 = x - mean;
        m2 += delta * delta2;
    }

    const variance = n > 1 ? m2 / (n - 1) : 0;
    const stddev = Math.sqrt(variance);

    // Z-score for today
    const zScore = stddev > 0 ? (todayCount - mean) / stddev : 0;
    const roundedZ = Math.round(zScore * 100) / 100;

    const level: CIIResult['anomaly']['level'] =
        zScore >= 3.0 ? 'CRITICAL' :
        zScore >= 2.0 ? 'HIGH' :
        zScore >= 1.5 ? 'ELEVATED' : 'NORMAL';

    return {
        zScore: roundedZ,
        level,
        articleCountToday: todayCount,
        avgDailyCount: Math.round(mean),
    };
}

/**
 * Get CII for all countries
 */
export async function getCIIForAllCountries(): Promise<Record<string, CIIResult>> {
    const countries = Object.keys(COUNTRY_ARTICLE_TABLES) as CountryCode[];
    const results: Record<string, CIIResult> = {};

    for (const country of countries) {
        try {
            results[country] = await calculateCII(country);
        } catch (error) {
            logger.error({ error, country }, 'CII calculation failed for country');
            results[country] = {
                score: 0,
                level: 'low',
                breakdown: {
                    negativeSentimentRatio: 0,
                    avgEmotionalIntensity: 0,
                    newsVelocityScore: 0,
                    avgLoadedLanguage: 0,
                    avgSensationalism: 0,
                },
                articleCount24h: 0,
                anomaly: { zScore: 0, level: 'NORMAL', articleCountToday: 0, avgDailyCount: 0 },
            };
        }
    }

    return results;
}
