# Backend Test Fixes - Implementation Guide

This document contains the exact code changes needed to fix the backend test infrastructure.

---

## Fix 1: Update setup.ts - LOG_LEVEL

**File:** `backend/tests/setup.ts`

**Change line 18 from:**
```typescript
process.env.LOG_LEVEL = 'silent';
```

**To:**
```typescript
process.env.LOG_LEVEL = 'error';
```

---

## Fix 2: Add setupFiles to vitest.config.ts

**File:** `backend/vitest.config.ts`

**Add after line 8:**
```typescript
setupFiles: ['./tests/setup.ts'],
```

**Full updated config:**
```typescript
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
    test: {
        globals: true,
        environment: 'node',
        include: ['tests/**/*.test.ts'],
        setupFiles: ['./tests/setup.ts'],
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
            exclude: [
                '**/node_modules/**',
                '**/dist/**',
                '**/*.config.*',
                '**/tests/**',
                '**/db/migrations/**',
            ],
            all: true,
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
```

---

## Fix 3: Fix auth.middleware.test.ts vi.mock Hoisting

**File:** `backend/tests/unit/auth.middleware.test.ts`

**Replace lines 1-28 with:**
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';

// Use vi.hoisted to define mock functions that can be referenced in vi.mock
const { mockVerifyIdToken, setFirebaseEnabled } = vi.hoisted(() => {
    const mockVerifyIdToken = vi.fn();
    let isEnabled = true;
    return {
        mockVerifyIdToken,
        setFirebaseEnabled: (enabled: boolean) => { isEnabled = enabled; },
        getFirebaseEnabled: () => isEnabled,
    };
});

// Mock Firebase with hoisted values
vi.mock('@/config/firebase.js', () => {
    let isEnabled = true;
    return {
        get adminAuth() {
            return isEnabled ? {
                verifyIdToken: mockVerifyIdToken,
            } : null;
        },
        get isFirebaseEnabled() {
            return isEnabled;
        },
        setFirebaseEnabled: (enabled: boolean) => { isEnabled = enabled; },
    };
});

vi.mock('@/config/logger.js', () => ({
    logger: {
        info: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
        debug: vi.fn(),
    },
}));

import { authMiddleware, optionalAuthMiddleware, AuthUser } from '@/middleware/auth.js';
import { setFirebaseEnabled as setEnabled } from '@/config/firebase.js';
```

---

## Fix 4: Create Centralized Mock Factory

**Create new file:** `backend/tests/mocks/db.ts`

```typescript
import { vi } from 'vitest';

export const createMockQueryBuilder = (defaultData: any = null) => {
    return {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        offset: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        leftJoin: vi.fn().mockReturnThis(),
        groupBy: vi.fn().mockReturnThis(),
        get: vi.fn().mockResolvedValue(defaultData),
        all: vi.fn().mockResolvedValue(defaultData ? [defaultData] : []),
        then: (resolve: any) => resolve(defaultData ? [defaultData] : []),
        values: vi.fn().mockReturnThis(),
        returning: vi.fn().mockReturnThis(),
        set: vi.fn().mockReturnThis(),
    };
};

export const createMockDb = (defaultData: any = null) => {
    const queryBuilder = createMockQueryBuilder(defaultData);
    return {
        db: {
            select: vi.fn().mockReturnValue(queryBuilder),
            insert: vi.fn().mockReturnValue(queryBuilder),
            update: vi.fn().mockReturnValue(queryBuilder),
            delete: vi.fn().mockReturnValue(queryBuilder),
        },
        queryBuilder,
    };
};
```

---

## Fix 5: Create Centralized Firebase Mock

**Create new file:** `backend/tests/mocks/firebase.ts`

```typescript
import { vi } from 'vitest';

export const createMockFirebaseAuth = () => {
    return {
        verifyIdToken: vi.fn().mockResolvedValue({
            uid: 'test-user-uid',
            email: 'test@example.com',
            email_verified: true,
        }),
        createUser: vi.fn().mockResolvedValue({ uid: 'new-user-uid' }),
        createCustomToken: vi.fn().mockResolvedValue('mock-custom-token'),
        getUser: vi.fn().mockResolvedValue({
            uid: 'test-user-uid',
            email: 'test@example.com',
        }),
        deleteUser: vi.fn().mockResolvedValue(undefined),
        generateEmailVerificationLink: vi.fn().mockResolvedValue('https://verify.link'),
        updateUser: vi.fn().mockResolvedValue(undefined),
    };
};

