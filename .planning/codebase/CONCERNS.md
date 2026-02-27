# D4ily Technical Concerns & Debt

## Executive Summary
The D4ily codebase contains several architectural patterns and implementation decisions that present technical debt, scalability concerns, and fragile areas requiring attention. This document outlines the primary concerns organized by category.

---

## 1. Database Architecture Concerns

### 1.1 Per-Country Table Duplication Pattern (HIGH IMPACT)
**File**: `backend/src/db/schema/articles.ts` (Lines 5-192)

The schema creates separate tables for each country (`tr_articles`, `de_articles`, `us_articles`, etc.) with identical structures. This introduces significant technical debt:

- **Code Duplication**: 8 countries × 3-4 tables per country = ~32 tables with identical schemas
- **Query Complexity**: Country-specific queries must map to correct table; increases likelihood of bugs
- **Schema Evolution**: Adding/modifying columns requires ALTER TABLE on 8 separate production tables
- **Scalability Issues**: Adding new countries requires code changes and manual migration
- **Testing Burden**: All tests must be run 8× to ensure consistency across country tables

**Better Approach**: Use a single `articles` table with `country_code` column, partition by country if needed for performance.

**Related Issues**:
- `COUNTRY_TABLES` mapping appears in multiple files (digest.ts, admin.ts, scraperService.ts, etc.)
- No automated way to add new countries; requires code modifications and database migrations

---

### 1.2 No Proper Drizzle Migrations for Production Turso (HIGH RISK)
**File**: `backend/package.json` (Lines 17-18)
**File**: `backend/src/db/migrations/` directory

The project has migration files but they're not being used for Turso production database:

- **Manual ALTER TABLE Pattern**: New columns like `detail_content` must be added via manual ALTER TABLE statements on production Turso
- **No Migration History**: Drizzle migrations exist but aren't tracked against Turso; no audit trail of changes
- **Dangerous Workflow**: Schema changes could be lost if not documented manually
- **Risk of State Drift**: Development DB and production DB can have schema mismatches

**Critical Note from MEMORY.md**: "Schema changes need manual ALTER TABLE — drizzle migrations weren't set up for Turso"

---

### 1.3 Database Version Compatibility Issues (MEDIUM RISK)
**File**: `backend/package.json` (Line 26)

`@libsql/client: "^0.5.6"` is pinned for critical reasons:
- **0.4.3**: Crashes locally with Rust panic
- **0.5.6**: Current (works both local and remote)
- **0.6.x**: Migration job checks break all queries (Turso returns 400)
- **0.17.0**: SQLITE_UNKNOWN on all article inserts

**Risk**: Version bump during npm updates could silently break production. Needs strict version pinning and documented compatibility matrix.

---

## 2. Security Concerns

### 2.1 Firebase Configuration String Replacement (MEDIUM RISK)
**File**: `backend/src/config/firebase.ts` (Line 13)

```typescript
const privateKey = env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n') || '';
```

This pattern works but relies on environment variable escaping. Risks:
- If someone copies the raw `.env` value with literal `\n`, it will fail silently
- No validation that privateKey is actually valid before attempting to use it
- Error handling doesn't distinguish between missing creds and malformed creds

**Better Approach**: Validate Firebase creds before initializing app; provide clear error messages

---

### 2.2 Admin API Key as Fallback in OPS Authentication (MEDIUM RISK)
**File**: `backend/src/index.ts` (Lines 68, 70-71)

```typescript
const configuredOpsKey = env.OPS_API_KEY || env.ADMIN_API_KEY || '';

if (!configuredOpsKey) {
    logger.error('OPS_API_KEY/ADMIN_API_KEY is not configured');
```

**Issues**:
- OPS endpoints (`/ops/scrape`, `/ops/digest`, `/ops/tweets`) can be triggered using ADMIN_API_KEY
- Conflates two different permission levels
- If ADMIN_API_KEY is compromised, ops endpoints are also compromised
- No audit log of which key type was used (ops vs admin)

