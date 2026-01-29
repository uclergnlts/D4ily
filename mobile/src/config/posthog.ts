import PostHog from 'posthog-react-native';

/**
 * PostHog Configuration for Mobile (React Native)
 * Production-ready product analytics and event tracking
 */

const POSTHOG_API_KEY = process.env.EXPO_PUBLIC_POSTHOG_API_KEY || '';
const POSTHOG_HOST = process.env.EXPO_PUBLIC_POSTHOG_HOST || 'https://app.posthog.com';

let posthogClient: PostHog | null = null;

export function initPostHog() {
    if (POSTHOG_API_KEY) {
        posthogClient = new PostHog(POSTHOG_API_KEY, {
            host: POSTHOG_HOST,
            captureApplicationLifecycleEvents: true,
            captureDeepLinks: true,
            debug: __DEV__,
            flushAt: 20,
            flushInterval: 10000,
        });

        console.log('✅ PostHog initialized successfully');
    } else {
        console.log('⚠️ PostHog not initialized (missing API key)');
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
    event: string,
    properties?: Record<string, any>
) {
    if (!posthogClient) return;

    posthogClient.capture(event, {
        ...properties,
        $lib: 'mobile',
        $lib_version: '1.0.0',
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

    posthogClient.identify(distinctId, {
        ...properties,
        $lib: 'mobile',
    });
}

/**
 * Reset user (logout)
 */
export function resetUser() {
    if (!posthogClient) return;

    posthogClient.reset();
}

/**
 * Set user properties
 */
export function setUserProperties(properties: Record<string, any>) {
    if (!posthogClient) return;

    posthogClient.people.set(properties);
}

/**
 * Track screen view
 */
export function trackScreenView(
    screenName: string,
    properties?: Record<string, any>
) {
    if (!posthogClient) return;

    posthogClient.screen(screenName, {
        ...properties,
    });
}

/**
 * Track user action
 */
export function trackUserAction(
    action: string,
    properties?: Record<string, any>
) {
    if (!posthogClient) return;

    posthogClient.capture('user_action', {
        action,
        ...properties,
    });
}

/**
 * Track article view
 */
export function trackArticleView(
    articleId: string,
    properties?: Record<string, any>
) {
    if (!posthogClient) return;

    posthogClient.capture('article_viewed', {
        article_id: articleId,
        ...properties,
    });
}

/**
 * Track premium action
 */
export function trackPremiumAction(
    action: 'view_pricing' | 'start_purchase' | 'purchase_completed' | 'purchase_failed',
    properties?: Record<string, any>
) {
    if (!posthogClient) return;

    posthogClient.capture('premium_action', {
        action,
        ...properties,
    });
}

/**
 * Track engagement
 */
export function trackEngagement(
    type: 'like' | 'comment' | 'share' | 'bookmark',
    targetId: string,
    properties?: Record<string, any>
) {
    if (!posthogClient) return;

    posthogClient.capture('engagement', {
        type,
        target_id: targetId,
        ...properties,
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
 * Example usage in components:
 * 
 * import { trackEvent, trackScreenView, trackArticleView, trackPremiumAction } from '../config/posthog';
 * 
 * // Track screen view
 * useEffect(() => {
 *     trackScreenView('FeedScreen', { country: 'tr' });
 * }, []);
 * 
 * // Track article view
 * const handleArticlePress = (article: Article) => {
 *     trackArticleView(article.id, { source: article.source, category: article.category });
 *     navigation.navigate('ArticleDetail', { articleId: article.id });
 * };
 * 
 * // Track premium action
 * const handlePurchase = () => {
 *     trackPremiumAction('start_purchase', { plan: 'monthly' });
 *     // ... purchase logic ...
 * };
 * 
 * // Track custom event
 * const handleShare = () => {
 *     trackEvent('article_shared', { article_id: '123', platform: 'twitter' });
 * };
 */
