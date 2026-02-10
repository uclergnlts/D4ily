import { Hono } from 'hono';
import { db } from '../config/db.js';
import { subscriptions, users, payments } from '../db/schema/index.js';
import { eq } from 'drizzle-orm';
import { logger } from '../config/logger.js';
import { createId } from '@paralleldrive/cuid2';
import crypto from 'crypto';

const webhookRoute = new Hono();

// RevenueCat webhook events
interface RevenueCatEvent {
    event: {
        type: string;
        id: string;
        app_user_id: string;
        original_app_user_id: string;
        product_id: string;
        period_type: string;
        purchased_at_ms: number;
        expiration_at_ms?: number;
        store: string;
        environment: string;
        is_trial_conversion?: boolean;
        cancel_reason?: string;
        new_product_id?: string;
        subscriber_attributes?: Record<string, any>;
    };
}

/**
 * POST /webhooks/revenuecat
 * Handle RevenueCat webhook events
 */
webhookRoute.post('/revenuecat', async (c) => {
    try {
        // Read raw body for HMAC verification, then parse JSON
        const rawBody = await c.req.text();
        const body = JSON.parse(rawBody) as RevenueCatEvent;
        const { event } = body;

        logger.info({ eventType: event.type, userId: event.app_user_id }, 'RevenueCat webhook received');

        // Verify webhook signature using raw body bytes
        const signature = c.req.header('X-RevenueCat-Signature');
        if (!verifyWebhookSignature(rawBody, signature)) {
            logger.warn('Invalid RevenueCat webhook signature');
            return c.json({ success: false, error: 'Invalid signature' }, 401);
        }

        // Handle different event types
        switch (event.type) {
            case 'INITIAL_PURCHASE':
            case 'RENEWAL':
            case 'UNCANCELLATION':
                await handleSubscriptionActive(event);
                break;

            case 'CANCELLATION':
                await handleSubscriptionCancelled(event);
                break;

            case 'EXPIRATION':
                await handleSubscriptionExpired(event);
                break;

            case 'PRODUCT_CHANGE':
                await handleProductChange(event);
                break;

            default:
                logger.info({ eventType: event.type }, 'Unhandled RevenueCat event type');
        }

        return c.json({ success: true });
    } catch (error) {
        logger.error({ error }, 'RevenueCat webhook processing failed');
        return c.json({ success: false, error: 'Webhook processing failed' }, 500);
    }
});

/**
 * Verify RevenueCat webhook signature
 */
function verifyWebhookSignature(rawBody: string, signature: string | undefined): boolean {
    const webhookSecret = process.env.REVENUECAT_WEBHOOK_SECRET;

    // In development, allow missing signature if secret is not set
    if (process.env.NODE_ENV === 'development' && !webhookSecret) {
        logger.warn('RevenueCat webhook verification skipped in development');
        return true;
    }

    if (!signature || !webhookSecret) {
        logger.error('Missing webhook signature or secret');
        return false;
    }

    try {
        const hmac = crypto.createHmac('sha256', webhookSecret);
        hmac.update(rawBody);
        const expectedSignature = hmac.digest('hex');
        return crypto.timingSafeEqual(
            Buffer.from(signature, 'hex'),
            Buffer.from(expectedSignature, 'hex')
        );
    } catch (error) {
        logger.error({ error }, 'Webhook signature verification failed');
        return false;
    }
}

/**
 * Handle subscription activation (initial purchase, renewal, uncancellation)
 */
