# D4ily External Integrations & APIs

## Overview
D4ily integrates with multiple external services for authentication, data processing, push notifications, monetization, and analytics. This document details all external dependencies and API integrations.

---

## Authentication & User Management

### Firebase
**Provider**: Google Firebase
**Components**: Auth (mobile + admin), Realtime DB, Messaging
**SDK Versions**:
- Backend: firebase-admin 12.7.0
- Mobile: firebase 12.8.0
- Admin: firebase 10.7.0

**Integration Points**:

#### Backend (firebase-admin)
- **File**: `/backend/src/config/firebase.ts`
- **Functionality**:
  - ID token verification for all protected endpoints
  - Push notification sending via Firebase Cloud Messaging
  - User management and auth verification
- **Configuration**:
  - `FIREBASE_PROJECT_ID`: GCP project identifier
  - `FIREBASE_PRIVATE_KEY`: Service account private key (replace \n escapes)
  - `FIREBASE_CLIENT_EMAIL`: Service account email
- **Status Indicators**:
  - Gracefully disables if credentials missing (logs warning)
  - Required for production auth but optional in dev

#### Mobile (firebase)
- **File**: `/mobile/src/utils/firebaseAuth.ts`
- **Functionality**:
  - Google OAuth sign-in
  - Apple OAuth sign-in
  - ID token retrieval for API requests
  - AsyncStorage persistence for auth state
