# D4ily Testing Patterns & Framework Guide

Comprehensive testing strategy for the D4ily project, focused on quality and maintainability.

## Test Framework Overview

### Backend (Node.js)
- **Framework**: Vitest (v1.x)
- **Test runner**: `npm run test` (watch mode) or `npm run test:coverage` (CI)
- **Configuration file**: `vitest.config.ts` in backend root
- **Language**: TypeScript (.ts files)
- **Environment**: Node.js
- **Coverage tool**: V8 provider

### Mobile & Admin
- **Framework**: Jest (configured but minimal testing)
- **Status**: Mobile has Jest setup but most testing is manual/E2E
- **Focus**: Backend unit and integration tests take priority

## Test File Locations & Naming

### Backend Test Structure
```
backend/tests/
├── unit/                    # Unit tests (mocked dependencies)
│   ├── *.test.ts           # Individual service/utility tests
│   ├── aiService.test.ts
│   ├── digestService.test.ts
│   └── errors.test.ts
├── integration/            # Integration tests (real routes)
│   └── routes/
│       ├── digest.test.ts
│       ├── admin.test.ts
│       └── auth.test.ts
```

### Naming Convention
- **Unit tests**: `featureName.test.ts` (e.g., `aiService.test.ts`)
- **Integration tests**: `featureName.test.ts` in `routes/` subdirectory
- **Test suites**: `describe()` blocks match file names for clarity
- **Test cases**: `it()` describes specific behavior being tested

## Vitest Configuration

### vitest.config.ts Settings
```typescript
export default defineConfig({
    test: {
        globals: true,              // Global test functions (describe, it, expect)
        environment: 'node',         // Node.js environment
        include: ['tests/**/*.test.ts'], // Test file patterns
        deps: {
            interopDefault: true,   // Default export interop
        },
        env: {
            NODE_ENV: 'test',
            PORT: '3333',
            LOG_LEVEL: 'error',     // Suppress logs during tests
            // ... other test env vars
        },
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html'],
            reportOnFailure: true,  // Generate reports even if tests fail
            exclude: [
                '**/node_modules/**',
                '**/dist/**',
                '**/*.config.*',
                '**/tests/**',
                '**/drizzle/**',
                '**/scripts/**',
            ],
            include: ['src/**'],     // Only report src/ coverage
            all: true,              // Include uncovered files
        },
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
        testTimeout: 10000,         // 10 second timeout per test
        hookTimeout: 10000,         // 10 second timeout for beforeEach/afterAll
    },
});
```

### Key Configuration Details
- **globals: true**: No need to import describe/it/expect
- **reportOnFailure: true**: Critical setting for generating coverage reports on test failures
- **include: ['src/**']**: Focuses coverage on actual source (excludes test files, configs, root ts files)
- **Test/Hook Timeouts**: 10 seconds allows for async operations

## Mocking Patterns

### Mock Factory Pattern (vi.hoisted)
**Use case**: When a mock references module-scope constants

```typescript
const { mockOpenaiCreate, mockOpenaiQuickCreate } = vi.hoisted(() => ({
    mockOpenaiCreate: vi.fn(),
    mockOpenaiQuickCreate: vi.fn(),
}));

vi.mock('@/config/openai.js', () => ({
    openai: {
        chat: { completions: { create: mockOpenaiCreate } },
    },
    openaiQuick: {
        chat: { completions: { create: mockOpenaiQuickCreate } },
    },
}));
```

**Why hoisted?**: Hoisted functions run before imports, allowing mock references in module scope.

### Simple Mock Pattern
**Use case**: Direct mock of modules without variable references

```typescript
vi.mock('@/config/logger.js', () => ({
    logger: {
        info: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
        debug: vi.fn(),
    },
}));
```

### Query Builder Mock (for Drizzle)
**Use case**: Mocking Drizzle ORM query chains

