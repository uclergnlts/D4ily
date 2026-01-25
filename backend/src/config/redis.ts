import { Redis } from '@upstash/redis';
import { env } from './env.js';

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

// Helper functions with graceful fallbacks
export async function cacheGet<T>(key: string): Promise<T | null> {
    try {
        const data = await withTimeout(redis.get(key), 3000);
        return data as T | null;
    } catch (error) {
        console.warn('Redis cacheGet failed:', error);
        return null;
    }
}

export async function cacheSet(key: string, value: any, ttlSeconds?: number) {
    try {
        if (ttlSeconds) {
            await withTimeout(redis.set(key, value, { ex: ttlSeconds }), 3000);
        } else {
            await withTimeout(redis.set(key, value), 3000);
        }
    } catch (error) {
        console.warn('Redis cacheSet failed:', error);
    }
}

export async function cacheInvalidate(pattern: string) {
    try {
        const keys = await withTimeout(redis.keys(pattern), 3000);
        if (keys && keys.length > 0) {
            await withTimeout(redis.del(...keys), 3000);
        }
    } catch (error) {
        console.warn('Redis cacheInvalidate failed:', error);
    }
}
