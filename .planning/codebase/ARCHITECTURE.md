# D4ily Platform Architecture

## Overview

D4ily is an AI-powered multi-country news digest platform organized as a monorepo with three main applications:

1. **Backend API** (Hono Node.js server) - Handles digests, articles, user interactions
2. **Mobile App** (React Native/Expo) - Consumer-facing news digest reader
3. **Admin Panel** (React/Vite) - Administrative management interface

The system integrates with Firebase for authentication, OpenAI for content analysis, and Turso (SQLite) for data persistence.

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Client Layer                          │
├──────────────────────┬──────────────────┬──────────────────┤
│   Mobile App         │   Admin Panel     │   Landing Page   │
│   (React Native)     │   (React/Vite)    │   (React)        │
└──────────┬───────────┴────────┬──────────┴──────────┬───────┘
           │                    │                     │
           └────────────────────┼─────────────────────┘
                                │
                    ┌───────────▼────────────┐
                    │   Firebase Auth        │
                    │   (ID Tokens)          │
                    └───────────┬────────────┘
                                │
           ┌────────────────────▼───────────────────┐
           │      Backend API (Hono)                │
           │      Port 3000 (Development)           │
           │      Railway.app (Production)          │
           └────────────────────┬───────────────────┘
                                │
        ┌───────────────────────┼───────────────────────┐
        │                       │                       │
   ┌────▼────┐            ┌─────▼──────┐          ┌────▼────┐
   │  Turso   │            │  Redis     │          │ OpenAI  │
   │ (SQLite) │            │ (Upstash)  │          │  API    │
   │  Remote  │            │ (Caching)  │          │         │
   └──────────┘            └────────────┘          └─────────┘
