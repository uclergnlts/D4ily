import { PostHog } from 'posthog-node';
import { env } from './env';

/**
 * PostHog Configuration for Backend
 * Production-ready product analytics and event tracking
 */

let posthogClient: PostHog | null = null;

export function initPostHog() {
    if (env.POSTHOG_API_KEY && env.POSTHOG_HOST) {
        posthogClient = new PostHog(env.POSTHOG_API_KEY, {
            host: env.POSTHOG_HOST,
            flushAt: 20,
            flushInterval: 10000,
        });

        console.log('✅ PostHog initialized successfully');
    } else {
        console.log('⚠️ PostHog not initialized (missing API key or host)');
    }
}

/**
 * Get PostHog client instance
 */
export function getPostHog(): PostHog | null {
    return posthogClient;
}

/**
 * Track an event
 */
export function trackEvent(
    distinctId: string,
    event: string,
    properties?: Record<string, any>
) {
    if (!posthogClient) return;

    posthogClient.capture({
        distinctId,
        event,
        properties: {
            ...properties,
            $lib: 'backend',
            $lib_version: '1.0.0',
        },
    });
}

/**
 * Identify a user
 */
export function identifyUser(
    distinctId: string,
    properties?: Record<string, any>
) {
    if (!posthogClient) return;

    posthogClient.identify({
        distinctId,
        properties: {
            ...properties,
            $lib: 'backend',
        },
    });
}

/**
 * Alias a user (merge identities)
 */
export function aliasUser(distinctId: string, alias: string) {
    if (!posthogClient) return;

    posthogClient.alias({
        distinctId,
        alias,
    });
}

/**
 * Set user properties
 */
export function setUserProperties(
    distinctId: string,
    properties: Record<string, any>
) {
    if (!posthogClient) return;

    posthogClient.capture({
        distinctId,
        event: '$set',
        properties,
    });
}

/**
 * Track page view
 */
export function trackPageView(
    distinctId: string,
    path: string,
    properties?: Record<string, any>
) {
    if (!posthogClient) return;

    posthogClient.capture({
        distinctId,
        event: '$pageview',
        properties: {
            $current_url: path,
            ...properties,
        },
    });
}

/**
 * Track API request
 */
export function trackApiRequest(
    distinctId: string,
    method: string,
    path: string,
    statusCode: number,
    duration: number,
    properties?: Record<string, any>
) {
    if (!posthogClient) return;

    posthogClient.capture({
        distinctId,
        event: 'api_request',
        properties: {
            method,
            path,
            status_code: statusCode,
            duration_ms: duration,
            ...properties,
        },
    });
}

/**
 * Track error
 */
export function trackError(
    distinctId: string,
    error: Error,
    context?: Record<string, any>
) {
    if (!posthogClient) return;

    posthogClient.capture({
        distinctId,
        event: 'error',
        properties: {
            error_message: error.message,
            error_name: error.name,
            error_stack: error.stack,
            ...context,
        },
    });
}

/**
 * Track user action
 */
export function trackUserAction(
    distinctId: string,
    action: string,
    properties?: Record<string, any>
) {
    if (!posthogClient) return;

    posthogClient.capture({
        distinctId,
        event: 'user_action',
        properties: {
            action,
            ...properties,
        },
    });
}

/**
 * Flush events immediately
 */
export function flushEvents() {
    if (!posthogClient) return;

    posthogClient.flush();
}

/**
 * Shutdown PostHog client
 */
export async function shutdownPostHog() {
    if (!posthogClient) return;

    await posthogClient.shutdown();
    posthogClient = null;
}

/**
 * Example usage in routes:
 * 
 * import { trackEvent, trackApiRequest, trackUserAction } from '../config/posthog';
 * 
 * // Track API request
 * const startTime = Date.now();
 * // ... API logic ...
 * const duration = Date.now() - startTime;
 * trackApiRequest(userId, 'GET', '/feed/tr', 200, duration, { country: 'tr' });
 * 
 * // Track user action
 * trackUserAction(userId, 'article_viewed', { article_id: '123', source: 'CNN' });
 * 
 * // Track custom event
 * trackEvent(userId, 'premium_subscription', { plan: 'monthly', amount: 9.99 });
 */
