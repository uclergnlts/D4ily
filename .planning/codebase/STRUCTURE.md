# D4ily Project Directory Structure

## Project Root

```
D4ily/
├── backend/              # Hono Node.js API server
├── mobile/               # React Native/Expo mobile app
├── admin/                # React admin panel (Vite)
├── landing/              # Landing page (not detailed)
├── .planning/codebase/   # Architecture documentation
├── .github/              # GitHub workflows & CI/CD
├── .claude/              # Claude Code settings
├── README.md             # Project overview
├── .gitignore            # Git ignore rules
└── tmp_*.json            # Temporary test files
```

---

## Backend Structure (`backend/`)

### Root Configuration Files

```
backend/
├── package.json                          # Node.js dependencies & scripts
│   ├── "dev": "tsx watch src/index.ts"
│   ├── "build": "tsc"
│   ├── "start": "tsx src/index.ts"
│   ├── "test": "vitest"
│   ├── "test:coverage": "vitest run --coverage"
│   ├── "db:generate": "drizzle-kit generate"
│   └── "db:studio": "drizzle-kit studio"
├── tsconfig.json                         # TypeScript configuration
├── vitest.config.ts                      # Vitest test framework config
├── vitest.minimal.config.ts              # Minimal test config
├── drizzle.config.ts                     # Drizzle ORM configuration
├── eslint.config.js                      # ESLint rules
└── .env.example                          # Environment variables template
```

### Source Code (`src/`)

#### Entry Point
```
src/
├── index.ts                              # Main Hono app initialization
│   ├── CORS configuration (allowed origins)
│   ├── Compression middleware
│   ├── Rate limiting setup
│   ├── Request logging with latency budget
│   ├── Route registration (18 routes)
│   ├── Cron job startup
│   ├── DEV endpoints (/dev/scrape, /dev/digest)
│   └── OPS endpoints (/ops/scrape, /ops/digest, /ops/tweets)
├── check-articles.ts                     # Helper to check articles in DB
└── test-connections.ts                   # DB connection tester
```

#### Configuration (`src/config/`)
```
config/
├── env.ts                                # Environment variable schema & validation
├── db.ts                                 # Turso/libsql database connection
├── firebase.ts                           # Firebase Admin SDK initialization
├── logger.ts                             # Pino logger configuration
├── posthog.ts                            # PostHog analytics setup
└── sentry.ts                             # Sentry error tracking setup
```

#### Database (`src/db/`)
```
db/
├── seed.ts                               # Database seeding script
├── migrations/                           # Drizzle migration files (auto-generated)
└── schema/
    ├── index.ts                          # Schema barrel export
    ├── global.ts                         # Shared tables (users, sources, etc.)
    ├── articles.ts                       # Country-specific article tables
    ├── interactions.ts                   # Comments, reactions, polls, etc.
    └── metrics.ts                        # CII metrics schema
```

**Global Tables (shared across countries):**
- `categories` - News categories
- `sources` - RSS feeds & Twitter accounts
- `users` - User accounts
- `notifications` - Notification preferences
- `comments` - Article comments
- `reactions` - User reactions (emoji)
- `polls` - Digest polls
- `reads` - Read history
- `premium_users` - Premium subscriptions
- `feedbackItems` - User feedback
- `users_alignment_votes` - Alignment votes
- `alignment_notification_jobs` - Notification scheduling

**Country-Specific Tables (8 countries: tr, de, us, uk, fr, es, it, ru):**
Each country has three tables:
- `[country]_articles` - Article data with AI summaries
- `[country]_daily_digests` - Aggregated daily digests
- `[country]_tweets` - Tweets from political accounts

