import { beforeAll, afterAll, afterEach, vi } from 'vitest';

// Note: Environment variables are now set in vitest.config.ts
// This file only contains global mocks and hooks

// Mock pino with event emitter interface
vi.mock('pino', () => {
    const mockLogger = {
        info: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
        debug: vi.fn(),
        trace: vi.fn(),
        fatal: vi.fn(),
        child: vi.fn().mockReturnThis(),
        level: 'error',
        on: vi.fn(),
        once: vi.fn(),
        emit: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        off: vi.fn(),
    };
    const pinoFn = vi.fn(() => mockLogger);
    // Add static properties
    Object.assign(pinoFn, {
        destination: vi.fn(() => ({
            on: vi.fn(),
            write: vi.fn(),
            end: vi.fn(),
        })),
        transport: vi.fn(() => ({
            on: vi.fn(),
        })),
    });
    return {
        default: pinoFn,
        pino: pinoFn,
    };
});

// Mock logger module
vi.mock('../src/config/logger', () => ({
    logger: {
        info: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
        debug: vi.fn(),
        trace: vi.fn(),
        fatal: vi.fn(),
        child: vi.fn().mockReturnThis(),
    }
}));

// Mock db with chainable query builder
vi.mock('../src/config/db', () => {
    const createQueryBuilder = () => ({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        offset: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        leftJoin: vi.fn().mockReturnThis(),
        groupBy: vi.fn().mockReturnThis(),
        get: vi.fn().mockResolvedValue(null),
        all: vi.fn().mockResolvedValue([]),
        then: (resolve: any) => resolve([]),
        values: vi.fn().mockReturnThis(),
        returning: vi.fn().mockReturnThis(),
        set: vi.fn().mockReturnThis(),
    });
    
    return {
        db: {
            select: vi.fn().mockReturnValue(createQueryBuilder()),
            insert: vi.fn().mockReturnValue(createQueryBuilder()),
            update: vi.fn().mockReturnValue(createQueryBuilder()),
            delete: vi.fn().mockReturnValue(createQueryBuilder()),
        },
    };
});

// Mock env
vi.mock('../src/config/env', () => ({
    env: {
        NODE_ENV: 'test',
        PORT: '3333',
        TURSO_DATABASE_URL: 'libsql://test-db.turso.io',
        TURSO_AUTH_TOKEN: 'test-token',
        FIREBASE_PROJECT_ID: 'test-project',
        UPSTASH_REDIS_REST_URL: 'https://test-redis.upstash.io',
        UPSTASH_REDIS_REST_TOKEN: 'test-token',
        LOG_LEVEL: 'error',
    }
}));

// Setup runs before all tests
beforeAll(() => {
    console.log('🧪 Test suite starting...');
});

// Cleanup runs after all tests
afterAll(() => {
    console.log('✅ Test suite completed');
});

// Reset state after each test
afterEach(() => {
    vi.clearAllMocks();
});

// Export empty object to make this a module
export {};