**Better Approach**: Require dedicated OPS_API_KEY; fail if not present

---

### 2.3 X-Forwarded-For Header Spoofing Risk (MEDIUM RISK)
**File**: `backend/src/middleware/rateLimiter.ts` (Lines 60-65)

```typescript
const forwardedFor = c.req.header('x-forwarded-for') || '';
if (forwardedFor) {
    const first = forwardedFor.split(',')[0]?.trim();
    if (first) return first;
}
```

**Risk**: In production, if Railway/load balancer doesn't properly validate X-Forwarded-For, attackers can spoof IPs to bypass rate limiting.

**Mitigation Applied**: Code attempts to use actual socket address first (lines 49-54), but fallback to headers is still weak.

**Better Approach**:
- Only trust specific headers from known proxies
- Log suspicious patterns
- Consider stricter rate limiting for unauthenticated users

---

### 2.4 Hardcoded CORS Origins (MEDIUM RISK)
**File**: `backend/src/index.ts` (Lines 44-58)

```typescript
const defaultProductionOrigins = [
    'https://d4ily.com',
    'https://www.d4ily.com',
    'https://admin.d4ily.com',
];

const extraConfiguredOrigins = (env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
```

**Issues**:
- Origins hardcoded in source; can't be changed without redeploy
- Admin domain hardcoded; if admin moves to new domain, requires code change
- No validation of ALLOWED_ORIGINS format

---

### 2.5 Insufficient Admin Role Validation (MEDIUM RISK)
**File**: `backend/src/middleware/auth.ts` (Lines 109-147)

Admin middleware includes backward compatibility fallback:
```typescript
// Backward compatibility for Firebase project migrations:
// if UID changed, try to resolve by verified email.
if (!user && decodedToken.email) {
    user = await db.select().from(users).where(eq(users.email, decodedToken.email)).get();
```

**Issues**:
- Allows authentication via email when UID doesn't match
- During Firebase project migrations, could create security gap
- Logs a warning but continues; doesn't prevent access

**Better Approach**: Strict UID matching; separate migration script with explicit safeguards

---

## 3. Performance & Scalability Concerns

### 3.1 In-Memory Rate Limiting with Memory Leak Risk (MEDIUM RISK)
**File**: `backend/src/middleware/rateLimiter.ts` (Lines 11-33)

```typescript
const rateLimitStore = new Map<string, RateLimitEntry>();
const MAX_STORE_SIZE = 100000;

const cleanupInterval = setInterval(() => {
    // Cleanup old entries every 5 minutes
    // Emergency cleanup if store > 100k
});
```

**Issues**:
- In-memory Map grows unbounded until cleanup
- Cleanup runs every 5 minutes; brief window for DOS if many unique IPs hit in <5min
- Cleanup only removes expired entries; doesn't handle legitimate high-load scenarios
- Single-process solution; doesn't scale across multiple workers

**Better Approach**:
- Use Redis for distributed rate limiting (Upstash already configured!)
- Implement stricter early cleanup thresholds
- Add metrics for rate limiter health

---

### 3.2 Background AI Processing Queue Not Persistent (HIGH RISK)
**File**: `backend/src/services/scraper/scraperService.ts` (Lines 40-66)

```typescript
const aiProcessingQueue: Array<() => Promise<void>> = [];
let isProcessingQueue = false;

async function processAIQueue() {
    // Processes in-memory queue
    while (aiProcessingQueue.length > 0) {
        const task = aiProcessingQueue.shift();
        // ...
    }
}
```

**Critical Issues**:
- **Data Loss Risk**: If server crashes, all queued AI processing tasks are lost
- **Incomplete Articles**: Articles created but not processed by AI remain in incomplete state
- **No Retry Logic**: Failed AI processing doesn't retry or log failure properly
- **Scaling Issue**: Can't distribute across workers; queue only in memory