#### Routes (`src/routes/`)
```
routes/
├── admin.ts                              # Admin article/digest management (46KB)
├── auth.ts                               # User authentication & registration (19KB)
├── categories.ts                         # GET categories endpoint
├── cii.ts                                # Content Index Info metrics
├── comments.ts                           # Comment CRUD & threading (14KB)
├── digest.ts                             # GET/POST digests (15KB)
├── feed.ts                               # GET articles with filters (33KB)
├── feedback.ts                           # User feedback collection
├── history.ts                            # Read history tracking
├── notifications.ts                      # Notification management (14KB)
├── polls.ts                              # Digest polls CRUD
├── premium.ts                            # Premium features/subscriptions
├── reactions.ts                          # Article reactions (13KB)
├── search.ts                             # Full-text search (10KB)
├── sources.ts                            # Source management (26KB)
├── topics.ts                             # Article topics/categories
├── user.ts                               # User profile & preferences (15KB)
├── weekly.ts                             # Weekly digest summaries
└── webhooks.ts                           # Firebase & external webhooks (10KB)
```

#### Services (`src/services/`)
```
services/
├── digestService.ts                      # Digest generation & fetching (62KB)
│   ├── AI-powered clustering
│   ├── Section categorization
│   ├── Fallback logic
│   └── Period handling (daily/morning/evening)
├── aiService.ts                          # OpenAI API wrapper
├── emotionalAnalysisService.ts           # Sentiment & tone analysis
├── perspectivesService.ts                # Political alignment analysis (25KB)
├── alignmentFeedbackService.ts           # Alignment vote processing (11KB)
├── alignmentNotificationService.ts       # Alignment notifications (10KB)
├── weeklyService.ts                      # Weekly summary generation (7KB)
├── notificationService.ts                # FCM push notifications
├── digestNotificationService.ts          # Digest-specific notifications
├── ciiService.ts                         # Content Index Info metrics
└── scraper/
    ├── scraperService.ts                 # Article scraping orchestration (10KB)
    ├── rssParser.ts                      # RSS feed parsing (5KB)
    └── tweetScraperService.ts            # Twitter account scraping (8KB)
```

#### Middleware (`src/middleware/`)
```
middleware/
├── auth.ts                               # Firebase token verification
│   ├── Token decoding
│   ├── User context injection
│   └── Role checking
├── rateLimiter.ts                        # Express-rate-limit wrapper
├── rateLimit.ts                          # Additional rate limit utilities
└── timeout.ts                            # Route-specific request timeouts
```

#### Cron Jobs (`src/cron/`)
```
cron/
├── scraperCron.ts                        # Every 30 minutes
│   └── Fetches RSS feeds & Twitter accounts
├── digestCron.ts                         # 07:00 & 19:00 Istanbul time
│   └── Generates daily digests
├── weeklyCron.ts                         # Sunday 20:00
│   └── Generates weekly summaries
├── alignmentNotificationCron.ts          # Every 5 minutes
│   └── Processes alignment feedback
└── tweetCron.ts                          # Every 6 hours
    └── Scrapes political Twitter accounts
```

#### Types (`src/types/`)
```
types/
└── index.ts                              # TypeScript type definitions
    ├── DigestSection
    ├── Article
    ├── User
    ├── Comment
    └── Other shared types
```

#### Utilities (`src/utils/`)
```
utils/
├── aiRequestWrapper.ts                   # AI call orchestration & retries
├── aiFallbacks.ts                        # Fallback digests (hardcoded content)
├── alignment.ts                          # Alignment score calculations
├── circuitBreaker.ts                     # Service degradation patterns
├── errors.ts                             # Custom error types & handling
├── json.ts                               # JSON parsing utilities
├── politicalTone.ts                      # Tone analysis algorithms
├── sanitize.ts                           # HTML/XSS sanitization (DOMPurify)
├── similarity.ts                         # Article similarity scoring
└── schemas.ts                            # Zod validation schemas
```

