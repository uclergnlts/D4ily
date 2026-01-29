import { vi, afterEach } from 'vitest';

// Mock environment variables
process.env.NODE_ENV = 'test';
process.env.PORT = '3333';
process.env.TURSO_DATABASE_URL = 'libsql://test-db.turso.io';
process.env.TURSO_AUTH_TOKEN = 'test-token';
process.env.UPSTASH_REDIS_REST_URL = 'https://test-redis.upstash.io';
process.env.UPSTASH_REDIS_REST_TOKEN = 'test-token';
process.env.OPENAI_API_KEY = 'test-openai-key';
process.env.FIREBASE_PROJECT_ID = 'test-project';
process.env.FIREBASE_CLIENT_EMAIL = 'test@example.com';
process.env.FIREBASE_PRIVATE_KEY = '-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQDb...\n-----END PRIVATE KEY-----\n';
process.env.LOG_LEVEL = 'error';

// Clean up after each test
afterEach(() => {
    vi.clearAllMocks();
});
