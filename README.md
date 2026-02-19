# D4ily Monorepo

This repository contains three applications:

- `backend`: Hono + TypeScript API, cron jobs, and DB migrations.
- `admin`: React + Vite admin panel.
- `mobile`: Expo + React Native mobile app.

## Requirements

- Node.js `>=20`
- npm `>=10`

## Quick Start

Install dependencies per package:

```bash
npm --prefix backend install
npm --prefix admin install
npm --prefix mobile install
```

Run apps locally:

```bash
npm --prefix backend run dev
npm --prefix admin run dev
npm --prefix mobile run start
```

## Environment Variables

### Backend (`backend/.env`)

Core variables:

- `PORT`
- `NODE_ENV`
- `TURSO_DATABASE_URL`
- `TURSO_AUTH_TOKEN`
- `OPENAI_API_KEY`
- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY`
- `OPS_API_KEY` (or `ADMIN_API_KEY`) for `/ops/*` endpoints

See schema: `backend/src/config/env.ts`.

### Admin (`admin/.env`)

Use `admin/.env.example` as reference.

### Mobile (`mobile/.env`)

Common variables:

- `EXPO_PUBLIC_API_URL`
- `EXPO_PUBLIC_FIREBASE_API_KEY`
- `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `EXPO_PUBLIC_FIREBASE_PROJECT_ID`
- `EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `EXPO_PUBLIC_FIREBASE_APP_ID`
- Optional debug flag: `EXPO_PUBLIC_DEBUG_API=true`

## Quality Commands

```bash
npm --prefix backend run build
npm --prefix backend run test:unit
npm --prefix backend run test:integration

npm --prefix admin run lint
npm --prefix admin run build

npm --prefix mobile run lint
npm --prefix mobile test -- --runInBand
```

## Notes

- Mobile Firebase native files (`GoogleService-Info.plist`, `google-services.json`) are ignored and should not be committed.
- `/ops/*` routes are protected by `x-ops-key` and rate limiting in backend.
