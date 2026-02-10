import { Hono } from 'hono';
import { db } from '../config/db.js';
import { rss_sources, sourceBiasVotes, sourceAlignmentHistory, userFollowedSources, sourceVotes } from '../db/schema/index.js';
import { eq, and, desc } from 'drizzle-orm';
import { handleError } from '../utils/errors.js';
import { countrySchema, biasScoreSchema } from '../utils/schemas.js';
import type { ApiResponse, RSSSource, SourceStance } from '../types/index.js';
import { z } from 'zod';
import { authMiddleware, adminMiddleware, AuthUser } from '../middleware/auth.js';
import { logger } from '../config/logger.js';
import { v4 as uuidv4 } from 'uuid';
import { getAlignmentLabel, isValidAlignmentScore, isValidConfidence } from '../utils/alignment.js';
import {
    submitAlignmentVote,
    getAlignmentFeedback,
    getUserVoteForSource,
    updateReputationOnAlignmentChange,
} from '../services/alignmentFeedbackService.js';
import { queueAlignmentChangeNotifications } from '../services/alignmentNotificationService.js';
import { voteRateLimiter } from '../middleware/rateLimiter.js';

type Variables = {
    user: AuthUser;
};

const app = new Hono<{ Variables: Variables }>();

// Schemas
const rateBiasSchema = z.object({
    score: z.number().int().min(1).max(10),
});

const alignmentVoteSchema = z.object({
    voteType: z.enum(['agree', 'disagree', 'unsure']),
    suggestedScore: z.number().int().min(-5).max(5).optional(),
    comment: z.string().max(500).optional(),
});

// GET /sources - Get all sources (optionally filter by country)
app.get('/', async (c) => {
    try {
        const countryParam = c.req.query('country');

        // Validate country if provided
        if (countryParam) {
            const validation = countrySchema.safeParse(countryParam);
            if (!validation.success) {
                return c.json({
                    success: false,
                    error: 'Invalid country code',
                }, 400);
            }
        }

        let sources: RSSSource[];
        if (countryParam) {
            sources = await db
                .select()
                .from(rss_sources)
                .where(eq(rss_sources.countryCode, countryParam));
        } else {
            sources = await db.select().from(rss_sources);
        }

        // Group by country
        const groupedByCountry = sources.reduce((acc, source) => {
            if (!acc[source.countryCode]) {
                acc[source.countryCode] = [];
            }
            acc[source.countryCode].push(source);
            return acc;
        }, {} as Record<string, RSSSource[]>);

        const response: ApiResponse<RSSSource[] | Record<string, RSSSource[]>> = {
            success: true,
            data: countryParam ? sources : groupedByCountry,
        };

        return c.json(response);
    } catch (error) {
        return handleError(c, error, 'Failed to fetch sources');
    }
});

// GET /sources/:sourceId/bias - Get source bias statistics
app.get('/:sourceId/bias', async (c) => {
    try {
        const sourceId = parseInt(c.req.param('sourceId'), 10);

        if (isNaN(sourceId)) {
            return c.json({
                success: false,
                error: 'Invalid source ID',
            }, 400);
        }

        const source = await db
            .select()
            .from(rss_sources)
            .where(eq(rss_sources.id, sourceId))
            .get();

        if (!source) {
            return c.json({
                success: false,
                error: 'Source not found',
            }, 404);
        }

        return c.json({
            success: true,
            data: {
                sourceId: source.id,
                sourceName: source.sourceName,
                biasScoreSystem: source.biasScoreSystem,
                biasScoreUser: source.biasScoreUser,
                biasVoteCount: source.biasVoteCount,
            },
        });
    } catch (error) {
        return handleError(c, error, 'Failed to fetch bias');
    }
});

// GET /sources/:sourceId/stance - Get source editorial stance
app.get('/:sourceId/stance', async (c) => {
    try {
        const sourceId = parseInt(c.req.param('sourceId'), 10);

        if (isNaN(sourceId)) {
            return c.json({
                success: false,
                error: 'Invalid source ID',
            }, 400);
        }

        const source = await db
            .select()
            .from(rss_sources)
            .where(eq(rss_sources.id, sourceId))
            .get();

        if (!source) {
            return c.json({
                success: false,
                error: 'Source not found',
            }, 404);
        }

        const confidence = source.govAlignmentConfidence ?? 0.7;
        const label = getAlignmentLabel(source.govAlignmentScore, confidence);

        const stanceData: SourceStance = {
            sourceId: source.id,
            sourceName: source.sourceName,
            govAlignmentScore: source.govAlignmentScore,
            govAlignmentLabel: label,
            confidence: confidence,
            notes: source.govAlignmentNotes,
            lastUpdated: source.govAlignmentLastUpdated
                ? source.govAlignmentLastUpdated.toISOString()
                : null,
        };

        return c.json({
            success: true,
            data: stanceData,
        });
    } catch (error) {
        return handleError(c, error, 'Failed to fetch source stance');
    }
});