**Current Behavior**:
- Article created immediately with placeholder values (lines 139-167)
- AI processing queued asynchronously (lines 184-235)
- If server crashes before processing, article remains with default/incorrect values forever

**Better Approach**:
- Use persistent queue (e.g., Redis, Bull, or database job table)
- Implement retry logic with exponential backoff
- Add visibility into queue status in admin panel

---

### 3.3 Digest Generation Timeout Budget Fragile (MEDIUM RISK)
**File**: `backend/src/index.ts` (Lines 113-131)

```typescript
const budgetMs = c.req.path.startsWith('/feed') ? 800 :
                 c.req.path.startsWith('/digest') ? 3000 : 1200;

if (duration > budgetMs) {
    logger.warn({ duration, budgetMs }, 'Route exceeded latency budget');
}
```

**Issues**:
- Digest has 3000ms budget; AI calls could easily exceed this
- Budget is just logged, not enforced; client could wait longer
- No feedback to client about actual vs expected latency
- Timeout middleware set to 30s for digest (aiTimeout), but budget is 3s — confusing

**Better Approach**:
- Implement actual timeout enforcement (currently soft warning only)
- Separate timeout from latency budget
- Return partial results if timeout approaching

---

### 3.4 Scraper Batch Processing with Delays (MEDIUM RISK)
**File**: `backend/src/cron/scraperCron.ts` (Lines 43-96)

```typescript
const BATCH_SIZE = 5;

for (let i = 0; i < sources.length; i += BATCH_SIZE) {
    const batch = sources.slice(i, i + BATCH_SIZE);

    // Process batch in parallel
    const batchResults = await Promise.allSettled(batch.map(...));

    // Small delay between batches
    if (i + BATCH_SIZE < sources.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
}
```

**Issues**:
- 1000ms delay between batches is arbitrary; could be too long (slow scrape) or too short
- If scrape takes 30 minutes per country × 8 countries = 4 hours to scrape all articles
- No progress tracking; long-running cron with no visibility
- No scaling mechanism; always sequential batches

---

### 3.5 Duplicate Detection Uses In-Memory Linear Search (MEDIUM RISK)
**File**: `backend/src/services/scraper/scraperService.ts` (Lines 91-104)

```typescript
const recentArticles = await db
    .select()
    .from(tables.articles)
    .where(gte(tables.articles.scrapedAt, oneDayAgo))
    .limit(100);

for (const item of feed.items.slice(0, 10)) {
    const duplicate = recentArticles.find((article) =>
        isDuplicate(item.title, article.originalTitle)
    );
```

**Issues**:
- Fetches last 100 articles for each source (repeated DB calls)
- Linear search through array for each item (`O(n*m)`)
- isDuplicate function likely compute-intensive (string similarity)
- Doesn't catch duplicates older than 24 hours

**Better Approach**:
- Use database-level deduplication (hash index or full-text search)
- Implement Bloom filter for recent articles
- Cache deduplication results in Redis

---

## 4. Error Handling & Observability Concerns

### 4.1 Console.log() in Production Code (LOW-MEDIUM RISK)
**File**: Search results show 54 occurrences of `console.log/error/warn` across 9 files

Examples:
- `backend/src/index.ts`: Lines 261-264 use console.log instead of logger
- `backend/src/db/seed.ts`: Uses console.log
- Various services use console.log for debugging

**Issue**: Inconsistent logging. Some output goes to console, some to Pino logger. Makes debugging harder.

---

### 4.2 Insufficient Error Context in Catch Blocks (MEDIUM RISK)
**File**: `backend/src/services/scraper/scraperService.ts` (Lines 232-234, 237-239)

```typescript
} catch (error) {
    logger.error({ error, articleId, title: item.title }, 'AI processing failed for article');
}

} catch (error) {
    logger.error({ error, item: item.title }, 'Failed to process article');
}
```

