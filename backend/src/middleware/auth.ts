import { Context, Next } from 'hono';
import { adminAuth, isFirebaseEnabled } from '../config/firebase.js';
import { logger } from '../config/logger.js';
import { db } from '../config/db.js';
import { users } from '../db/schema/index.js';
import { eq } from 'drizzle-orm';

export interface AuthUser {
    uid: string;
    email: string | undefined;
    emailVerified: boolean;
    userRole?: 'user' | 'admin';
}

// Auth middleware to verify Firebase tokens
export async function authMiddleware(c: Context, next: Next) {
    // Skip if Firebase is not enabled
    if (!isFirebaseEnabled || !adminAuth) {
        logger.error('Firebase not configured. Authentication required but unavailable.');
        return c.json({
            success: false,
            error: 'Authentication service unavailable',
        }, 503);
    }

    try {
        const authHeader = c.req.header('Authorization');

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return c.json({
                success: false,
                error: 'Unauthorized: No token provided',
            }, 401);
        }

        const token = authHeader.substring(7); // Remove 'Bearer ' prefix

        // Verify the token with Firebase
        const decodedToken = await adminAuth.verifyIdToken(token);

        // Attach user to context
        c.set('user', {
            uid: decodedToken.uid,
            email: decodedToken.email,
            emailVerified: decodedToken.email_verified || false,
        } as AuthUser);

        await next();
    } catch (error) {
        logger.error({ error }, 'Token verification failed');

        return c.json({
            success: false,
            error: 'Unauthorized: Invalid or expired token',
        }, 401);
    }
}

// Optional auth middleware (doesn't block if no token)
export async function optionalAuthMiddleware(c: Context, next: Next) {
    if (!isFirebaseEnabled || !adminAuth) {
        return next();
    }

    try {
        const authHeader = c.req.header('Authorization');

        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.substring(7);
            const decodedToken = await adminAuth.verifyIdToken(token);

            c.set('user', {
                uid: decodedToken.uid,
                email: decodedToken.email,
                emailVerified: decodedToken.email_verified || false,
            } as AuthUser);
        }
    } catch (error) {
        logger.debug({ error }, 'Optional auth failed, continuing without user');
    }

    await next();
}

// Admin middleware - requires auth + admin role
export async function adminMiddleware(c: Context, next: Next) {
    // First, verify authentication
    if (!isFirebaseEnabled || !adminAuth) {
        logger.error('Firebase not configured. Admin authentication required but unavailable.');
        return c.json({
            success: false,
            error: 'Authentication service unavailable',
        }, 503);
    }

    try {
        const authHeader = c.req.header('Authorization');

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return c.json({
                success: false,
                error: 'Unauthorized: No token provided',
            }, 401);
        }

        const token = authHeader.substring(7);
        const decodedToken = await adminAuth.verifyIdToken(token);

        // Check admin role in database
        const user = await db
            .select()
            .from(users)
            .where(eq(users.id, decodedToken.uid))
            .get();

        if (!user) {
            return c.json({
                success: false,
                error: 'User not found',
            }, 404);
        }

        if (user.userRole !== 'admin') {
            logger.warn({ userId: decodedToken.uid }, 'Non-admin user attempted admin action');
            return c.json({
                success: false,
                error: 'Forbidden: Admin access required',
            }, 403);
        }

        // Attach user to context with role
        c.set('user', {
            uid: decodedToken.uid,
            email: decodedToken.email,
            emailVerified: decodedToken.email_verified || false,
            userRole: user.userRole,
        } as AuthUser);

        await next();
    } catch (error) {
        logger.error({ error }, 'Admin auth verification failed');

        return c.json({
            success: false,
            error: 'Unauthorized: Invalid or expired token',
        }, 401);
    }
}

// Premium middleware - requires auth + premium subscription
export async function premiumMiddleware(c: Context, next: Next) {
    // First, verify authentication
    if (!isFirebaseEnabled || !adminAuth) {
        logger.error('Firebase not configured. Premium authentication required but unavailable.');
        return c.json({
            success: false,
            error: 'Authentication service unavailable',
        }, 503);
    }

    try {
        const authHeader = c.req.header('Authorization');

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return c.json({
                success: false,
                error: 'Unauthorized: No token provided',
            }, 401);
        }

        const token = authHeader.substring(7);
        const decodedToken = await adminAuth.verifyIdToken(token);

        // Check premium status in database
        const user = await db
            .select()
            .from(users)
            .where(eq(users.id, decodedToken.uid))
            .get();

        if (!user) {
            return c.json({
                success: false,
                error: 'User not found',
            }, 404);
        }

        if (user.subscriptionStatus !== 'premium') {
            logger.warn({ userId: decodedToken.uid }, 'Non-premium user attempted premium action');
            return c.json({
                success: false,
                error: 'Forbidden: Premium subscription required',
            }, 403);
        }

        // Attach user to context with role
        c.set('user', {
            uid: decodedToken.uid,
            email: decodedToken.email,
            emailVerified: decodedToken.email_verified || false,
            userRole: user.userRole,
        } as AuthUser);

        await next();
    } catch (error) {
        logger.error({ error }, 'Premium auth verification failed');

        return c.json({
            success: false,
            error: 'Unauthorized: Invalid or expired token',
        }, 401);
    }
}