// PUT /sources/:sourceId/stance - Update source editorial stance (admin only)
app.put('/:sourceId/stance', adminMiddleware, async (c) => {
    try {
        const user = c.get('user') as AuthUser;
        const sourceId = parseInt(c.req.param('sourceId'), 10);

        if (isNaN(sourceId)) {
            return c.json({
                success: false,
                error: 'Invalid source ID',
            }, 400);
        }

        const body = await c.req.json();
        const { score, confidence, notes, reason } = body;

        // Validate score
        if (score !== undefined && !isValidAlignmentScore(score)) {
            return c.json({
                success: false,
                error: 'Invalid alignment score. Must be an integer between -5 and +5.',
            }, 400);
        }

        // Validate confidence
        if (confidence !== undefined && !isValidConfidence(confidence)) {
            return c.json({
                success: false,
                error: 'Invalid confidence. Must be between 0 and 1.',
            }, 400);
        }

        // Check if source exists
        const source = await db
            .select()
            .from(rss_sources)
            .where(eq(rss_sources.id, sourceId))
            .get();

        if (!source) {
            return c.json({
                success: false,
                error: 'Source not found',
            }, 404);
        }

        const newScore = score ?? source.govAlignmentScore;
        const newConfidence = confidence ?? source.govAlignmentConfidence ?? 0.7;
        const newLabel = getAlignmentLabel(newScore, newConfidence);
        const oldLabel = source.govAlignmentLabel;

        // Create history record
        await db.insert(sourceAlignmentHistory).values({
            id: uuidv4(),
            sourceId,
            oldScore: source.govAlignmentScore,
            newScore: newScore,
            oldLabel: oldLabel,
            newLabel: newLabel,
            reason: reason || 'Admin update',
            updatedBy: 'admin',
            updatedAt: new Date(),
        });

        // Update source
        await db
            .update(rss_sources)
            .set({
                govAlignmentScore: newScore,
                govAlignmentLabel: newLabel,
                govAlignmentConfidence: newConfidence,
                govAlignmentNotes: notes ?? source.govAlignmentNotes,
                govAlignmentLastUpdated: new Date(),
            })
            .where(eq(rss_sources.id, sourceId));

        logger.info({
            adminId: user.uid,
            sourceId,
            oldScore: source.govAlignmentScore,
            newScore,
            newLabel,
        }, 'Source stance updated by admin');

        // Queue notifications for followers if score changed significantly
        if (source.govAlignmentScore !== newScore) {
            try {
                await queueAlignmentChangeNotifications({
                    sourceId,
                    sourceName: source.sourceName,
                    oldScore: source.govAlignmentScore,
                    newScore,
                    oldLabel: oldLabel,
                    newLabel: newLabel,
                    reason: reason || 'Admin update',
                });

                // Update user reputations based on their votes
                await updateReputationOnAlignmentChange(sourceId, newScore);
            } catch (notifError) {
                logger.error({ notifError }, 'Failed to queue alignment notifications');
                // Don't fail the main request
            }
        }

        const stanceData: SourceStance = {
            sourceId: source.id,
            sourceName: source.sourceName,
            govAlignmentScore: newScore,
            govAlignmentLabel: newLabel,
            confidence: newConfidence,
            notes: notes ?? source.govAlignmentNotes,
            lastUpdated: new Date().toISOString(),
        };

        return c.json({
            success: true,
            message: 'Source stance updated',
            data: stanceData,
        });
    } catch (error) {
        logger.error({ error }, 'Update stance failed');
        return c.json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to update stance',
        }, 400);
    }
});

