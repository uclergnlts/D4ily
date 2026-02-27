# D4ily Codebase Conventions

Quality-focused code style guide for the D4ily project (Backend, Mobile, Admin).

## TypeScript Usage Patterns

### Strict Mode
- All projects use `"strict": true` in `tsconfig.json`
- Type annotations required for function parameters and return types
- Explicit generic types preferred over inference when clarity matters

### Module Resolution
- **Alias**: `@` points to `src/` directory in all projects
  - Backend: `@` → `src/`
  - Mobile: `@` → `src/`
  - Admin: Uses default relative imports primarily
- **Module System**: ES modules (`"type": "module"` in backend package.json)
- **Import Extensions**: Always use `.js` extension in imports (ESM compatibility)
  ```typescript
  import { logger } from '../config/logger.js';
  import { db } from '@/config/db.js';
  ```

### Type Definitions
- Types defined in dedicated `types/index.ts` files
- API response types use discriminated unions:
  ```typescript
  export type ApiResponse<T> = {
    success: true;
    data: T;
  } | {
    success: false;
    error: string;
    details?: string;
  };
  ```
- Domain types (e.g., `Article`, `Digest`, `Category`) centralized in `types/index.ts`
- Interface naming: Use `PascalCase` for types and interfaces
- Type parameters: Explicit and meaningful (e.g., `<T>` for generic data)

## Naming Conventions

### Files & Directories
- **Services**: `camelCaseService.ts` (e.g., `digestService.ts`, `scraperService.ts`)
- **Routes**: Plural names (e.g., `routes/digest.ts`, `routes/sources.ts`)
- **Middleware**: `camelCaseName.ts` (e.g., `auth.ts`, `rateLimiter.ts`)
- **Utilities**: `camelCaseName.ts` (e.g., `errors.ts`, `circuitBreaker.ts`)
- **Config**: `camelCaseName.ts` in `config/` directory
- **Hooks** (Mobile): `useCamelCase.ts` (e.g., `useDigest.ts`, `useHistory.ts`)
- **Stores** (Mobile): `useCamelCaseStore.ts` (e.g., `useAppStore.ts`, `useThemeStore.ts`)
- **Components** (Mobile): `PascalCase.tsx` (e.g., `DigestHeader.tsx`, `CommentSection.tsx`)
- **Test files**: `featureName.test.ts` or `featureName.spec.ts`
- **Database schemas**: `descriptiveName.ts` (e.g., `articles.ts`, `interactions.ts`)

### Functions & Variables
- **Functions**: `camelCase` (e.g., `handleError`, `getLatestDigest`, `createUser`)
- **Constants**: `UPPER_SNAKE_CASE` for module-level constants (e.g., `CATEGORY_NAMES`)
- **Variables**: `camelCase` (e.g., `selectedCountry`, `isLoading`)
- **React hooks**: `use` prefix (e.g., `useAppStore`, `useLatestDigest`)
- **Zustand stores**: `use` prefix (e.g., `useAppStore`, `useThemeStore`)
- **Private/internal**: No special prefix; context or comment indicates scope

### Database Columns
- **Snake case**: `snake_case` for database columns (e.g., `published_at`, `translated_title`)
- **Properties**: Automatically mapped to camelCase in Drizzle models when accessed
- Column naming consistency across all country-specific tables (8 countries: tr, de, us, uk, fr, es, it, ru)

## Import Organization

### Backend (Hono)
1. Standard Node.js imports (e.g., `crypto`, `path`)
2. External packages (e.g., `hono`, `dotenv`, `pino`)
3. Config imports (`@/config/*`)
4. Type imports (e.g., `type { ApiResponse }`)
5. Database/Schema imports (`@/db/schema/*`)
6. Service imports (`@/services/*`)
7. Utility imports (`@/utils/*`)
8. Middleware imports (for routes)

Example:
```typescript
import 'dotenv/config';
import { serve } from '@hono/node-server';
import { Hono, Context, Next } from 'hono';
import { logger } from './config/logger.js';
import { env } from './config/env.js';
import type { ApiResponse } from './types/index.js';
```

### Mobile (React Native/Expo)
1. React/React Native imports
2. Expo imports
3. Navigation (expo-router)
4. External UI/logic libraries (e.g., `@tanstack/react-query`, `zustand`)
5. API services
6. Custom hooks
7. Store imports (Zustand)
8. Component imports
9. Utility imports
10. Type imports

