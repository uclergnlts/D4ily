import React from 'react';
import * as Sentry from '@sentry/react-native';
import { Platform } from 'react-native';

/**
 * Sentry Configuration for Mobile (React Native)
 * Production-ready error tracking and performance monitoring
 */

const SENTRY_DSN = process.env.EXPO_PUBLIC_SENTRY_DSN || '';

export function initSentry() {
    if (SENTRY_DSN) {
        Sentry.init({
            dsn: SENTRY_DSN,
            debug: __DEV__,
            environment: __DEV__ ? 'development' : 'production',
            
            // Performance monitoring
            tracesSampleRate: __DEV__ ? 1.0 : 0.1,
            profilesSampleRate: __DEV__ ? 1.0 : 0.1,
            
            // Session replay
            sessionReplay: {
                sessionSampleRate: __DEV__ ? 1.0 : 0.1,
                errorSampleRate: 1.0,
            },

            // Integrations
            integrations: [
                new Sentry.ReactNativeTracing({
                    tracingOrigins: ['localhost', /^\//],
                    routingInstrumentation: Sentry.ReactNavigationInstrumentation(),
                }),
            ],

            // Before send hook to filter sensitive data and attach device context
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
                    if (error?.message?.includes('Network request failed')) {
                        // Don't report network errors in development
                        if (__DEV__) return null;
                    }
                }

                // Attach device context
                event.contexts = {
                    ...event.contexts,
                    device: {
                        ...event.contexts?.device,
                        platform: Platform.OS,
                        osVersion: Platform.Version as string,
                    },
                };

                return event;
            },

            // Release tracking
            release: process.env.EXPO_PUBLIC_APP_VERSION || '1.0.0',
            dist: process.env.EXPO_PUBLIC_BUILD_NUMBER || '1',
        });

        console.log('✅ Sentry initialized successfully');
    } else {
        console.log('⚠️ Sentry not initialized (missing DSN)');
    }
}

/**
 * Set user context for Sentry
 */
export function setSentryUser(userId: string, email?: string, username?: string) {
    Sentry.setUser({
        id: userId,
        email: email ? email.replace(/(.{2})(.*)(@.*)/, '$1***$3') : undefined,
        username: username ? username.replace(/(.{2})(.*)/, '$1***') : undefined,
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

/**
 * Wrap a component with error boundary
 */
export function withErrorBoundary<P extends object>(
    Component: React.ComponentType<P>,
    fallback?: React.ReactNode
) {
    return Sentry.withErrorBoundary(Component, {
        fallback: fallback || <ErrorFallback />,
    });
}

/**
 * Default error fallback component
 */
function ErrorFallback() {
    return null; // You can customize this
}

export { Sentry };