### Testing (`tests/`)
```
tests/
├── setup.ts                              # Vitest setup & configuration
├── fixtures/
│   └── index.ts                          # Mock data generators
├── mocks/
│   ├── db.ts                             # Database mock
│   ├── firebase.ts                       # Firebase mock
│   ├── redis.ts                          # Redis mock
│   └── index.ts                          # Mock aggregator
├── integration/
│   └── routes/
│       ├── admin.test.ts
│       ├── auth.test.ts
│       ├── categories.test.ts
│       ├── comments.test.ts
│       ├── feed.test.ts
│       ├── polls.test.ts
│       ├── reactions.test.ts
│       ├── search.test.ts
│       ├── sources.test.ts
│       ├── topics.test.ts
│       ├── user.test.ts
│       ├── weekly.test.ts
│       └── notifications.test.ts
└── unit/
    ├── alignment.test.ts
    ├── alignmentFeedbackService.test.ts
    ├── alignmentNotificationService.test.ts
    ├── aiRequestWrapper.test.ts
    ├── aiService.test.ts
    ├── aiFallbacks.test.ts
    ├── auth.middleware.test.ts
    ├── circuitBreaker.test.ts
    ├── detailContent.regression.test.ts
    ├── digestService.test.ts
    ├── emotionalAnalysisService.test.ts
    ├── errors.test.ts
    ├── example.test.ts
    ├── minimal.test.ts
    ├── perspectivesService.test.ts
    ├── politicalTone.test.ts
    ├── rateLimit.test.ts
    ├── sanitize.test.ts
    ├── scraperCron.test.ts
    ├── security.test.ts
    ├── similarity.test.ts
    ├── simple.test.ts
    ├── timeout.test.ts
    ├── weeklyService.test.ts
    └── weeklyCron.test.ts
```

### Scripts (Root-Level)
```
backend/
├── apply-ai-migration.ts                 # Migration helper
├── check-articles.ts                     # Article verification
├── check-db.ts                           # Database health check
├── check-users.ts                        # User count check
├── manual-scrape.ts                      # Manual scraper trigger
├── migrate-comments.ts                   # Data migration
├── migrate-fix.ts                        # Fix migrations
├── migrate-interactions.ts               # Interaction migration
├── migrate-users-auth.ts                 # User auth migration
├── seed-mock-articles.ts                 # Seed test data
├── test-db-query.ts                      # Test DB queries
├── test-firebase.ts                      # Test Firebase config
├── test-openai.ts                        # Test OpenAI API
└── test-single-article.ts                # Test single article
```

### Key Configuration Files

**drizzle.config.ts** (Database)
- Connection to Turso
- Schema location: `src/db/schema`
- Out directory for migrations

**vitest.config.ts** (Testing)
- Coverage configuration
- Test environment (node)
- Test file patterns
- `reportOnFailure: true` for failed test reports

**.env Variables**
```
# Database
TURSO_CONNECTION_URL=libsql://...
TURSO_AUTH_TOKEN=...

# Firebase
FIREBASE_PROJECT_ID=...
FIREBASE_PRIVATE_KEY=...
FIREBASE_CLIENT_EMAIL=...

# APIs
OPENAI_API_KEY=...
UPSTASH_REDIS_REST_URL=...
UPSTASH_REDIS_REST_TOKEN=...

# Admin
OPS_API_KEY=...
ADMIN_API_KEY=...

# Server
PORT=3000
NODE_ENV=development
ALLOWED_ORIGINS=...

# Optional
SENTRY_DSN=...
POSTHOG_API_KEY=...
```

---

## Mobile App Structure (`mobile/`)

### Root Configuration Files

```
mobile/
├── package.json                          # Dependencies & scripts
│   ├── "start": "expo start"
│   ├── "android": "expo start --android"
│   ├── "ios": "expo start --ios"
│   ├── "test": "jest"
│   ├── "generate-api": "orval"
│   └── "format:api": "prettier ..."
├── tsconfig.json                         # TypeScript configuration
├── app.json                              # Expo configuration
│   ├── App name: "d4ily"
│   ├── Slug: "d4ily"
│   ├── Platforms: [ios, android, web]
│   ├── Plugins (Sentry, permissions, notifications)
│   └── Scheme configuration
├── eas.json                              # EAS Build configuration
├── metro.config.js                       # Metro bundler config
├── babel.config.js                       # Babel configuration
├── jest.config.js                        # Jest testing config
├── .eslintrc.js                          # ESLint rules
└── orval.config.ts                       # API code generation
```

