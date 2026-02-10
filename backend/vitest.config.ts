import { defineConfig } from 'vitest/config';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
    test: {
        globals: true,
        environment: 'node',
        include: ['tests/**/*.test.ts'],
        // setupFiles: ['./tests/setup.ts'],
        deps: {
            interopDefault: true,
        },
        env: {
            NODE_ENV: 'test',
            PORT: '3333',
            TURSO_DATABASE_URL: 'libsql://test-db.turso.io',
            TURSO_AUTH_TOKEN: 'test-token',
            UPSTASH_REDIS_REST_URL: 'https://test-redis.upstash.io',
            UPSTASH_REDIS_REST_TOKEN: 'test-token',
            OPENAI_API_KEY: 'test-openai-key',
            FIREBASE_PROJECT_ID: 'test-project',
            FIREBASE_CLIENT_EMAIL: 'test@example.com',
            FIREBASE_PRIVATE_KEY: '-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQDb...\n-----END PRIVATE KEY-----\n',
            ADMIN_API_KEY: 'test-admin-key',
            ENCRYPTION_KEY: '12345678901234567890123456789012',
            CLOUDINARY_CLOUD_NAME: 'test-cloud',
            CLOUDINARY_API_KEY: 'test-api-key',
            LOG_LEVEL: 'error',
        },
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html'],
            reportOnFailure: true,
            exclude: [
                '**/node_modules/**',
                '**/dist/**',
                '**/*.config.*',
                '**/tests/**',
                '**/drizzle/**',
                '**/scripts/**',
            ],
            include: ['src/**'],
            all: true,
        },
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
        testTimeout: 10000,
        hookTimeout: 10000,
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },
});
