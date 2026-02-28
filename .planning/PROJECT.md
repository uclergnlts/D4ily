# D4ily

## What This Is

AI-powered multi-country news digest platform that scrapes news from 8 countries (TR, DE, US, UK, FR, ES, IT, RU), generates GPT-4 powered daily digests with sentiment analysis, bias detection, and cross-source comparison. Available as a React Native mobile app with an admin panel for content management.

## Core Value

Users get a concise, AI-analyzed daily news digest that surfaces what matters across multiple countries — replacing the need to follow dozens of sources manually.

## Requirements

### Validated

- ✓ Multi-country RSS scraping (8 countries, 30min intervals) — existing
- ✓ AI-powered article analysis (summarization, topics, sentiment) — existing
- ✓ Daily digest generation (GPT-4, morning/evening) — existing
- ✓ Twitter/X tweet integration per country — existing
- ✓ Mobile app with digest, search, compare, analysis tabs — existing
- ✓ Firebase authentication (Google, Apple OAuth) — existing
- ✓ Admin panel with full CRUD (digests, articles, sources, twitter accounts) — existing
- ✓ Push notification infrastructure (Expo + Firebase) — existing
- ✓ Premium subscription system (RevenueCat) — existing
- ✓ Cron job scheduling (scraper, digest, tweets, weekly) — existing
- ✓ Redis caching with circuit breaker pattern — existing
- ✓ Error tracking and analytics (Sentry, PostHog) — existing
- ✓ System health monitoring (admin dashboard) — existing

### Active

- [ ] App Store & Play Store publication (ASO optimization)
- [ ] Social sharing (deep links, digest sharing, invite system)
- [ ] Onboarding flow & retention mechanics (habit loops, reminders)
- [ ] Real-time breaking news alerts
- [ ] Detailed bias analysis (source reliability scoring, trend analysis)
- [ ] Social features (comments, discussions, community)
- [ ] CI/CD pipeline & automated testing
- [ ] Multi-instance scaling & infrastructure hardening
- [ ] Monitoring & alerting improvements

### Out of Scope

- Web application — mobile-first strategy, defer to v3+
- Monetization expansion (ads, enterprise) — focus on growth first
- User-generated content — not a social platform, AI-curated content
- Real-time chat — high complexity, not aligned with digest model
- Video content — storage/bandwidth costs, text-focused product

## Context

- **Production**: Backend on Railway (auto-deploy from master), mobile via EAS Build
- **Database**: Turso (SQLite serverless) with per-country table pattern (8×article tables)
- **AI costs**: GPT-4 digest generation is the primary cost driver
- **Known debt**: No proper DB migrations for Turso (manual ALTER TABLE), per-country table duplication, @libsql/client version pinned to 0.5.6
- **Current users**: Early stage, pre-App Store launch
- **iOS build**: In progress via EAS Build for TestFlight distribution

## Constraints

- **Tech stack**: Hono + Turso + Expo (React Native) — established, not changing
- **Budget**: Solo developer, minimize infrastructure costs
- **AI API**: OpenAI GPT-4 rate limits and costs constrain digest frequency
- **Database**: Turso schema changes require manual ALTER TABLE in production
- **@libsql/client**: Must stay at 0.5.6 (other versions have breaking bugs)
- **App Store**: Must pass Apple/Google review guidelines

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Per-country tables instead of single table | Isolation, independent scaling | ⚠️ Revisit — causes code duplication |
| Turso (SQLite) over PostgreSQL | Serverless, scales to zero, low cost | ✓ Good |
| Hono over Express | Lightweight, modern, edge-ready | ✓ Good |
| Railway over Vercel/Fly | Simple deploy, free tier generous | ✓ Good |
| RevenueCat for subscriptions | Cross-platform IAP handling | — Pending |
| Feed tab removed from mobile | Users prefer digests over raw articles | ✓ Good |
| Firebase Auth over custom auth | Battle-tested, multi-provider | ✓ Good |
| Cron-based digest over on-demand | Prevents API timeout (was causing 30s+ delays) | ✓ Good |

---
*Last updated: 2026-02-28 after initialization*
