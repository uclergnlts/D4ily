import { db } from '../config/db.js';
import { sourceAlignmentVotes, userAlignmentReputation, rss_sources } from '../db/schema/index.js';
import { eq, and, sql } from 'drizzle-orm';
import { logger } from '../config/logger.js';
import { v4 as uuidv4 } from 'uuid';

export type VoteType = 'agree' | 'disagree' | 'unsure';

export interface AlignmentVote {
    userId: string;
    sourceId: number;
    voteType: VoteType;
    suggestedScore?: number;  // -5 to +5
    comment?: string;
}

export interface AlignmentFeedback {
    sourceId: number;
    sourceName: string;
    currentScore: number;
    currentLabel: string | null;
    totalVotes: number;
    agreeCount: number;
    disagreeCount: number;
    unsureCount: number;
    agreePercentage: number;
    averageSuggestedScore: number | null;
}

export interface UserReputation {
    userId: string;
    totalVotes: number;
    accurateVotes: number;
    reputationScore: number;
    lastVoteAt: Date | null;
}

/**
 * Submit or update a user's alignment vote for a source
 */
export async function submitAlignmentVote(vote: AlignmentVote): Promise<{ success: boolean; isUpdate: boolean }> {
    try {
        // Check if source exists
        const source = await db
            .select()
            .from(rss_sources)
            .where(eq(rss_sources.id, vote.sourceId))
            .get();

        if (!source) {
            throw new Error('Source not found');
        }

        // Validate suggested score if provided
        if (vote.suggestedScore !== undefined) {
            if (vote.suggestedScore < -5 || vote.suggestedScore > 5) {
                throw new Error('Suggested score must be between -5 and +5');
            }
        }

        // Check for existing vote
        const existingVote = await db
            .select()
            .from(sourceAlignmentVotes)
            .where(and(
                eq(sourceAlignmentVotes.userId, vote.userId),
                eq(sourceAlignmentVotes.sourceId, vote.sourceId)
            ))
            .get();

        if (existingVote) {
            // Update existing vote
            await db
                .update(sourceAlignmentVotes)
                .set({
                    voteType: vote.voteType,
                    suggestedScore: vote.suggestedScore ?? null,
                    comment: vote.comment ?? null,
                    updatedAt: new Date(),
                })
                .where(eq(sourceAlignmentVotes.id, existingVote.id));

            logger.info({
                userId: vote.userId,
                sourceId: vote.sourceId,
                voteType: vote.voteType,
            }, 'Alignment vote updated');

            return { success: true, isUpdate: true };
        }

        // Create new vote
        await db.insert(sourceAlignmentVotes).values({
            id: uuidv4(),
            userId: vote.userId,
            sourceId: vote.sourceId,
            voteType: vote.voteType,
            suggestedScore: vote.suggestedScore ?? null,
            comment: vote.comment ?? null,
            createdAt: new Date(),
            updatedAt: new Date(),
        });

        // Update user reputation record (increment total votes)
        await updateUserReputationOnVote(vote.userId);

        logger.info({
            userId: vote.userId,
            sourceId: vote.sourceId,
            voteType: vote.voteType,
        }, 'Alignment vote created');

        return { success: true, isUpdate: false };
    } catch (error) {
        logger.error({ error, vote }, 'Failed to submit alignment vote');
        throw error;
    }
}

/**
 * Get alignment feedback summary for a source
 */
export async function getAlignmentFeedback(sourceId: number): Promise<AlignmentFeedback | null> {
    try {
        // Get source info
        const source = await db
            .select()
            .from(rss_sources)
            .where(eq(rss_sources.id, sourceId))
            .get();

        if (!source) {
            return null;
        }

        // Get all votes for this source
        const votes = await db
            .select()
            .from(sourceAlignmentVotes)
            .where(eq(sourceAlignmentVotes.sourceId, sourceId));

        const totalVotes = votes.length;
        const agreeCount = votes.filter(v => v.voteType === 'agree').length;
        const disagreeCount = votes.filter(v => v.voteType === 'disagree').length;
        const unsureCount = votes.filter(v => v.voteType === 'unsure').length;

        // Calculate average suggested score (from disagree votes only)
        const disagreeVotesWithSuggestion = votes.filter(
            v => v.voteType === 'disagree' && v.suggestedScore !== null
        );

        let averageSuggestedScore: number | null = null;
        if (disagreeVotesWithSuggestion.length > 0) {
            const sum = disagreeVotesWithSuggestion.reduce(
                (acc, v) => acc + (v.suggestedScore || 0), 0
            );
            averageSuggestedScore = Math.round((sum / disagreeVotesWithSuggestion.length) * 10) / 10;
        }

        return {
            sourceId: source.id,
            sourceName: source.sourceName,
            currentScore: source.govAlignmentScore,
            currentLabel: source.govAlignmentLabel,
            totalVotes,
            agreeCount,
            disagreeCount,
            unsureCount,
            agreePercentage: totalVotes > 0 ? Math.round((agreeCount / totalVotes) * 100) : 0,
            averageSuggestedScore,
        };
    } catch (error) {
        logger.error({ error, sourceId }, 'Failed to get alignment feedback');
        throw error;
    }
}