export const mockFirebaseModule = (options: { enabled?: boolean } = {}) => {
    const { enabled = true } = options;
    const adminAuth = createMockFirebaseAuth();
    
    return {
        adminAuth: enabled ? adminAuth : null,
        isFirebaseEnabled: enabled,
        _mockAuth: adminAuth, // For test access
    };
};
```

---

## Fix 6: Create Centralized Redis Mock

**Create new file:** `backend/tests/mocks/redis.ts`

```typescript
import { vi } from 'vitest';

export const createMockRedis = () => {
    const store = new Map<string, any>();
    
    return {
        get: vi.fn().mockImplementation((key: string) => Promise.resolve(store.get(key))),
        set: vi.fn().mockImplementation((key: string, value: any) => {
            store.set(key, value);
            return Promise.resolve('OK');
        }),
        del: vi.fn().mockImplementation((key: string) => {
            store.delete(key);
            return Promise.resolve(1);
        }),
        incr: vi.fn().mockResolvedValue(1),
        expire: vi.fn().mockResolvedValue(true),
        keys: vi.fn().mockResolvedValue([]),
        _store: store, // For test access
        _reset: () => store.clear(),
    };
};

export const createMockCache = () => {
    return {
        cacheGet: vi.fn().mockResolvedValue(null),
        cacheSet: vi.fn().mockResolvedValue(undefined),
    };
};
```

---

## Fix 7: Create tsconfig.test.json

**Create new file:** `backend/tsconfig.test.json`

```json
{
    "extends": "./tsconfig.json",
    "compilerOptions": {
        "rootDir": ".",
        "types": ["vitest/globals", "node"]
    },
    "include": [
        "src/**/*",
        "tests/**/*"
    ],
    "exclude": [
        "node_modules",
        "dist"
    ]
}
```

---

## Fix 8: Update setup.ts to Remove Redundant Env Vars

**File:** `backend/tests/setup.ts`

**Replace entire file with:**
```typescript
import { beforeAll, afterAll, afterEach, vi } from 'vitest';

// Note: Environment variables are now set in vitest.config.ts
// This file only contains global mocks and hooks

// Mock pino
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
    };
    return {
        default: vi.fn(() => mockLogger),
        pino: vi.fn(() => mockLogger),
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
```

---

## Fix 9: Update Integration Tests to Use app.request()

**Example refactor for feed.test.ts:**

**Before:**
```typescript
import request from 'supertest';
import { serve } from '@hono/node-server';

const server = serve({
    fetch: app.fetch,
    port: 0,
});

// In tests:
const response = await request(server).get('/feed/tr');
```

**After:**
```typescript
// Remove supertest and serve imports
// Remove server creation

// In tests:
const response = await app.request('/feed/tr');
const body = await response.json();
expect(response.status).toBe(200);
```

---

## Fix 10: Add Missing detailContent to aiService.test.ts Mock

**File:** `backend/tests/unit/aiService.test.ts`

**Update the mock response at line 36-48 to include detailContent:**
```typescript
vi.mocked(openai.chat.completions.create).mockResolvedValue({
    choices: [{
        message: {
            content: JSON.stringify({
                translated_title: 'Translated Title',
                summary: 'Test summary',
                detail_content: 'This is a detailed content that provides comprehensive coverage of the news story with additional context and expert analysis.',
                is_clickbait: false,
                is_ad: false,
                category: 'Teknoloji',
                topics: ['#Tech'],
                sentiment: 'positive',
                political_tone: -2,
                political_confidence: 0.75,
                government_mentioned: true,
            }),
        },
    }],
} as any);
```

---

## Implementation Order

1. **Fix 1** - LOG_LEVEL (Critical - blocks all tests)
2. **Fix 2** - setupFiles (Critical - enables global mocks)
3. **Fix 8** - Clean up setup.ts (Prevents conflicts)
4. **Fix 7** - tsconfig.test.json (TypeScript support)
5. **Fix 3** - auth.middleware.test.ts (Fixes hoisting)
6. **Fixes 4-6** - Mock factories (Standardization)
7. **Fix 9** - Integration test refactor (Performance)
8. **Fix 10** - aiService mock update (Feature completeness)

---

## Verification Steps

After implementing fixes:

1. Run `npm run build` to verify TypeScript compilation
2. Run `npm run test:unit` to verify unit tests
3. Run `npm run test:integration` to verify integration tests
4. Run `npm run test:coverage` to verify coverage

Expected results:
- Build: ✅ Success
- Unit tests: 15-16 passing
- Integration tests: 12-14 passing
- Coverage: >60%