```typescript
const createQueryBuilder = () => ({
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    get: vi.fn().mockResolvedValue(mockData),
    then: (resolve: any) => resolve([mockData]),
});

vi.mock('@/config/db.js', () => ({
    db: {
        select: vi.fn(() => createQueryBuilder()),
        insert: vi.fn(() => createQueryBuilder()),
        update: vi.fn(() => createQueryBuilder()),
    }
}));
```

### Service/Function Mocks
**Use case**: Mocking imported services and functions

```typescript
vi.mock('@/services/digestService.js', () => ({
    getLatestDigest: vi.fn().mockResolvedValue({
        id: 'digest-1',
        countryCode: 'tr',
        period: 'morning',
        digestDate: '2026-01-22',
        summaryText: 'Günün özeti...',
    }),
    generateDailyDigest: vi.fn().mockResolvedValue({
        id: 'digest-1',
        success: true,
    }),
}));
```

### Circuit Breaker Mock
**Pattern**: Pass-through mock for testing circuit breaker behavior

```typescript
vi.mock('@/utils/circuitBreaker.js', () => {
    class MockCircuitBreaker {
        async execute<T>(_name: string, fn: () => Promise<T>, fallback?: () => T): Promise<T> {
            try {
                return await fn();
            } catch (error) {
                if (fallback) return fallback();
                throw error;
            }
        }
        getState() { return 'CLOSED'; }
        reset() {}
        getAllMetrics() { return {}; }
    }

    return {
        CircuitBreaker: MockCircuitBreaker,
        circuitBreaker: new MockCircuitBreaker(),
        openAICircuitBreaker: new MockCircuitBreaker(),
    };
});
```

## Test Structure & Patterns

### Basic Unit Test Example
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mocks must come before imports
vi.mock('@/config/openai.js', () => ({
    openai: {
        chat: { completions: { create: vi.fn() } },
    },
}));

// Import tested module after mocks
import { processArticleWithAI } from '@/services/ai/aiService.js';
import { openai } from '@/config/openai.js';

describe('AI Service', () => {
    beforeEach(() => {
        vi.clearAllMocks();  // Clear mocks between tests
    });

    describe('processArticleWithAI', () => {
        it('should process article successfully', async () => {
            vi.mocked(openai.chat.completions.create).mockResolvedValue({
                choices: [{
                    message: {
                        content: JSON.stringify({
                            translated_title: 'Translated Title',
                            summary: 'Test summary',
                        }),
                    },
                }],
            } as any);

            const result = await processArticleWithAI('Test Title', 'Test Content...', 'en');

            expect(result.translatedTitle).toBe('Translated Title');
            expect(result.summary).toBe('Test summary');
            expect(openai.chat.completions.create).toHaveBeenCalled();
        });

        it('should return fallback on OpenAI error', async () => {
            vi.mocked(openai.chat.completions.create).mockRejectedValue(
                new Error('API Error')
            );

            const result = await processArticleWithAI('Title', 'Content...', 'en');

            expect(result.translatedTitle).toBe('Title');  // Falls back to original
        });
    });
});
```

### Integration Test Example (Routes)
```typescript
import { describe, it, expect, vi, afterAll } from 'vitest';
import request from 'supertest';
import { Hono } from 'hono';
import { serve } from '@hono/node-server';

// Mock environment and services
vi.mock('@/config/env.js', () => ({
    env: {
        NODE_ENV: 'test',
        PORT: '3352',
    }
}));

vi.mock('@/services/digestService.js', () => ({
    getLatestDigest: vi.fn().mockResolvedValue({
        id: 'digest-1',
        countryCode: 'tr',
        summaryText: 'Günün özeti...',
    }),
}));

import digestRoute from '@/routes/digest.js';

const app = new Hono();
app.route('/digest', digestRoute);
const server = serve({
    fetch: app.fetch,
    port: 0,
});

