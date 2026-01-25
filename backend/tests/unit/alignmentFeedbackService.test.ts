import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Logger
vi.mock('@/config/logger.js', () => ({
    logger: {
        info: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
        debug: vi.fn(),
    },
}));

// Mock uuid
vi.mock('uuid', () => ({
    v4: vi.fn(() => 'mock-uuid-123'),
}));

// Mock Database
const mockSource = {
    id: 1,
    sourceName: 'Test Source',
    govAlignmentScore: 2,
    govAlignmentLabel: 'Iktidara Egilimli',
    govAlignmentConfidence: 0.75,
};

const mockVotes = [
    { id: 'vote-1', userId: 'user-1', sourceId: 1, voteType: 'agree', suggestedScore: null, comment: null },
    { id: 'vote-2', userId: 'user-2', sourceId: 1, voteType: 'disagree', suggestedScore: -2, comment: 'Bence daha muhalif' },
    { id: 'vote-3', userId: 'user-3', sourceId: 1, voteType: 'unsure', suggestedScore: null, comment: null },
];

const mockUserReputation = {
    userId: 'user-1',
    totalVotes: 10,
    accurateVotes: 7,
    reputationScore: 0.7,
    lastVoteAt: new Date('2026-01-20T10:00:00Z'),
    updatedAt: new Date('2026-01-20T10:00:00Z'),
};

let mockDbState = {
    sources: [mockSource],
    votes: [...mockVotes],
    reputations: [mockUserReputation],
};

vi.mock('@/config/db.js', () => {
    const mockQueryBuilder = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        get: vi.fn().mockImplementation(() => {
            // Return based on context
            return mockDbState.sources[0];
        }),
        then: function (resolve: any) {
            resolve(mockDbState.votes);
        },
        values: vi.fn().mockReturnThis(),
        returning: vi.fn().mockReturnThis(),
        set: vi.fn().mockReturnThis(),
    };

    return {
        db: {
            select: vi.fn().mockReturnValue(mockQueryBuilder),
            insert: vi.fn().mockReturnValue({
                values: vi.fn().mockResolvedValue(undefined),
            }),
            update: vi.fn().mockReturnValue({
                set: vi.fn().mockReturnValue({
                    where: vi.fn().mockResolvedValue(undefined),
                }),
            }),
        },
    };
});

import {
    submitAlignmentVote,
    getAlignmentFeedback,
    getUserReputation,
    updateReputationOnAlignmentChange,
    getUserVoteForSource,
} from '@/services/alignmentFeedbackService.js';
import { db } from '@/config/db.js';