async function handleSubscriptionActive(event: RevenueCatEvent['event']) {
    const userId = event.app_user_id;
    const planId = mapProductToPlan(event.product_id);
    const provider = mapStoreToProvider(event.store);

    // Check if subscription already exists
    const existingSubscription = await db
        .select()
        .from(subscriptions)
        .where(eq(subscriptions.providerSubscriptionId, event.id))
        .get();

    if (existingSubscription) {
        // Update existing subscription
        await db
            .update(subscriptions)
            .set({
                status: 'active',
                currentPeriodStart: new Date(event.purchased_at_ms),
                currentPeriodEnd: event.expiration_at_ms ? new Date(event.expiration_at_ms) : null,
                cancelAtPeriodEnd: false,
                updatedAt: new Date(),
            })
            .where(eq(subscriptions.id, existingSubscription.id));
    } else {
        // Create new subscription
        await db.insert(subscriptions).values({
            id: createId(),
            userId,
            planId,
            status: 'active',
            provider,
            providerSubscriptionId: event.id,
            currentPeriodStart: new Date(event.purchased_at_ms),
            currentPeriodEnd: event.expiration_at_ms ? new Date(event.expiration_at_ms) : null,
            cancelAtPeriodEnd: false,
            createdAt: new Date(),
            updatedAt: new Date(),
        });
    }

    // Update user's subscription status
    await db
        .update(users)
        .set({ subscriptionStatus: 'premium', updatedAt: new Date() })
        .where(eq(users.id, userId));

    logger.info({ userId, planId }, 'Subscription activated');
}

/**
 * Handle subscription cancellation
 */
async function handleSubscriptionCancelled(event: RevenueCatEvent['event']) {
    const subscription = await db
        .select()
        .from(subscriptions)
        .where(eq(subscriptions.providerSubscriptionId, event.id))
        .get();

    if (subscription) {
        await db
            .update(subscriptions)
            .set({
                status: 'cancelled',
                cancelAtPeriodEnd: true,
                updatedAt: new Date(),
            })
            .where(eq(subscriptions.id, subscription.id));

        logger.info({ userId: subscription.userId }, 'Subscription cancelled');
    }
}

/**
 * Handle subscription expiration
 */
async function handleSubscriptionExpired(event: RevenueCatEvent['event']) {
    const subscription = await db
        .select()
        .from(subscriptions)
        .where(eq(subscriptions.providerSubscriptionId, event.id))
        .get();

    if (subscription) {
        await db
            .update(subscriptions)
            .set({
                status: 'expired',
                updatedAt: new Date(),
            })
            .where(eq(subscriptions.id, subscription.id));

        // Update user's subscription status to free
        await db
            .update(users)
            .set({ subscriptionStatus: 'free', updatedAt: new Date() })
            .where(eq(users.id, subscription.userId));

        logger.info({ userId: subscription.userId }, 'Subscription expired');
    }
}

/**
 * Handle product change (upgrade/downgrade)
 */
async function handleProductChange(event: RevenueCatEvent['event']) {
    if (!event.new_product_id) return;

    const subscription = await db
        .select()
        .from(subscriptions)
        .where(eq(subscriptions.providerSubscriptionId, event.id))
        .get();

    if (subscription) {
        const newPlanId = mapProductToPlan(event.new_product_id);

        await db
            .update(subscriptions)
            .set({
                planId: newPlanId,
                updatedAt: new Date(),
            })
            .where(eq(subscriptions.id, subscription.id));

        logger.info({ userId: subscription.userId, newPlanId }, 'Subscription plan changed');
    }
}

/**
 * Map RevenueCat product ID to our plan ID
 */
function mapProductToPlan(productId: string): 'monthly' | 'yearly' {
    // Map your RevenueCat product IDs to plan IDs
    const productMap: Record<string, 'monthly' | 'yearly'> = {
        'premium_monthly': 'monthly',
        'premium_yearly': 'yearly',
        'com.d4ily.premium.monthly': 'monthly',
        'com.d4ily.premium.yearly': 'yearly',
    };

    return productMap[productId] || 'monthly';
}

/**
 * Map RevenueCat store to our provider
 */
function mapStoreToProvider(store: string): 'stripe' | 'iyzico' | 'apple' | 'google' {
    const storeMap: Record<string, 'stripe' | 'iyzico' | 'apple' | 'google'> = {
        'APP_STORE': 'apple',
        'PLAY_STORE': 'google',
        'STRIPE': 'stripe',
        'PROMOTIONAL': 'stripe',
    };

    return storeMap[store] || 'apple';
}

export default webhookRoute;
