# Backend Test Infrastructure Analysis Report

## Executive Summary

This report provides a comprehensive analysis of the backend test infrastructure, identifying critical issues, bugs, and inconsistencies that cause the "No test suite found" error across all 30 test files.

---

## 1. Critical Issues Identified

### 1.1 Setup File Conflicts

**File:** [`tests/setup.ts`](backend/tests/setup.ts)

**Issue:** The setup file sets `LOG_LEVEL: 'silent'` but the Zod schema in [`src/config/env.ts`](backend/src/config/env.ts:29) only accepts `'error' | 'warn' | 'info' | 'debug'`.

```typescript
// setup.ts line 18
process.env.LOG_LEVEL = 'silent'; // ❌ Invalid value

// env.ts line 29
LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
```

**Impact:** Causes ZodError during module initialization, preventing test discovery.

**Fix:** Change to `'error'` in setup.ts.

---

### 1.2 Vitest Configuration vs Setup File Redundancy

**Files:** 
- [`vitest.config.ts`](backend/vitest.config.ts)
- [`tests/setup.ts`](backend/tests/setup.ts)

**Issue:** Environment variables are defined in both files with inconsistent values:

| Variable | vitest.config.ts | setup.ts |
|----------|------------------|----------|
| `LOG_LEVEL` | `'error'` | `'silent'` |
| `UPSTASH_REDIS_REST_URL` | `'https://test-redis.upstash.io'` | `'https://test-redis'` |

**Impact:** Race condition - which file loads first determines the values.

**Fix:** Remove environment variable setup from `setup.ts` and rely solely on `vitest.config.ts`.

---

### 1.3 Missing setupFiles Configuration

**File:** [`vitest.config.ts`](backend/vitest.config.ts)

**Issue:** The `setup.ts` file is never referenced in vitest config:

```typescript
// vitest.config.ts - MISSING:
// setupFiles: ['./tests/setup.ts'],
```

**Impact:** Global mocks in setup.ts are not applied, causing module resolution failures.

**Fix:** Add `setupFiles` to vitest config.

---

### 1.4 vi.mock Hoisting Issues

**Affected Files:** Multiple test files

**Issue:** Variables defined outside `vi.mock()` factory functions are referenced inside, causing hoisting errors.

**Example from [`tests/unit/auth.middleware.test.ts`](backend/tests/unit/auth.middleware.test.ts:5-17):**

```typescript
// ❌ WRONG - Variables defined outside mock
const mockVerifyIdToken = vi.fn();
let mockIsFirebaseEnabled = true;

vi.mock('@/config/firebase.js', () => ({
    get adminAuth() {
        return mockIsFirebaseEnabled ? { // ❌ References external variable
            verifyIdToken: mockVerifyIdToken, // ❌ References external variable
        } : null;
    },
}));
```

**Impact:** Vitest hoists `vi.mock()` calls to the top of the file, but the variables don't exist yet.

**Fix:** Define all mock values inside the factory function or use `vi.hoisted()`.

---

### 1.5 TypeScript Path Alias Resolution

**Files:**
- [`tsconfig.json`](backend/tsconfig.json)
- [`vitest.config.ts`](backend/vitest.config.ts)

**Issue:** The `tsconfig.json` excludes the `tests` directory:

```json
// tsconfig.json line 26-30
"exclude": [
    "node_modules",
    "dist",
    "tests"  // ❌ Tests are excluded from TypeScript compilation
]
```

**Impact:** TypeScript doesn't process test files, causing potential type errors.

**Fix:** Create a separate `tsconfig.test.json` that includes tests.

---

### 1.6 Import Path Inconsistency

**Issue:** Test files use `@/` alias with `.js` extension:

```typescript
// Example from tests
import { handleError } from '@/utils/errors.js';
```

But the actual source files don't have `.js` extensions. This works in production due to ESM resolution but can cause issues in test environment.

**Fix:** Ensure consistent import paths across all test files.

---

## 2. Mock Configuration Issues

### 2.1 Database Mock Inconsistency

**Issue:** Different test files mock the database differently, leading to inconsistent behavior:

**Pattern A - Simple mock:**
```typescript
vi.mock('@/config/db.js', () => ({
    db: {
        select: vi.fn(),
        insert: vi.fn(),
    }
}));
```

**Pattern B - Query builder mock:**
```typescript
vi.mock('@/config/db.js', () => {
    const createQueryBuilder = () => ({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        get: vi.fn().mockResolvedValue(mockData),
        // ...
    });
    return { db: { select: vi.fn(() => createQueryBuilder()) } };
});
```

**Impact:** Tests may pass or fail depending on which mock pattern is used.

**Fix:** Create a centralized mock factory in `tests/mocks/db.ts`.

---

### 2.2 Firebase Mock Missing Properties

**File:** [`tests/integration/routes/admin.test.ts`](backend/tests/integration/routes/admin.test.ts:39-48)

**Issue:** Firebase mock doesn't include all methods used by the application:

```typescript
vi.mock('@/config/firebase.js', () => ({
    adminAuth: {
        verifyIdToken: vi.fn().mockResolvedValue({...}),
        // ❌ Missing: createUser, deleteUser, etc.
    },
    isFirebaseEnabled: true,
}));
```

**Impact:** Tests fail when routes use unmocked Firebase methods.

**Fix:** Create comprehensive Firebase mock with all methods.

---

### 2.3 Redis Mock Incomplete

**File:** [`tests/unit/rateLimit.test.ts`](backend/tests/unit/rateLimit.test.ts:5-10)

**Issue:** Redis mock is minimal:

```typescript
vi.mock('@/config/redis.js', () => ({
    redis: {
        incr: vi.fn().mockResolvedValue(1),
        expire: vi.fn().mockResolvedValue(true),
    },
}));
```

**Missing methods:** `get`, `set`, `del`, `keys`, etc.

**Fix:** Add all Redis methods used in the application.

---

## 3. Test Structure Issues

### 3.1 Integration Tests Start Real Servers

**Files:** All integration test files

**Issue:** Integration tests use `@hono/node-server` to start actual HTTP servers:

```typescript
const server = serve({
    fetch: app.fetch,
    port: 0, // Random port
});
```

**Impact:** 
- Port conflicts when running tests in parallel
- Server cleanup issues causing test hangs
- Resource leaks

**Fix:** Use Hono's built-in `app.request()` method instead of supertest with real servers.

---

### 3.2 Missing afterAll Cleanup

**Issue:** Some test files don't properly close servers:

```typescript
// ❌ Missing or incomplete cleanup
afterAll(async () => {
    await new Promise<void>((resolve) => {
        server.close(() => resolve());
    });
});
```

**Impact:** Tests hang or fail due to open handles.

**Fix:** Ensure all integration tests have proper cleanup.

---

### 3.3 Test Isolation Issues

**Issue:** Tests modify shared mock state without resetting:

```typescript
// Example from comments.test.ts
let mockComment: any = {...};

// Test modifies shared state
it('should return 404', async () => {
    mockComment = null; // ❌ Affects subsequent tests
});
```

**Fix:** Use `beforeEach` to reset all mock state.

---

## 4. Type Definition Issues

### 4.1 Missing Test Type Declarations

**Issue:** No `@types/supertest` augmentation for Hono server type.

**Impact:** TypeScript errors when using `request(server)`.

**Fix:** Add type declarations or use proper typing.

---

### 4.2 Inconsistent AuthUser Type

**File:** [`src/middleware/auth.ts`](backend/src/middleware/auth.ts:8-13)

**Issue:** `AuthUser` interface doesn't match mock implementations:

```typescript
// Source
export interface AuthUser {
    uid: string;
    email: string | undefined;
    emailVerified: boolean;
    userRole?: 'user' | 'admin';
}

// Mock (different property names)
c.set('user', {
    uid: 'test-user-id',
    email: 'test@example.com',
    email_verified: true, // ❌ Should be emailVerified
});
```

**Fix:** Ensure mock objects match interface definitions.

---

## 5. Vitest Integration Issues

### 5.1 Missing Global Types