**Issues**:
- Error logged but not acted upon; article silently marked as failed
- No distinction between recoverable (rate limit) vs fatal errors
- No alerting mechanism for systematic failures (e.g., OpenAI quota exceeded)
- Failed articles accumulate without visibility

---

### 4.3 Promise Errors Not Handled in Fire-and-Forget (HIGH RISK)
**File**: `backend/src/index.ts` (Lines 219-235)

```typescript
app.post('/ops/scrape', async (c) => {
    runScraper().then(() => {
        logger.info('OPS: Scraper completed');
    }).catch((err) => {
        logger.error({ error: err }, 'OPS: Scraper failed');
    });
    return c.json({ success: true, message: 'Scraper started in background' });
});
```

**Issues**:
- Response sent immediately ("Scraper started") before scraper actually runs
- Ops endpoint always returns 200 even if scraper fails in background
- Client has no way to know if scrape succeeded or failed
- Long-running operations need polling mechanism, not fire-and-forget

**Better Approach**:
- Return job ID for long-running ops
- Provide status endpoint to check job progress
- Implement proper job queue with failure tracking

---

### 4.4 Digest Generation Failures Not Reported to Clients (MEDIUM RISK)
**File**: `backend/src/cron/digestCron.ts` (Lines 36-42)

```typescript
} catch (error) {
    logger.error({ error, period }, 'Daily digest generation failed');
    addCronLog({
        jobName: 'digest',
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error',
    });
}
```

**Issues**:
- Digest failures logged but users don't get notified
- In-memory cron log has 200 entry limit; old failures are forgotten
- No alert to admins about systematic failures
- No way for ops to know digest generation is failing without checking logs

---

## 5. Code Quality & Duplication Concerns

### 5.1 COUNTRY_TABLES Mapping Duplication (MEDIUM RISK)
**Appears in**:
- `backend/src/routes/admin.ts` (Lines 23-60)
- `backend/src/routes/digest.ts` (Lines 29-38)
- `backend/src/services/scraperService.ts` (Lines 29-38)
- `backend/src/services/digestService.ts` (Lines 22-31)

```typescript
const COUNTRY_TABLES = {
    tr: { articles: tr_articles, sources: tr_article_sources },
    de: { articles: de_articles, sources: de_article_sources },
    // ... repeated in 4+ files
} as const;
```

**Issue**: Same mapping defined in multiple files. Adding new country requires updates in 4+ places.

---

### 5.2 Timestamp Handling Inconsistency (LOW-MEDIUM RISK)
**Files**: Database schema mixes timestamp representations:
- Some use `integer` with `{ mode: 'timestamp' }` (scrapedAt, publishedAt)
- Some use `text` for ISO strings (digestDate in daily_digests)
- Digest route generates title from parsed ISO string (digest.ts lines 42-48)

**Risk**: Easy to mix up formats in queries; conversions could lose timezone info

---

### 5.3 Configuration Hardcoding in Multiple Places (MEDIUM RISK)
- Admin API key fallback (index.ts)
- CORS origins (index.ts)
- Rate limit windows and thresholds (rateLimiter.ts, multiple values)
- Latency budgets (index.ts)
- AI queue delays (scraperService.ts - 500ms)
- Batch sizes (scraperCron.ts - 5 sources)

**Better Approach**: Extract all config to env variables or dedicated config file

---

## 6. Deployment & Infrastructure Concerns

### 6.1 Cron Jobs Always Start in All Environments (HIGH RISK)
**File**: `backend/src/index.ts` (Lines 250-256)

```typescript
if (env.NODE_ENV !== 'test') {
    startScraperCron();
    startDigestCron();
    startTweetCron();
    startWeeklyCron();
    startAlignmentNotificationCron();
}
```

**Issues**:
- Cron jobs run in development mode
- If developer runs `npm run dev`, scraper starts immediately
- Multiple instances could run in staging, causing duplicate article scrapes
- No leader election for distributed deployments