Example:
```typescript
import React, { useEffect } from 'react';
import { View, Text } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { digestService } from '../../src/api/services/digestService';
import { useLatestDigest } from '../../src/hooks/useDigest';
import { useAppStore } from '../../src/store/useAppStore';
```

### Admin (React + Vite)
1. React imports
2. React Router imports
3. TanStack Query
4. Utility libraries
5. Component imports
6. API client/service imports
7. Type imports

## Error Handling Patterns

### Backend Error Handling
- **Centralized handler**: `handleError()` utility function wraps try-catch blocks
  ```typescript
  export function handleError(c: Context, error: unknown, message: string) {
      logger.error({
          error: error instanceof Error ? error.message : error,
          stack: error instanceof Error ? error.stack : undefined,
          path: c.req.path,
          method: c.req.method,
      }, message);

      const response: ApiResponse<never> = {
          success: false,
          error: message,
          ...(env.NODE_ENV === 'development' && error instanceof Error && {
              details: error.message,
          }),
      };

      return c.json(response, 500);
  }
  ```
- **Logging**: Pino logger with structured logging (objects with contextual data)
- **Development vs. Production**: Error details only exposed in development environment
- **Status codes**: Standard HTTP codes (401, 403, 404, 500)
- **API errors**: Return `ApiResponse` with `success: false` and descriptive `error` message

### Mobile Error Handling
- **Service layer**: Try-catch in API services, return empty arrays/null on 404
  ```typescript
  try {
      const response = await client.get<ApiResponse<DailyDigest[]>>(`/digest/${country}`);
      if (!response.data.success) return [];
      return response.data.data;
  } catch (error: any) {
      if (error?.status === 404) return [];
      console.warn('Failed to fetch digests:', error?.message);
      return [];
  }
  ```
- **Component level**: Use React Query's error states and fallback UI
- **User feedback**: Toast notifications for user-facing errors

### Circuit Breaker Pattern
- **Purpose**: Prevent cascading failures for external services (OpenAI, Redis)
- **Implementation**: `CircuitBreaker` class in `utils/circuitBreaker.ts`
- **Usage**: Wrap AI requests and database calls with circuit breaker
  ```typescript
  await openAICircuitBreaker.execute('ai-request', async () => {
      return await openai.chat.completions.create(...)
  }, fallback);
  ```
- **States**: CLOSED (normal), OPEN (failing), HALF_OPEN (recovering)
- **Fallback**: Graceful degradation via `aiFallbacks.ts` for AI operations

## State Management Patterns

### Mobile (Zustand)
- **Store creation**: `create<StateType>()` with typed state interface
  ```typescript
  interface AppState {
      selectedCountry: CountryCode;
      setSelectedCountry: (country: CountryCode) => void;
      isSideMenuOpen: boolean;
      toggleSideMenu: () => void;
  }
  export const useAppStore = create<AppState>((set) => ({
      selectedCountry: 'tr',
      setSelectedCountry: (country) => set({ selectedCountry: country }),
      isSideMenuOpen: false,
      toggleSideMenu: () => set((state) => ({ isSideMenuOpen: !state.isSideMenuOpen })),
  }));
  ```
- **Store files**: Placed in `src/store/` directory with `use` prefix
- **Selector pattern**: Access store state directly in hooks
  ```typescript
  const activeScheme = useThemeStore(state => state.activeScheme);
  const { selectedCountry } = useAppStore();
  ```

### Mobile (React Query/TanStack Query)
- **Query keys**: Array structure with hierarchical naming
  ```typescript
  queryKey: ['digest', 'latest', country, dayKey]
  queryKey: ['digests', country]
  queryKey: ['digest', digestId]
  ```
- **Stale times**: Consistent TTL per data type
  - Latest digest: 5 minutes (`1000 * 60 * 5`)
  - Digests list: 10 minutes (`1000 * 60 * 10`)
  - Digest detail: 30 minutes (`1000 * 60 * 30`)
- **Refetch strategy**:
  - `refetchOnMount: 'always'` for frequently-updated data
  - `refetchOnReconnect: true` for critical data
  - Default for static content

### Backend (Database)
- **Database client**: Drizzle ORM with Turso (LibSQL)
- **Schema organization**: Country-specific tables (8 countries)
  ```typescript
  const COUNTRY_TABLES = {
      tr: { articles: tr_articles, digests: tr_daily_digests },
      de: { articles: de_articles, digests: de_daily_digests },
      // ... 6 more countries
  } as const;
  ```