```

---

## Backend Architecture

### Entry Point: `src/index.ts`

The Hono application initializes with:
- **CORS configuration** (production origin whitelist)
- **Compression middleware** for API responses
- **Rate limiting** (global, ops-specific)
- **Request logging** with latency budgeting
- **Route registration** for 18 API endpoints
- **Cron job initialization** (scraper, digest, weekly, alignment notifications, tweets)
- **Ops endpoints** (`/ops/scrape`, `/ops/digest`, `/ops/tweets`) with API key auth

### Route Layer

API routes are organized by feature:

| Route | Purpose | Key Handlers |
|-------|---------|-------------|
| `/auth` | User authentication | Firebase token verification, registration |
| `/categories` | News categories | GET categories for filtering |
| `/sources` | News sources (RSS/Twitter) | Create, update, list sources |
| `/digest` | Daily digests | GET latest/dated digests, create, reactions |
| `/feed` | Individual articles | GET articles, filtering, feed management |
| `/weekly` | Weekly summaries | GET weekly digests with AI analysis |
| `/search` | Full-text search | Search articles by text/topics/sources |
| `/comments` | Article comments | CRUD comments, threading |
| `/reactions` | Article reactions | Create, delete reactions (emojis) |
| `/user` | User management | Profile, preferences, history |
| `/notifications` | User notifications | Push token registration, notification list |
| `/polls` | Digest polls | Create, vote on polls |
| `/topics` | News topics | GET topics for categorization |
| `/history` | Read history | Track and retrieve read articles |
| `/premium` | Premium features | Subscription status |
| `/cii` | Content Index Info | Content quality metrics |
| `/admin` | Admin operations | Article/digest management, user admin |
| `/webhooks` | External integrations | Firebase/external webhooks |
| `/feedback` | User feedback | Store user feedback |

### Service Layer

Services encapsulate business logic:

#### Core Services
- **digestService.ts** (62KB)
  - Generates daily digests using AI clustering
  - Fetches articles within time windows
  - Processes with OpenAI (text-davinci-003)
  - Handles legacy (morning/evening) and daily periods
  - Fallback logic for AI failures

- **aiService.ts**
  - Wraps OpenAI API calls
  - Prompt engineering for various AI tasks
  - Response parsing and error handling

- **emotionalAnalysisService.ts**
  - Analyzes article sentiment
  - Scores emotional tone
  - Political bias detection

- **perspectivesService.ts**
  - Finds different perspectives on topics
  - Aligns articles with political spectrum
  - Generates comparison views

- **scraperService.ts** + **tweetScraperService.ts**
  - RSS feed parsing (rssParser.ts)
  - Article extraction and enrichment
  - Tweet scraping from Twitter X accounts

- **alignmentFeedbackService.ts**
  - Processes user alignment votes
  - Updates political spectrum models
  - Notification generation

- **weeklyService.ts**
  - Aggregates weekly summaries
  - AI-powered weekly analysis

#### Notification Services
- **notificationService.ts** - FCM push notifications
- **digestNotificationService.ts** - Digest delivery notifications
- **alignmentNotificationService.ts** - Alignment feature notifications

#### Support Services
- **ciiService.ts** - Content Index Info (quality metrics)

### Database Layer

**ORM**: Drizzle ORM with Turso (libsql) driver
**Version**: @libsql/client ^0.5.6 (verified stable for local & remote)

#### Schema Structure (`src/db/schema/`)

##### global.ts - Shared Tables
- `categories` - News categories
- `sources` - Article sources (RSS feeds, Twitter accounts)
- `users` - User accounts (Firebase integrated)
- `notifications` - User notification settings
- `comments` - Article comments
- `reactions` - User reactions (emoji-based)
- `polls` - Digest polls
- `reads` - Read history
- `premium_users` - Premium subscriptions
- `feedbackItems` - User feedback
- `users_alignment_votes` - Political alignment votes
- `alignment_notification_jobs` - Scheduled alignment notifications

##### Country-Specific Tables (8 countries: tr, de, us, uk, fr, es, it, ru)
Per country: `[country]_articles`, `[country]_daily_digests`, `[country]_tweets`

Each country module contains:
- **Articles table**
  - title, description, URL, source
  - AI-generated: title_summary, detail_content, summary
  - Emotional analysis: emotional_tone, tone_score
  - Quality metrics: content_quality_score, alignment_data
  - Metadata: published_at, scraped_at

- **Digests table**
  - period (daily, morning, evening)
  - digestDate string (YYYY-MM-DD)
  - Sections: politics, economy, technology, society, health, science, culture, world, security, energy, geopolitics
  - AI-generated summaries
  - Metadata: created_at

- **Tweets table**
  - Tweet content from political/news accounts
  - Links to accounts
  - Engagement metrics

### Middleware Layer (`src/middleware/`)

1. **auth.ts**
   - Firebase ID token verification
   - User context injection
   - Role-based access control

2. **rateLimiter.ts**
   - Express-rate-limit integration
   - Window-based rate limiting
   - Per-route customization

3. **timeout.ts**
   - Route-specific timeouts
   - AI routes: 30s, default: 60s

4. **rateLimit.ts** (legacy)
   - Additional rate limit utilities

### Utility Layer (`src/utils/`)

- **aiRequestWrapper.ts** - AI call orchestration with retries
- **aiFallbacks.ts** - Fallback digests when AI fails
- **alignment.ts** - Political alignment calculations
- **circuitBreaker.ts** - Service degradation patterns
- **errors.ts** - Custom error types
- **politicalTone.ts** - Tone analysis algorithms
- **sanitize.ts** - HTML/XSS sanitization
- **similarity.ts** - Article similarity scoring
- **schemas.ts** - Zod validation schemas

### Cron Jobs (`src/cron/`)

| Job | Schedule | Purpose |
|-----|----------|---------|
| **scraperCron** | Every 30 minutes | Fetches RSS feeds & Twitter accounts, stores articles |
| **digestCron** | 07:00 & 19:00 Istanbul | Generates daily digests |
| **weeklyCron** | Sunday 20:00 Istanbul | Generates weekly summaries |
| **alignmentNotificationCron** | Every 5 minutes | Processes alignment feedback notifications |
| **tweetCron** | Every 6 hours | Scrapes political Twitter X accounts |

---

## Mobile App Architecture

### Entry Point: `app/_layout.tsx`

Root layout with:
- Font loading (DM Sans, Syne)
- Theme provider (light/dark)
- Auth state restoration from Secure Store
- Push notification initialization
- TanStack Query provider
- Gesture handler wrapper

### Navigation Structure (Expo Router)

```
app/
├── (tabs)/           # 5-tab bottom navigation
│   ├── index.tsx     # Özetler (Digests)
│   ├── explore.tsx   # Ara (Search)
│   ├── compare.tsx   # Karşılaştır (Compare)
│   ├── map.tsx       # World Map/Globe
│   └── profile.tsx   # Profil
├── auth.tsx          # Auth modal
├── auth/             # Auth sub-screens
├── article/          # Article detail modal
├── digest/           # Digest detail modal
├── settings/         # Settings screens
├── onboarding/       # Initial setup
├── help.tsx          # Help/FAQ
├── notifications.tsx # Notification center
├── history.tsx       # Read history
├── premium.tsx       # Premium subscription
└── user-profile.tsx  # User profile