### Source Code (`src/`)

#### Configuration (`src/config/`)
```
config/
├── sentry.tsx                            # Sentry error tracking setup
└── notifications.ts                      # FCM push notification setup
```

#### API Layer (`src/api/`)
```
api/
├── client.ts                             # Axios instance with interceptors
│   ├── Auth token injection
│   ├── Error handling
│   ├── Request/response logging
│   └── Base URL: EXPO_PUBLIC_API_URL
├── config.ts                             # API endpoints & configuration
├── queryClient.ts                        # TanStack Query configuration
├── mock/                                 # Mock data for offline development
└── services/                             # API service methods
    ├── digest.ts                         # Digest endpoints
    ├── article.ts                        # Article endpoints
    ├── user.ts                           # User endpoints
    ├── auth.ts                           # Authentication endpoints
    └── ... other services
```

#### State Management (`src/store/`)
```
store/
├── useAuthStore.ts                       # Authentication state (Zustand)
│   ├── user, token, isLoading
│   ├── login(), logout(), checkAuth()
│   └── Secure Store persistence
├── useAppStore.ts                        # Global app state
├── useFeedStore.ts                       # Feed filters & preferences
└── useThemeStore.ts                      # Light/dark theme
```

#### Components (`src/components/`)
```
components/
├── ui/                                   # Reusable UI components
│   ├── AlignmentDot.tsx                 # Political alignment indicator
│   ├── AlignmentGauge.tsx               # Alignment spectrum visualization
│   ├── EmotionBar.tsx                   # Emotional tone bar
│   ├── EmptyState.tsx                   # Empty list state
│   ├── ErrorState.tsx                   # Error display
│   ├── LoadingCard.tsx                  # Loading skeleton
│   ├── NotificationItem.tsx             # Notification list item
│   ├── TimeAgo.tsx                      # Relative time display
│   └── CIIBadge.tsx                     # Content Index Info badge
│
├── article/                              # Article display components
│   ├── ArticleHeader.tsx                # Title, source, date
│   ├── ArticleWebView.tsx               # Full article viewer
│   ├── AISummaryModal.tsx               # AI-generated summary modal
│   ├── ContentQualityBadges.tsx         # Quality metrics badges
│   ├── EmotionalAnalysisCard.tsx        # Sentiment analysis display
│   ├── PoliticalToneGauge.tsx           # Political bias visualization
│   └── SourceInfoBar.tsx                # Source metadata bar
│
├── digest/                               # Digest components
│   └── DigestReactions.tsx              # Digest reaction buttons
│
├── feed/                                 # Feed display
│   ├── BalancedFeedScreen.tsx           # Main feed with balanced articles
│   ├── FeaturedCarousel.tsx             # Top articles carousel
│   └── FeedFilterBar.tsx                # Filter & sort controls
│
├── source/                               # Source information
│   ├── SourceCard.tsx                   # Source summary card
│   ├── ComparisonCard.tsx               # Source comparison card
│   └── SourceAlignmentHistory.tsx       # Source alignment over time
│
├── profile/                              # User profile
│   ├── ProfileHeader.tsx                # User avatar & name
│   ├── ReputationCard.tsx               # Reputation/karma score
│   └── StatsOverview.tsx                # User statistics
│
├── interaction/                          # User interaction components
│   ├── AlignmentVotingWidget.tsx        # Vote on alignment
│   ├── CommentCard.tsx                  # Single comment display
│   ├── CommentForm.tsx                  # Comment text input
│   └── CommentThread.tsx                # Nested comments
│
├── comments/                             # Comment management
│   └── CommentSection.tsx               # Full comment thread display
│
├── comparison/                           # Comparison view
│   └── ComparisonView.tsx               # Side-by-side comparison
│
├── analysis/                             # News analysis
│   ├── NewsAtmosphereCard.tsx           # Overall sentiment visualization
│   └── CountryCIIComparison.tsx         # CII metrics by country
│
├── feedback/                             # User feedback
│   └── FeedbackSheet.tsx                # Feedback form modal
│
├── map/                                  # Map visualization
│   ├── WorldMap.tsx                     # Interactive world map
│   ├── Globe.tsx                        # 3D globe view
│   ├── CountryShape.tsx                 # Country path shape
│   ├── CountryTooltip.tsx               # Country info tooltip
│   ├── NewsMarker.tsx                   # News location marker
│   └── NewsLocationPanel.tsx            # Location details panel
│
└── navigation/                           # Navigation
    └── SideMenu.tsx                     # Slide-out navigation menu
```