- **Table creation**: Helper functions for DRY code (e.g., `createArticleTable(countryCode)`)
- **Indexes**: Strategic indexes for query performance
  - Published date: For feed queries
  - Category: For filtering
  - Composite indexes: For complex WHERE+ORDER BY clauses

## API Response Format Conventions

### Response Structure
All API responses follow a consistent discriminated union pattern:

**Success**:
```json
{
  "success": true,
  "data": { /* actual data */ }
}
```

**Error**:
```json
{
  "success": false,
  "error": "Human-readable error message",
  "details": "Optional debug info (dev only)"
}
```

### Status Codes
- `200`: Success with data
- `201`: Created
- `400`: Bad request (validation error)
- `401`: Unauthorized (missing/invalid token)
- `403`: Forbidden (insufficient permissions)
- `404`: Not found
- `500`: Server error
- `503`: Service unavailable (e.g., Firebase down)

### Pagination Pattern
```typescript
export const paginationSchema = z.object({
    page: z.string().regex(/^\d+$/).transform(Number).default('1'),
    limit: z.string().regex(/^\d+$/).transform(Number).default('20'),
});
```

### Validation
- **Zod schemas**: For runtime validation of inputs
- **Schema naming**: `camelCaseSchema` in `utils/schemas.ts`
- **Country enum**: `z.enum(['tr', 'de', 'us', 'uk', 'fr', 'es', 'it', 'ru'])`

## Environment Configuration

### Backend
- **Validation**: Zod schema in `config/env.ts`
- **Parsing**: `envSchema.parse(process.env)` with error handling
- **Types**: `type Env = z.infer<typeof envSchema>`
- **Dev defaults**: Some variables optional (TURSO_DATABASE_URL defaults to `file:local.db`)

### Mobile
- **Config**: `src/api/config.ts` for API endpoints
- **Environment-specific**: Build variants for staging/production
- **Secure storage**: Expo Secure Store for tokens

## Code Organization

### Backend Structure
```
backend/src/
├── config/          # Configuration (db, env, logger, Firebase, OpenAI)
├── routes/          # Hono route handlers
├── middleware/      # Auth, rate limiting, timeout
├── services/        # Business logic (digest, scraper, AI)
├── cron/            # Scheduled tasks
├── db/
│   └── schema/      # Drizzle schemas
├── utils/           # Utilities (errors, circuit breaker, schemas)
├── types/           # Type definitions
└── index.ts         # Server entry point
```

### Mobile Structure
```
mobile/src/
├── api/
│   ├── services/    # API service modules
│   ├── client.ts    # HTTP client
│   └── queryClient.ts
├── store/           # Zustand stores
├── hooks/           # Custom React hooks
├── components/      # Reusable components
├── types/           # Type definitions
└── utils/           # Utilities
```

### Admin Structure
```
admin/src/
├── api/             # API client
├── components/      # React components
├── pages/           # Route pages
├── hooks/           # Custom hooks
├── store/           # State management
├── types/           # Type definitions
└── App.tsx          # Main app
```

## Logging Conventions

### Pino Logger
- **Configuration**: In `config/logger.ts`
- **Level**: Controlled by `LOG_LEVEL` env var (error, warn, info, debug)
- **Dev format**: Pretty-printed with colors
- **Production**: JSON format for log aggregation
- **Structured logging**: Pass objects with context
  ```typescript
  logger.info({
      method: c.req.method,
      path: c.req.path,
      status: c.res.status,
      duration,
  });
  logger.error({ error: err }, 'Operation failed');
  ```

## Code Quality Principles

1. **Type Safety**: Leverage TypeScript strict mode; avoid `any` when possible
2. **Error Transparency**: Log errors with full context (path, method, stack trace)
3. **Separation of Concerns**: Services handle business logic, routes handle HTTP
4. **DRY**: Use helper functions for repeated patterns (e.g., `createArticleTable`)
5. **Constants over Magic Numbers**: Use module-level constants for IDs, timeouts, limits
6. **Composition**: Prefer composing small functions over large monolithic functions
7. **Validation**: Zod schemas for all external inputs
8. **Circuit Breaking**: Protect against cascading failures in external service calls
9. **Graceful Degradation**: Fallback mechanisms for AI and cache failures
10. **Performance**: Use indexes, stale-time strategy, and latency budgets