**File:** [`vitest.config.ts`](backend/vitest.config.ts:6)

**Issue:** `globals: true` is set but TypeScript doesn't know about global test functions.

**Fix:** Add to `tsconfig.json`:
```json
{
    "compilerOptions": {
        "types": ["vitest/globals"]
    }
}
```

---

### 5.2 Coverage Configuration

**Issue:** Coverage excludes important directories but includes others incorrectly:

```typescript
exclude: [
    '**/node_modules/**',
    '**/dist/**',
    '**/*.config.*',
    '**/tests/**',
    '**/drizzle/**', // ❌ Should be db/migrations
],
```

**Fix:** Update coverage exclusions to match actual project structure.

---

## 6. Recommended Fixes

### Priority 1: Critical Fixes (Blocking Tests)

1. **Fix LOG_LEVEL validation**
   - Change `setup.ts` line 18 to `'error'`
   - Or add `'silent'` to Zod enum in `env.ts`

2. **Add setupFiles to vitest.config.ts**
   ```typescript
   test: {
       setupFiles: ['./tests/setup.ts'],
       // ...
   }
   ```

3. **Fix vi.mock hoisting in auth.middleware.test.ts**
   ```typescript
   vi.mock('@/config/firebase.js', () => {
       const mockVerifyIdToken = vi.fn();
       return {
           adminAuth: { verifyIdToken: mockVerifyIdToken },
           isFirebaseEnabled: true,
       };
   });
   ```

### Priority 2: Structural Improvements

4. **Create centralized mock factories**
   - `tests/mocks/db.ts`
   - `tests/mocks/firebase.ts`
   - `tests/mocks/redis.ts`

5. **Create tsconfig.test.json**
   ```json
   {
       "extends": "./tsconfig.json",
       "include": ["src/**/*", "tests/**/*"],
       "compilerOptions": {
           "types": ["vitest/globals", "node"]
       }
   }
   ```

6. **Replace supertest with Hono's app.request()**
   ```typescript
   // Instead of:
   const server = serve({ fetch: app.fetch, port: 0 });
   await request(server).get('/test');
   
   // Use:
   const res = await app.request('/test');
   ```

### Priority 3: Best Practices

7. **Standardize mock patterns across all test files**

8. **Add proper TypeScript types for test utilities**

9. **Implement test isolation with beforeEach resets**

10. **Add test coverage thresholds**

---

## 7. Implementation Checklist

- [ ] Fix LOG_LEVEL in setup.ts
- [ ] Add setupFiles to vitest.config.ts
- [ ] Fix vi.mock hoisting in auth.middleware.test.ts
- [ ] Create centralized mock factories
- [ ] Create tsconfig.test.json
- [ ] Refactor integration tests to use app.request()
- [ ] Standardize mock patterns
- [ ] Add proper cleanup in afterAll hooks
- [ ] Fix AuthUser type consistency
- [ ] Add vitest/globals to TypeScript types

---

## 8. Estimated Impact

After implementing these fixes:
- **Expected passing tests:** 25-28 out of 30
- **Remaining issues:** Edge cases in complex integration tests
- **Test execution time:** ~50% faster without real servers

---

## Appendix: File-by-File Issues

| Test File | Issues |
|-----------|--------|
| `example.test.ts` | ✅ No issues |
| `errors.test.ts` | vi.doMock usage |
| `similarity.test.ts` | ✅ No issues |
| `aiService.test.ts` | Missing detailContent in mock response |
| `auth.middleware.test.ts` | vi.mock hoisting |
| `rateLimit.test.ts` | Incomplete Redis mock |
| `digestService.test.ts` | ✅ No issues |
| `weeklyService.test.ts` | ✅ No issues |
| `perspectivesService.test.ts` | ✅ No issues |
| `detailContent.regression.test.ts` | ✅ No issues |
| `admin.test.ts` | Server cleanup, mock complexity |
| `auth.test.ts` | Server cleanup |
| `feed.test.ts` | Server cleanup, complex mocks |
| `comments.test.ts` | Shared state mutation |
| Other integration tests | Similar server/mock issues |
