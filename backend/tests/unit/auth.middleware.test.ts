import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';

// Use vi.hoisted to define mock functions that can be referenced in vi.mock
const mockState = vi.hoisted(() => {
    return {
        mockVerifyIdToken: vi.fn(),
        isFirebaseEnabled: true,
    };
});

// Mock Firebase with hoisted values
vi.mock('@/config/firebase.js', () => ({
    get adminAuth() {
        return mockState.isFirebaseEnabled ? {
            verifyIdToken: mockState.mockVerifyIdToken,
        } : null;
    },
    get isFirebaseEnabled() {
        return mockState.isFirebaseEnabled;
    },
}));

vi.mock('@/config/logger.js', () => ({
    logger: {
        info: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
        debug: vi.fn(),
    },
}));

import { authMiddleware, optionalAuthMiddleware, AuthUser } from '@/middleware/auth.js';

describe('Auth Middleware Unit Tests', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockState.isFirebaseEnabled = true;
    });

    describe('authMiddleware', () => {
        it('should return 401 when no Authorization header', async () => {
            const app = new Hono();
            app.use('*', authMiddleware);
            app.get('/test', (c) => c.json({ success: true }));

            const res = await app.request('/test');
            expect(res.status).toBe(401);

            const body = await res.json();
            expect(body.success).toBe(false);
            expect(body.error).toContain('No token provided');
        });

        it('should return 401 when token is not Bearer format', async () => {
            const app = new Hono();
            app.use('*', authMiddleware);
            app.get('/test', (c) => c.json({ success: true }));

            const res = await app.request('/test', {
                headers: { Authorization: 'Basic invalid-token' },
            });
            expect(res.status).toBe(401);
        });

        it('should return 401 when token verification fails', async () => {
            mockState.mockVerifyIdToken.mockRejectedValue(new Error('Invalid token'));

            const app = new Hono();
            app.use('*', authMiddleware);
            app.get('/test', (c) => c.json({ success: true }));

            const res = await app.request('/test', {
                headers: { Authorization: 'Bearer invalid-token' },
            });
            expect(res.status).toBe(401);

            const body = await res.json();
            expect(body.error).toContain('Invalid or expired token');
        });

        it('should set user in context when token is valid', async () => {
            mockState.mockVerifyIdToken.mockResolvedValue({
                uid: 'test-user-id',
                email: 'test@example.com',
                email_verified: true,
            });

            const app = new Hono();
            app.use('*', authMiddleware);
            app.get('/test', (c) => {
                const user = c.get('user') as AuthUser;
                return c.json({ success: true, user });
            });

            const res = await app.request('/test', {
                headers: { Authorization: 'Bearer valid-token' },
            });
            expect(res.status).toBe(200);

            const body = await res.json();
            expect(body.success).toBe(true);
            expect(body.user.uid).toBe('test-user-id');
            expect(body.user.email).toBe('test@example.com');
            expect(body.user.emailVerified).toBe(true);
        });

        it('should skip auth when Firebase is disabled', async () => {
            mockState.isFirebaseEnabled = false;

            const app = new Hono();
            app.use('*', authMiddleware);
            app.get('/test', (c) => c.json({ success: true }));

            const res = await app.request('/test');
            expect(res.status).toBe(200);

            const body = await res.json();
            expect(body.success).toBe(true);
        });
    });

    describe('optionalAuthMiddleware', () => {
        it('should continue without user when no token provided', async () => {
            const app = new Hono();
            app.use('*', optionalAuthMiddleware);
            app.get('/test', (c) => {
                const user = c.get('user');
                return c.json({ success: true, hasUser: !!user });
            });

            const res = await app.request('/test');
            expect(res.status).toBe(200);

            const body = await res.json();
            expect(body.success).toBe(true);
            expect(body.hasUser).toBe(false);
        });

        it('should set user when valid token provided', async () => {
            mockState.mockVerifyIdToken.mockResolvedValue({
                uid: 'test-user-id',
                email: 'test@example.com',
                email_verified: true,
            });

            const app = new Hono();
            app.use('*', optionalAuthMiddleware);
            app.get('/test', (c) => {
                const user = c.get('user') as AuthUser;
                return c.json({ success: true, hasUser: !!user, uid: user?.uid });
            });

            const res = await app.request('/test', {
                headers: { Authorization: 'Bearer valid-token' },
            });
            expect(res.status).toBe(200);

            const body = await res.json();
            expect(body.hasUser).toBe(true);
            expect(body.uid).toBe('test-user-id');
        });

        it('should continue without user when token is invalid', async () => {
            mockState.mockVerifyIdToken.mockRejectedValue(new Error('Invalid token'));

            const app = new Hono();
            app.use('*', optionalAuthMiddleware);
            app.get('/test', (c) => {
                const user = c.get('user');
                return c.json({ success: true, hasUser: !!user });
            });

            const res = await app.request('/test', {
                headers: { Authorization: 'Bearer invalid-token' },
            });
            expect(res.status).toBe(200);

            const body = await res.json();
            expect(body.success).toBe(true);
            expect(body.hasUser).toBe(false);
        });

        it('should skip when Firebase is disabled', async () => {
            mockState.isFirebaseEnabled = false;

            const app = new Hono();
            app.use('*', optionalAuthMiddleware);
            app.get('/test', (c) => c.json({ success: true }));

            const res = await app.request('/test');
            expect(res.status).toBe(200);
        });
    });
});
