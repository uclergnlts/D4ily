import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import { Hono } from 'hono';
import { serve } from '@hono/node-server';

// Mock all dependencies BEFORE any imports

// Mock Env
vi.mock('@/config/env.js', () => ({
    env: {
        NODE_ENV: 'test',
        PORT: '3342',
        TURSO_DATABASE_URL: 'libsql://test-db',
        TURSO_AUTH_TOKEN: 'test-token',
        FIREBASE_PROJECT_ID: 'test-project',
        FIREBASE_CLIENT_EMAIL: 'test@test.iam.gserviceaccount.com',
        FIREBASE_PRIVATE_KEY: '-----BEGIN PRIVATE KEY-----\ntest\n-----END PRIVATE KEY-----',
        UPSTASH_REDIS_REST_URL: 'https://test-redis',
        UPSTASH_REDIS_REST_TOKEN: 'test-token',
        LOG_LEVEL: 'info',
    }
}));

// Mock Logger
vi.mock('@/config/logger.js', () => ({
    logger: {
        info: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
    },
}));

// Mock Firebase - complete mock
vi.mock('@/config/firebase.js', () => ({
    adminAuth: {
        createUser: vi.fn().mockResolvedValue({ uid: 'new-user-uid' }),
        createCustomToken: vi.fn().mockResolvedValue('mock-custom-token'),
        verifyIdToken: vi.fn().mockResolvedValue({
            uid: 'test-firebase-uid',
            email: 'test@example.com',
        }),
        getUser: vi.fn().mockResolvedValue({
            uid: 'test-firebase-uid',
            email: 'test@example.com',
        }),
        deleteUser: vi.fn().mockResolvedValue(undefined),
        generateEmailVerificationLink: vi.fn().mockResolvedValue('https://verify.link'),
    },
    isFirebaseEnabled: true,
}));

// Mock Database
vi.mock('@/config/db.js', () => {
    const mockUser = {
        id: 'test-firebase-uid',
        email: 'test@example.com',
        name: 'Test User',
        avatarUrl: null,
        userRole: 'user',
        subscriptionStatus: 'free',
        createdAt: new Date(),
        updatedAt: new Date(),
    };

    const createQueryBuilder = () => ({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        get: vi.fn().mockResolvedValue(mockUser),
        values: vi.fn().mockReturnThis(),
        returning: vi.fn().mockReturnThis(),
        set: vi.fn().mockReturnThis(),
    });

    return {
        db: {
            select: vi.fn(() => createQueryBuilder()),
            insert: vi.fn(() => createQueryBuilder()),
            update: vi.fn(() => createQueryBuilder()),
            delete: vi.fn(() => createQueryBuilder()),
        }
    };
});

// Mock auth middleware 
vi.mock('@/middleware/auth.js', () => ({
    authMiddleware: vi.fn((c: any, next: any) => {
        c.set('user', {
            uid: 'test-firebase-uid',
            email: 'test@example.com',
            email_verified: true,
        });
        return next();
    }),
    AuthUser: {},
}));

// Import after all mocks are set up
import authRoute from '@/routes/auth.js';
import { adminAuth } from '@/config/firebase.js';

const app = new Hono();
app.route('/auth', authRoute);
const server = serve({
    fetch: app.fetch,
    port: 0,
});

describe('Auth API Integration Tests', () => {
    afterAll(async () => {
        await new Promise<void>((resolve) => {
            server.close(() => resolve());
        });
    });

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('POST /auth/register', () => {
        it('should register a new user successfully', async () => {
            const response = await request(server)
                .post('/auth/register')
                .send({
                    email: 'newuser@example.com',
                    password: 'password123',
                    name: 'New User',
                })
                .expect(201);

            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveProperty('user');
            expect(response.body.data).toHaveProperty('customToken');
        });

        it('should return 400 for invalid email format', async () => {
            const response = await request(server)
                .post('/auth/register')
                .send({
                    email: 'invalid-email',
                    password: 'password123',
                    name: 'Test User',
                })
                .expect(400);

            expect(response.body.success).toBe(false);
        });

        it('should return 400 for short password', async () => {
            const response = await request(server)
                .post('/auth/register')
                .send({
                    email: 'test@example.com',
                    password: 'short',
                    name: 'Test User',
                })
                .expect(400);

            expect(response.body.success).toBe(false);
        });

        it('should return 400 for missing name', async () => {
            const response = await request(server)
                .post('/auth/register')
                .send({
                    email: 'test@example.com',
                    password: 'password123',
                })
                .expect(400);

            expect(response.body.success).toBe(false);
        });

        it('should return 400 for duplicate email', async () => {
            vi.mocked(adminAuth.createUser).mockRejectedValueOnce({
                code: 'auth/email-already-exists'
            });

            const response = await request(server)
                .post('/auth/register')
                .send({
                    email: 'existing@example.com',
                    password: 'password123',
                    name: 'Test User',
                })
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.error).toBe('Email already registered');
        });
    });

    describe('GET /auth/me', () => {
        it('should return authenticated user data', async () => {
            const response = await request(server)
                .get('/auth/me')
                .set('Authorization', 'Bearer mock-token')
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveProperty('id');
            expect(response.body.data).toHaveProperty('email');
            expect(response.body.data).toHaveProperty('name');
        });

        it('should include user role and subscription status', async () => {
            const response = await request(server)
                .get('/auth/me')
                .set('Authorization', 'Bearer mock-token')
                .expect(200);

            expect(response.body.data).toHaveProperty('userRole');
            expect(response.body.data).toHaveProperty('subscriptionStatus');
        });
    });

    describe('POST /auth/verify-email', () => {
        it('should generate verification link', async () => {
            const response = await request(server)
                .post('/auth/verify-email')
                .set('Authorization', 'Bearer mock-token')
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.message).toBe('Verification email sent');
        });
    });

    describe('DELETE /auth/delete', () => {
        it('should delete user account successfully', async () => {
            const response = await request(server)
                .delete('/auth/delete')
                .set('Authorization', 'Bearer mock-token')
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.message).toBe('Account deleted successfully');
        });
    });
});