/**
 * Get user's alignment reputation
 */
export async function getUserReputation(userId: string): Promise<UserReputation> {
    try {
        let reputation = await db
            .select()
            .from(userAlignmentReputation)
            .where(eq(userAlignmentReputation.userId, userId))
            .get();

        if (!reputation) {
            // Create default reputation record
            await db.insert(userAlignmentReputation).values({
                userId,
                totalVotes: 0,
                accurateVotes: 0,
                reputationScore: 0.5,
                updatedAt: new Date(),
            });

            reputation = {
                userId,
                totalVotes: 0,
                accurateVotes: 0,
                reputationScore: 0.5,
                lastVoteAt: null,
                updatedAt: new Date(),
            };
        }

        return {
            userId: reputation.userId,
            totalVotes: reputation.totalVotes,
            accurateVotes: reputation.accurateVotes,
            reputationScore: reputation.reputationScore,
            lastVoteAt: reputation.lastVoteAt,
        };
    } catch (error) {
        logger.error({ error, userId }, 'Failed to get user reputation');
        throw error;
    }
}

/**
 * Update user reputation when they submit a vote
 */
async function updateUserReputationOnVote(userId: string): Promise<void> {
    try {
        const existing = await db
            .select()
            .from(userAlignmentReputation)
            .where(eq(userAlignmentReputation.userId, userId))
            .get();

        if (existing) {
            await db
                .update(userAlignmentReputation)
                .set({
                    totalVotes: existing.totalVotes + 1,
                    lastVoteAt: new Date(),
                    updatedAt: new Date(),
                })
                .where(eq(userAlignmentReputation.userId, userId));
        } else {
            await db.insert(userAlignmentReputation).values({
                userId,
                totalVotes: 1,
                accurateVotes: 0,
                reputationScore: 0.5,
                lastVoteAt: new Date(),
                updatedAt: new Date(),
            });
        }
    } catch (error) {
        logger.error({ error, userId }, 'Failed to update user reputation on vote');
    }
}

/**
 * Update reputation scores when admin confirms an alignment change
 * Call this when an admin updates a source's alignment
 */
export async function updateReputationOnAlignmentChange(
    sourceId: number,
    newScore: number
): Promise<void> {
    try {
        // Get all votes for this source
        const votes = await db
            .select()
            .from(sourceAlignmentVotes)
            .where(eq(sourceAlignmentVotes.sourceId, sourceId));

        for (const vote of votes) {
            // Determine if the vote was "accurate"
            // - Agree votes are accurate if the score didn't change significantly
            // - Disagree votes with suggested score are accurate if the new score is close
            let isAccurate = false;

            if (vote.voteType === 'agree') {
                // Consider accurate if new score is within ±1 of old
                // (This rewards users who agreed with a stable assessment)
                isAccurate = true;  // Simplified: agree is always somewhat accurate
            } else if (vote.voteType === 'disagree' && vote.suggestedScore !== null) {
                // Consider accurate if suggested score is within ±2 of the new score
                isAccurate = Math.abs(vote.suggestedScore - newScore) <= 2;
            }

            if (isAccurate) {
                // Update user's accurate vote count
                const userRep = await db
                    .select()
                    .from(userAlignmentReputation)
                    .where(eq(userAlignmentReputation.userId, vote.userId))
                    .get();

                if (userRep) {
                    const newAccurate = userRep.accurateVotes + 1;
                    const newRepScore = userRep.totalVotes > 0
                        ? newAccurate / userRep.totalVotes
                        : 0.5;

                    await db
                        .update(userAlignmentReputation)
                        .set({
                            accurateVotes: newAccurate,
                            reputationScore: Math.min(1, newRepScore),
                            updatedAt: new Date(),
                        })
                        .where(eq(userAlignmentReputation.userId, vote.userId));
                }
            }
        }

        logger.info({
            sourceId,
            newScore,
            votesProcessed: votes.length,
        }, 'User reputations updated after alignment change');
    } catch (error) {
        logger.error({ error, sourceId }, 'Failed to update reputations on alignment change');
    }
}

/**
 * Get user's vote for a specific source
 */
export async function getUserVoteForSource(
    userId: string,
    sourceId: number
): Promise<{ voteType: VoteType; suggestedScore: number | null } | null> {
    try {
        const vote = await db
            .select()
            .from(sourceAlignmentVotes)
            .where(and(
                eq(sourceAlignmentVotes.userId, userId),
                eq(sourceAlignmentVotes.sourceId, sourceId)
            ))
            .get();

        if (!vote) return null;

        return {
            voteType: vote.voteType as VoteType,
            suggestedScore: vote.suggestedScore,
        };
    } catch (error) {
        logger.error({ error, userId, sourceId }, 'Failed to get user vote for source');
        return null;
    }
}
