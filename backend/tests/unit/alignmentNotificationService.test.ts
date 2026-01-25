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

// Mock alignment utility
vi.mock('@/utils/alignment.js', () => ({
    getAlignmentLabel: vi.fn((score) => {
        if (score >= 3) return 'Iktidara Yakin';
        if (score >= 1) return 'Iktidara Egilimli';
        if (score <= -3) return 'Muhalefete Yakin';
        if (score <= -1) return 'Muhalefete Egilimli';
        return 'Notr/Bagimsiz';
    }),
}));

// Mock database state
const mockFollowers = [
    { userId: 'user-1' },
    { userId: 'user-2' },
    { userId: 'user-3' },
];

const mockPreferences = [
    { userId: 'user-1', notifAlignmentChanges: true },
    { userId: 'user-2', notifAlignmentChanges: false },  // Notifications disabled
    // user-3 has no preference (defaults to enabled)
];

const mockDevices = [
    { fcmToken: 'token-1', deviceType: 'ios' },
    { fcmToken: 'token-2', deviceType: 'android' },
];

const mockPendingNotifications = [
    {
        id: 'notif-1',
        userId: 'user-1',
        sourceId: 1,
        sourceName: 'Test Source',
        oldScore: 0,
        newScore: 3,
        oldLabel: 'Notr/Bagimsiz',
        newLabel: 'Iktidara Yakin',
        changeReason: 'Admin update',
        status: 'pending',
    },
];

const mockFailedNotifications = [
    {
        id: 'notif-fail-1',
        userId: 'user-2',
        status: 'failed',
    },
];