**Better Approach**:
- Only run crons in production
- Use Redis-based job locks for multi-instance safety
- Implement leader election

---

### 6.2 Railway Deployment Timeout Configuration (MEDIUM RISK)
**File**: `backend/railway.json` (Line 16)

```json
"healthcheckTimeout": 100
```

**Issues**:
- 100ms is very short for Node.js startup with Firebase init
- If startup takes 150ms, Railway considers it unhealthy
- No startupProbe/readinessProbe separation; health endpoint must respond quickly

**Better Approach**: Increase healthcheck timeout to 30s; implement fast health check

---

### 6.3 Manual Database Migrations for Multi-Instance Deployments (HIGH RISK)
When deploying with schema changes:
- Requires manual ALTER TABLE execution on Turso
- Could fail mid-deployment if process crashes
- No rollback mechanism
- Multiple Railway instances could conflict during migration

**Better Approach**:
- Automate schema migration in deployment phase
- Implement database migration versioning
- Use foreign key checks to prevent inconsistencies

---

### 6.4 No Feature Flags for Gradual Rollouts (MEDIUM RISK)
Adding new features requires:
1. Deploy code to all instances
2. All instances immediately use new feature
3. No way to test on subset of users

**Risk**: Major bugs affect all users immediately.

---

## 7. Data Integrity & Consistency Concerns

### 7.1 Cascading Deletes and Foreign Key Constraints Missing (MEDIUM RISK)
**File**: `backend/src/db/schema/` - Tables don't show explicit CASCADE DELETE relationships

**Issues**:
- If article is deleted, associated sources/topics/polls remain orphaned
- No foreign key constraints to prevent invalid references
- SQLite may not enforce FKs by default (depends on PRAGMA)

**Better Approach**:
- Add explicit FOREIGN KEY constraints with CASCADE DELETE
- Add NOT NULL where appropriate
- Document referential integrity expectations

---

### 7.2 Article Source Count Increment Race Condition (MEDIUM RISK)
**File**: `backend/src/services/scraper/scraperService.ts` (Lines 118-122)

```typescript
await db.insert(tables.sources).values({
    // ... add source
});

await db.update(tables.articles)
    .set({ sourceCount: sql`${tables.articles.sourceCount} + 1` })
    .where(eq(tables.articles.id, duplicate.id));
```

**Issues**:
- Between checking duplicate and incrementing count, another scraper could add same source
- Two processes could both increment count separately
- `sourceCount` could become out of sync with actual sources

**Better Approach**:
- Add source with ON CONFLICT clause
- Use transaction wrapping duplicate check + increment
- Verify sourceCount via trigger or periodic reconciliation

---

### 7.3 Topic Extraction Without Verification (LOW-MEDIUM RISK)
**File**: `backend/src/services/digestService.ts` (Lines 167-170)

Topics are selected by importance score but not verified to exist:
- Could reference topicId that doesn't exist
- No validation that topicId belongs to correct article

---

## 8. API & Integration Concerns

### 8.1 Timeout Middleware Inconsistently Applied (MEDIUM RISK)
**File**: `backend/src/index.ts` (Lines 158-165)

```typescript
app.use('/digest/*', aiTimeout);       // 30s timeout
app.use('/weekly/*', aiTimeout);       // 30s timeout
app.use('/admin/*', defaultTimeout);   // 60s timeout
app.use('/search/*', defaultTimeout);  // 60s timeout
```

But other routes have NO explicit timeout set. Risk:
- Some routes (comments, reactions, polls) have no timeout
- Could hang indefinitely
- Load accumulates as pending requests stack up

---

### 8.2 Admin Routes Missing Rate Limiting (MEDIUM RISK)
**File**: `backend/src/routes/admin.ts`

Admin routes don't appear to use rate limiting middleware. Issues:
- POST /admin/scrape-source vulnerable to DOS
- Compute-heavy operations (manual scrape, manual digest) unprotected
- No per-user rate limiting