#### Screens/Pages (File-Based Routing)

**`app/`** - Expo Router pages
```
app/
├── (tabs)/                              # Bottom tab navigation group
│   ├── _layout.tsx                      # Tab navigator layout
│   ├── index.tsx                        # Özetler (Digests) - main tab
│   ├── explore.tsx                      # Ara (Search) - explore/search
│   ├── compare.tsx                      # Karşılaştır (Compare) - comparison
│   ├── map.tsx                          # World map/news location view
│   └── profile.tsx                      # Profil (User profile)
│
├── _layout.tsx                          # Root layout (fonts, theme, providers)
├── auth.tsx                             # Authentication screen
├── auth/                                # Auth sub-routes
│   ├── forgot-password.tsx              # Password recovery
│   └── verify.tsx                       # Email verification
│
├── article/                             # Article detail modal
│   └── [id].tsx                         # Dynamic article page
│
├── digest/                              # Digest detail modal
│   └── [id].tsx                         # Dynamic digest page
│
├── onboarding/                          # Initial setup screens
│   ├── _layout.tsx
│   ├── categories.tsx                   # Select favorite categories
│   ├── sources.tsx                      # Select news sources
│   └── ... other onboarding steps
│
├── settings/                            # Settings screens
│   ├── _layout.tsx
│   ├── notifications.tsx                # Notification preferences
│   └── categories.tsx                   # Category settings
│
├── help.tsx                             # Help/FAQ screen
├── history.tsx                          # Read article history
├── notifications.tsx                    # Notification center
├── premium.tsx                          # Premium subscription view
├── podcast.tsx                          # Podcast player (experimental)
├── user-profile.tsx                     # User profile detail
├── saved.tsx                            # Saved articles
├── sources/                             # Sources browser
│   └── index.tsx
├── settings.tsx                         # Main settings screen
├── vote-source.tsx                      # Vote on source alignment
└── modal.tsx                            # Generic modal
```

### Assets & Native Code

```
mobile/
├── assets/                              # Images, fonts, icons
├── native_modules/                      # Custom native code (if any)
└── ...Expo-managed native files
```

### Testing

```
mobile/
└── __tests__/
    └── useInteraction.test.tsx          # Hook testing example
```

### Key Dependencies

- **expo** - Managed React Native
- **expo-router** - File-based routing
- **react-native** - Native framework
- **@tanstack/react-query** - Server state
- **zustand** - Client state
- **nativewind** - Tailwind for React Native
- **firebase** - Auth/Firestore
- **axios** - HTTP client
- **expo-notifications** - Push notifications
- **sentry** - Error tracking

### Environment Variables (`.env`)

```
EXPO_PUBLIC_API_URL=https://d4ily-production.up.railway.app
EXPO_PUBLIC_FIREBASE_PROJECT_ID=...
EXPO_PUBLIC_FIREBASE_API_KEY=...
EXPO_PUBLIC_DEBUG_API=false
EXPO_PUBLIC_SENTRY_DSN=...
```

