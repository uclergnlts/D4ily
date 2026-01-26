import { Hono } from 'hono';
import { db } from '../config/db.js';
import { weeklyComparisons, comments } from '../db/schema/index.js';
import { eq, and, desc, isNull } from 'drizzle-orm';
import { logger } from '../config/logger.js';
import { getLatestWeeklyComparison, getWeeklyComparisonByWeek } from '../services/weeklyService.js';

const weeklyRoute = new Hono();

// Safe JSON parse helper
function safeJsonParse<T>(value: string | T, fallback: T): T {
    if (typeof value !== 'string') return value;
    try {
        return JSON.parse(value) as T;
    } catch {
        logger.warn({ value }, 'Failed to parse JSON, using fallback');
        return fallback;
    }
}

/**
 * GET /weekly/latest
 * Get the latest weekly comparison
 */
weeklyRoute.get('/latest', async (c) => {
    try {
        const comparison = await getLatestWeeklyComparison();

        if (!comparison) {
            return c.json({
                success: false,
                error: 'No weekly comparison found',
            }, 404);
        }

        // Parse countriesData from JSON string
        const countriesData = safeJsonParse(comparison.countriesData, {});

        return c.json({
            success: true,
            data: {
                ...comparison,
                countriesData,
            },
        });
    } catch (error) {
        logger.error({ error }, 'Get latest weekly comparison failed');
        return c.json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to get comparison',
        }, 500);
    }
});

/**
 * GET /weekly
 * Get weekly comparison by week start date or list recent
 * Query params: ?week=YYYY-MM-DD (Monday of the week)
 */
weeklyRoute.get('/', async (c) => {
    try {
        const week = c.req.query('week');

        if (week) {
            const comparison = await getWeeklyComparisonByWeek(week);

            if (!comparison) {
                return c.json({
                    success: false,
                    error: 'Comparison not found for this week',
                }, 404);
            }

            const countriesData = safeJsonParse(comparison.countriesData, {});

            return c.json({
                success: true,
                data: {
                    ...comparison,
                    countriesData,
                },
            });
        }

        // Return recent comparisons
        const comparisons = await db
            .select()
            .from(weeklyComparisons)
            .orderBy(desc(weeklyComparisons.createdAt))
            .limit(10);

        return c.json({
            success: true,
            data: comparisons.map(comp => ({
                ...comp,
                countriesData: safeJsonParse(comp.countriesData, {}),
            })),
        });
    } catch (error) {
        logger.error({ error }, 'Get weekly comparison failed');
        return c.json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to get comparison',
        }, 500);
    }
});

/**
 * GET /weekly/:comparisonId
 * Get weekly comparison by ID with comments
 */
weeklyRoute.get('/:comparisonId', async (c) => {
    try {
        const { comparisonId } = c.req.param();

        const comparison = await db
            .select()
            .from(weeklyComparisons)
            .where(eq(weeklyComparisons.id, comparisonId))
            .get();

        if (!comparison) {
            return c.json({
                success: false,
                error: 'Comparison not found',
            }, 404);
        }

        // Get comments for this comparison
        const comparisonComments = await db
            .select()
            .from(comments)
            .where(and(
                eq(comments.targetType, 'weekly_comparison'),
                eq(comments.targetId, comparisonId),
                isNull(comments.parentCommentId)
            ))
            .orderBy(desc(comments.createdAt))
            .limit(20);

        const countriesData = safeJsonParse(comparison.countriesData, {});

        return c.json({
            success: true,
            data: {
                ...comparison,
                countriesData,
                comments: comparisonComments,
            },
        });
    } catch (error) {
        logger.error({ error }, 'Get comparison by ID failed');
        return c.json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to get comparison',
        }, 500);
    }
});

export default weeklyRoute;
