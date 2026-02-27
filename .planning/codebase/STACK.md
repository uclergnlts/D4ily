# D4ily Technology Stack

## Overview
D4ily is a multi-country AI-powered news digest platform with three main components: a Hono Node.js backend, React Native mobile app, and React admin panel. The stack emphasizes type safety, real-time capabilities, and cross-platform support.

---

## Backend Stack

### Runtime & Language
- **Node.js**: >=20.0.0 (supports jsdom 27 with ArrayBuffer.prototype.resizable)
- **TypeScript**: 5.3.0 (strict mode enabled)
- **Module System**: ES Modules (type: "module")

### Core Framework & Server
- **Hono**: 4.11.10 (lightweight HTTP framework)
- **@hono/node-server**: 1.8.0 (Node.js runtime for Hono)
- **Compression**: Built-in via hono/compress middleware

### Database & ORM
- **Turso**: SQLite serverless (remote libsql:// and local file: support)
- **@libsql/client**: 0.5.6 (critical version - 0.4.3 crashes locally, 0.6.x breaks migrations, 0.17.0 fails on inserts)
- **Drizzle ORM**: 0.29.0 (SQLite dialect with libsql driver)
- **Drizzle Kit**: 0.20.0 (schema migrations and studio)

### Caching & Performance
- **@upstash/redis**: 1.28.0 (REST-based Redis caching with circuit breaker)
- **Cache Keys**: Pattern-based invalidation with TTL support
- **Fallback**: App gracefully operates without Redis in dev

### AI & ML Services
- **OpenAI**: 4.24.0 (GPT-4 models for digest generation and analysis)
  - Main client: 60s timeout, 2 retries
  - Quick client: 15s timeout, 1 retry
  - Used for: article summarization, topic extraction, emotional analysis, perspective generation

### Authentication & Authorization
- **Firebase Admin SDK**: 12.7.0 (backend auth verification and messaging)
  - ID token verification
  - Push notification sending via Firebase Cloud Messaging
  - User management

### Email & Communication
- **Resend**: Email service (configuration available, API key optional)

### Monitoring & Analytics
- **Sentry**: 8.0.0 (error tracking with environment-specific sampling)
  - Production: 10% trace and profile sampling
  - Dev/Test: 100% sampling
  - Sensitive data filtering (auth headers, cookies)
- **PostHog**: 4.0.0 (product analytics and event tracking)
  - Batch events: flushAt 20, flushInterval 10s
  - Tracks user actions, API requests, errors

### Monetization & Subscriptions
- **RevenueCat**: Webhook integration for subscription management (available config)
  - Supported events: INITIAL_PURCHASE, RENEWAL, CANCELLATION, EXPIRATION, PRODUCT_CHANGE

### Content & Utilities
- **xml2js**: 0.6.2 (RSS feed XML parsing)
- **jsdom**: 27.4.0 (HTML parsing and DOM simulation for article content extraction)
- **DOMPurify**: 3.3.1 (XSS protection for user-generated content)
- **Nanoid**: 5.1.6 (URL-friendly unique ID generation)
- **UUID**: 13.0.0 (RFC4122 unique identifiers)
- **Zod**: 3.22.0 (TypeScript-first schema validation)
- **Pino**: 8.17.0 (lightweight JSON logger)
- **Pino-Pretty**: 13.1.3 (dev logging formatter)
- **node-cron**: 3.0.3 (scheduled job execution: scraper 30min, digests 2x daily, tweets, weekly summaries)

### Rate Limiting & Security
- **express-rate-limit**: 8.2.1 (HTTP rate limiting middleware)
- **Crypto**: Node.js built-in (timing-safe string comparison for API key verification)

### Linting & Testing
- **Vitest**: 1.6.1 (unit/integration test runner, globals enabled)
- **@vitest/coverage-v8**: 1.6.1 (code coverage with V8 provider)
  - reportOnFailure: true (generates reports even on failures)
  - 10s test timeout
- **@vitest/ui**: 1.6.1 (visual test dashboard)
- **Supertest**: 6.3.4 (HTTP assertion library)
- **@faker-js/faker**: 10.2.0 (mock data generation)

### Code Quality & Build
- **TypeScript Compiler**: 5.3.0 (ESNext target, strict checks)
- **tsx**: 4.7.0 (TypeScript + ESM node runner)

### Configuration Files
- **tsconfig.json**: ES2022 target, bundler resolution, path aliases (@/*)
- **vitest.config.ts**: Node environment, 10s timeout, coverage to src/**, HTML+JSON+text reports
- **drizzle.config.ts**: SQLite dialect, libsql driver, local and remote support

### Dependency Overrides
```json
{
  "axios": "^1.13.5",
  "fast-xml-parser": "^5.3.6",
  "qs": "^6.14.2",
  "minimatch": "^10.2.1",
  "rollup": "^4.59.0",
  "esbuild": "^0.25.11"
}
```

---

## Mobile Stack

### Runtime & Language
- **React Native**: 0.81.5 (bleeding edge with new architecture enabled)
- **React**: 19.1.0 (latest concurrent features)
- **TypeScript**: 5.9.2
- **Expo**: 54.0.32 (managed React Native platform)

### Navigation & Routing
- **Expo Router**: 6.0.22 (file-based routing with typed routes experiment)
- **React Navigation**: 7.1.8 (core navigation components)
- **@react-navigation/bottom-tabs**: 7.4.0 (tab-based UI)
- **@react-navigation/native**: 7.1.8 (navigation container)
- **@react-navigation/elements**: 2.6.3 (header and navigation elements)

### State Management
- **Zustand**: 5.0.10 (lightweight global state store)
- **@tanstack/react-query**: 5.90.19 (server state management and caching)
- **@react-native-async-storage/async-storage**: 2.2.0 (persistent local storage)

### UI & Styling
- **NativeWind**: 2.0.11 (Tailwind CSS for React Native)
- **Tailwind CSS**: 3.3.2 (utility CSS framework)
- **TailwindCSS Merge**: 3.4.0 (class merging utility)
- **Class Variance Authority**: 0.7.1 (type-safe class generation)
- **clsx**: 2.1.1 (className utility)
- **Lucide React Native**: 0.562.0 (icon library)
- **Moti**: 0.29.0 (animation library)

### Fonts & Icons
- **@expo-google-fonts/dm-sans**: 0.4.2 (DM Sans font)
- **@expo-google-fonts/syne**: 0.4.2 (Syne font)
- **@expo/vector-icons**: 15.0.3 (Ionicons, Material Design)
- **Expo Symbols**: 1.0.8 (SF Symbols)

### UI Components & Interactions
- **@react-native-community/slider**: 5.0.1 (slider component)
- **@shopify/flash-list**: 2.0.2 (high-performance scrolling list)
- **React Native Safe Area Context**: 5.6.0 (safe area handling)
- **React Native Screens**: 4.16.0 (native screen management)
- **React Native Gesture Handler**: 2.28.0 (gesture recognition)
- **React Native Reanimated**: 4.1.1 (performance-optimized animations)
- **React Native SVG**: 15.12.1 (SVG rendering)
- **React Native WebView**: 13.15.0 (native web content)

### Authentication & Security
- **Firebase**: 12.8.0 (auth, Realtime DB, Firestore)
- **Expo Secure Store**: 15.0.8 (secure credential storage)

### Data & Visualization
- **Axios**: 1.13.5 (HTTP client)
- **D3 Geo**: 3.1.1 (geographic data visualization)
- **@types/d3-geo**: 3.1.0 (TypeScript definitions)

### Notifications
- **Expo Notifications**: 0.29.13 (push notifications)
- **Expo Device**: 7.0.2 (device capabilities detection)

### Monetization
- **React Native Purchases**: 8.9.5 (RevenueCat SDK for subscriptions)

### Analytics
- **Sentry**: 6.0.0 (error tracking for React Native)
- **PostHog**: 3.0.0 (product analytics)

### System Integration
- **Expo Constants**: 18.0.13 (app constants)
- **Expo Haptics**: 15.0.8 (haptic feedback)
- **Expo Image**: 3.0.11 (optimized image component)
- **Expo Linking**: 8.0.11 (deep linking)
- **Expo Splash Screen**: 31.0.13 (app splash screen)
- **Expo Status Bar**: 3.0.9 (status bar controls)
- **Expo System UI**: 6.0.9 (system UI styling)
- **Expo Web Browser**: 15.0.10 (native web browser integration)

### API & Code Generation
- **Orval**: 7.21.0 (TypeScript API client generation from OpenAPI/Swagger)
- **Prettier**: 3.0.0 (code formatting)

### Testing
- **Jest**: 29.7.0 (test framework)
- **Jest Expo**: 54.0.16 (Expo preset for Jest)
- **React Test Renderer**: 19.1.0 (component rendering for tests)
- **@testing-library/react-native**: 13.3.3 (React Native testing utilities)

### Build & Platform Config
- **EAS Build**: Expo Application Services (managed build service)
- **EAS CLI**: >=13.0.0 (command line tool)
- **app.json**: Expo configuration with new architecture, plugins, experiments
- **eas.json**: Build profiles (development, preview, production)

### Configuration Files
- **tsconfig.json**: ES2020 target, strict mode
- **.env**: Firebase config, API URL
- **app.json**: Platform-specific configs (iOS bundle ID, Android package, adaptive icons)
- **eas.json**: Build profiles with environment overrides

### Dependency Overrides
```json
{
  "markdown-it": "^14.1.1",
  "minimatch": "^10.2.1",
  "tar": "^7.5.8"
}
```

---

## Admin Panel Stack

### Runtime & Language
- **React**: 18.2.0 (stable version for web)
- **TypeScript**: 5.3.0
- **Node.js**: >=14 (Vite requirement)

### Framework & Build
- **Vite**: 5.0.0 (fast build tool and dev server)
- **@vitejs/plugin-react**: 4.3.1 (React JSX/Refresh support)

### Routing & State
- **React Router DOM**: 6.20.0 (SPA routing)
- **Zustand**: 4.4.0 (state management)
- **@tanstack/react-query**: 5.0.0 (server state caching)
- **@tanstack/react-table**: 8.10.0 (headless table component)

### Forms & Validation
- **React Hook Form**: 7.48.0 (performant form management)
- **@hookform/resolvers**: 3.3.0 (schema validation integrations)
- **Zod**: 3.22.0 (TypeScript schema validation)

### UI & Components
- **Lucide React**: 0.294.0 (icon library)
- **Tailwind CSS**: 3.3.0 (utility styling)
- **Tailwind Merge**: 2.1.0 (class merging)
- **clsx**: 2.0.0 (className utility)

### Utilities
- **Axios**: 1.6.0 (HTTP client)
- **Date-FNS**: 2.30.0 (date manipulation)
- **React Hot Toast**: 2.4.0 (toast notifications)
- **Recharts**: 2.10.0 (React charting library)

### Authentication
- **Firebase**: 10.7.0 (web SDK for auth)

### Linting & Formatting
- **ESLint**: 9.9.0 (code linting)
- **@eslint/js**: 9.9.0 (ESLint JS plugin)
- **eslint-plugin-react-hooks**: 5.1.0-rc.0 (hooks rules)
- **eslint-plugin-react-refresh**: 0.4.9 (React refresh rules)
- **Prettier**: 3.0.0 (code formatting)

### CSS Processing
- **PostCSS**: 8.4.0 (CSS transformation)
- **Autoprefixer**: 10.4.0 (vendor prefix handling)

### Configuration Files
- **vite.config.ts**: React plugin, dev proxy to backend (http://localhost:3333)
- **tsconfig.json**: React 18 types, strict mode
- **.env.example**: Firebase and API configuration

---

## Environment Configuration

### Backend (.env)
Required (or defaults):
- NODE_ENV (default: development)
- PORT (default: 3000)
- TURSO_DATABASE_URL (default: file:local.db)
- TURSO_AUTH_TOKEN

Optional:
- UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN (caching)
- FIREBASE_PROJECT_ID / FIREBASE_PRIVATE_KEY / FIREBASE_CLIENT_EMAIL (auth)
- OPENAI_API_KEY (AI features)
- ELASTICSEARCH_URL / ELASTICSEARCH_API_KEY (search)
- RESEND_API_KEY (email)
- CLOUDINARY_* (CDN/image storage)
- REVENUECAT_* (subscriptions)
- SENTRY_DSN (error tracking)
- POSTHOG_* (analytics)
- LOGTAIL_TOKEN (logging)

### Mobile (.env)
- EXPO_PUBLIC_FIREBASE_API_KEY
- EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN
- EXPO_PUBLIC_FIREBASE_PROJECT_ID
- EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET
- EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
- EXPO_PUBLIC_FIREBASE_APP_ID
- EXPO_PUBLIC_API_URL (production: https://d4ily-production.up.railway.app)

### Admin (.env)
- VITE_API_URL (default: http://localhost:3333)
- VITE_FIREBASE_* (Firebase web config)

---

## Key Design Decisions

### Database Strategy
- **Turso (SQLite)**: Serverless, scales to zero, easy local dev
- **Per-country tables**: Separate article/source/tweet tables for TR, DE, US, UK, FR, ES, IT, RU
- **Drizzle ORM**: Type-safe queries, migration management

### Caching Architecture
- **Upstash Redis**: Serverless cache with circuit breaker pattern
- **Graceful degradation**: App works without Redis in dev/offline
- **Pattern-based invalidation**: Batch cache clearing

### Testing Infrastructure
- **Vitest**: Fast, ESM-native, type-aware
- **Coverage reporting**: Even on test failures
- **Integration tests**: Use mock Turso credentials

### Monorepo Structure
- **Three independent packages**: backend, mobile, admin
- **Each has own tsconfig and build setup**
- **Shared configuration conventions** (env files, API URLs)

---

## Production Deployment

### Backend Hosting
- **Railway**: Auto-deploys from master branch
- **Service**: D4ily
- **Project**: angelic-vibrancy
- **Nixpacks builder**: Node.js 22
- **URL**: https://d4ily-production.up.railway.app

### Mobile Deployment
- **EAS Build**: Managed build service for iOS/Android
- **Development builds**: Internal distribution for testing
- **Preview builds**: Internal for staging
- **Production builds**: App Store and Google Play submissions

### Admin Panel Deployment
- **Typically served from same domain** or CDN
- **Vite build output**: Static files ready for deployment

---

## Performance Considerations

### Backend
- **Timeout budgets**: 800ms for feed, 3s for digest, 1.2s default
- **Request logging**: Server-Timing header for observability
- **Rate limiting**: Per-endpoint limits (5 ops/min)
- **AI queue**: Background processing with rate limiting (500ms between calls)

### Mobile
- **Flash List**: Optimized infinite scrolling for large lists
- **React Query**: Automatic refetching and background sync
- **Image optimization**: Expo Image with lazy loading
- **Code splitting**: Expo Router with route-based splitting

### Admin
- **Vite dev server**: Instant HMR
- **API proxy**: Dev server proxies to local backend
- **React Query**: Efficient server state management

---

## Security Measures

- **Firebase Auth**: ID token validation on all protected endpoints
- **CORS**: Strict origin checking in production
- **Rate limiting**: express-rate-limit for API endpoints
- **Webhook validation**: HMAC signature verification for RevenueCat
- **Secure storage**: Expo Secure Store for credentials on mobile
- **Sentry**: Sensitive data filtering (auth headers, cookies removed)
- **DOMPurify**: XSS protection for user content
- **Timing-safe comparison**: Crypto-based API key verification

