import { db } from '../config/db.js';
import { openai } from '../config/openai.js';
import { logger } from '../config/logger.js';
import {
    weeklyComparisons,
    tr_daily_digests,
    de_daily_digests,
    us_daily_digests,
} from '../db/schema/index.js';
import { gte, lte, eq, desc, and } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

const COUNTRY_DIGEST_TABLES = {
    tr: tr_daily_digests,
    de: de_daily_digests,
    us: us_daily_digests,
} as const;

type CountryCode = 'tr' | 'de' | 'us';

interface CountryData {
    topics: string[];
    sentiment: string;
    summary: string;
}

interface WeeklyComparisonResult {
    countriesData: Record<string, CountryData>;
    comparisonText: string;
}

/**
 * Generate weekly comparison using OpenAI
 */
async function generateWeeklyWithAI(
    countryDigests: Record<string, string[]>
): Promise<WeeklyComparisonResult> {
    try {
        let digestSummary = '';
        for (const [country, summaries] of Object.entries(countryDigests)) {
            digestSummary += `\n${country.toUpperCase()}:\n${summaries.join('\n')}\n`;
        }

        const prompt = `Aşağıdaki haftalık haber özetlerini analiz et ve ülkeler arası karşılaştırma yap:

${digestSummary}

Lütfen şunları sağla:
1. countries_data: Her ülke için (tr, de, us):
   - topics: Ana konular (3-5 hashtag)
   - sentiment: Genel ton (positive/neutral/negative)
   - summary: Kısa özet (1-2 cümle)
2. comparison_text: Ülkelerin gündemlerini karşılaştıran detaylı analiz (Türkçe, 200-300 kelime)

Sadece JSON formatında cevap ver.`;

        const response = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                {
                    role: 'system',
                    content: 'Sen bir uluslararası haber analisti AI\'sısın. Haftalık ülkeler arası gündem karşılaştırması yapıyorsun. Sadece JSON formatında cevap ver.',
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
            countriesData: result.countries_data || {},
            comparisonText: result.comparison_text || 'Karşılaştırma oluşturulamadı.',
        };
    } catch (error) {
        logger.error({ error }, 'Weekly AI generation failed');

        return {
            countriesData: {},
            comparisonText: 'Bu haftanın karşılaştırması oluşturulamadı.',
        };
    }
}

/**
 * Get week boundaries (Monday to Sunday)
 */
function getWeekBoundaries(date: Date): { weekStart: string; weekEnd: string } {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Monday start

    const monday = new Date(d.setDate(diff));
    monday.setHours(0, 0, 0, 0);

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);

    return {
        weekStart: monday.toISOString().split('T')[0],
        weekEnd: sunday.toISOString().split('T')[0],
    };
}

/**
 * Generate weekly comparison
 */
export async function generateWeeklyComparison(
    weekStart?: string,
    weekEnd?: string
): Promise<{ id: string; success: boolean; error?: string }> {
    try {
        // Get week boundaries
        const boundaries = weekStart && weekEnd
            ? { weekStart, weekEnd }
            : getWeekBoundaries(new Date());

        // Get digests for each country
        const countryDigests: Record<string, string[]> = {};
        const countries: CountryCode[] = ['tr', 'de', 'us'];

        for (const country of countries) {
            const table = COUNTRY_DIGEST_TABLES[country];
            const digests = await db
                .select()
                .from(table)
                .where(and(
                    gte(table.digestDate, boundaries.weekStart),
                    lte(table.digestDate, boundaries.weekEnd)
                ));

            countryDigests[country] = digests.map(d => d.summaryText);
        }

        // Check if we have enough data
        const totalDigests = Object.values(countryDigests).flat().length;
        if (totalDigests < 3) {
            logger.warn({ totalDigests }, 'Not enough digests for weekly comparison');
            return { id: '', success: false, error: 'Not enough digests' };
        }

        // Generate comparison with AI
        const result = await generateWeeklyWithAI(countryDigests);

        // Check if comparison already exists for this week
        const existing = await db
            .select()
            .from(weeklyComparisons)
            .where(and(
                eq(weeklyComparisons.weekStart, boundaries.weekStart),
                eq(weeklyComparisons.weekEnd, boundaries.weekEnd)
            ))
            .get();

        if (existing) {
            // Update existing
            await db
                .update(weeklyComparisons)
                .set({
                    countriesData: JSON.stringify(result.countriesData),
                    comparisonText: result.comparisonText,
                })
                .where(eq(weeklyComparisons.id, existing.id));

            logger.info({ weekStart: boundaries.weekStart, id: existing.id }, 'Weekly comparison updated');
            return { id: existing.id, success: true };
        }

        // Create new comparison
        const comparisonId = uuidv4();
        await db.insert(weeklyComparisons).values({
            id: comparisonId,
            weekStart: boundaries.weekStart,
            weekEnd: boundaries.weekEnd,
            countriesData: JSON.stringify(result.countriesData),
            comparisonText: result.comparisonText,
            createdAt: new Date(),
            commentCount: 0,
        });

        logger.info({ weekStart: boundaries.weekStart, comparisonId }, 'Weekly comparison created');
        return { id: comparisonId, success: true };
    } catch (error) {
        logger.error({ error }, 'Generate weekly comparison failed');
        return { id: '', success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
}

/**
 * Get latest weekly comparison
 */
export async function getLatestWeeklyComparison() {
    const comparison = await db
        .select()
        .from(weeklyComparisons)
        .orderBy(desc(weeklyComparisons.createdAt))
        .limit(1)
        .get();

    return comparison;
}

/**
 * Get weekly comparison by week
 */
export async function getWeeklyComparisonByWeek(weekStart: string) {
    const comparison = await db
        .select()
        .from(weeklyComparisons)
        .where(eq(weeklyComparisons.weekStart, weekStart))
        .get();

    return comparison;
}
