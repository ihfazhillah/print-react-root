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

## 11. Tracer Bullet Strategy

Per constitution principle III, development follows this sequence:

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
