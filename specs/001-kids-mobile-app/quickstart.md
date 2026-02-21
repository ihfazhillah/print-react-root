# Quickstart: Kids Mobile App

**Date**: 2026-02-21 | **Branch**: `001-kids-mobile-app`

## Prerequisites

- Node.js 18+ (LTS recommended)
- A physical Android device with **Expo Go** installed (from Google
  Play Store), connected to the same Wi-Fi as your dev machine
- The FastAPI backend running on the local network
  (`fastapi-image-search/`)

## Initial Setup

```bash
# From repository root
cd kids-app

# Install dependencies (always use npx expo install for Expo packages)
npm install

# Start the Expo dev server
npx expo start
```

## Running on Android (Expo Go)

```bash
# Start the dev server
npx expo start

# Scan the QR code with Expo Go on your Android device
# (device must be on the same Wi-Fi network as your dev machine)
```

If the QR code connection fails, try tunnel mode:

```bash
npx expo start --tunnel
```

## Environment Variables

The app reads build-time environment variables for the default
backend endpoint:

| Variable | Default | Description |
|----------|---------|-------------|
| `EXPO_PUBLIC_API_IP` | `192.168.68.254` | Backend server IP address |
| `EXPO_PUBLIC_API_PORT` | `80` | Backend server port |

Set these in a `.env` file at the `kids-app/` root or via shell
environment before starting Expo:

```bash
EXPO_PUBLIC_API_IP=192.168.68.100 npx expo start
```

These values are baked into the JS bundle at build time (Expo's
`EXPO_PUBLIC_` prefix convention). The user can override them at
runtime via the in-app settings page.

## Backend Setup

The mobile app requires the FastAPI backend to be running:

```bash
# From repository root
cd fastapi-image-search
python -m uvicorn main:app --host 0.0.0.0 --port 80
```

Ensure the backend is accessible from the tablet's network. Test with:

```bash
curl http://<backend-ip>:80/api/items?limit=1
```

## Project Structure

```
kids-app/
├── app/                  # Expo Router screens
│   ├── _layout.tsx       # Root layout (Stack + providers)
│   ├── index.tsx         # Home screen
│   ├── detail/[id].tsx   # Image detail + print
│   ├── collection/[id].tsx  # Collection detail
│   └── settings.tsx      # Endpoint config
├── src/
│   ├── api/              # HTTP client
│   ├── hooks/            # React Query hooks
│   ├── types/            # TypeScript type definitions
│   └── components/       # Reusable UI components
├── __tests__/            # Tests (mirrors src/ structure)
├── app.json              # Expo config
└── package.json
```

## Key Commands

| Command | Description |
|---------|-------------|
| `npx expo start` | Start dev server |
| `npx expo start --android` | Start and open on Android |
| `npx expo run:android` | Build and run native Android |
| `npm test` | Run tests (jest-expo) |
| `npm run lint` | Run ESLint |
| `npm run format` | Run Prettier |

## Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run a specific test file
npm test -- __tests__/hooks/useItems.test.ts
```

Tests mock all API calls — no running backend required for testing.

## Tech Stack Summary

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | React Native (Expo SDK 54) | ~54.0.33 |
| Language | TypeScript | 5.x |
| Navigation | Expo Router | ~6.0.23 |
| Server state | TanStack React Query | ^5.90.x |
| Images | expo-image | ~3.0.11 |
| Persistence | AsyncStorage | ~2.2.0 |
| Testing | jest-expo + @testing-library/react-native | ~54.0.17 / ^13.3.x |
| Linting | eslint-config-expo + Prettier | latest |
