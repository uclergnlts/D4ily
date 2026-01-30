import { Redis } from '@upstash/redis';
import { env } from './env.js';
import { logger } from './logger.js';
import { redisCircuitBreaker } from '../utils/circuitBreaker.js';

export const redis = new Redis({
    url: env.UPSTASH_REDIS_REST_URL,
    token: env.UPSTASH_REDIS_REST_TOKEN,
});

// Helper function to add timeout to promises
function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T | null> {
    return Promise.race([
        promise,
        new Promise<null>((resolve) => setTimeout(() => resolve(null), timeoutMs)),
    ]);
}

// Helper functions with graceful fallbacks and circuit breaker
export async function cacheGet<T>(key: string): Promise<T | null> {
    return redisCircuitBreaker.execute(
        'redis:cacheGet',
        async () => {
            const data = await withTimeout(redis.get(key), 5000);
            return data as T | null;
        },
        () => null // Fallback returns null
    );
}

export async function cacheSet(key: string, value: any, ttlSeconds?: number) {
    return redisCircuitBreaker.execute(
        'redis:cacheSet',
        async () => {
            if (ttlSeconds) {
                await withTimeout(redis.set(key, value, { ex: ttlSeconds }), 5000);
            } else {
                await withTimeout(redis.set(key, value), 5000);
            }
        },
        () => undefined // Fallback does nothing
    );
}

export async function cacheInvalidate(pattern: string) {
    return redisCircuitBreaker.execute(
        'redis:cacheInvalidate',
        async () => {
            const keys = await withTimeout(redis.keys(pattern), 5000);
            if (keys && keys.length > 0) {
                await withTimeout(redis.del(...keys), 5000);
            }
        },
        () => undefined // Fallback does nothing
    );
}