(tabs)/_layout.tsx    # Bottom tab navigation setup
```

### Component Hierarchy

#### Screen Components (Feature Screens)
- **DigestScreen** - Lists digests, AI-generated summaries
- **SearchScreen** - Full-text search with filters
- **CompareScreen** - Compare articles/sources/political alignment
- **ProfileScreen** - User profile & statistics
- **MapScreen** - World map showing news by country

#### Component Directories

| Path | Components | Purpose |
|------|-----------|---------|
| `src/components/article/` | ArticleHeader, ArticleWebView, ContentQualityBadges, EmotionalAnalysisCard, PoliticalToneGauge, SourceInfoBar, AISummaryModal | Article display & metadata |
| `src/components/digest/` | DigestReactions | Digest interactions |
| `src/components/feed/` | BalancedFeedScreen, FeaturedCarousel, FeedFilterBar | Feed display |
| `src/components/source/` | SourceCard, ComparisonCard, SourceAlignmentHistory | Source information |
| `src/components/profile/` | ProfileHeader, ReputationCard, StatsOverview | User profile |
| `src/components/interaction/` | AlignmentVotingWidget, CommentCard, CommentForm, CommentThread | User interactions |
| `src/components/analysis/` | NewsAtmosphereCard, CountryCIIComparison | News analysis |
| `src/components/map/` | WorldMap, Globe, CountryShape, CountryTooltip, NewsMarker, NewsLocationPanel | Map visualization |
| `src/components/ui/` | AlignmentDot, AlignmentGauge, EmotionBar, EmptyState, ErrorState, LoadingCard, NotificationItem, TimeAgo, CIIBadge | Reusable UI |
| `src/components/feedback/` | FeedbackSheet | User feedback |
| `src/components/comments/` | CommentSection | Comment threads |
| `src/components/comparison/` | ComparisonView | Source/perspective comparison |
| `src/components/ai/` | AnalysisCard | AI-generated analysis |

### State Management (Zustand)

**`src/store/`**
- **useAuthStore** - User auth state, login/logout, token management
- **useAppStore** - Global app state
- **useFeedStore** - Feed filter preferences
- **useThemeStore** - Theme (light/dark)

### API Layer (`src/api/`)

- **client.ts** - Axios instance with auth interceptors
- **config.ts** - API configuration & endpoints
- **queryClient.ts** - TanStack Query client
- **services/** - API service methods

### Styling

- **NativeWind v2** - Tailwind CSS for React Native
- **Custom theme** - Syne (display), DM Sans (body)
- **Icons** - Lucide React Native

### Key Dependencies

- **Expo Router** - File-based routing
- **TanStack Query** - Server state management
- **Zustand** - Client state
- **Firebase** - Auth and Firestore
- **Sentry** - Error tracking
- **Expo Notifications** - Push notifications

---

## Admin Panel Architecture

### Entry Point: `src/App.tsx`

React Router-based SPA with:
- LoginPage route
- Protected AdminLayout with routes
- TanStack Query for data fetching
- Zustand for state
- React Hot Toast for notifications

### Routing Structure

```
/login              # Authentication page
/                   # Dashboard
/articles/:country  # Articles by country
/sources/:country   # Sources management
/sources/manage-countries  # Country CRUD
/digests/:country   # Digests by country
/twitter/:country   # Twitter accounts
/users              # User management
/notifications      # Notification management
/cron-logs          # Cron job logs
/system             # System health
/settings           # Settings
```

### Page Components (Feature Pages)

| Page | Purpose | Key Features |
|------|---------|-------------|
| **DashboardPage** | System overview | Stats, recent activity, health checks |
| **ArticlesByCountryPage** | Article management | Table view, filtering, bulk actions |
| **DigestsByCountryPage** | Digest management | View, edit, regenerate digests |
| **SourcesByCountryPage** | RSS source management | CRUD sources, test feeds |
| **ManageCountriesPage** | Country configuration | Add/remove countries |
| **TwitterAccountsPage** | Twitter account management | Configure X/Twitter accounts |
| **UsersPage** | User management | View users, roles, statistics |
| **NotificationsPage** | Notification system | View/manage notifications |
| **CronLogsPage** | Cron job monitoring | View logs, trigger manually |
| **SystemHealthPage** | System status | Database, services, uptime |
| **SettingsPage** | Admin settings | Configuration options |
| **LoginPage** | Admin authentication | Firebase login |

### Component Structure (`src/components/`)

| Directory | Components | Purpose |
|-----------|-----------|---------|
| `layout/` | AdminLayout | Sidebar, header, main content area |
| `ui/` | Reusable components | Buttons, cards, modals, tables |

### State Management

- **Zustand** - Admin-specific state (selected country, filters)
- **TanStack Query** - Server state (articles, digests, users)
- **React Router** - Route state

### Styling

- **Tailwind CSS** - Utility-first styling
- **Custom components** - Button, Table, Modal, Form inputs
- **Responsive design** - Mobile-to-desktop layouts

---

## Data Flow Patterns

### Digest Generation Flow

```
Scraper Cron (30min)
  ↓