---

## Admin Panel Structure (`admin/`)

### Root Configuration Files

```
admin/
├── package.json                          # Dependencies & scripts
│   ├── "dev": "vite"
│   ├── "build": "tsc -b && vite build"
│   ├── "lint": "eslint ."
│   └── "preview": "vite preview"
├── tsconfig.json                         # TypeScript configuration
├── vite.config.ts                        # Vite configuration
├── eslint.config.js                      # ESLint rules
├── tailwind.config.js                    # Tailwind CSS config
├── postcss.config.js                     # PostCSS config
└── .env.example                          # Environment template
```

### Source Code (`src/`)

#### Entry Point
```
src/
├── main.tsx                              # React DOM render
├── App.tsx                               # React Router setup
├── index.css                             # Global styles
└── vite-env.d.ts                        # Vite type definitions
```

#### API Layer (`src/api/`)
```
api/
├── queryClient.ts                        # TanStack Query client
└── client.ts                             # Axios instance for admin API
```

#### State Management (`src/store/`)
```
store/
├── authStore.ts                          # Admin authentication (Zustand)
└── ... other stores
```

#### Pages (`src/pages/`)
```
pages/
├── LoginPage.tsx                         # Admin login (Firebase)
├── DashboardPage.tsx                     # Overview dashboard
│   ├── Stats (articles, digests, users)
│   ├── Recent activity
│   └── System health
│
├── ArticlesByCountryPage.tsx             # Article management table
│   ├── Filters by country/date
│   ├── Bulk actions
│   └── Detail modal/edit
│
├── DigestsByCountryPage.tsx              # Digest management
│   ├── View digest contents
│   ├── Edit sections
│   ├── Regenerate digest
│   └── View reactions/comments
│
├── SourcesByCountryPage.tsx              # RSS/Twitter source management
│   ├── Add/edit sources
│   ├── Test feed
│   ├── Enable/disable
│   └── View last fetch
│
├── ManageCountriesPage.tsx               # Country configuration
│   ├── Add countries
│   ├── Remove countries
│   ├── Configure per-country settings
│   └── Country-specific sources
│
├── TwitterAccountsPage.tsx               # Twitter/X account management
│   ├── Add political accounts
│   ├── Configure scrape frequency
│   └── View recent tweets
│
├── UsersPage.tsx                         # User management
│   ├── User list/table
│   ├── Ban/promote users
│   ├── View user stats
│   └── Filter by country/role
│
├── NotificationsPage.tsx                 # Notification management
│   ├── View sent notifications
│   ├── Send broadcast
│   ├── View notification logs
│   └── Configure notification settings
│
├── CronLogsPage.tsx                      # Cron job monitoring
│   ├── View cron job logs
│   ├── Trigger jobs manually
│   ├── View last run times
│   └── View job status
│
├── SystemHealthPage.tsx                  # System status
│   ├── Database connection
│   ├── API health
│   ├── Service status
│   ├── Last scraper run
│   └── Uptime
│
└── SettingsPage.tsx                      # Admin settings
    ├── API keys configuration
    ├── Email settings
    ├── Backup/export options
    └── System configuration
```

#### Components (`src/components/`)
```
components/
├── layout/
│   └── AdminLayout.tsx                   # Main layout wrapper
│       ├── Sidebar navigation
│       ├── Top header
│       ├── Route outlet
│       └── Responsive design
│
└── ui/
    ├── Button.tsx
    ├── Table.tsx                         # Data table component
    ├── Modal.tsx
    ├── Card.tsx
    ├── Form.tsx
    ├── Input.tsx
    ├── Select.tsx
    ├── DatePicker.tsx
    ├── Pagination.tsx
    └── ... other reusable components
```

