import { beforeAll, afterAll, afterEach, vi } from 'vitest';

// Mock pino FIRST before any other imports
vi.mock('pino', () => {
    const mockLogger = {
        info: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
        debug: vi.fn(),
        trace: vi.fn(),
        fatal: vi.fn(),
        child: vi.fn().mockReturnThis(),
        level: 'silent',
    };
    return {
        default: vi.fn(() => mockLogger),
        pino: vi.fn(() => mockLogger),
    };
});

// Mock environment variables to ensure env.ts passes validation
process.env.NODE_ENV = 'test';
process.env.PORT = '3333';
process.env.TURSO_DATABASE_URL = 'libsql://test-db.turso.io';
process.env.TURSO_AUTH_TOKEN = 'test-token';
process.env.OPENAI_API_KEY = 'test-openai-key';
process.env.FIREBASE_PROJECT_ID = 'test-project';
process.env.FIREBASE_CLIENT_EMAIL = 'test@example.com';
process.env.FIREBASE_PRIVATE_KEY = '-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQDb...\n-----END PRIVATE KEY-----\n';
process.env.ADMIN_API_KEY = 'test-admin-key';
process.env.ENCRYPTION_KEY = '12345678901234567890123456789012'; // 32 chars
process.env.CLOUDINARY_CLOUD_NAME = 'test-cloud';
process.env.CLOUDINARY_API_KEY = 'test-api-key';
vi.mock('../src/config/db', () => ({
    db: {
        select: vi.fn(),
        from: vi.fn(),
        where: vi.fn(),
        limit: vi.fn(),
        offset: vi.fn(),
        orderBy: vi.fn(),
        leftJoin: vi.fn(),
        insert: vi.fn().mockReturnValue({ values: vi.fn() }),
        update: vi.fn().mockReturnValue({ set: vi.fn() }),
        delete: vi.fn(),
    },
}));

vi.mock('../src/config/env', () => ({
    env: {
        NODE_ENV: 'test',
        PORT: '3333',
        TURSO_DATABASE_URL: 'libsql://test-db',
        TURSO_AUTH_TOKEN: 'test-token',
        FIREBASE_PROJECT_ID: 'test-project',
        UPSTASH_REDIS_REST_URL: 'https://test-redis',
        UPSTASH_REDIS_REST_TOKEN: 'test-token',
        LOG_LEVEL: 'silent',
    }
}));

// Mock logger to avoid pino issues in tests
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

// Setup runs before all tests
beforeAll(async () => {
    console.log('🧪 Test suite starting...');
});

// Cleanup runs after all tests
afterAll(async () => {
    console.log('✅ Test suite completed');
});

// Reset state after each test
afterEach(async () => {
    // Clear any test data if needed
});
