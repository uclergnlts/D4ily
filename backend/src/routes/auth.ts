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

const loginSchema = z.object({
    email: z.string().email('Invalid email format'),
    password: z.string().min(1, 'Password is required'),
});

// Firebase REST API URL for sign in
const FIREBASE_API_KEY = process.env.FIREBASE_API_KEY || '';
const FIREBASE_SIGN_IN_URL = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FIREBASE_API_KEY}`;

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
 * POST /auth/login
 * Login with email and password using Firebase REST API
 */
authRoute.post('/login', authRateLimiter, async (c) => {
    if (!isFirebaseEnabled || !auth) {
        return c.json({
            success: false,
            error: 'Authentication is not configured',
        }, 503);
    }

    if (!FIREBASE_API_KEY) {
        return c.json({
            success: false,
            error: 'Firebase API key is not configured',
        }, 503);
    }

    try {
        const body = await c.req.json();
        const validatedData = loginSchema.parse(body);

        // Use Firebase REST API to verify email/password
        const firebaseResponse = await fetch(FIREBASE_SIGN_IN_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                email: validatedData.email,
                password: validatedData.password,
                returnSecureToken: true,
            }),
        });

        const firebaseData = await firebaseResponse.json() as {
            localId?: string;
            idToken?: string;
            refreshToken?: string;
            error?: { message: string };
        };

        if (!firebaseResponse.ok || firebaseData.error) {
            const errorMessage = firebaseData.error?.message || 'Login failed';
            
            // Map Firebase error messages to user-friendly messages
            let userMessage = 'Giriş başarısız';
            if (errorMessage.includes('EMAIL_NOT_FOUND')) {
                userMessage = 'Bu e-posta adresi kayıtlı değil';
            } else if (errorMessage.includes('INVALID_PASSWORD') || errorMessage.includes('INVALID_LOGIN_CREDENTIALS')) {
                userMessage = 'E-posta veya şifre hatalı';
            } else if (errorMessage.includes('USER_DISABLED')) {
                userMessage = 'Bu hesap devre dışı bırakılmış';
            } else if (errorMessage.includes('TOO_MANY_ATTEMPTS')) {
                userMessage = 'Çok fazla başarısız deneme. Lütfen daha sonra tekrar deneyin';
            }

            return c.json({
                success: false,
                error: userMessage,
            }, 401);
        }

        const uid = firebaseData.localId!;
        const idToken = firebaseData.idToken!;

        // Get user from database
        let user = await db
            .select()
            .from(users)
            .where(eq(users.id, uid))
            .get();

        // If user doesn't exist in DB, create them
        if (!user) {
            const firebaseUser = await auth.getUser(uid);
            user = await db
                .insert(users)
                .values({
                    id: uid,
                    email: firebaseUser.email || validatedData.email,
                    name: firebaseUser.displayName || 'User',
                    avatarUrl: firebaseUser.photoURL || null,
                    userRole: 'user',
                    subscriptionStatus: 'free',
                    createdAt: new Date(),
                    updatedAt: new Date(),
                })
                .returning()
                .get();
        }

        // Update last login
        await db
            .update(users)
            .set({ updatedAt: new Date() })
            .where(eq(users.id, uid));

        logger.info({ userId: uid, email: validatedData.email }, 'User logged in successfully');

        return c.json({
            success: true,
            data: {
                user: {
                    uid: user.id,
                    email: user.email,
                    name: user.name,
                    avatarUrl: user.avatarUrl,
                    role: user.userRole,
                    subscriptionStatus: user.subscriptionStatus,
                },
                token: idToken,
            },
        });
    } catch (error: any) {
        logger.error({ error }, 'Login failed');

        if (error instanceof z.ZodError) {
            return c.json({
                success: false,
                error: 'Geçersiz e-posta veya şifre formatı',
            }, 400);
        }

        return c.json({
            success: false,
            error: 'Giriş başarısız. Lütfen tekrar deneyin.',
        }, 500);
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
 * POST /auth/reset-password
 * Send password reset email
 */
authRoute.post('/reset-password', authRateLimiter, async (c) => {
    if (!FIREBASE_API_KEY) {
        return c.json({
            success: false,
            error: 'Firebase API key is not configured',
        }, 503);
    }

    try {
        const body = await c.req.json();
        const emailSchema = z.object({
            email: z.string().email('Invalid email format'),
        });
        const { email } = emailSchema.parse(body);

        // Use Firebase REST API to send password reset email
        const firebaseResponse = await fetch(
            `https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${FIREBASE_API_KEY}`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email,
                    requestType: 'PASSWORD_RESET',
                }),
            }
        );

        const firebaseData = await firebaseResponse.json() as {
            error?: { message: string };
        };

        if (!firebaseResponse.ok || firebaseData.error) {
            const errorMessage = firebaseData.error?.message || 'Password reset failed';
            
            // Map Firebase error messages to user-friendly messages
            let userMessage = 'Şifre sıfırlama başarısız';
            if (errorMessage.includes('EMAIL_NOT_FOUND')) {
                userMessage = 'Bu e-posta adresi kayıtlı değil';
            } else if (errorMessage.includes('INVALID_EMAIL')) {
                userMessage = 'Geçersiz e-posta adresi';
            }

            return c.json({
                success: false,
                error: userMessage,
            }, 400);
        }

        logger.info({ email }, 'Password reset email sent');

        return c.json({
            success: true,
            message: 'Şifre sıfırlama bağlantısı e-posta adresinize gönderildi',
        });
    } catch (error: any) {
        logger.error({ error }, 'Password reset failed');

        if (error instanceof z.ZodError) {
            return c.json({
                success: false,
                error: 'Geçersiz e-posta formatı',
            }, 400);
        }

        return c.json({
            success: false,
            error: 'Şifre sıfırlama başarısız. Lütfen tekrar deneyin.',
        }, 500);
    }
});

/**
 * POST /auth/verify-code
 * Verify email verification code (for mobile app)
 */
authRoute.post('/verify-code', authRateLimiter, async (c) => {
    if (!FIREBASE_API_KEY) {
        return c.json({
            success: false,
            error: 'Firebase API key is not configured',
        }, 503);
    }

    try {
        const body = await c.req.json();
        const codeSchema = z.object({
            oobCode: z.string().min(1, 'Verification code is required'),
        });
        const { oobCode } = codeSchema.parse(body);

        // Use Firebase REST API to verify email
        const firebaseResponse = await fetch(
            `https://identitytoolkit.googleapis.com/v1/accounts:update?key=${FIREBASE_API_KEY}`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    oobCode,
                }),
            }
        );

        const firebaseData = await firebaseResponse.json() as {
            emailVerified?: boolean;
            error?: { message: string };
        };

        if (!firebaseResponse.ok || firebaseData.error) {
            const errorMessage = firebaseData.error?.message || 'Verification failed';
            
            let userMessage = 'Doğrulama başarısız';
            if (errorMessage.includes('EXPIRED_OOB_CODE')) {
                userMessage = 'Doğrulama kodunun süresi doldu. Yeni bir kod isteyin.';
            } else if (errorMessage.includes('INVALID_OOB_CODE')) {
                userMessage = 'Geçersiz doğrulama kodu';
            }

            return c.json({
                success: false,
                error: userMessage,
            }, 400);
        }

        logger.info({ emailVerified: firebaseData.emailVerified }, 'Email verified successfully');

        return c.json({
            success: true,
            message: 'E-posta başarıyla doğrulandı',
            emailVerified: firebaseData.emailVerified,
        });
    } catch (error: any) {
        logger.error({ error }, 'Email verification failed');

        if (error instanceof z.ZodError) {
            return c.json({
                success: false,
                error: 'Geçersiz doğrulama kodu',
            }, 400);
        }

        return c.json({
            success: false,
            error: 'Doğrulama başarısız. Lütfen tekrar deneyin.',
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
