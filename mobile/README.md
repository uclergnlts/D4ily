# D4ily Mobile App

Expo + React Native client for D4ily.

## Requirements

- Node.js `>=20`
- Expo CLI via project scripts

## Setup

```bash
npm install
```

Create a `.env` file in `mobile/` and set:

- `EXPO_PUBLIC_API_URL`
- `EXPO_PUBLIC_FIREBASE_API_KEY`
- `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `EXPO_PUBLIC_FIREBASE_PROJECT_ID`
- `EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `EXPO_PUBLIC_FIREBASE_APP_ID`
- Optional: `EXPO_PUBLIC_DEBUG_API=true` for sanitized API debug logs

## Run

```bash
npm run start
```

Platform shortcuts:

```bash
npm run android
npm run ios
npm run web
```

## Quality

```bash
npm run lint
npm test -- --runInBand
```

## API Client

API base URL comes from `EXPO_PUBLIC_API_URL` and falls back to production if unset.

## Security

- Do not commit `GoogleService-Info.plist` or `google-services.json`.
- Keep Firebase and revenue keys in environment variables.
