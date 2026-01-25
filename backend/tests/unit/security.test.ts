import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';

// Mock env
vi.mock('@/config/env.js', () => ({
    env: {
        NODE_ENV: 'test',
    }
}));

// Mock logger
vi.mock('@/config/logger.js', () => ({
    logger: {
        info: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
    },
}));

// Mock Firebase
vi.mock('@/config/firebase.js', () => ({
    adminAuth: {
        verifyIdToken: vi.fn(),
    },
    isFirebaseEnabled: true,
}));

// Mock DB for user role check
vi.mock('@/config/db.js', () => {
    const createQueryBuilder = (userData: any) => ({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        get: vi.fn().mockResolvedValue(userData),
    });

    return {
        db: {
            select: vi.fn(() => createQueryBuilder({
                id: 'regular-user',
                userRole: 'user'
            })),
        }
    };
});

import { authMiddleware } from '@/middleware/auth.js';
import { adminAuth } from '@/config/firebase.js';

describe('Security Tests - Admin Middleware Bypass', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('Role-based Access Control', () => {
        it('should return 401 when no token provided', async () => {
            const app = new Hono();
            app.use('*', authMiddleware);
            app.get('/admin/test', (c) => c.json({ success: true }));

            const res = await app.request('/admin/test');
            expect(res.status).toBe(401);

            const body = await res.json();
            expect(body.success).toBe(false);
            expect(body.error).toContain('No token provided');
        });

        it('should return 401 for invalid token format', async () => {
            const app = new Hono();
            app.use('*', authMiddleware);
            app.get('/admin/test', (c) => c.json({ success: true }));

            const res = await app.request('/admin/test', {
                headers: { Authorization: 'InvalidFormat token123' }
            });
            expect(res.status).toBe(401);
        });

        it('should return 401 when token verification fails', async () => {
            vi.mocked(adminAuth.verifyIdToken).mockRejectedValue(
                new Error('Token verification failed')
            );

            const app = new Hono();
            app.use('*', authMiddleware);
            app.get('/admin/test', (c) => c.json({ success: true }));

            const res = await app.request('/admin/test', {
                headers: { Authorization: 'Bearer fake-token' }
            });
            expect(res.status).toBe(401);

            const body = await res.json();
            expect(body.error).toContain('Invalid or expired token');
        });

        it('should allow request with valid token', async () => {
            vi.mocked(adminAuth.verifyIdToken).mockResolvedValue({
                uid: 'test-user',
                email: 'test@example.com',
                email_verified: true,
            } as any);

            const app = new Hono();
            app.use('*', authMiddleware);
            app.get('/test', (c) => c.json({ success: true }));

            const res = await app.request('/test', {
                headers: { Authorization: 'Bearer valid-token' }
            });
            expect(res.status).toBe(200);
        });
    });
});
