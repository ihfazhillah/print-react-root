# print-react Development Guidelines

Auto-generated from all feature plans. Last updated: 2026-02-21

## Active Technologies

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
npm test && npm run lint      # Test + lint
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

- 001-kids-mobile-app: Added TypeScript 5.x on React Native 0.81 (Expo SDK 54) + expo ~54.0.33, expo-router ~6.0.23, expo-image ~3.0.11, @tanstack/react-query ^5.90.x, @react-native-async-storage/async-storage ~2.2.0, expo-network ~8.0.8

<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->
