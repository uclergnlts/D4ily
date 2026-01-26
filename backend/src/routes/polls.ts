import { Hono } from 'hono';
import { db } from '../config/db';
import {
    pollVotes,
    tr_article_polls,
    de_article_polls,
    us_article_polls,
    uk_article_polls,
    fr_article_polls,
    es_article_polls,
    it_article_polls,
    ru_article_polls,
} from '../db/schema/index';
import { authMiddleware, AuthUser } from '../middleware/auth';
import { eq, and } from 'drizzle-orm';
import { logger } from '../config/logger';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';

type Variables = {
    user: AuthUser;
};

const pollsRoute = new Hono<{ Variables: Variables }>();

// Validation schemas
const countrySchema = z.enum(['tr', 'de', 'us', 'uk', 'fr', 'es', 'it', 'ru']);

const voteSchema = z.object({
    optionIndex: z.number().int().min(0),
});

const COUNTRY_POLL_TABLES = {
    tr: tr_article_polls,
    de: de_article_polls,
    us: us_article_polls,
    uk: uk_article_polls,
    fr: fr_article_polls,
    es: es_article_polls,
    it: it_article_polls,
    ru: ru_article_polls,
} as const;

// Safe JSON parse helper
function safeJsonParse<T>(value: unknown, fallback: T): T {
    if (typeof value !== 'string') return value as T;
    try {
        return JSON.parse(value) as T;
    } catch {
        logger.warn({ value }, 'Failed to parse JSON, using fallback');
        return fallback;
    }
}

/**
 * GET /polls/:country/:pollId
 * Get poll details and results
 */
pollsRoute.get('/:country/:pollId', async (c) => {
    try {
        const { country, pollId } = c.req.param();
        const validatedCountry = countrySchema.parse(country) as keyof typeof COUNTRY_POLL_TABLES;

        const table = COUNTRY_POLL_TABLES[validatedCountry];
        const poll = await db
            .select()
            .from(table)
            .where(eq(table.id, pollId))
            .get();

        if (!poll) {
            return c.json({
                success: false,
                error: 'Poll not found',
            }, 404);
        }

        const options = safeJsonParse<string[]>(poll.options, []);
        const results = safeJsonParse<Record<string, number>>(poll.results, {});

        return c.json({
            success: true,
            data: {
                ...poll,
                options,
                results,
            },
        });
    } catch (error) {
        logger.error({ error }, 'Get poll failed');
        return c.json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to get poll',
        }, 500);
    }
});

/**
 * GET /polls/:country/:pollId/results
 * Get poll results only
 */
pollsRoute.get('/:country/:pollId/results', async (c) => {
    try {
        const { country, pollId } = c.req.param();
        const validatedCountry = countrySchema.parse(country) as keyof typeof COUNTRY_POLL_TABLES;

        const table = COUNTRY_POLL_TABLES[validatedCountry];
        const poll = await db
            .select({
                id: table.id,
                question: table.question,
                options: table.options,
                results: table.results,
                totalVotes: table.totalVotes,
            })
            .from(table)
            .where(eq(table.id, pollId))
            .get();

        if (!poll) {
            return c.json({
                success: false,
                error: 'Poll not found',
            }, 404);
        }

        const options = safeJsonParse<string[]>(poll.options, []);
        const results = safeJsonParse<Record<string, number>>(poll.results, {});

        // Calculate percentages
        const percentages = options.map((_: string, index: number) => {
            const votes = results[index.toString()] || 0;
            return poll.totalVotes > 0 ? Math.round((votes / poll.totalVotes) * 100) : 0;
        });

        return c.json({
            success: true,
            data: {
                question: poll.question,
                options,
                results,
                percentages,
                totalVotes: poll.totalVotes,
            },
        });
    } catch (error) {
        logger.error({ error }, 'Get poll results failed');
        return c.json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to get results',
        }, 500);
    }
});

/**
 * POST /polls/:country/:pollId/vote
 * Vote on a poll (requires auth)
 */
pollsRoute.post('/:country/:pollId/vote', authMiddleware, async (c) => {
    try {
        const user = c.get('user') as AuthUser;
        const { country, pollId } = c.req.param();
        const validatedCountry = countrySchema.parse(country) as keyof typeof COUNTRY_POLL_TABLES;

        const body = await c.req.json();
        const { optionIndex } = voteSchema.parse(body);

        const table = COUNTRY_POLL_TABLES[validatedCountry];

        // Check if poll exists
        const poll = await db
            .select()
            .from(table)
            .where(eq(table.id, pollId))
            .get();

        if (!poll) {
            return c.json({
                success: false,
                error: 'Poll not found',
            }, 404);
        }

        // Check if poll has expired
        if (poll.expiresAt && new Date(poll.expiresAt) < new Date()) {
            return c.json({
                success: false,
                error: 'Poll has expired',
            }, 400);
        }

        // Check if option is valid
        const options = safeJsonParse<string[]>(poll.options, []);
        if (optionIndex >= options.length) {
            return c.json({
                success: false,
                error: 'Invalid option index',
            }, 400);
        }

        // Check if user already voted
        const existingVote = await db
            .select()
            .from(pollVotes)
            .where(and(
                eq(pollVotes.pollId, pollId),
                eq(pollVotes.userId, user.uid)
            ))
            .get();

        if (existingVote) {
            return c.json({
                success: false,
                error: 'You have already voted on this poll',
            }, 400);
        }

        // Record vote
        await db.insert(pollVotes).values({
            id: uuidv4(),
            pollId,
            userId: user.uid,
            optionIndex,
            createdAt: new Date(),
        });

        // Update poll results
        const results = safeJsonParse<Record<string, number>>(poll.results, {});
        results[optionIndex.toString()] = (results[optionIndex.toString()] || 0) + 1;

        await db
            .update(table)
            .set({
                results: JSON.stringify(results),
                totalVotes: poll.totalVotes + 1,
            })
            .where(eq(table.id, pollId));

        logger.info({ userId: user.uid, pollId, optionIndex }, 'Poll vote recorded');

        return c.json({
            success: true,
            message: 'Vote recorded',
            data: {
                optionIndex,
                totalVotes: poll.totalVotes + 1,
            },
        });
    } catch (error) {
        logger.error({ error }, 'Vote failed');
        return c.json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to vote',
        }, 400);
    }
});

/**
 * GET /polls/:country/:pollId/my-vote
 * Check if current user has voted (requires auth)
 */
pollsRoute.get('/:country/:pollId/my-vote', authMiddleware, async (c) => {
    try {
        const user = c.get('user') as AuthUser;
        const { pollId } = c.req.param();

        const vote = await db
            .select()
            .from(pollVotes)
            .where(and(
                eq(pollVotes.pollId, pollId),
                eq(pollVotes.userId, user.uid)
            ))
            .get();

        return c.json({
            success: true,
            data: {
                hasVoted: !!vote,
                optionIndex: vote?.optionIndex ?? null,
            },
        });
    } catch (error) {
        return c.json({
            success: false,
            error: 'Failed to check vote status',
        }, 500);
    }
});

export default pollsRoute;
