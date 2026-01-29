import { vi } from 'vitest';

/**
 * Creates a mock Redis client with in-memory store
 */
export const createMockRedis = () => {
    const store = new Map<string, any>();
    
    return {
        get: vi.fn().mockImplementation((key: string) => Promise.resolve(store.get(key) || null)),
        set: vi.fn().mockImplementation((key: string, value: any) => {
            store.set(key, value);
            return Promise.resolve('OK');
        }),
        del: vi.fn().mockImplementation((key: string) => {
            const existed = store.has(key);
            store.delete(key);
            return Promise.resolve(existed ? 1 : 0);
        }),
        incr: vi.fn().mockImplementation((key: string) => {
            const current = store.get(key) || 0;
            const newValue = current + 1;
            store.set(key, newValue);
            return Promise.resolve(newValue);
        }),
        expire: vi.fn().mockResolvedValue(true),
        keys: vi.fn().mockImplementation((pattern: string) => {
            const keys = Array.from(store.keys());
            // Simple pattern matching (just * wildcard)
            const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
            return Promise.resolve(keys.filter(k => regex.test(k)));
        }),
        exists: vi.fn().mockImplementation((key: string) => Promise.resolve(store.has(key) ? 1 : 0)),
        ttl: vi.fn().mockResolvedValue(-1),
        // Test utilities
        _store: store,
        _reset: () => store.clear(),
    };
};

/**
 * Creates mock cache functions
 */
export const createMockCache = () => {
    const cache = new Map<string, any>();
    
    return {
        cacheGet: vi.fn().mockImplementation((key: string) => Promise.resolve(cache.get(key) || null)),
        cacheSet: vi.fn().mockImplementation((key: string, value: any) => {
            cache.set(key, value);
            return Promise.resolve(undefined);
        }),
        _cache: cache,
        _reset: () => cache.clear(),
    };
};

/**
 * Creates a simple mock Redis that always returns default values
 */
export const createSimpleMockRedis = () => {
    return {
        get: vi.fn().mockResolvedValue(null),
        set: vi.fn().mockResolvedValue('OK'),
        del: vi.fn().mockResolvedValue(1),
        incr: vi.fn().mockResolvedValue(1),
        expire: vi.fn().mockResolvedValue(true),
        keys: vi.fn().mockResolvedValue([]),
        exists: vi.fn().mockResolvedValue(0),
        ttl: vi.fn().mockResolvedValue(-1),
    };
};
