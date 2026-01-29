import * as Sentry from '@sentry/node';
import { env } from './env';

/**
 * Sentry Configuration for Backend
 * Production-ready error tracking and performance monitoring
 */

export function initSentry() {
    if (env.NODE_ENV === 'production' && env.SENTRY_DSN) {
        Sentry.init({
            dsn: env.SENTRY_DSN,
            environment: env.NODE_ENV,
            tracesSampleRate: env.NODE_ENV === 'production' ? 0.1 : 1.0,
            profilesSampleRate: env.NODE_ENV === 'production' ? 0.1 : 1.0,
            
            // Integrations
            integrations: [
                new Sentry.Integrations.Http({ tracing: true }),
                new Sentry.Integrations.Express({ app: null }),
                new Sentry.Integrations.OnUncaughtException(),
                new Sentry.Integrations.OnUnhandledRejection(),
            ],

            // Before send hook to filter sensitive data and anonymize user data
            beforeSend(event, hint) {
                // Remove sensitive data from request headers
                if (event.request?.headers) {
                    delete event.request.headers['authorization'];
                    delete event.request.headers['cookie'];
                    delete event.request.headers['x-api-key'];
                }

                // Filter out specific error types
                if (event.exception) {
                    const error = hint?.originalException as Error;
                    if (error?.message?.includes('ETIMEDOUT')) {
                        // Don't report timeout errors
                        return null;
                    }
                }

                // Anonymize user data
                if (event.user) {
                    event.user = {
                        id: event.user.id,
                        ip_address: event.user.ip_address,
                    };
                }

                return event;
            },

            // Release tracking
            release: process.env.RELEASE_VERSION || '1.0.0',
        });

        console.log('✅ Sentry initialized successfully');
    } else {
        console.log('⚠️ Sentry not initialized (missing DSN or not in production)');
    }
}

/**
 * Set user context for Sentry
 */
export function setSentryUser(userId: string, email?: string) {
    Sentry.setUser({
        id: userId,
        email: email ? email.replace(/(.{2})(.*)(@.*)/, '$1***$3') : undefined,
    });
}

/**
 * Clear user context
 */
export function clearSentryUser() {
    Sentry.setUser(null);
}

/**
 * Capture exception with additional context
 */
export function captureException(error: Error, context?: Record<string, any>) {
    if (context) {
        Sentry.withScope((scope) => {
            Object.entries(context).forEach(([key, value]) => {
                scope.setContext(key, value);
            });
            Sentry.captureException(error);
        });
    } else {
        Sentry.captureException(error);
    }
}

/**
 * Capture message with level
 */
export function captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info') {
    Sentry.captureMessage(message, level);
}

/**
 * Add breadcrumb for better error context
 */
export function addBreadcrumb(category: string, message: string, data?: Record<string, any>) {
    Sentry.addBreadcrumb({
        category,
        message,
        level: 'info',
        data,
    });
}

/**
 * Start a performance transaction
 */
export function startTransaction(name: string, op: string) {
    return Sentry.startTransaction({
        name,
        op,
    });
}

export { Sentry };
