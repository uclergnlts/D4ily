import { Hono } from 'hono';
import { adminAuth as auth, isFirebaseEnabled } from '../config/firebase.js';
import { db } from '../config/db.js';
import { users } from '../db/schema/index.js';
import { eq } from 'drizzle-orm';
import { logger } from '../config/logger.js';
import { z } from 'zod';
import { authMiddleware, AuthUser } from '../middleware/auth.js';
import { authRateLimiter } from '../middleware/rateLimiter.js';

type Variables = {
    user: AuthUser;
};

const authRoute = new Hono<{ Variables: Variables }>();

// Validation schemas - using 'name' to match existing schema
const registerSchema = z.object({
    email: z.string().email('Invalid email format'),
    password: z.string().min(8, 'Password must be at least 8 characters').max(100),
    name: z.string().min(2, 'Name must be at least 2 characters').max(50),
});

/**
 * POST /auth/register
 * Register a new user with Firebase and create database record
 */
authRoute.post('/register', authRateLimiter, async (c) => {
    if (!isFirebaseEnabled || !auth) {
        return c.json({
            success: false,
            error: 'Authentication is not configured',
        }, 503);
    }

    try {
        const body = await c.req.json();
        const validatedData = registerSchema.parse(body);

        // Create user in Firebase
        const firebaseUser = await auth.createUser({
            email: validatedData.email,
            password: validatedData.password,
            displayName: validatedData.name,
            emailVerified: false,
        });

        // Create user record in database with existing schema fields
        const newUser = await db
            .insert(users)
            .values({
                id: firebaseUser.uid,
                email: validatedData.email,
                name: validatedData.name,
                avatarUrl: null,
                userRole: 'user',
                subscriptionStatus: 'free',
                createdAt: new Date(),
                updatedAt: new Date(),
            })
            .returning()
            .get();

        // Generate custom token for immediate login
        const customToken = await auth.createCustomToken(firebaseUser.uid);

        logger.info({ userId: firebaseUser.uid, email: validatedData.email }, 'User registered successfully');

        return c.json({
            success: true,
            data: {
                user: {
                    id: newUser.id,
                    email: newUser.email,
                    name: newUser.name,
                },
                customToken, // Client can use this to sign in
            },
        }, 201);
    } catch (error: any) {
        logger.error({ error }, 'Registration failed');

        // Handle Firebase-specific errors
        if (error.code === 'auth/email-already-exists') {
            return c.json({
                success: false,
                error: 'Email already registered',
            }, 400);
        }

        return c.json({
            success: false,
            error: error instanceof Error ? error.message : 'Registration failed',
        }, 400);
    }
});

/**
 * POST /auth/sync
 * Sync/create user from Firebase auth (for Google Sign-In)
 */
authRoute.post('/sync', authMiddleware, async (c) => {
    try {
        const authUser = c.get('user') as AuthUser;

        // Check if user exists
        let user = await db
            .select()
            .from(users)
            .where(eq(users.id, authUser.uid))
            .get();

        if (!user) {
            // Get Firebase user data
            const firebaseUser = await auth!.getUser(authUser.uid);

            // Create new user
            user = await db
                .insert(users)
                .values({
                    id: authUser.uid,
                    email: firebaseUser.email || authUser.email || '',
                    name: firebaseUser.displayName || 'User',
                    avatarUrl: firebaseUser.photoURL || null,
                    userRole: 'user',
                    subscriptionStatus: 'free',
                    createdAt: new Date(),
                    updatedAt: new Date(),
                })
                .returning()
                .get();

            logger.info({ userId: authUser.uid }, 'New user synced from Google Sign-In');
        }

        return c.json({
            success: true,
            data: {
                id: user.id,
                email: user.email,
                name: user.name,
                avatarUrl: user.avatarUrl,
                userRole: user.userRole,
                subscriptionStatus: user.subscriptionStatus,
            },
        });
    } catch (error) {
        logger.error({ error }, 'User sync failed');
        return c.json({
            success: false,
            error: 'Failed to sync user',
        }, 500);
    }
});

/**
 * GET /auth/me
 * Get current authenticated user
 */
authRoute.get('/me', authMiddleware, async (c) => {
    try {
        const authUser = c.get('user') as AuthUser;

        // Get full user data from database
        const user = await db
            .select()
            .from(users)
            .where(eq(users.id, authUser.uid))
            .get();

        if (!user) {
            return c.json({
                success: false,
                error: 'User not found',
            }, 404);
        }

        // Update last access
        await db
            .update(users)
            .set({ updatedAt: new Date() })
            .where(eq(users.id, authUser.uid));

        return c.json({
            success: true,
            data: {
                id: user.id,
                email: user.email,
                name: user.name,
                avatarUrl: user.avatarUrl,
                userRole: user.userRole,
                subscriptionStatus: user.subscriptionStatus,
                createdAt: user.createdAt,
                updatedAt: user.updatedAt,
            },
        });
    } catch (error) {
        logger.error({ error }, 'Get user failed');
        return c.json({
            success: false,
            error: 'Failed to get user data',
        }, 500);
    }
});

/**
 * POST /auth/verify-email
 * Send email verification link
 */
authRoute.post('/verify-email', authMiddleware, async (c) => {
    if (!isFirebaseEnabled || !auth) {
        return c.json({
            success: false,
            error: 'Authentication is not configured',
        }, 503);
    }

    try {
        const authUser = c.get('user') as AuthUser;

        // Generate email verification link
        const link = await auth.generateEmailVerificationLink(authUser.email!);

        // In production, send this via email service (Resend, SendGrid, etc.)
        logger.info({ userId: authUser.uid, link }, 'Email verification link generated');

        return c.json({
            success: true,
            message: 'Verification email sent',
            // For development only - remove in production
            ...(process.env.NODE_ENV === 'development' && { link }),
        });
    } catch (error) {
        logger.error({ error }, 'Email verification failed');
        return c.json({
            success: false,
            error: 'Failed to send verification email',
        }, 500);
    }
});

/**
 * DELETE /auth/delete
 * Delete user account
 */
authRoute.delete('/delete', authMiddleware, async (c) => {
    if (!isFirebaseEnabled || !auth) {
        return c.json({
            success: false,
            error: 'Authentication is not configured',
        }, 503);
    }

    try {
        const authUser = c.get('user') as AuthUser;

        // Delete from Firebase
        await auth.deleteUser(authUser.uid);

        // Delete from database (cascade will handle related data)
        await db
            .delete(users)
            .where(eq(users.id, authUser.uid));

        logger.info({ userId: authUser.uid }, 'User account deleted successfully');

        return c.json({
            success: true,
            message: 'Account deleted successfully',
        });
    } catch (error) {
        logger.error({ error }, 'Account deletion failed');
        return c.json({
            success: false,
            error: 'Failed to delete account',
        }, 500);
    }
});

export default authRoute;