// POST /sources/:sourceId/vote - Vote on source alignment
app.post('/:sourceId/vote', voteRateLimiter, authMiddleware, async (c) => {
    try {
        const user = c.get('user') as AuthUser;
        const sourceId = parseInt(c.req.param('sourceId'), 10);
        const { score } = await c.req.json();

        if (isNaN(sourceId)) {
            return c.json({ success: false, error: 'Invalid source ID' }, 400);
        }

        if (score === undefined || !isValidAlignmentScore(score)) {
            return c.json({
                success: false,
                error: 'Invalid score. Must be between -5 and +5',
            }, 400);
        }

        // Check if source exists
        const source = await db
            .select()
            .from(rss_sources)
            .where(eq(rss_sources.id, sourceId))
            .get();

        if (!source) {
            return c.json({ success: false, error: 'Source not found' }, 404);
        }

        // Check if user already voted
        const existingVote = await db
            .select()
            .from(sourceVotes)
            .where(and(
                eq(sourceVotes.userId, user.uid),
                eq(sourceVotes.sourceId, sourceId)
            ))
            .get();

        if (existingVote) {
            // Update existing vote
            await db
                .update(sourceVotes)
                .set({
                    score,
                    updatedAt: new Date(),
                })
                .where(eq(sourceVotes.id, existingVote.id));
        } else {
            // Create new vote
            await db.insert(sourceVotes).values({
                id: uuidv4(),
                userId: user.uid,
                sourceId,
                score,
                createdAt: new Date(),
                updatedAt: new Date(),
            });
        }

        // Recalculate average user score
        const allVotes = await db
            .select({ score: sourceVotes.score })
            .from(sourceVotes)
            .where(eq(sourceVotes.sourceId, sourceId));

        const totalScore = allVotes.reduce((sum, vote) => sum + vote.score, 0);
        const avgScore = totalScore / allVotes.length;
        const voteCount = allVotes.length;

        // Update source stats
        await db
            .update(rss_sources)
            .set({
                biasScoreUser: avgScore,
                biasVoteCount: voteCount,
            })
            .where(eq(rss_sources.id, sourceId));

        logger.info({ userId: user.uid, sourceId, score, newAvg: avgScore }, 'User voted on source alignment');

        return c.json({
            success: true,
            data: {
                voteCount,
                biasScoreUser: avgScore,
                yourVote: score,
            },
        });
    } catch (error) {
        return handleError(c, error, 'Failed to submit vote');
    }
});

// GET /sources/:sourceId/stance/history - Get stance change history
app.get('/:sourceId/stance/history', async (c) => {
    try {
        const sourceId = parseInt(c.req.param('sourceId'), 10);

        if (isNaN(sourceId)) {
            return c.json({
                success: false,
                error: 'Invalid source ID',
            }, 400);
        }

        // Check if source exists
        const source = await db
            .select()
            .from(rss_sources)
            .where(eq(rss_sources.id, sourceId))
            .get();

        if (!source) {
            return c.json({
                success: false,
                error: 'Source not found',
            }, 404);
        }

        const history = await db
            .select()
            .from(sourceAlignmentHistory)
            .where(eq(sourceAlignmentHistory.sourceId, sourceId))
            .orderBy(desc(sourceAlignmentHistory.updatedAt))
            .limit(50);

        return c.json({
            success: true,
            data: {
                sourceId,
                sourceName: source.sourceName,
                history: history.map(h => ({
                    id: h.id,
                    oldScore: h.oldScore,
                    newScore: h.newScore,
                    oldLabel: h.oldLabel,
                    newLabel: h.newLabel,
                    reason: h.reason,
                    updatedBy: h.updatedBy,
                    updatedAt: h.updatedAt?.toISOString(),
                })),
            },
        });
    } catch (error) {
        return handleError(c, error, 'Failed to fetch stance history');
    }
});

// POST /sources/:sourceId/rate-bias - Rate source bias (requires auth)
app.post('/:sourceId/rate-bias', authMiddleware, async (c) => {
    try {
        const user = c.get('user') as AuthUser;
        const sourceId = parseInt(c.req.param('sourceId'), 10);

        if (isNaN(sourceId)) {
            return c.json({
                success: false,
                error: 'Invalid source ID',
            }, 400);
        }

        const body = await c.req.json();
        const { score } = rateBiasSchema.parse(body);

        // Check if source exists
        const source = await db
            .select()
            .from(rss_sources)
            .where(eq(rss_sources.id, sourceId))
            .get();

        if (!source) {
            return c.json({
                success: false,
                error: 'Source not found',
            }, 404);
        }

        // Check if user already voted
        const existingVote = await db
            .select()
            .from(sourceBiasVotes)
            .where(and(
                eq(sourceBiasVotes.userId, user.uid),
                eq(sourceBiasVotes.sourceId, sourceId)
            ))
            .get();

        if (existingVote) {
            // Update existing vote
            await db
                .update(sourceBiasVotes)
                .set({
                    score,
                    updatedAt: new Date(),
                })
                .where(eq(sourceBiasVotes.id, existingVote.id));

            // Recalculate average bias score
            const allVotes = await db
                .select()
                .from(sourceBiasVotes)
                .where(eq(sourceBiasVotes.sourceId, sourceId));

            const avgScore = allVotes.reduce((sum, v) => sum + v.score, 0) / allVotes.length;

            await db
                .update(rss_sources)
                .set({ biasScoreUser: avgScore })
                .where(eq(rss_sources.id, sourceId));

            logger.info({ userId: user.uid, sourceId, score }, 'Bias vote updated');

            return c.json({
                success: true,
                message: 'Bias rating updated',
                data: { score, newAverage: avgScore },
            });
        }

        // Create new vote
        await db.insert(sourceBiasVotes).values({
            id: uuidv4(),
            userId: user.uid,
            sourceId,
            score,
            createdAt: new Date(),
            updatedAt: new Date(),
        });

        // Calculate new average
        const newVoteCount = source.biasVoteCount + 1;
        const currentTotal = (source.biasScoreUser || 0) * source.biasVoteCount;
        const newAverage = (currentTotal + score) / newVoteCount;

        await db
            .update(rss_sources)
            .set({
                biasScoreUser: newAverage,
                biasVoteCount: newVoteCount,
            })
            .where(eq(rss_sources.id, sourceId));

        logger.info({ userId: user.uid, sourceId, score }, 'Bias vote added');

        return c.json({
            success: true,
            message: 'Bias rating added',
            data: { score, newAverage, totalVotes: newVoteCount },
        }, 201);
    } catch (error) {
        logger.error({ error }, 'Rate bias failed');
        return c.json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to rate bias',
        }, 400);
    }
});

