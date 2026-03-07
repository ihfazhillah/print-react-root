# print-react Development Guidelines

Auto-generated from all feature plans. Last updated: 2026-02-21

## Active Technologies
- Python 3.10+ + FastAPI, httpx, BeautifulSoup4, Jinja2, uvicorn (existing); no new pip dependencies needed (002-pluggable-printer)
- N/A (file-based `data.json`, configuration via environment variables) (002-pluggable-printer)
- Python 3.10+ (existing) + FastAPI, httpx, BeautifulSoup4, Jinja2, uvicorn (existing); aiosqlite 0.22.1 (new) (003-database-layer)
- SQLite (file-based, co-located with backend) (003-database-layer)
- Python 3.10+ (existing) + FastAPI, aiosqlite (existing); deep-translator >=1.11.4 (new) (004-tag-crud-translation)
- SQLite via aiosqlite (existing `printable_pages.db`) (004-tag-crud-translation)
- Python 3.10+ (backend), TypeScript 5.x / React Native 0.81 / Expo SDK 54 (mobile) + FastAPI, aiosqlite, Jinja2 (backend); @tanstack/react-query, expo-router (mobile) (007-usage-insights)
- TypeScript 5.x on React Native 0.81 (Expo SDK 54) + expo-file-system (existing), expo-intent-launcher (new), expo-application (new) (006-in-app-update)
- N/A (ephemeral state only, APK cached in `FileSystem.cacheDirectory`) (006-in-app-update)

- TypeScript 5.x on React Native 0.81 (Expo SDK 54) + expo ~54.0.33, expo-router ~6.0.23, expo-image ~3.0.11, @tanstack/react-query ^5.90.x, @react-native-async-storage/async-storage ~2.2.0, expo-network ~8.0.8 (001-kids-mobile-app)

## Project Structure

```text
kids-app/                 # Expo managed project (Android-only)
  app/                    # Expo Router file-based screens
  src/api/                # HTTP client
  src/hooks/              # React Query hooks
  src/types/              # TypeScript types
  src/components/         # Reusable UI components
  __tests__/              # Jest tests (mirrors src/)
```

## Commands

```bash
cd kids-app
npm test && npm run lint      # All tests + lint
npm run test:e2e              # E2E user story tests only
npm run test:unit             # Unit tests only
npx expo start --clear        # Dev server (clear Metro cache)
```

## Code Style

TypeScript 5.x on React Native 0.81 (Expo SDK 54): Follow standard conventions

## Expo SDK 54 Setup Gotchas

These issues were discovered during project setup and MUST be
respected in future dependency changes:

1. **Peer deps**: `npx expo install` often fails due to
   `react@19.1.0` vs `react-dom@19.2.4` conflict. Use
   `npm install <pkg> --legacy-peer-deps` as fallback.
2. **Reanimated v4 Babel**: Requires explicit `babel.config.js`
   with `react-native-reanimated/plugin`. Also requires
   `react-native-worklets` (separate package) and top-level
   `babel-preset-expo` install.
3. **ESLint**: Must use v9.x (not v10). Import as
   `eslint-config-expo/flat.js`. Use plain array export (no
   `defineConfig`).
4. **Testing**: `jest` must be installed explicitly alongside
   `jest-expo`. Use `@testing-library/react-native/build/matchers/extend-expect`
   in `setupFiles` (not `jest-native`, which is deprecated).
5. **Metro cache**: Always `npx expo start --clear` after changing
   Babel config or installing Babel plugins.

## Recent Changes
- 007-usage-insights: Added Python 3.10+ (backend), TypeScript 5.x / React Native 0.81 / Expo SDK 54 (mobile) + FastAPI, aiosqlite, Jinja2 (backend); @tanstack/react-query, expo-router (mobile)
- 006-in-app-update: Added TypeScript 5.x on React Native 0.81 (Expo SDK 54) + expo-file-system (existing), expo-intent-launcher (new), expo-application (new)
- 004-tag-crud-translation: Added Python 3.10+ (existing) + FastAPI, aiosqlite (existing); deep-translator >=1.11.4 (new)


<!-- MANUAL ADDITIONS START -->

## Ideas Backlog

When a conversation surfaces a feature idea, improvement, or insight that is **out of scope** for the current task, append it to `specs/IDEAS.md` instead of ignoring it. Use the existing format and sections in that file. Don't spec it — just dump the idea with enough context to understand it later.

## FastAPI Backend (fastapi-image-search/)

- Use `uv` to run commands: `uv run python -m unittest discover -v`
- Do not add dev dependencies (e.g. pytest) unless explicitly asked — use stdlib `unittest`

<!-- MANUAL ADDITIONS END -->