#### Types (`src/types/`)
```
types/
├── api.ts                                # API response types
├── admin.ts                              # Admin-specific types
└── ... other types
```

#### Hooks (`src/hooks/`)
```
hooks/
├── useAdminAuth.ts                       # Admin authentication hook
├── useFetchArticles.ts                   # Articles data fetching
├── useFetchDigests.ts                    # Digests data fetching
└── ... other custom hooks
```

#### Configuration (`src/config/`)
```
config/
└── firebase.ts                           # Firebase setup for admin
```

#### Utilities (`src/lib/`)
```
lib/
├── api.ts                                # API helper functions
├── format.ts                             # Formatting utilities
└── ... other helpers
```

### Build Output

```
admin/
└── dist/                                 # Built production files (generated)
    ├── index.html
    ├── assets/
    └── ...
```

### Environment Variables

```
VITE_API_URL=https://d4ily-production.up.railway.app
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_API_KEY=...
```

---

## Important Configuration Files Summary

| File | Purpose | Location |
|------|---------|----------|
| `tsconfig.json` | TypeScript compilation settings | backend, mobile, admin |
| `package.json` | Dependencies & npm scripts | backend, mobile, admin |
| `.env` | Environment variables | backend (only), mobile, admin |
| `vitest.config.ts` | Test framework setup | backend |
| `drizzle.config.ts` | ORM configuration | backend |
| `app.json` | Expo app configuration | mobile |
| `eas.json` | EAS Build configuration | mobile |
| `vite.config.ts` | Vite build configuration | admin |
| `tailwind.config.js` | Tailwind CSS customization | mobile, admin |

---

## Naming Conventions

### Files
- **Components**: PascalCase (e.g., `ArticleCard.tsx`)
- **Services**: camelCase with "Service" suffix (e.g., `digestService.ts`)
- **Hooks**: camelCase with "use" prefix (e.g., `useAuthStore.ts`)
- **Tests**: Original name + `.test.ts` (e.g., `digestService.test.ts`)
- **Utils**: camelCase (e.g., `sanitize.ts`)
- **Types**: PascalCase (e.g., `Article.ts`)

### Directories
- **kebab-case** for multi-word (e.g., `daily-digests`)
- **camelCase** for logic modules (e.g., `scraperService`)
- **Plural for collections** (e.g., `components`, `routes`, `services`)

### Database Tables
- **snake_case** with country prefix (e.g., `tr_articles`, `us_daily_digests`)
- **Global tables** without prefix (e.g., `users`, `sources`, `categories`)

### APIs
- **kebab-case paths** (e.g., `/daily-digests`, `/read-history`)
- **camelCase query params** (e.g., `?createdAfter=`, `?countryCode=`)

---

## Key File Sizes (Backend)

| File | Size | Complexity |
|------|------|-----------|
| `digestService.ts` | 62 KB | High - core logic |
| `admin.ts` | 46 KB | High - many endpoints |
| `feed.ts` | 33 KB | High - complex filtering |
| `sources.ts` | 26 KB | Medium - source management |
| `perspectivesService.ts` | 25 KB | High - alignment algorithms |
| `auth.ts` | 19 KB | Medium - auth flow |
| `comments.ts` | 14 KB | Medium - nested comments |
| `digest.ts` | 15 KB | Medium - digest endpoints |
| `reactions.ts` | 13 KB | Low - simple CRUD |

---

## Development Workflow

### Backend Development
```bash
# Start dev server with hot reload
npm run dev

# Run tests with coverage
npm run test:coverage

# Generate database migrations
npm run db:generate

# View database in studio
npm run db:studio
```

### Mobile Development
```bash
# Start Expo dev server
npm start

# Run iOS simulator
npm run ios

# Run Android emulator
npm run android

# Run tests
npm test

# Generate API types from OpenAPI spec
npm run generate-api
```

### Admin Development
```bash
# Start dev server with hot reload
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Lint code
npm run lint
```

