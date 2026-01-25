import { Hono } from 'hono';
import { db } from '../config/db.js';
import {
    tr_daily_digests,
    de_daily_digests,
    us_daily_digests,
    comments,
} from '../db/schema/index.js';
import { eq, and, desc, isNull } from 'drizzle-orm';
import { logger } from '../config/logger.js';
import { z } from 'zod';
import { getLatestDigest, getDigestByDateAndPeriod } from '../services/digestService.js';

const digestRoute = new Hono();

// Validation schemas
const countrySchema = z.enum(['tr', 'de', 'us']);
const periodSchema = z.enum(['morning', 'evening']);

const COUNTRY_TABLES = {
    tr: tr_daily_digests,
    de: de_daily_digests,
    us: us_daily_digests,
} as const;

/**
 * GET /digest/:country/latest
 * Get the latest daily digest
 */
digestRoute.get('/:country/latest', async (c) => {
    try {
        const { country } = c.req.param();
        const validatedCountry = countrySchema.parse(country) as 'tr' | 'de' | 'us';

        const digest = await getLatestDigest(validatedCountry);

        if (!digest) {
            return c.json({
                success: false,
                error: 'No digest found',
            }, 404);
        }

        // Parse topTopics from JSON string
        const topTopics = typeof digest.topTopics === 'string'
            ? JSON.parse(digest.topTopics)
            : digest.topTopics;

        return c.json({
            success: true,
            data: {
                ...digest,
                topTopics,
            },
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
        const validatedCountry = countrySchema.parse(country) as 'tr' | 'de' | 'us';

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
                data: digests.map(d => ({
                    ...d,
                    topTopics: typeof d.topTopics === 'string' ? JSON.parse(d.topTopics) : d.topTopics,
                })),
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

        const topTopics = typeof digest.topTopics === 'string'
            ? JSON.parse(digest.topTopics)
            : digest.topTopics;

        return c.json({
            success: true,
            data: {
                ...digest,
                topTopics,
            },
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
        const validatedCountry = countrySchema.parse(country) as 'tr' | 'de' | 'us';

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

        const topTopics = typeof digest.topTopics === 'string'
            ? JSON.parse(digest.topTopics)
            : digest.topTopics;

        return c.json({
            success: true,
            data: {
                ...digest,
                topTopics,
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