// POST /sources/:sourceId/alignment-vote - Vote on source alignment (requires auth)
app.post('/:sourceId/alignment-vote', voteRateLimiter, authMiddleware, async (c) => {
    try {
        const user = c.get('user') as AuthUser;
        const sourceId = parseInt(c.req.param('sourceId'), 10);

        if (isNaN(sourceId)) {
            return c.json({
                success: false,
                error: 'Invalid source ID',
            }, 400);
        }

        const body = await c.req.json();
        const validation = alignmentVoteSchema.safeParse(body);

        if (!validation.success) {
            return c.json({
                success: false,
                error: 'Invalid vote data',
                details: validation.error.errors,
            }, 400);
        }

        const { voteType, suggestedScore, comment } = validation.data;

        const result = await submitAlignmentVote({
            userId: user.uid,
            sourceId,
            voteType,
            suggestedScore,
            comment,
        });

        return c.json({
            success: true,
            message: result.isUpdate ? 'Vote updated' : 'Vote submitted',
            data: { voteType, suggestedScore },
        }, result.isUpdate ? 200 : 201);
    } catch (error) {
        if (error instanceof Error && error.message === 'Source not found') {
            return c.json({
                success: false,
                error: 'Source not found',
            }, 404);
        }
        logger.error({ error }, 'Alignment vote failed');
        return c.json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to submit vote',
        }, 400);
    }
});

// GET /sources/:sourceId/alignment-feedback - Get alignment feedback summary
app.get('/:sourceId/alignment-feedback', async (c) => {
    try {
        const sourceId = parseInt(c.req.param('sourceId'), 10);

        if (isNaN(sourceId)) {
            return c.json({
                success: false,
                error: 'Invalid source ID',
            }, 400);
        }

        const feedback = await getAlignmentFeedback(sourceId);

        if (!feedback) {
            return c.json({
                success: false,
                error: 'Source not found',
            }, 404);
        }

        return c.json({
            success: true,
            data: feedback,
        });
    } catch (error) {
        return handleError(c, error, 'Failed to fetch alignment feedback');
    }
});

// GET /sources/:country - Get sources by country
app.get('/:country', async (c) => {
    try {
        const countryParam = c.req.param('country');

        // Check if it's a source ID (number) or country code
        if (/^\d+$/.test(countryParam)) {
            // It's a source ID - get single source
            const sourceId = parseInt(countryParam, 10);
            const source = await db
                .select()
                .from(rss_sources)
                .where(eq(rss_sources.id, sourceId))
                .get();

            if (!source) {
                return c.json({
                    success: false,
                    error: 'Source not found',
                }, 404);
            }

            return c.json({
                success: true,
                data: source,
            });
        }

        // Validate country
        const validation = countrySchema.safeParse(countryParam);
        if (!validation.success) {
            return c.json({
                success: false,
                error: 'Invalid country code',
            }, 400);
        }

        const sources = await db
            .select()
            .from(rss_sources)
            .where(eq(rss_sources.countryCode, countryParam));

        const response: ApiResponse<RSSSource[]> = {
            success: true,
            data: sources,
        };

        return c.json(response);
    } catch (error) {
        return handleError(c, error, 'Failed to fetch sources');
    }
});

export default app;
