# Research: Kids Mobile App

**Date**: 2026-02-21 | **Branch**: `001-kids-mobile-app`

## 1. Mobile Framework

- **Decision**: React Native with Expo managed workflow (SDK 54)
- **Rationale**: Expo provides fast iteration with managed builds,
  OTA updates, and a rich standard library. The project name
  ("print-react") aligns with the React ecosystem. SDK 54 ships
  React Native 0.81 with the New Architecture enabled by default.
- **Alternatives considered**:
  - React Native bare CLI: more control but slower setup, manual
    native linking; unnecessary for a simple 4-screen app
  - Flutter: strong tablet support but separate Dart ecosystem;
    no synergy with existing React-adjacent project
  - Native Kotlin: maximum performance but single-platform,
    higher development cost for a toy project

## 2. Server State Management

- **Decision**: TanStack React Query v5 (`@tanstack/react-query ^5.90.x`)
- **Rationale**: User explicitly requested TanStack React Query.
  v5 is the current stable release, pure JS/TS (no native modules),
  and provides `useInfiniteQuery` for pagination and `useMutation`
  for print actions. Works with Expo without config plugins.
- **Alternatives considered**:
  - SWR: lighter but lacks `useInfiniteQuery` ergonomics and
    mutation support
  - RTK Query: requires Redux setup; over-engineered for 5 endpoints
  - Plain fetch + useState: no caching, no deduplication, no
    pagination primitives

### React Query React Native gotchas

Two integrations are required in the root layout:

1. **Online state**: Wire `expo-network` to React Query's
   `onlineManager` so it detects connectivity changes (browser
   `window` events don't exist in RN).
2. **Focus/refetch on app resume**: Wire `AppState` to React Query's
   `focusManager` so queries refetch when the app returns from
   background.

## 3. Navigation

- **Decision**: Expo Router v6 (`expo-router ~6.0.23`) with Stack layout
- **Rationale**: File-based routing with automatic deep linking.
  Stack layout provides native back button handling on Android
  (both on-screen header arrow and system gesture), satisfying FR-017
  with zero custom code.
- **Alternatives considered**:
  - React Navigation (manual): Expo Router is built on it; using
    it directly adds boilerplate without benefit
  - Tab-based layout: spec has no tab bar; gear icon on home screen
    navigates to settings via stack push

### Route structure

```
app/
  _layout.tsx          → Stack navigator + providers
  index.tsx            → Home (search + grid)
  detail/[id].tsx      → Individual image detail + print
  collection/[id].tsx  → Collection detail
  settings.tsx         → Server endpoint config
```

## 4. Image Display and Caching

- **Decision**: `expo-image ~3.0.11`
- **Rationale**: First-party Expo package with built-in disk + memory
  caching, BlurHash placeholder support, `contentFit: "contain"` for
  aspect-ratio preservation (FR-002), and `recyclingKey` for FlatList
  performance. Actively maintained by Expo team with full New
  Architecture support.
- **Alternatives considered**:
  - react-native-fast-image: original repo abandoned; forks exist
    but require custom dev client
  - Built-in Image: no disk caching; would cause repeated network
    fetches for thumbnails during scroll

## 5. Infinite Scroll / Pagination

- **Decision**: `useInfiniteQuery` + FlatList `onEndReached`
- **Rationale**: React Query's `useInfiniteQuery` manages the page
  array, provides `hasNextPage` / `isFetchingNextPage` booleans,
  and deduplicates fetches. Combined with FlatList's
  `onEndReachedThreshold: 0.5`, this delivers seamless pagination
  (SC-003).
- **API pagination**: Backend uses offset-based pagination with
  `skip` and `limit` query params. Default limit is 20.
  `getNextPageParam` increments skip by the page size; returns
  `undefined` when fewer items than `limit` are returned.

## 6. Search-as-you-type

- **Decision**: Debounce the query key value (400ms), not the fetch
  function. Use `placeholderData: keepPreviousData` to prevent
  flicker.
- **Rationale**: Debouncing the value that goes into the query key
  means React Query only creates cache entries for stabilized search
  terms, reducing network requests and cache bloat. The
  `keepPreviousData` function (v5 named export) keeps showing
  previous results during the debounce window.
- **Implementation**: Custom `useDebounce(value, delay)` hook using
  `useState` + `useEffect` + `setTimeout`. The debounced value
  feeds into the query key: `['search', debouncedQuery]`.

## 7. Local Persistence

- **Decision**: `@react-native-async-storage/async-storage ~2.2.0`
- **Rationale**: Stores the server endpoint (IP + port) as a simple
  key-value pair. AsyncStorage is the standard Expo-compatible
  solution for small persistence needs. No need for SQLite or
  SecureStore since the endpoint is not sensitive data.
- **Alternatives considered**:
  - Expo SecureStore: encrypted storage; overkill for a non-secret
    IP address
  - MMKV: faster but requires native module; unnecessary for a
    single key-value pair

## 8. Testing

- **Decision**: jest-expo ~54.0.17 + @testing-library/react-native ^13.3.x
- **Rationale**: `jest-expo` provides the correct Babel transforms,
  module mocks, and native module stubs for Expo SDK 54.
  `@testing-library/react-native` is the standard for component
  testing (react-test-renderer is deprecated in React 19). Expo
  Router's `expo-router/testing-library` provides `renderRouter()`
  for navigation flow tests.
- **Strategy**: Mock all API calls via React Query's test utilities
  (custom `QueryClientProvider` with pre-filled cache or MSW).
  Tests MUST NOT depend on network (constitution II).

## 9. Linting and Formatting

- **Decision**: `eslint-config-expo` (flat config) + Prettier
- **Rationale**: `eslint-config-expo` bundles TypeScript, React, and
  React Native rules. Flat config format (`eslint.config.mjs`) is
  the modern standard from SDK 53+. Prettier handles formatting;
  `eslint-config-prettier` disables conflicting rules.

## 10. Backend API Shape (Existing)

Endpoint analysis from `fastapi-image-search/main.py`:

| Endpoint | Method | Params | Returns |
|----------|--------|--------|---------|
| `/api/items` | GET | `skip=0`, `limit=20` | `Item[]` |
| `/api/search` | GET | `q=""`, `skip=0`, `limit=20` | `Item[]` |
| `/api/related/{item_index}` | GET | path: `item_index` (int) | `Item[]` (collection prints or tag-matched items) |
| `/api/tags` | GET | `limit=10` | `string[]` (sorted) |
| `/api/print-image` | GET | `url` (string, required) | `{ status, message }` or HTTP 500 |

### Item shape (from data.json)

```json
{
  "thumbnail": "https://print.krokotak.com/d/p/.../hash_page.t.webp",
  "url": "https://print.krokotak.com/print?id=...",
  "searches": [{ "link": "...", "text": "tag-name" }],
  "type": "print" | "collection",
  "prints": [...]   // only present when type === "collection"
}
```

### Key API behaviors

- **Pagination**: Offset-based (`skip`/`limit`). Returns `[]` when
  past end of data.
- **Search**: Case-insensitive substring match on tag text. For
  collections, also checks nested print tags. Returns the collection
  item, not individual prints.
- **Related**: For collections, returns the nested `prints` array.
  For prints, returns items sharing at least one tag.
- **Print**: Scrapes krokotak, converts WebP→PNG via ImageMagick,
  POSTs to printer server. Requires `PRINT_PASSWORD` env var on
  backend.
- **CORS**: Not configured in backend — may need to be added for
  mobile client HTTP requests (though React Native does not enforce
  CORS like browsers do).
- **Dataset**: 2,140 items total (93 collections + 2,047 prints),
  333 unique tags.

## 11. Expo SDK 54 Dependency Resolution

- **Decision**: Use `npm install --legacy-peer-deps` as fallback
  when `npx expo install` fails
- **Rationale**: Expo SDK 54 pins `react@19.1.0` but several
  transitive dependencies (notably `react-dom@19.2.4` via
  `expo-router`) demand `react@^19.2.4`. This creates an
  `ERESOLVE` conflict that blocks `npx expo install` for any
  package that triggers the resolution chain. The
  `--legacy-peer-deps` flag ignores peer version mismatches,
  which is safe here because Expo's own compatibility matrix
  already validates these pairings.
- **Affected packages**: `babel-preset-expo`, `react-native-worklets`,
  `@testing-library/react-native`, `jest`

## 12. Reanimated v4 Babel Toolchain

- **Decision**: Explicit `babel.config.js` + separate
  `react-native-worklets` install
- **Rationale**: Expo SDK 54 no longer ships a `babel.config.js`
  (the preset is applied internally by Metro). However,
  `react-native-reanimated` v4.x requires its Babel plugin to be
  declared explicitly. That plugin in turn imports
  `react-native-worklets/plugin` at transform time, which is a
  new separate package in the v4 reanimated ecosystem. Without
  both pieces, Metro throws `Cannot find module` at bundle time.
  Additionally, `babel-preset-expo` may be nested inside
  `expo/node_modules/` rather than hoisted, so it must also be
  installed explicitly when an explicit `babel.config.js` exists.
- **Required setup**:
  1. `npx expo install react-native-worklets`
  2. `npm install babel-preset-expo --legacy-peer-deps`
  3. Create `babel.config.js` with `babel-preset-expo` preset and
     `react-native-reanimated/plugin`
  4. Restart Metro with `npx expo start --clear`

## 13. ESLint 9 vs 10 Compatibility

- **Decision**: Pin ESLint to v9.x (`eslint@^9`)
- **Rationale**: ESLint 10.x removed the legacy `getFilename()`
  API that `eslint-plugin-react` still depends on, causing a
  runtime crash. `eslint-config-expo` bundles `eslint-plugin-react`
  and hasn't yet updated for the v10 API change.
  Additionally, flat config imports require the explicit `.js`
  extension (`eslint-config-expo/flat.js`) and the `defineConfig`
  wrapper is not re-exported — use a plain array export instead.
- **Alternatives considered**:
  - ESLint 10 with patched plugin: unstable, not upstream-supported

## 14. Testing Toolchain (React 19 + Expo SDK 54)

- **Decision**: `jest-expo@~54.0.17` + `jest@^30.2.0` +
  `@testing-library/react-native@^13.3.x` (no `jest-native`)
- **Rationale**: Three gotchas emerged:
  1. `jest-expo` does not declare `jest` as a direct dependency —
     it must be installed explicitly.
  2. `@testing-library/jest-native` is deprecated; its matchers
     are now built into `@testing-library/react-native` v13.3.x
     at path `build/matchers/extend-expect`.
  3. The Jest config key is `setupFiles` (not
     `setupFilesAfterSetup`, which doesn't exist).
- **Known issue**: Expo recommends `jest@~29.7.0` but v30 was
  installed; `jest-watch-typeahead` (a `jest-expo` dep) has a
  peer requirement of `jest@^27|^28|^29`, producing a warning
  but no runtime failure so far.

## 15. Tracer Bullet Strategy

Per constitution principle III, development follows this sequence (updated to reflect Expo Go on physical device):

**Tracer bullet (first deployable slice)**:
1. Scaffold Expo project with TypeScript, Expo Router, React Query
2. Home screen with FlatList grid fetching `/api/items` (hardcoded endpoint)
3. Thumbnail display with expo-image
4. Deploy to Android device/emulator — validates architecture end-to-end

**Widening iterations** (each keeps the app deployable):
1. Detail page: tap image → detail view with tags and related images
2. Print: add Print button with mutation + loading/success/error states
3. Search: add SearchBar with debounced search-as-you-type
4. Collections: collection page with Detail/Related sections
5. Settings: endpoint configuration with AsyncStorage persistence
6. Polish: empty states, error states, connection handling, accessibility

## 16. Image Loading — SSL Certificate Trust on Android

- **Problem**: `print.krokotak.com` serves thumbnails over HTTPS with an
  untrusted certificate chain. Android's network stack rejects the
  connection with `java.security.cert.CertPathValidatorException: Trust
  anchor for certification path not found`. Both `expo-image` and RN's
  built-in `Image` component fail; the phone's browser is more lenient.
- **Decision (current)**: Proxy thumbnails through the FastAPI backend
  via `/api/proxy-image?url=...`. The backend uses `httpx` with
  `verify=False`, so it bypasses the SSL issue. The mobile app loads
  images from `http://{local-backend}/api/proxy-image?url=...` which
  is trusted HTTP on the local network.
- **Decision (future)**: When switching from Expo Go to a development
  build, use the Expo config plugin at
  `plugins/withNetworkSecurityConfig.js` which injects an Android
  `network_security_config.xml` trusting system + user CAs for
  `krokotak.com`. This allows direct image loading without the proxy.
  Requires `ANDROID_HOME` set up and `npx expo prebuild` +
  `npx expo run:android`.
- **Rationale**: The proxy approach works in Expo Go without native
  toolchain setup. The config plugin is the proper Android-side fix
  but requires a dev build. Both solutions are in place; the app
  currently uses the proxy.
- **Alternatives considered**:
  - Custom OkHttp SSL factory via native module: too invasive for
    managed workflow
  - Downloading certs and bundling in the app: fragile, certs rotate
  - Ignoring the issue: images don't load, app is unusable