Fetch RSS feeds & Twitter accounts
  ↓
Parse & extract articles
  ↓
Store in DB: [country]_articles
  ↓
Digest Cron (07:00, 19:00)
  ↓
Fetch articles (last 12/24 hours)
  ↓
AI Service: Generate summaries & clustering
  ↓
Perspectives Service: Find different viewpoints
  ↓
Store in DB: [country]_daily_digests
  ↓
Mobile/Admin API: GET /digest/:country
  ↓
Client: Display to users
```

### User Interaction Flow

```
Mobile Client
  ↓
Action: Vote alignment, comment, react
  ↓
POST /auth/:endpoint (with Firebase token)
  ↓
Auth Middleware: Verify token
  ↓
Interaction Service: Process & store
  ↓
DB: Update interaction tables
  ↓
Optional: Trigger notification
  ↓
Response: Success/error
```

### Authentication Flow

```
Mobile Client
  ↓
Firebase Auth UI: Email/password or social
  ↓
Firebase: Generate ID token
  ↓
Client: Store token in Secure Store
  ↓
API Requests: Include "Bearer {token}" header
  ↓
Backend Auth Middleware: Verify with Firebase
  ↓
Inject user context
  ↓
Process request with user identity
```

---

## Integration Points

### External Services

1. **Firebase**
   - Authentication (ID tokens)
   - User management
   - Webhook endpoints

2. **OpenAI**
   - Chat Completions API
   - Digest generation
   - Article summarization
   - Emotional analysis

3. **RSS Feeds**
   - News source aggregation
   - Multiple per country
   - Configurable in admin

4. **Twitter X API**
   - Political account scraping
   - Tweet collection
   - Engagement metrics

5. **Turso (libsql)**
   - Primary data store
   - Remote SQLite
   - Version 0.5.6

6. **Upstash Redis**
   - Optional caching
   - Rate limit state

7. **Sentry**
   - Error tracking (production)

8. **PostHog**
   - Analytics

9. **FCM (Firebase Cloud Messaging)**
   - Push notifications
   - Device token management

---

## Deployment Architecture

### Backend (Hono)

- **Platform**: Railway
- **Project**: angelic-vibrancy
- **Service**: D4ily
- **Triggers**: Auto-deploys from GitHub `master` branch
- **URL**: https://d4ily-production.up.railway.app
- **Runtime**: Node.js 22 (Nixpacks builder)
- **Port**: 3000

### Database (Turso)

- **Instance**: Hosted remote libsql
- **Connection**: `TURSO_CONNECTION_URL` (DB URL)
- **Auth**: `TURSO_AUTH_TOKEN` (API token)
- **Type**: SQLite (remote)
- **Replicas**: Read replicas for performance

### Mobile App

- **Platform**: Expo (managed cloud build)
- **Distribution**: TestFlight (iOS), Google Play (Android)
- **Development**: `expo start` for local testing

### Admin Panel

- **Platform**: Vercel (assumed)
- **Build**: `tsc -b && vite build`
- **Dev**: `vite`

---

## Key Architectural Decisions

1. **Monorepo Structure** - Single repo, three apps, shared types
2. **Country-Specific Tables** - Separate tables per country for scalability
3. **Digests Over Feed** - Aggregated daily summaries instead of individual feed
4. **AI-First Summarization** - OpenAI for content clustering & analysis
5. **Firebase Auth** - Centralized authentication
6. **Zustand + TanStack Query** - Lightweight, composable state management
7. **Expo Router** - File-based routing for mobile, similar to Next.js
8. **Drizzle ORM** - Type-safe SQL queries
9. **Hono Framework** - Lightweight, edge-compatible API server