---

### 8.3 Firebase Tokens Can Expire Mid-Request (LOW RISK)
**File**: `backend/src/middleware/auth.ts`

Token verified once at middleware level. If request takes 30+ seconds:
- Token could expire during request processing
- Database updates could fail silently if token expires
- No re-validation during long operations

**Better Approach**: Implement token refresh logic in long-running requests

---

## 9. Mobile App Concerns (React Native/Expo)

### 9.1 API Client Timeout Configuration (MEDIUM RISK)
**File**: `admin/src/api/client.ts` (Line 11)

```typescript
timeout: 15000,  // 15 seconds
```

**Issues**:
- Hard-coded timeout; no environment-specific variation
- Digest endpoint can timeout if generation slow
- No retry-after handling or exponential backoff
- Mobile should have longer timeout (network variance)

---

### 9.2 Silent Token Expiry Handling (MEDIUM RISK)
**File**: `admin/src/api/client.ts` (Lines 28-39)

```typescript
(error) => {
    if (error.response?.status === 401) {
        void auth.signOut();
        if (window.location.pathname !== '/login') {
            window.location.replace('/login');
        }
    }
    return Promise.reject(error);
}
```

**Issues**:
- User silently redirected on token expiry
- Any pending requests are rejected without explanation
- No user notification or retry logic
- Could lose user data if form submission in progress

---

## 10. Testing & Verification Gaps

### 10.1 No Integration Tests for Multi-Country Scenarios (MEDIUM RISK)
With 8 countries and per-country tables:
- Risk of bugs that only manifest in specific countries
- No test verifying digest consistency across countries
- No test for schema consistency across all country tables

---

### 10.2 AI Processing Not Tested (HIGH RISK)
**File**: `backend/src/services/scraper/scraperService.ts` (Lines 184-235)

AI processing happens asynchronously in background. Concerns:
- Tests can't easily verify AI results
- No way to know if AI processing failed until manual inspection
- No test coverage for AI result validation

---

## 11. Documentation & Knowledge Gaps

### 11.1 Missing Runbook for Adding New Country (HIGH RISK)
Process not documented:
1. Add new country to COUNTRY_TABLES in multiple files
2. Create new country-specific database tables
3. Seed categories for new country
4. Update admin country enum
5. Add to digest generation logic
6. Verify all country-specific queries work

---

### 11.2 Missing Alert Configuration (MEDIUM RISK)
No documented alerts for:
- Scraper failures
- Digest generation failures
- AI processing queue growing unbounded
- Rate limiter hitting MAX_STORE_SIZE
- Database connection failures
- OpenAI API quota exceeded

---

## Priority Fixes Summary

### CRITICAL (Fix Immediately)
1. **Persistent job queue for AI processing** - Prevent data loss
2. **Database migration automation** - Prevent schema drift in multi-instance deployments
3. **Cron job isolation in production** - Prevent duplicate processing
4. **Ops endpoint job tracking** - Replace fire-and-forget pattern

### HIGH (Fix Before Next Release)
1. **Unified country table schema** - Reduce duplication; enable new countries without code changes
2. **Admin route rate limiting** - Protect heavy operations
3. **Proper timeout enforcement** - Currently just logged, not enforced
4. **Redis-based rate limiting** - Replace in-memory store; support distributed deployments

### MEDIUM (Plan for Next Sprint)
1. **Audit logging for sensitive operations** - Track who scraped/modified what
2. **Feature flags for gradual rollouts** - Safer deployments
3. **Improved error alerting** - Admin notifications for systematic failures
4. **Job queue visibility in admin panel** - See AI processing queue status

### LOW (Technical Debt Cleanup)
1. **Extract configuration to single source** - Reduce duplication
2. **Consistent logging** - Replace console.log with logger
3. **Timestamp format standardization** - Prevent timezone bugs
4. **Add foreign key constraints** - Improve data integrity