- **Configuration**:
  - `EXPO_PUBLIC_FIREBASE_API_KEY`
  - `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN`
  - `EXPO_PUBLIC_FIREBASE_PROJECT_ID` (d4ily-e40c5)
  - `EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET`
  - `EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
  - `EXPO_PUBLIC_FIREBASE_APP_ID`
- **Project Details**: d4ily-e40c5

#### Admin Panel (firebase)
- **File**: Admin login form
- **Functionality**: Web-based admin authentication
- **Configuration**: Same as mobile (VITE_FIREBASE_* environment variables)

**Middleware**: `/backend/src/middleware/auth.ts` - Validates Firebase ID tokens on all protected routes

---

## Database & Caching

### Turso (SQLite Serverless)
**Provider**: Turso.tech
**Version**: @libsql/client 0.5.6 (CRITICAL: version 0.4.3 crashes locally, 0.6.x breaks migrations, 0.17.0 fails inserts)

**Integration**:
- **File**: `/backend/src/config/db.ts`
- **Configuration**:
  - `TURSO_DATABASE_URL`: Remote libsql:// or local file: URL
  - `TURSO_AUTH_TOKEN`: Required for remote connections only
- **ORM**: Drizzle 0.29.0 with libsql driver
- **Dialect**: SQLite
- **Migrations**: Handled by drizzle-kit (manual ALTER TABLE on production for schema changes)

**Database Schema** (8 country-specific databases):
- **Country Tables**: tr, de, us, uk, fr, es, it, ru
- **Each country has**:
  - `articles`: News articles with AI-processed summaries, topics, details
  - `article_sources`: Source metadata and RSS feeds
  - `tweets`: Twitter/X posts from tracked accounts
  - `categories`: News categories
  - `topics`: Article topics and tagging
  - `interactions`: User reactions, comments, bookmarks
  - `users`: User profiles and subscriptions
  - `subscriptions`: Premium subscription tracking
  - `payments`: Payment transaction history
  - `metrics`: Usage analytics

**Migration Notes**:
- Schema changes require manual ALTER TABLE on production Turso
- Example: `detail_content` column was added via ALTER TABLE to 8 article tables
- Drizzle migrations not fully set up for Turso due to dialect limitations

---

### Upstash Redis
**Provider**: Upstash (Serverless Redis)
**SDK**: @upstash/redis 1.28.0

**Integration**:
- **File**: `/backend/src/config/redis.ts`
- **Configuration**:
  - `UPSTASH_REDIS_REST_URL`: REST endpoint
  - `UPSTASH_REDIS_REST_TOKEN`: API token
- **Status**: Optional - app works without Redis in dev
- **Pattern**:
  - Circuit breaker pattern for fault tolerance
  - 5-second timeout per operation
  - Graceful fallback if Redis unavailable

**Usage**:
- **cacheGet(key)**: Retrieve cached value (returns null if missing/error)
- **cacheSet(key, value, ttlSeconds)**: Store with optional TTL
- **cacheInvalidate(pattern)**: Batch delete matching keys
- **Example**: Digest caching, feed result caching, analytics aggregations

**Error Handling**: Timeouts and failures logged but don't crash app

---

## AI & Language Models

### OpenAI
**Provider**: OpenAI
**SDK**: openai 4.24.0

**Integration**:
- **File**: `/backend/src/config/openai.ts`
- **Configuration**: `OPENAI_API_KEY`
- **Models Used**: GPT-4 (assumed based on digest generation)

**Clients**:
- **Main client**: 60s timeout, 2 retries (for digest generation with large prompts)
- **Quick client**: 15s timeout, 1 retry (for faster operations)

**Usage Points**:

#### Digest Generation
- **File**: `/backend/src/services/digestService.ts` (62KB)
- **Functionality**:
  - Summarize articles into digestible format
  - Extract key topics and themes
  - Generate comparative analysis across sources
  - Create personalized insights

#### Article Processing
- **File**: `/backend/src/services/ai/aiService.ts`
- **Functionality**:
  - Topic extraction and classification
  - Content summarization
  - Metadata generation

#### Emotional Analysis
- **File**: `/backend/src/services/ai/emotionalAnalysisService.ts`
- **Functionality**:
  - Sentiment analysis
  - Emotional tone detection
  - Reader impact assessment

#### Perspectives & Bias Detection
- **File**: `/backend/src/services/perspectivesService.ts` (25KB)
- **Functionality**:
  - Generate multiple viewpoints on articles
  - Identify bias in reporting
  - Suggest alternative interpretations

**AI Processing Pipeline**:
1. RSS feeds parsed → articles extracted
2. Articles queued for AI processing
3. Background queue (in-memory) processes with 500ms delays to avoid rate limiting
4. Results stored in database with summaries, topics, perspectives

---

## Push Notifications & Messaging

### Firebase Cloud Messaging
**Provider**: Google Firebase
**Integration**: Via firebase-admin SDK

**Backend Integration**:
- **File**: `/backend/src/services/notificationService.ts`
- **Functionality**:
  - Send push notifications to user devices
  - Track notification delivery
  - Handle subscription device management

**Mobile Integration**:
- **File**: `/mobile/src/config/notifications.ts` (388 lines)
- **SDK**: expo-notifications 0.29.13
- **Functionality**:
  - Request push notification permissions
  - Obtain Expo push tokens
  - Register tokens with backend
  - Handle notification received/tapped events
  - Local notification scheduling
  - Badge count management

**Notification Features**:
- **Remote notifications**: From backend via Firebase
- **Local notifications**: Scheduled on device
- **Types**: new_article, digest, comment, like, reply, premium, system
- **Listeners**: Auto-cleanup on unmount
- **Project ID**: 48c5bd0c-f017-4675-a5b1-039df60c199e (Expo)

**Mobile Configuration** (app.json):
```json
{
  "plugins": [
    "expo-router",
    "expo-splash-screen",
    ["expo-notifications", { "sounds": [] }]
  ]
}
```

**Digest Notifications**:
- **File**: `/backend/src/services/digestNotificationService.ts`
- **Timing**: Scheduled for 07:00 and 19:00 (daily digest cron)
- **Content**: New digest available notification

---

## Social Media Integration

### Twitter/X API
**Provider**: Twitter API (via twitterapi.io)
**Integration**: Custom wrapper (not SDK)

**Configuration**:
- `TWITTER_API_KEY`: API key for twitterapi.io
- **Base URL**: https://api.twitterapi.io
- **Endpoint**: `/twitter/user/last_tweets?userName={handle}`

**Backend Service**:
- **File**: `/backend/src/services/scraper/tweetScraperService.ts` (80+ lines)
- **Functionality**:
  - Fetch recent tweets from tracked accounts
  - Parse tweet metadata (likes, retweets, replies, views)
  - Extract author information
  - Store tweets in country-specific tables

**Tweet Data Model**:
```typescript
interface TwitterApiTweet {
  id: string;
  text: string;
  createdAt: string;
  lang: string;
  likeCount: number;
  retweetCount: number;
  replyCount: number;
  viewCount: number;
  author: {
    userName: string;
    name: string;
    profilePicture?: string;
  };
}
```

**Storage**: Per-country tweet tables (tr_tweets, de_tweets, etc.)

**Cron Job**: `/backend/src/cron/tweetCron.ts`
- Manual trigger: POST `/ops/tweets`
- Retries: Up to 3 with exponential backoff (2s, 4s, 8s)
- Rate limiting: 200ms delay between accounts
- Error handling: Logs and continues on failure

**Data File**: `/twitter_handles.json` - Contains tracked accounts

---

## Monetization & Subscriptions

### RevenueCat
**Provider**: RevenueCat (IAP platform)
**Mobile SDK**: react-native-purchases 8.9.5

**Configuration**:
- `REVENUECAT_PUBLIC_API_KEY`: Public key for mobile SDK
- `REVENUECAT_SECRET_API_KEY`: Secret key for server-side operations
- `REVENUECAT_WEBHOOK_SECRET`: HMAC secret for webhook verification

**Mobile Integration**:
- **File**: `/mobile/src/hooks/usePremium.ts` (100+ lines)
- **API Key**: test_CaEVCJZXSWamswOHAcBeiiPjoAX (test key for all platforms)
- **Functionality**:
  - Load available subscription packages/offerings
  - Check customer subscription status
  - Make purchases (delegated to RevenueCat)
  - Sync subscription with backend after purchase

**Supported Entitlements**:
- `premium`: Premium subscription identifier
- Plans: monthly, yearly
- Providers: apple (App Store), google (Google Play), stripe, iyzico

**Backend Webhook**:
- **Endpoint**: POST `/webhooks/revenuecat`
- **File**: `/backend/src/routes/webhooks.ts`
- **Verification**: HMAC-SHA256 signature validation
- **Idempotency**: Tracks processed event IDs in Redis (7-day TTL)

**Handled Events**:
- `INITIAL_PURCHASE`: New subscription created
- `RENEWAL`: Subscription renewed
- `UNCANCELLATION`: User un-cancelled subscription
- `CANCELLATION`: User cancelled subscription
- `EXPIRATION`: Subscription expired
- `PRODUCT_CHANGE`: User changed plan (monthly ↔ yearly)

**Database Schema**:
- `subscriptions`: Subscription records (id, userId, planId, status, provider, dates)
- `payments`: Payment transaction history
- `users.subscriptionStatus`: Quick status field ('premium' or other)

---

## Email Services

### Resend
**Provider**: Resend (Email API)
**Configuration**: `RESEND_API_KEY` (optional)

**Potential Usage**:
- Transactional emails (password reset, verification)
- Digest email delivery
- Subscription notifications
- **Status**: Configured but integration code not yet implemented in samples

---

## Content Delivery & Image Storage

### Cloudinary
**Provider**: Cloudinary (CDN + Image Management)
**Configuration**:
- `CLOUDINARY_CLOUD_NAME`: Account identifier
- `CLOUDINARY_API_KEY`: API key
- `CLOUDINARY_API_SECRET`: API secret

**Usage**: Image optimization, thumbnail generation, responsive delivery
**Status**: Configured but primary usage pattern not shown in samples

---

## Error Tracking & Monitoring

### Sentry
**Provider**: Sentry
**Backend SDK**: @sentry/node 8.0.0
**Mobile SDK**: @sentry/react-native 6.0.0

**Backend Integration**:
- **File**: `/backend/src/config/sentry.ts`
- **Configuration**: `SENTRY_DSN` (optional, production only)
- **Initialization**: Automatic in production mode
- **Sampling**:
  - Production: 10% trace and profile sampling
  - Dev/Test: 100% sampling
- **Before-send hook**: Filters sensitive data (auth headers, cookies)
- **Error filtering**: Ignores timeout errors
- **User anonymization**: Masks email addresses

**Mobile Integration**:
- **File**: `/mobile/src/config/sentry.tsx`
- **Functionality**:
  - Automatic error capture
  - Breadcrumb tracking
  - Performance monitoring
  - User context tracking

**Shared Functionality**:
- **setSentryUser()**: Set user context
- **clearSentryUser()**: Clear user context
- **captureException()**: Manually capture exceptions
- **captureMessage()**: Manually capture messages
- **addBreadcrumb()**: Track user actions

---

## Analytics & Product Analytics

### PostHog
**Provider**: PostHog
**Backend SDK**: posthog-node 4.0.0
**Mobile SDK**: posthog-react-native 3.0.0

**Backend Integration**:
- **File**: `/backend/src/config/posthog.ts` (223 lines)
- **Configuration**:
  - `POSTHOG_API_KEY`: API key
  - `POSTHOG_HOST`: PostHog instance URL
- **Batch Settings**: flushAt 20 events, flushInterval 10s
- **Initialization**: `initPostHog()` called at startup
- **Shutdown**: Graceful shutdown with `shutdownPostHog()`

**Tracked Events**:
- **trackEvent()**: Custom events with properties
- **trackApiRequest()**: API request tracking (method, path, status, duration)
- **trackUserAction()**: User interactions (article viewed, etc.)
- **trackError()**: Error events with context
- **trackPageView()**: Page navigation (web)
- **identifyUser()**: User identification
- **aliasUser()**: Merge user identities
- **setUserProperties()**: User property updates

**Mobile Integration**:
- **File**: `/mobile/src/config/posthog.ts`
- **Functionality**:
  - Automatic screen tracking
  - User action tracking
  - Error logging
  - Event batching

**Event Examples**:
```javascript
trackEvent(userId, 'premium_subscription', { plan: 'monthly', amount: 9.99 });
trackApiRequest(userId, 'GET', '/feed/tr', 200, 145, { country: 'tr' });
trackUserAction(userId, 'article_viewed', { article_id: '123', source: 'CNN' });
```

---

## RSS Feed Aggregation

### RSS Feed Parsing
**Provider**: Native (no external service, self-hosted parsing)
**Library**: xml2js 0.6.2

**Service**:
- **File**: `/backend/src/services/scraper/rssParser.ts`
- **Functionality**:
  - Parse RSS/Atom feeds
  - Extract article metadata
  - Handle various feed formats

**Sources Configuration**:
- Stored in database `article_sources` table
- Contains RSS URLs per country per source
- Examples: CNN, BBC, Reuters, AP, etc. (country-specific)

**Processing Pipeline**:
1. Scraper fetches each RSS feed
2. Parser extracts articles
3. Duplicate check via similarity algorithm
4. Articles queued for AI processing
5. Results stored in country-specific tables

**Cron Job**: `/backend/src/cron/scraperCron.ts`
- **Schedule**: Every 30 minutes
- **Manual trigger**: POST `/ops/scrape` (requires ops API key)
- **Queue**: In-memory AI processing queue with background worker
- **Rate limiting**: 500ms delay between AI calls

---

## Search Infrastructure

### Elasticsearch
**Provider**: Elasticsearch
**Configuration**:
- `ELASTICSEARCH_URL`: Elasticsearch endpoint
- `ELASTICSEARCH_API_KEY`: API key for authentication

**Status**: Configured but primary usage not shown in samples
**Potential Use**: Full-text search across articles and digests

---

## CII (Cross-Issue Importance) Analysis

### Internal Service
**File**: `/backend/src/services/ciiService.ts`
**Functionality**: Calculate cross-issue importance scores for articles
**API Route**: `/cii` endpoint
**No external integration** - purely internal algorithm

---

## Content Alignment Analysis

### Alignment Feedback Service
**File**: `/backend/src/services/alignmentFeedbackService.ts`
**Functionality**: Track user feedback on content alignment/bias
**No external integration** - stores feedback in local database

---

## Scheduled Cron Jobs

All cron jobs are located in `/backend/src/cron/` with manual trigger endpoints:

### 1. Scraper Cron
- **File**: `scraperCron.ts`
- **Schedule**: Every 30 minutes
- **Trigger**: POST `/ops/scrape` (requires ops API key)
- **Task**: Run article scraper across all RSS sources
- **Queue**: Background AI processing

### 2. Digest Cron
- **File**: `digestCron.ts`
- **Schedule**: Daily at 07:00 and 19:00 (UTC assumed)
- **Trigger**: POST `/ops/digest`
- **Task**: Generate daily digest for each country
- **Output**: Store in database, notify users

### 3. Tweet Cron
- **File**: `tweetCron.ts`
- **Schedule**: As configured (not shown in samples)
- **Trigger**: POST `/ops/tweets`
- **Task**: Scrape tweets from tracked accounts

### 4. Weekly Cron
- **File**: `weeklyCron.ts`
- **Schedule**: Sunday at 20:00 (assumed)
- **Task**: Generate weekly summary digest
- **File**: `/backend/src/services/weeklyService.ts`

### 5. Alignment Notification Cron
- **File**: `alignmentNotificationCron.ts`
- **Schedule**: Every 5 minutes
- **Task**: Send alignment notification to users about content consensus

---

## API Keys & Authentication

### Backend Authentication
- **Firebase ID Token**: Sent as `Authorization: Bearer {token}`
- **Ops API Key**: Sent as `x-ops-key` header for `/ops/*` endpoints
- **Rate Limiting**: 5 ops requests per minute

### Admin API Keys
- `ADMIN_API_KEY`: Optional, used if `OPS_API_KEY` not set
- **Validation**: Timing-safe string comparison via crypto module

---

## Network & API Configuration

### Development
- **Backend**: http://localhost:3000 (or 3333 in some configs)
- **Mobile**: Android emulator uses 10.0.2.2:3000, iOS uses localhost:3000
- **Admin**: http://localhost:5173 with proxy to http://localhost:3333

### Production
- **Backend**: https://d4ily-production.up.railway.app
- **Mobile**: https://d4ily-production.up.railway.app
- **Admin**: Typically served from same domain or CDN

### Vite Proxy Configuration
```typescript
// Admin dev server proxies /api requests to backend
proxy: {
  '/api': {
    target: 'http://localhost:3333',
    changeOrigin: true,
    rewrite: (path) => path.replace(/^\/api/, '')
  }
}
```

---

## Monitoring & Observability

### Request Timing
- **Server-Timing header**: Includes app duration
- **Latency budgets**:
  - `/feed` routes: 800ms
  - `/digest` routes: 3000ms
  - Default: 1200ms
- **Warnings logged** if exceeded

### Logging
- **Backend**: Pino logger with structured JSON output
- **Mobile**: Console logs + Sentry
- **Log levels**: error, warn, info, debug

### Availability
- **Health check**: GET `/health` returns uptime and status
- **Circuit breaker**: Redis failures don't crash app
- **Graceful degradation**: Optional services (Redis, Firebase) can fail independently

---

## Summary Table

| Service | Type | SDK/Library | Config | Status | Critical |
|---------|------|-------------|--------|--------|----------|
| Firebase | Auth + Messaging | firebase-admin 12.7 | FIREBASE_* | Prod | Yes |
| Turso | Database | @libsql/client 0.5.6 | TURSO_* | Prod | Yes |
| Upstash Redis | Cache | @upstash/redis 1.28 | UPSTASH_* | Optional | No |
| OpenAI | AI Models | openai 4.24 | OPENAI_API_KEY | Prod | Yes |
| Expo/Firebase Cloud Messaging | Push | expo-notifications | - | Prod | Yes |
| Twitter API | Social Data | Custom (twitterapi.io) | TWITTER_API_KEY | Prod | No |
| RevenueCat | Monetization | react-native-purchases 8.9 | REVENUECAT_* | Prod | No |
| Sentry | Error Tracking | @sentry/node 8.0 | SENTRY_DSN | Optional | No |
| PostHog | Analytics | posthog-node 4.0 | POSTHOG_* | Optional | No |
| Resend | Email | (config only) | RESEND_API_KEY | Optional | No |
| Cloudinary | CDN | (config only) | CLOUDINARY_* | Optional | No |
| Elasticsearch | Search | (config only) | ELASTICSEARCH_* | Optional | No |

