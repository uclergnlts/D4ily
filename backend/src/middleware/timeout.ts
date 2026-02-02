import { Context, Next } from 'hono';
import { logger } from '../config/logger.js';

interface TimeoutOptions {
    timeout: number;          // Timeout in milliseconds
    message?: string;         // Error message
    onTimeout?: () => void;   // Callback when timeout occurs
}

/**
 * Create timeout middleware for Hono
 * Aborts request if it takes longer than specified timeout
 */
export function timeout(options: TimeoutOptions) {
    const { timeout: timeoutMs, message = 'Request timeout' } = options;

    return async (c: Context, next: Next) => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => {
            controller.abort();
        }, timeoutMs);

        const startTime = Date.now();

        try {
            // Create a promise that rejects on timeout
            const timeoutPromise = new Promise<never>((_, reject) => {
                controller.signal.addEventListener('abort', () => {
                    reject(new Error('TIMEOUT'));
                });
            });

            // Race between the actual request and timeout
            await Promise.race([
                next(),
                timeoutPromise,
            ]);
        } catch (error) {
            if (error instanceof Error && error.message === 'TIMEOUT') {
                const duration = Date.now() - startTime;
                logger.warn({
                    path: c.req.path,
                    method: c.req.method,
                    duration,
                    timeoutMs,
                }, 'Request timeout');

                if (options.onTimeout) {
                    options.onTimeout();
                }

                return c.json({
                    success: false,
                    error: message,
                    code: 'REQUEST_TIMEOUT',
                }, 408);
            }
            throw error;
        } finally {
            clearTimeout(timeoutId);
        }
    };
}

// Pre-configured timeout middlewares
export const feedTimeout = timeout({
    timeout: 10000,  // 10 seconds for feed endpoints
    message: 'Feed request timeout. Please try again.',
});

export const aiTimeout = timeout({
    timeout: 30000,  // 30 seconds for AI-heavy endpoints
    message: 'AI processing timeout. Please try again.',
});

export const defaultTimeout = timeout({
    timeout: 60000,  // 60 seconds default
    message: 'Request timeout. Please try again.',
});

/**
 * Create a route-specific timeout middleware
 */
export function createTimeout(timeoutMs: number, customMessage?: string) {
    return timeout({
        timeout: timeoutMs,
        message: customMessage || `Request timeout after ${timeoutMs}ms`,
    });
}
