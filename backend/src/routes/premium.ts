import { Hono } from 'hono';
import { db } from '../config/db.js';
import { users, subscriptions, payments } from '../db/schema/index.js';
import { authMiddleware, AuthUser } from '../middleware/auth.js';
import { eq, desc } from 'drizzle-orm';
import { logger } from '../config/logger.js';
import { z } from 'zod';
import { createId } from '@paralleldrive/cuid2';

type Variables = {
    user: AuthUser;
};

const premiumRoute = new Hono<{ Variables: Variables }>();

// Apply auth middleware to all routes
premiumRoute.use('*', authMiddleware);

// Premium plans
const PREMIUM_PLANS = [
    {
        id: 'monthly',
        name: 'Aylık Premium',
        price: 29.99,
        currency: 'TRY',
        duration: '1 ay',
        features: [
            'Reklamsız deneyim',
            'Sınırsız detaylı analiz',
            'Kişiselleştirilmiş günlük bülten',
            'Öncelikli destek',
        ],
    },
    {
        id: 'yearly',
        name: 'Yıllık Premium',
        price: 299.99,
        currency: 'TRY',
        duration: '1 yıl',
        features: [
            'Reklamsız deneyim',
            'Sınırsız detaylı analiz',
            'Kişiselleştirilmiş günlük bülten',
            'Öncelikli destek',
            '%17 tasarruf',
        ],
    },
];

/**
 * GET /premium
 * Get premium plans and user status
 */
premiumRoute.get('/', async (c) => {
    try {
        const authUser = c.get('user') as AuthUser;

        const user = await db
            .select()
            .from(users)
            .where(eq(users.id, authUser.uid))
            .get();

        // Get active subscription details
        const subscription = await db
            .select()
            .from(subscriptions)
            .where(eq(subscriptions.userId, authUser.uid))
            .orderBy(desc(subscriptions.createdAt))
            .limit(1)
            .get();

        return c.json({
            success: true,
            data: {
                isPremium: user?.subscriptionStatus === 'premium',
                plans: PREMIUM_PLANS,
                subscription: subscription ? {
                    id: subscription.id,
                    planId: subscription.planId,
                    status: subscription.status,
                    provider: subscription.provider,
                    currentPeriodStart: subscription.currentPeriodStart,
                    currentPeriodEnd: subscription.currentPeriodEnd,
                    cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
                } : null,
            },
        });
    } catch (error) {
        logger.error({ error }, 'Get premium status failed');
        return c.json({
            success: false,
            error: 'Failed to get premium status',
        }, 500);
    }
});

/**
 * POST /premium/subscribe
 * Subscribe to premium via RevenueCat (mobile IAP)
 */
premiumRoute.post('/subscribe', async (c) => {
    try {
        const authUser = c.get('user') as AuthUser;
        const body = await c.req.json();

        const schema = z.object({
            planId: z.enum(['monthly', 'yearly']),
            provider: z.enum(['stripe', 'iyzico', 'apple', 'google']),
            providerSubscriptionId: z.string(),
            currentPeriodStart: z.number(), // Unix timestamp in ms
            currentPeriodEnd: z.number().optional(), // Unix timestamp in ms
        });

        const { planId, provider, providerSubscriptionId, currentPeriodStart, currentPeriodEnd } = schema.parse(body);

        // Check if subscription already exists
        const existingSubscription = await db
            .select()
            .from(subscriptions)
            .where(eq(subscriptions.providerSubscriptionId, providerSubscriptionId))
            .get();

        if (existingSubscription) {
            // Update existing subscription
            await db
                .update(subscriptions)
                .set({
                    status: 'active',
                    currentPeriodStart: new Date(currentPeriodStart),
                    currentPeriodEnd: currentPeriodEnd ? new Date(currentPeriodEnd) : null,
                    cancelAtPeriodEnd: false,
                    updatedAt: new Date(),
                })
                .where(eq(subscriptions.id, existingSubscription.id));
        } else {
            // Create new subscription
            await db.insert(subscriptions).values({
                id: createId(),
                userId: authUser.uid,
                planId,
                status: 'active',
                provider,
                providerSubscriptionId,
                currentPeriodStart: new Date(currentPeriodStart),
                currentPeriodEnd: currentPeriodEnd ? new Date(currentPeriodEnd) : null,
                cancelAtPeriodEnd: false,
                createdAt: new Date(),
                updatedAt: new Date(),
            });
        }

        // Update user status
        await db
            .update(users)
            .set({
                subscriptionStatus: 'premium',
                updatedAt: new Date(),
            })
            .where(eq(users.id, authUser.uid));

        logger.info({ userId: authUser.uid, planId, provider }, 'User subscribed to premium');

        return c.json({
            success: true,
            message: 'Premium aboneliği başarılı',
            data: {
                planId,
                status: 'active',
            },
        }, 201);
    } catch (error) {
        logger.error({ error }, 'Subscribe to premium failed');
        return c.json({
            success: false,
            error: 'Failed to subscribe to premium',
        }, 400);
    }
});

/**
 * POST /premium/cancel
 * Cancel premium subscription (mark for cancellation at period end)
 */
premiumRoute.post('/cancel', async (c) => {
    try {
        const authUser = c.get('user') as AuthUser;

        // Get active subscription
        const subscription = await db
            .select()
            .from(subscriptions)
            .where(eq(subscriptions.userId, authUser.uid))
            .orderBy(desc(subscriptions.createdAt))
            .limit(1)
            .get();

        if (subscription) {
            await db
                .update(subscriptions)
                .set({
                    cancelAtPeriodEnd: true,
                    updatedAt: new Date(),
                })
                .where(eq(subscriptions.id, subscription.id));
        }

        logger.info({ userId: authUser.uid }, 'Premium subscription marked for cancellation');

        return c.json({
            success: true,
            message: 'Premium aboneliği dönem sonunda iptal edilecek',
        });
    } catch (error) {
        logger.error({ error }, 'Cancel premium failed');
        return c.json({
            success: false,
            error: 'Failed to cancel premium',
        }, 500);
    }
});

/**
 * GET /premium/history
 * Get payment history
 */
premiumRoute.get('/history', async (c) => {
    try {
        const authUser = c.get('user') as AuthUser;

        const paymentHistory = await db
            .select()
            .from(payments)
            .where(eq(payments.userId, authUser.uid))
            .orderBy(desc(payments.createdAt))
            .all();

        return c.json({
            success: true,
            data: paymentHistory,
        });
    } catch (error) {
        logger.error({ error }, 'Get payment history failed');
        return c.json({
            success: false,
            error: 'Failed to get payment history',
        }, 500);
    }
});

export default premiumRoute;
