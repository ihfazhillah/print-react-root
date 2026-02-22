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
| `EXPO_PUBLIC_API_PORT` | `8080` | Backend server port |

Set these in a `.env` file at the `kids-app/` root or via shell
environment before starting Expo:

```bash
EXPO_PUBLIC_API_IP=192.168.68.254 EXPO_PUBLIC_API_PORT=8080 npx expo start
```

These values are baked into the JS bundle at build time (Expo's
`EXPO_PUBLIC_` prefix convention). The user can override them at
runtime via the in-app settings page.

## Backend Setup

The mobile app requires the FastAPI backend to be running:

```bash
# From repository root
cd fastapi-image-search
python -m uvicorn main:app --host 0.0.0.0 --port 8080
```

Ensure the backend is accessible from the tablet's network. Test with:

```bash
curl http://<backend-ip>:8080/api/items?limit=1
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
# Run all tests (unit + E2E)
npm test

# Run only E2E tests (user story validation)
npm run test:e2e

# Run only unit tests (hooks, components)
npm run test:unit

# Run tests in watch mode
npm test -- --watch

# Run a specific test file
npm test -- __tests__/hooks/useItems.test.ts
```

Tests mock all API calls — no running backend required for testing.

### E2E Tests (`__tests__/e2e/`)

Each user story has a mandatory E2E test file that validates acceptance
scenarios by testing user-visible behavior. A coverage guard ensures
all user stories are covered. See `coverage-guard.test.ts` for the
required mapping.

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

## Troubleshooting (Expo SDK 54 + React 19)

Issues encountered during project setup and their fixes:

### 1. Peer dependency conflicts with `npm install`

Expo SDK 54 pins `react@19.1.0`, but several transitive deps
(e.g. `react-dom@19.2.4`) require `react@^19.2.4`. This causes
`npx expo install` to fail with `ERESOLVE`.

**Fix**: Fall back to `npm install <package> --legacy-peer-deps`
when `npx expo install` fails.

### 2. `react-native-reanimated` requires explicit Babel config

Expo SDK 54 does not ship a `babel.config.js` by default (it uses
an internal preset). Adding `react-native-reanimated` requires one:

```js
// babel.config.js
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: ['react-native-reanimated/plugin'],
  };
};
```

### 3. `react-native-worklets` is a separate install

`react-native-reanimated` v4.x (SDK 54) extracted its worklets
runtime into a standalone package. The reanimated Babel plugin
internally imports `react-native-worklets/plugin`, so it must
be installed explicitly:

```bash
npx expo install react-native-worklets
```

### 4. `babel-preset-expo` must be top-level

When you create an explicit `babel.config.js`, Node's module
resolution must find `babel-preset-expo` at the top level of
`node_modules/`. Expo may hoist it into `expo/node_modules/`
instead. Install it explicitly if Metro throws
`Cannot find module 'babel-preset-expo'`:

```bash
npm install babel-preset-expo --legacy-peer-deps
```

### 5. ESLint 10 breaks `eslint-config-expo`

ESLint 10.x removed the `getFilename()` API that
`eslint-plugin-react` depends on. Use ESLint 9.x:

```bash
npm install eslint@^9 --save-dev --legacy-peer-deps
```

Use flat config (`eslint.config.mjs`) with explicit `.js`
extension on the import:

```js
import expoConfig from 'eslint-config-expo/flat.js';
```

### 6. `@testing-library/jest-native` is deprecated

In `@testing-library/react-native` v13.3.x the matchers are
built-in. Use this in Jest `setupFiles`:

```json
"setupFiles": [
  "@testing-library/react-native/build/matchers/extend-expect"
]
```

### 7. `jest` must be installed explicitly

`jest-expo@54` doesn't pull in `jest` as a direct dependency.
Install it yourself. Note: Expo recommends `jest@~29.7.0`;
`jest@30.x` has peer conflicts with `jest-watch-typeahead`.

### 8. Always clear Metro cache after Babel changes

After installing new Babel plugins or changing `babel.config.js`,
restart with cache cleared:

```bash
npx expo start --clear
```
