import { Hono } from 'hono';
import { db } from '../config/db.js';
import {
    tr_daily_digests,
    de_daily_digests,
    us_daily_digests,
    uk_daily_digests,
    fr_daily_digests,
    es_daily_digests,
    it_daily_digests,
    ru_daily_digests,
    comments,
} from '../db/schema/index.js';
import { eq, and, desc, isNull } from 'drizzle-orm';
import { logger } from '../config/logger.js';
import { z } from 'zod';
import { getLatestDigest, getDigestByDateAndPeriod } from '../services/digestService.js';
import { safeJsonParse } from '../utils/json.js';

const digestRoute = new Hono();

// Validation schemas
const countrySchema = z.enum(['tr', 'de', 'us', 'uk', 'fr', 'es', 'it', 'ru']);
const periodSchema = z.enum(['morning', 'evening']);

const COUNTRY_TABLES = {
    tr: tr_daily_digests,
    de: de_daily_digests,
    us: us_daily_digests,
    uk: uk_daily_digests,
    fr: fr_daily_digests,
    es: es_daily_digests,
    it: it_daily_digests,
    ru: ru_daily_digests,
} as const;

// Generate title from period and date
function generateTitle(digest: { period: string; digestDate: string }): string {
    const periodLabel = digest.period === 'morning' ? 'Sabah' : 'Akşam';
    const date = new Date(digest.digestDate);
    const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' };
    const formattedDate = date.toLocaleDateString('tr-TR', options);
    return `${formattedDate} ${periodLabel} Özeti`;
}

// Transform topTopics from string[] to {title, description}[]
function transformTopTopics(topics: any): { title: string; description: string; articleId?: string }[] {
    if (!topics || !Array.isArray(topics)) return [];

    // Check if already in object format
    if (topics.length > 0 && typeof topics[0] === 'object' && topics[0].title) {
        return topics;
    }

    // Convert string[] to object array
    return topics.map((topic: string) => ({
        title: topic,
        description: '', // No description available from old format
    }));
}

// Transform digest response for mobile compatibility
function transformDigestResponse(digest: any) {
    const topTopics = safeJsonParse(digest.topTopics, []);
    const sections = safeJsonParse(digest.sections, []);
    return {
        ...digest,
        date: digest.digestDate,           // digestDate → date
        summary: digest.summaryText,       // summaryText → summary
        title: generateTitle(digest),      // Generate title
        topTopics: transformTopTopics(topTopics), // string[] → {title, description}[]
        sections,                          // Category-based sections (TR only)
    };
}

/**
 * GET /digest/:country/latest
 * Get the latest daily digest
 */
digestRoute.get('/:country/latest', async (c) => {
    try {
        const { country } = c.req.param();
        const validatedCountry = countrySchema.parse(country) as 'tr' | 'de' | 'us' | 'uk' | 'fr' | 'es' | 'it' | 'ru';

        const digest = await getLatestDigest(validatedCountry);

        if (!digest) {
            return c.json({
                success: false,
                error: 'No digest found',
            }, 404);
        }

        return c.json({
            success: true,
            data: transformDigestResponse(digest),
        });
    } catch (error) {
        logger.error({ error }, 'Get latest digest failed');
        return c.json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to get digest',
        }, 500);
    }
});

/**
 * GET /digest/:country
 * Get digest by date and period
 * Query params: ?date=YYYY-MM-DD&period=morning|evening
 */
digestRoute.get('/:country', async (c) => {
    try {
        const { country } = c.req.param();
        const validatedCountry = countrySchema.parse(country) as 'tr' | 'de' | 'us' | 'uk' | 'fr' | 'es' | 'it' | 'ru';

        const date = c.req.query('date');
        const period = c.req.query('period');

        if (!date || !period) {
            // Return latest if no date/period specified
            const table = COUNTRY_TABLES[validatedCountry];
            const digests = await db
                .select()
                .from(table)
                .orderBy(desc(table.createdAt))
                .limit(10);

            return c.json({
                success: true,
                data: digests.map(d => transformDigestResponse(d)),
            });
        }

        const validatedPeriod = periodSchema.parse(period) as 'morning' | 'evening';
        const digest = await getDigestByDateAndPeriod(validatedCountry, date, validatedPeriod);

        if (!digest) {
            return c.json({
                success: false,
                error: 'Digest not found for this date and period',
            }, 404);
        }

        return c.json({
            success: true,
            data: transformDigestResponse(digest),
        });
    } catch (error) {
        logger.error({ error }, 'Get digest failed');
        return c.json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to get digest',
        }, 500);
    }
});

/**
 * GET /digest/:country/:digestId
 * Get digest by ID with comments
 */
digestRoute.get('/:country/:digestId', async (c) => {
    try {
        const { country, digestId } = c.req.param();
        const validatedCountry = countrySchema.parse(country) as 'tr' | 'de' | 'us' | 'uk' | 'fr' | 'es' | 'it' | 'ru';

        const table = COUNTRY_TABLES[validatedCountry];
        const digest = await db
            .select()
            .from(table)
            .where(eq(table.id, digestId))
            .get();

        if (!digest) {
            return c.json({
                success: false,
                error: 'Digest not found',
            }, 404);
        }

        // Get comments for this digest
        const digestComments = await db
            .select()
            .from(comments)
            .where(and(
                eq(comments.targetType, 'daily_digest'),
                eq(comments.targetId, digestId),
                isNull(comments.parentCommentId)
            ))
            .orderBy(desc(comments.createdAt))
            .limit(20);

        return c.json({
            success: true,
            data: {
                ...transformDigestResponse(digest),
                comments: digestComments,
            },
        });
    } catch (error) {
        logger.error({ error }, 'Get digest by ID failed');
        return c.json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to get digest',
        }, 500);
    }
});

export default digestRoute;