describe('Digest API Integration Tests', () => {
    afterAll(async () => {
        await new Promise<void>((resolve) => {
            server.close(() => resolve());
        });
    });

    it('GET /digest/:country/latest should return digest', async () => {
        const response = await request(server)
            .get('/digest/tr/latest')
            .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.id).toBe('digest-1');
    });

    it('GET /digest/:country with invalid country should return 400', async () => {
        const response = await request(server)
            .get('/digest/invalid')
            .expect(400);

        expect(response.body.success).toBe(false);
    });
});
```

## Setup & Teardown

### beforeEach / afterEach
```typescript
beforeEach(() => {
    vi.clearAllMocks();  // Reset all mock call counts
});

afterEach(() => {
    vi.restoreAllMocks();  // Restore original implementations
});
```

### beforeAll / afterAll
```typescript
describe('Suite with server', () => {
    let server: any;

    beforeAll(() => {
        server = createServer();
    });

    afterAll(async () => {
        await new Promise<void>((resolve) => {
            server.close(() => resolve());
        });
    });
});
```

## Coverage Configuration

### Coverage Reports
- **Providers**: V8 (built-in to Vitest)
- **Formats**: Text, JSON, HTML
- **Report Location**: `coverage/` directory in project root
- **Command**: `npm run test:coverage` generates full report

### Coverage Exclusions
```typescript
exclude: [
    '**/node_modules/**',
    '**/dist/**',
    '**/*.config.*',
    '**/tests/**',
    '**/drizzle/**',
    '**/scripts/**',
]
```

### What's Covered
- All files in `src/` directory
- Services, utilities, routes, middleware
- Database operations (through mocks)

## What's Tested vs. Not Tested

### Heavily Tested
- ✅ **Core Services**: `aiService.test.ts`, `digestService.test.ts`, `weeklyService.test.ts`
- ✅ **Utilities**: `errors.test.ts`, `alignment.test.ts`, `similarity.test.ts`, `sanitize.test.ts`
- ✅ **Middleware**: `auth.middleware.test.ts`, `rateLimit.test.ts`, `timeout.test.ts`
- ✅ **API Routes**: All routes in `tests/integration/routes/` (digest, admin, auth, etc.)
- ✅ **Crons**: `digestCron.test.ts`, `scraperCron.test.ts`, `weeklyCron.test.ts`
- ✅ **Circuit Breaker**: `circuitBreaker.test.ts`
- ✅ **Request Wrapper**: `aiRequestWrapper.test.ts` (AI fallback strategy)
- ✅ **Data Validation**: `schemas.ts` tested indirectly through route tests

### Partially Tested
- 🟡 **Scraper Service**: `rssParser.test.ts` exists, full scraper integration less covered
- 🟡 **Perspectives Service**: `perspectivesService.test.ts` with mocked AI
- 🟡 **Feed Routes**: Basic happy path tested
- 🟡 **Comments Routes**: Core operations tested

### Not Tested (Acceptable Gap)
- ❌ **Config Files**: Environment loading assumed to work
- ❌ **Cron Job Scheduling**: Node-cron scheduling not mocked
- ❌ **Firebase Admin SDK**: Authentication logic mocked, not tested with real Firebase
- ❌ **Third-party APIs**: OpenAI, Upstash Redis mocked completely
- ❌ **Database Migrations**: Drizzle migrations assumed working
- ❌ **Mobile Components**: Manual E2E testing, no Jest setup active
- ❌ **Admin Panel**: Manual testing only

## Running Tests

### Development Mode (Watch)
```bash
npm run test          # All tests in watch mode
npm run test:unit    # Only unit tests
npm run test:integration  # Only integration tests
```

### CI/Coverage
```bash
npm run test:coverage  # Full coverage report with V8
npm run test:ui       # Browser-based test UI
```

### Windows/PowerShell Notes
- Direct piping to vitest can cause output capture issues
- Use PowerShell script files when needed:
  ```powershell
  powershell -File script.ps1
  ```
- `npm run test:coverage` is most reliable for report generation

## Test Data & Mocking Strategy

### Mock Data Consistency
- Use realistic data that matches production schema
- Timestamp formats: ISO strings or Unix timestamps
- IDs: UUID v4 format or descriptive strings (e.g., 'digest-1')
- Enums: Match backend schema exactly (e.g., 'tr', 'de', 'us')

### AI Service Mocking
- Mock OpenAI responses as valid JSON strings in `content` field
- Always include required fields: `translated_title`, `summary`, `category`
- Optional fields mock realistic values (sentiment, political_tone, etc.)
- Use circuit breaker wrapper to test fallback behavior

### Database Mocking
- Query builder chains must return `this` for fluent API
- Terminal operations (get, all) return resolved values
- No actual database calls in unit tests
- Integration tests use mocked service responses

## Common Testing Patterns

### Testing Error Paths
```typescript
it('should handle API errors gracefully', async () => {
    vi.mocked(openai.chat.completions.create).mockRejectedValue(
        new Error('API Error')
    );

    const result = await processArticleWithAI('Title', 'Content', 'en');

    // Verify fallback behavior
    expect(result.translatedTitle).toBe('Title');
    expect(result.summary).toBeDefined();
    expect(logger.error).toHaveBeenCalled();
});
```

### Testing Validation
```typescript
it('should reject invalid country code', async () => {
    const response = await request(server)
        .get('/digest/invalid-country/latest')
        .expect(400);

    expect(response.body.success).toBe(false);
    expect(response.body.error).toMatch(/country/i);
});
```

### Testing Async Operations
```typescript
it('should handle async service calls', async () => {
    const promise = digestService.getLatestDigest('tr');
    await expect(promise).resolves.toBeDefined();
});
```

### Testing State Mutations (Services)
```typescript
it('should create and return digest', async () => {
    const digest = await generateDailyDigest('tr', 'daily');

    expect(digest.success).toBe(true);
    expect(digest.id).toBeDefined();
    expect(db.insert).toHaveBeenCalled();
});
```

## Best Practices for D4ily Tests

1. **Mock All External Services**: OpenAI, Firebase, Turso, Redis
2. **Clear Mocks Between Tests**: Call `vi.clearAllMocks()` in `beforeEach`
3. **Test Behavior, Not Implementation**: Focus on inputs/outputs, not internal logic
4. **Use Descriptive Test Names**: Clarity about what's being tested
5. **Test Error Paths**: Happy path + error scenarios
6. **Realistic Mock Data**: Use data that matches real database schema
7. **Coverage Over Quantity**: Better to have fewer, well-written tests
8. **Avoid Test Interdependence**: Each test should be independently runnable
9. **Use Type Safety**: Leverage TypeScript in mocks (no `any` when avoidable)
10. **Document Complex Mocks**: Comment why vi.hoisted or special patterns are needed

## Troubleshooting Tests

### Coverage Report Not Generated
- **Solution**: Ensure `reportOnFailure: true` in vitest.config.ts
- **Issue**: Tests may have failed silently

### Mock Not Applying
- **Solution**: Ensure mock is declared before import
- **Issue**: Imports at top of file execute before mocks

### Query Builder Chain Failing
- **Solution**: Each method must return `this` for chaining
- **Issue**: Terminal operation (get/all) needs to return promise

### Hoisted Mock Reference Error
- **Solution**: Use `vi.hoisted()` when mock factory needs module-scope constants
- **Issue**: Hoisted function runs before module imports

### Test Timeout
- **Solution**: Increase `testTimeout` in vitest.config.ts (default: 10000ms)
- **Issue**: Async operations taking longer than expected

## Future Testing Improvements

1. **E2E Tests**: Playwright or Cypress for real browser/server testing
2. **Database Integration Tests**: Use test Turso database instead of mocks
3. **Mobile Testing**: Activate Jest setup, add component tests
4. **Admin Testing**: Add critical path tests for admin operations
5. **Performance Tests**: Benchmark critical services (AI, digest generation)
6. **Visual Regression**: Screenshot testing for UI components