describe('Alignment Feedback Service', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Reset mock state
        mockDbState = {
            sources: [mockSource],
            votes: [...mockVotes],
            reputations: [mockUserReputation],
        };
    });

    describe('submitAlignmentVote', () => {
        it('should create a new vote successfully', async () => {
            // Mock: source exists, no existing vote
            vi.mocked(db.select).mockReturnValue({
                from: vi.fn().mockReturnValue({
                    where: vi.fn().mockReturnValue({
                        get: vi.fn()
                            .mockResolvedValueOnce(mockSource)  // Source lookup
                            .mockResolvedValueOnce(null),       // No existing vote
                    }),
                }),
            } as any);

            const result = await submitAlignmentVote({
                userId: 'user-new',
                sourceId: 1,
                voteType: 'agree',
            });

            expect(result.success).toBe(true);
            expect(result.isUpdate).toBe(false);
            expect(db.insert).toHaveBeenCalled();
        });

        it('should update an existing vote', async () => {
            const existingVote = { id: 'existing-vote', userId: 'user-1', sourceId: 1 };

            vi.mocked(db.select).mockReturnValue({
                from: vi.fn().mockReturnValue({
                    where: vi.fn().mockReturnValue({
                        get: vi.fn()
                            .mockResolvedValueOnce(mockSource)    // Source lookup
                            .mockResolvedValueOnce(existingVote), // Existing vote
                    }),
                }),
            } as any);

            const result = await submitAlignmentVote({
                userId: 'user-1',
                sourceId: 1,
                voteType: 'disagree',
                suggestedScore: -3,
            });

            expect(result.success).toBe(true);
            expect(result.isUpdate).toBe(true);
            expect(db.update).toHaveBeenCalled();
        });

        it('should throw error if source not found', async () => {
            vi.mocked(db.select).mockReturnValue({
                from: vi.fn().mockReturnValue({
                    where: vi.fn().mockReturnValue({
                        get: vi.fn().mockResolvedValue(null),  // Source not found
                    }),
                }),
            } as any);

            await expect(submitAlignmentVote({
                userId: 'user-1',
                sourceId: 999,
                voteType: 'agree',
            })).rejects.toThrow('Source not found');
        });

        it('should throw error for invalid suggested score', async () => {
            vi.mocked(db.select).mockReturnValue({
                from: vi.fn().mockReturnValue({
                    where: vi.fn().mockReturnValue({
                        get: vi.fn().mockResolvedValue(mockSource),
                    }),
                }),
            } as any);

            await expect(submitAlignmentVote({
                userId: 'user-1',
                sourceId: 1,
                voteType: 'disagree',
                suggestedScore: 10,  // Invalid: > 5
            })).rejects.toThrow('Suggested score must be between -5 and +5');

            await expect(submitAlignmentVote({
                userId: 'user-1',
                sourceId: 1,
                voteType: 'disagree',
                suggestedScore: -10,  // Invalid: < -5
            })).rejects.toThrow('Suggested score must be between -5 and +5');
        });

        it('should accept optional comment with vote', async () => {
            vi.mocked(db.select).mockReturnValue({
                from: vi.fn().mockReturnValue({
                    where: vi.fn().mockReturnValue({
                        get: vi.fn()
                            .mockResolvedValueOnce(mockSource)
                            .mockResolvedValueOnce(null),
                    }),
                }),
            } as any);

            const result = await submitAlignmentVote({
                userId: 'user-new',
                sourceId: 1,
                voteType: 'disagree',
                suggestedScore: -2,
                comment: 'Bu kaynak daha muhalif gorunuyor',
            });

            expect(result.success).toBe(true);
        });
    });

    describe('getAlignmentFeedback', () => {
        it('should return feedback summary for a source', async () => {
            vi.mocked(db.select).mockReturnValue({
                from: vi.fn().mockReturnValue({
                    where: vi.fn().mockReturnValue({
                        get: vi.fn().mockResolvedValue(mockSource),
                        then: function (resolve: any) {
                            resolve(mockVotes);
                        },
                    }),
                }),
            } as any);

            const feedback = await getAlignmentFeedback(1);

            expect(feedback).not.toBeNull();
            expect(feedback?.sourceId).toBe(1);
            expect(feedback?.sourceName).toBe('Test Source');
            expect(feedback?.currentScore).toBe(2);
            expect(feedback?.totalVotes).toBe(3);
            expect(feedback?.agreeCount).toBe(1);
            expect(feedback?.disagreeCount).toBe(1);
            expect(feedback?.unsureCount).toBe(1);
            expect(feedback?.agreePercentage).toBe(33);  // 1/3 = 33%
        });

        it('should return null if source not found', async () => {
            vi.mocked(db.select).mockReturnValue({
                from: vi.fn().mockReturnValue({
                    where: vi.fn().mockReturnValue({
                        get: vi.fn().mockResolvedValue(null),
                    }),
                }),
            } as any);

            const feedback = await getAlignmentFeedback(999);
            expect(feedback).toBeNull();
        });

        it('should calculate average suggested score from disagree votes', async () => {
            const votesWithSuggestions = [
                { voteType: 'disagree', suggestedScore: -2 },
                { voteType: 'disagree', suggestedScore: -4 },
                { voteType: 'agree', suggestedScore: null },
            ];

            vi.mocked(db.select).mockReturnValue({
                from: vi.fn().mockReturnValue({
                    where: vi.fn().mockReturnValue({
                        get: vi.fn().mockResolvedValue(mockSource),
                        then: function (resolve: any) {
                            resolve(votesWithSuggestions);
                        },
                    }),
                }),
            } as any);

            const feedback = await getAlignmentFeedback(1);

            expect(feedback?.averageSuggestedScore).toBe(-3);  // (-2 + -4) / 2
        });

        it('should return null average if no disagree votes with suggestions', async () => {
            const votesWithoutSuggestions = [
                { voteType: 'agree', suggestedScore: null },
                { voteType: 'unsure', suggestedScore: null },
            ];

            vi.mocked(db.select).mockReturnValue({
                from: vi.fn().mockReturnValue({
                    where: vi.fn().mockReturnValue({
                        get: vi.fn().mockResolvedValue(mockSource),
                        then: function (resolve: any) {
                            resolve(votesWithoutSuggestions);
                        },
                    }),
                }),
            } as any);

            const feedback = await getAlignmentFeedback(1);

            expect(feedback?.averageSuggestedScore).toBeNull();
        });
    });

    describe('getUserReputation', () => {
        it('should return existing user reputation', async () => {
            vi.mocked(db.select).mockReturnValue({
                from: vi.fn().mockReturnValue({
                    where: vi.fn().mockReturnValue({
                        get: vi.fn().mockResolvedValue(mockUserReputation),
                    }),
                }),
            } as any);

            const reputation = await getUserReputation('user-1');

            expect(reputation.userId).toBe('user-1');
            expect(reputation.totalVotes).toBe(10);
            expect(reputation.accurateVotes).toBe(7);
            expect(reputation.reputationScore).toBe(0.7);
        });

        it('should create default reputation for new user', async () => {
            vi.mocked(db.select).mockReturnValue({
                from: vi.fn().mockReturnValue({
                    where: vi.fn().mockReturnValue({
                        get: vi.fn().mockResolvedValue(null),
                    }),
                }),
            } as any);

            const reputation = await getUserReputation('new-user');

            expect(reputation.userId).toBe('new-user');
            expect(reputation.totalVotes).toBe(0);
            expect(reputation.accurateVotes).toBe(0);
            expect(reputation.reputationScore).toBe(0.5);
            expect(db.insert).toHaveBeenCalled();
        });
    });

    describe('getUserVoteForSource', () => {
        it('should return user vote if exists', async () => {
            const userVote = { voteType: 'agree', suggestedScore: null };

            vi.mocked(db.select).mockReturnValue({
                from: vi.fn().mockReturnValue({
                    where: vi.fn().mockReturnValue({
                        get: vi.fn().mockResolvedValue(userVote),
                    }),
                }),
            } as any);

            const vote = await getUserVoteForSource('user-1', 1);

            expect(vote?.voteType).toBe('agree');
            expect(vote?.suggestedScore).toBeNull();
        });

        it('should return null if user has not voted', async () => {
            vi.mocked(db.select).mockReturnValue({
                from: vi.fn().mockReturnValue({
                    where: vi.fn().mockReturnValue({
                        get: vi.fn().mockResolvedValue(null),
                    }),
                }),
            } as any);

            const vote = await getUserVoteForSource('user-new', 1);

            expect(vote).toBeNull();
        });
    });

    describe('updateReputationOnAlignmentChange', () => {
        it('should update reputations when alignment changes', async () => {
            const votesForSource = [
                { userId: 'user-1', voteType: 'agree', suggestedScore: null },
                { userId: 'user-2', voteType: 'disagree', suggestedScore: 3 },  // Close to new score (2)
            ];

            vi.mocked(db.select).mockReturnValue({
                from: vi.fn().mockReturnValue({
                    where: vi.fn().mockReturnValue({
                        get: vi.fn().mockResolvedValue(mockUserReputation),
                        then: function (resolve: any) {
                            resolve(votesForSource);
                        },
                    }),
                }),
            } as any);

            // Should not throw
            await expect(updateReputationOnAlignmentChange(1, 2)).resolves.not.toThrow();

            // Update should have been called for accurate voters
            expect(db.update).toHaveBeenCalled();
        });

        it('should handle empty votes list', async () => {
            vi.mocked(db.select).mockReturnValue({
                from: vi.fn().mockReturnValue({
                    where: vi.fn().mockReturnValue({
                        then: function (resolve: any) {
                            resolve([]);
                        },
                    }),
                }),
            } as any);

            // Should not throw with empty votes
            await expect(updateReputationOnAlignmentChange(1, 2)).resolves.not.toThrow();
        });
    });
});