vi.mock('@/config/db.js', () => {
    return {
        db: {
            select: vi.fn().mockReturnValue({
                from: vi.fn().mockReturnValue({
                    where: vi.fn().mockReturnValue({
                        then: vi.fn(),
                        limit: vi.fn().mockReturnValue({
                            then: vi.fn(),
                        }),
                    }),
                }),
            }),
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
    queueAlignmentChangeNotifications,
    processPendingAlignmentNotifications,
    getPendingNotificationCount,
    retryFailedNotifications,
} from '@/services/alignmentNotificationService.js';
import { db } from '@/config/db.js';

describe('Alignment Notification Service', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('queueAlignmentChangeNotifications', () => {
        it('should queue notifications for all eligible followers', async () => {
            // Mock followers query
            vi.mocked(db.select).mockReturnValueOnce({
                from: vi.fn().mockReturnValue({
                    where: vi.fn().mockReturnValue({
                        then: (resolve: any) => resolve(mockFollowers),
                    }),
                }),
            } as any);

            // Mock preferences query
            vi.mocked(db.select).mockReturnValueOnce({
                from: vi.fn().mockReturnValue({
                    where: vi.fn().mockReturnValue({
                        then: (resolve: any) => resolve(mockPreferences),
                    }),
                }),
            } as any);

            const count = await queueAlignmentChangeNotifications({
                sourceId: 1,
                sourceName: 'Test Source',
                oldScore: 0,
                newScore: 3,
                oldLabel: 'Notr/Bagimsiz',
                newLabel: 'Iktidara Yakin',
                reason: 'Admin update',
            });

            // Should queue for user-1 and user-3 (user-2 has notifications disabled)
            expect(count).toBe(2);
            expect(db.insert).toHaveBeenCalled();
        });

        it('should return 0 if no followers', async () => {
            vi.mocked(db.select).mockReturnValueOnce({
                from: vi.fn().mockReturnValue({
                    where: vi.fn().mockReturnValue({
                        then: (resolve: any) => resolve([]),  // No followers
                    }),
                }),
            } as any);

            const count = await queueAlignmentChangeNotifications({
                sourceId: 1,
                sourceName: 'Test Source',
                oldScore: 0,
                newScore: 3,
                oldLabel: null,
                newLabel: 'Iktidara Yakin',
                reason: 'Admin update',
            });

            expect(count).toBe(0);
            expect(db.insert).not.toHaveBeenCalled();
        });

        it('should return 0 if all followers have notifications disabled', async () => {
            const allDisabledPrefs = [
                { userId: 'user-1', notifAlignmentChanges: false },
                { userId: 'user-2', notifAlignmentChanges: false },
            ];

            vi.mocked(db.select).mockReturnValueOnce({
                from: vi.fn().mockReturnValue({
                    where: vi.fn().mockReturnValue({
                        then: (resolve: any) => resolve([{ userId: 'user-1' }, { userId: 'user-2' }]),
                    }),
                }),
            } as any);

            vi.mocked(db.select).mockReturnValueOnce({
                from: vi.fn().mockReturnValue({
                    where: vi.fn().mockReturnValue({
                        then: (resolve: any) => resolve(allDisabledPrefs),
                    }),
                }),
            } as any);

            const count = await queueAlignmentChangeNotifications({
                sourceId: 1,
                sourceName: 'Test Source',
                oldScore: 0,
                newScore: 3,
                oldLabel: null,
                newLabel: 'Iktidara Yakin',
                reason: 'Admin update',
            });

            expect(count).toBe(0);
        });
    });

    describe('processPendingAlignmentNotifications', () => {
        it('should process pending notifications', async () => {
            // Mock pending notifications query
            vi.mocked(db.select).mockReturnValueOnce({
                from: vi.fn().mockReturnValue({
                    where: vi.fn().mockReturnValue({
                        limit: vi.fn().mockReturnValue({
                            then: (resolve: any) => resolve(mockPendingNotifications),
                        }),
                    }),
                }),
            } as any);

            // Mock devices query
            vi.mocked(db.select).mockReturnValueOnce({
                from: vi.fn().mockReturnValue({
                    where: vi.fn().mockReturnValue({
                        then: (resolve: any) => resolve(mockDevices),
                    }),
                }),
            } as any);

            const result = await processPendingAlignmentNotifications(50);

            expect(result.sent).toBe(1);
            expect(result.failed).toBe(0);
            expect(db.insert).toHaveBeenCalled();  // Insert notification
            expect(db.update).toHaveBeenCalled();  // Update status to sent
        });

        it('should return zeros if no pending notifications', async () => {
            vi.mocked(db.select).mockReturnValueOnce({
                from: vi.fn().mockReturnValue({
                    where: vi.fn().mockReturnValue({
                        limit: vi.fn().mockReturnValue({
                            then: (resolve: any) => resolve([]),
                        }),
                    }),
                }),
            } as any);

            const result = await processPendingAlignmentNotifications(50);

            expect(result.sent).toBe(0);
            expect(result.failed).toBe(0);
        });

        it('should mark notification as failed on error', async () => {
            // Mock pending notifications query
            vi.mocked(db.select).mockReturnValueOnce({
                from: vi.fn().mockReturnValue({
                    where: vi.fn().mockReturnValue({
                        limit: vi.fn().mockReturnValue({
                            then: (resolve: any) => resolve(mockPendingNotifications),
                        }),
                    }),
                }),
            } as any);

            // Mock devices query to throw error
            vi.mocked(db.select).mockReturnValueOnce({
                from: vi.fn().mockReturnValue({
                    where: vi.fn().mockImplementation(() => {
                        throw new Error('Database error');
                    }),
                }),
            } as any);

            const result = await processPendingAlignmentNotifications(50);

            expect(result.failed).toBe(1);
        });

        it('should use default batch size of 50', async () => {
            vi.mocked(db.select).mockReturnValueOnce({
                from: vi.fn().mockReturnValue({
                    where: vi.fn().mockReturnValue({
                        limit: vi.fn().mockReturnValue({
                            then: (resolve: any) => resolve([]),
                        }),
                    }),
                }),
            } as any);

            await processPendingAlignmentNotifications();

            // Verify limit was called (implicitly with default 50)
            expect(db.select).toHaveBeenCalled();
        });
    });

    describe('getPendingNotificationCount', () => {
        it('should return pending and failed counts', async () => {
            // Mock pending count
            vi.mocked(db.select).mockReturnValueOnce({
                from: vi.fn().mockReturnValue({
                    where: vi.fn().mockReturnValue({
                        then: (resolve: any) => resolve(mockPendingNotifications),
                    }),
                }),
            } as any);

            // Mock failed count
            vi.mocked(db.select).mockReturnValueOnce({
                from: vi.fn().mockReturnValue({
                    where: vi.fn().mockReturnValue({
                        then: (resolve: any) => resolve(mockFailedNotifications),
                    }),
                }),
            } as any);

            const counts = await getPendingNotificationCount();

            expect(counts.pending).toBe(1);
            expect(counts.failed).toBe(1);
        });

        it('should return zeros on error', async () => {
            vi.mocked(db.select).mockReturnValueOnce({
                from: vi.fn().mockImplementation(() => {
                    throw new Error('Database error');
                }),
            } as any);

            const counts = await getPendingNotificationCount();

            expect(counts.pending).toBe(0);
            expect(counts.failed).toBe(0);
        });
    });

    describe('retryFailedNotifications', () => {
        it('should reset failed notifications to pending', async () => {
            vi.mocked(db.select).mockReturnValueOnce({
                from: vi.fn().mockReturnValue({
                    where: vi.fn().mockReturnValue({
                        limit: vi.fn().mockReturnValue({
                            then: (resolve: any) => resolve(mockFailedNotifications),
                        }),
                    }),
                }),
            } as any);

            const count = await retryFailedNotifications(20);

            expect(count).toBe(1);
            expect(db.update).toHaveBeenCalled();
        });

        it('should return 0 if no failed notifications', async () => {
            vi.mocked(db.select).mockReturnValueOnce({
                from: vi.fn().mockReturnValue({
                    where: vi.fn().mockReturnValue({
                        limit: vi.fn().mockReturnValue({
                            then: (resolve: any) => resolve([]),
                        }),
                    }),
                }),
            } as any);

            const count = await retryFailedNotifications(20);

            expect(count).toBe(0);
            expect(db.update).not.toHaveBeenCalled();
        });

        it('should use default limit of 20', async () => {
            vi.mocked(db.select).mockReturnValueOnce({
                from: vi.fn().mockReturnValue({
                    where: vi.fn().mockReturnValue({
                        limit: vi.fn().mockReturnValue({
                            then: (resolve: any) => resolve([]),
                        }),
                    }),
                }),
            } as any);

            await retryFailedNotifications();

            expect(db.select).toHaveBeenCalled();
        });

        it('should return 0 on error', async () => {
            vi.mocked(db.select).mockReturnValueOnce({
                from: vi.fn().mockImplementation(() => {
                    throw new Error('Database error');
                }),
            } as any);

            const count = await retryFailedNotifications();

            expect(count).toBe(0);
        });
    });
});
