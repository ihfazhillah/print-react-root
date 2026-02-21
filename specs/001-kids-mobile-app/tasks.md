# Tasks: Kids Mobile App

**Input**: Design documents from `/specs/001-kids-mobile-app/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/api-client.md

**Tests**: Included per constitution principle II ("New features MUST
include tests before the feature is considered complete").

**Organization**: Tasks grouped by user story. Each story is an
independently testable increment following the tracer-bullet approach.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story (US1, US2, US3, US4)
- All file paths relative to `kids-app/` (Expo project root)

---

## Phase 1: Setup

**Purpose**: Scaffold the Expo project and configure tooling

- [x] T001 Create Expo project with TypeScript template by running `npx create-expo-app kids-app --template blank-typescript` from the repository root
- [x] T002 Install runtime dependencies: `expo-router`, `expo-image`, `@tanstack/react-query`, `@react-native-async-storage/async-storage`, `expo-network`, `react-native-gesture-handler`, `react-native-reanimated`, `react-native-screens`, `react-native-safe-area-context` using `npx expo install`
- [x] T003 Install dev dependencies: `jest-expo`, `@testing-library/react-native`, `@testing-library/jest-native`, `eslint-config-expo`, `prettier`, `eslint-config-prettier`, `eslint-plugin-prettier`
- [x] T004 [P] Configure `kids-app/app.json` for Android-only: set `expo.android` config, remove `ios` key, set `scheme` for Expo Router, add `EXPO_PUBLIC_API_IP` and `EXPO_PUBLIC_API_PORT` default env vars in `kids-app/.env`
- [x] T005 [P] Configure ESLint flat config in `kids-app/eslint.config.mjs` using `eslint-config-expo` + Prettier, and create `kids-app/.prettierrc`
- [x] T006 [P] Configure Jest in `kids-app/package.json` with `jest-expo` preset and `transformIgnorePatterns` for Expo/RN packages; add `test`, `lint`, and `format` scripts

**Device testing**: No Android emulator. Use **Expo Go** on a physical
Android device (same Wi-Fi network). Scan the QR code from `npx expo start`.

**Checkpoint**: `npx expo start` launches dev server and QR code is
scannable from Expo Go; `npm test` runs (no tests yet); `npm run lint`
passes on empty project.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared types, API client, root layout, and utility hooks
that ALL user stories depend on

**CRITICAL**: No user story work can begin until this phase is complete

- [x] T007 [P] Define TypeScript types in `kids-app/src/types/api.ts`: `SearchTag`, `BaseItem`, `PrintItem`, `CollectionItem`, `Item` (discriminated union), `ServerConfig`, `PrintResponse`, `ApiError`, and `isCollection` type guard — per data-model.md
- [x] T008 [P] Create `useDebounce` hook in `kids-app/src/hooks/useDebounce.ts`: generic `useDebounce<T>(value: T, delay: number): T` using `useState` + `useEffect` + `setTimeout` with cleanup — per research.md section 6
- [x] T009 [P] Create `EmptyState` component in `kids-app/src/components/EmptyState.tsx`: accepts a `message` prop, renders a centered child-friendly text message (large font, muted color) — used for FR-016 across all screens
- [x] T010 Create `useServerConfig` hook in `kids-app/src/hooks/useServerConfig.ts`: reads `EXPO_PUBLIC_API_IP`/`EXPO_PUBLIC_API_PORT` as default, persists overrides to AsyncStorage key `"server_config"`, exposes `{ config, updateConfig, isLoading }` — per data-model.md ServerConfig entity
- [x] T011 Create API client in `kids-app/src/api/client.ts`: `apiClient` object with typed methods `getItems(skip, limit)`, `search(q, skip, limit)`, `getRelated(itemIndex)`, `getTags(limit)`, `printImage(url)` — all using `fetch()` with base URL from `useServerConfig`; export a `getBaseUrl` helper and individual fetch functions that accept `baseUrl` as parameter — per contracts/api-client.md
- [x] T012 Create root layout in `kids-app/app/_layout.tsx`: wrap app in `QueryClientProvider`, configure `onlineManager` with `expo-network`, configure `focusManager` with `AppState`, render `<Stack>` navigator with default screen options — per research.md sections 2 and 3

**Checkpoint**: App launches in Expo Go on physical device showing the
Expo Router default index screen. Types compile. API client importable.

---

## Phase 3: User Story 1 — Browse and Search Images (P1) — MVP

**Goal**: Child opens app, sees image grid, scrolls infinitely, and
searches by keyword with live results. This is the tracer bullet.

**Independent Test**: Open the app, scroll through images, type a
search term, clear search. No tapping/navigation needed.

### Implementation

- [x] T013 [P] [US1] Create `useItems` hook in `kids-app/src/hooks/useItems.ts`: `useInfiniteQuery` calling `/api/items` with `skip`/`limit` pagination, `getNextPageParam` returns `skip + PAGE_SIZE` when `page.length === PAGE_SIZE` else `undefined` — per contracts/api-client.md
- [x] T014 [P] [US1] Create `useSearch` hook in `kids-app/src/hooks/useSearch.ts`: accepts `query` string, uses `useDebounce(query, 400)` for query key, `useInfiniteQuery` calling `/api/search` with `placeholderData: keepPreviousData`, same pagination logic as `useItems` — per research.md section 6
- [x] T015 [P] [US1] Create `useTags` hook in `kids-app/src/hooks/useTags.ts`: `useQuery` calling `/api/tags` with configurable `limit` parameter (default 30), returns sorted tag strings — per contracts/api-client.md
- [x] T016 [US1] Create `ImageCard` component in `kids-app/src/components/ImageCard.tsx`: renders `expo-image` `<Image>` with `contentFit="contain"` for aspect-ratio preservation (FR-002), accepts `item: Item` and `onPress` callback, shows thumbnail with large touch target — per data-model.md Item type
- [x] T017 [US1] Create `ImageGrid` component in `kids-app/src/components/ImageGrid.tsx`: `FlatList` with `numColumns={3}`, renders `ImageCard` for each item, wires `onEndReached` to `fetchNextPage` with guard `hasNextPage && !isFetchingNextPage`, `onEndReachedThreshold={0.5}`, `ListFooterComponent` shows spinner when fetching, `ListEmptyComponent` shows `EmptyState` — per research.md section 5, FR-002, FR-003
- [x] T018 [US1] Create `SearchBar` component in `kids-app/src/components/SearchBar.tsx`: `TextInput` with `onChangeText` updating local state, passes debounced value up via `onSearch` callback, includes clear button that resets input and calls `onSearch("")` — per FR-004, acceptance scenario 3/4
- [x] T019 [US1] Implement home screen in `kids-app/app/index.tsx`: renders `SearchBar` at top, `ImageGrid` below; when search text is empty uses `useItems`, when search text is non-empty uses `useSearch`; manages `searchQuery` state; `ImageCard` `onPress` is a no-op placeholder for now — per FR-001, acceptance scenarios 1-5
- [ ] T020 [US1] Verify tracer bullet via Expo Go on physical Android device: app launches, grid shows 3-column thumbnails, infinite scroll loads more pages, search-as-you-type filters results, clearing search restores full list

### Tests

- [x] T021 [P] [US1] Write tests for `useItems` hook in `kids-app/__tests__/hooks/useItems.test.ts`: happy-path (returns items), pagination (fetches next page), empty response (no more pages) — mock fetch, wrap in test QueryClientProvider
- [x] T022 [P] [US1] Write tests for `useSearch` hook in `kids-app/__tests__/hooks/useSearch.test.ts`: debounced query key, `keepPreviousData` behavior, empty query returns all items — mock fetch, use fake timers for debounce
- [x] T023 [P] [US1] Write tests for `SearchBar` component in `kids-app/__tests__/components/SearchBar.test.tsx`: typing fires `onSearch` after debounce, clear button resets input, renders text input
- [x] T024 [P] [US1] Write tests for `ImageGrid` component in `kids-app/__tests__/components/ImageGrid.test.tsx`: renders grid of ImageCards, shows empty state when no items, shows loading spinner during fetch

**Checkpoint**: User Story 1 complete. App is a fully functional
image browser with search. Deployable standalone.

---

## Phase 4: User Story 2 — View Image Details and Print (P2)

**Goal**: Child taps an image, sees detail page with tags and related
images, and can print via the backend.

**Independent Test**: Tap any image from home grid, view detail page
with tags and related images, tap Print, see success/error feedback.

**Depends on**: US1 (home grid exists to navigate from)

### Implementation

- [ ] T025 [P] [US2] Create `useRelated` hook in `kids-app/src/hooks/useRelated.ts`: `useQuery` calling `/api/related/{itemIndex}`, accepts `itemIndex: number`, returns `Item[]` — per contracts/api-client.md
- [ ] T026 [P] [US2] Create `usePrintImage` hook in `kids-app/src/hooks/usePrintImage.ts`: `useMutation` calling `/api/print-image?url=...`, accepts print URL string, `retry: false` (user retaps manually), returns `{ mutate, isPending, isSuccess, isError, error }` — per contracts/api-client.md
- [ ] T027 [P] [US2] Create `TagList` component in `kids-app/src/components/TagList.tsx`: accepts `tags: SearchTag[]`, renders horizontal scrollable row of tag chips showing `tag.text` — per data-model.md SearchTag
- [ ] T028 [P] [US2] Create `PrintButton` component in `kids-app/src/components/PrintButton.tsx`: accepts `onPrint` callback, shows "Print" label, disables with loading spinner while `isPending`, shows success confirmation on `isSuccess` (auto-dismisses after 2s), shows child-friendly error on `isError` with retry — per FR-008, FR-009, FR-010
- [ ] T029 [US2] Create `RelatedSection` component in `kids-app/src/components/RelatedSection.tsx`: accepts `itemIndex: number`, uses `useRelated` to fetch related items, renders heading "Related" + grid/row of `ImageCard` components, shows `EmptyState` when empty — per FR-005, edge case (no related items)
- [ ] T030 [US2] Implement detail screen in `kids-app/app/detail/[id].tsx`: reads `id` param (item index) via `useLocalSearchParams`, fetches item data, renders large image (expo-image, `contentFit="contain"`), "Detail" section with `TagList`, `PrintButton` wired to `usePrintImage(item.url)`, and `RelatedSection`; Stack header provides back arrow (FR-017) — per acceptance scenarios 1-5
- [ ] T031 [US2] Update home screen `ImageCard` `onPress` in `kids-app/app/index.tsx`: navigate to `/detail/{itemIndex}` for print items, `/collection/{itemIndex}` for collection items (collection route is placeholder until US3) — compute `itemIndex` as `pageIndex * PAGE_SIZE + indexInPage`
- [ ] T032 [US2] Verify via Expo Go on physical Android device: tap image from grid → detail page shows image, tags, related items; tap Print → loading state → success feedback; tap related image → navigates to its detail page; back arrow returns to home

### Tests

- [ ] T033 [P] [US2] Write tests for `usePrintImage` hook in `kids-app/__tests__/hooks/usePrintImage.test.ts`: success response, error response (500), no retry on failure — mock fetch
- [ ] T034 [P] [US2] Write tests for `PrintButton` component in `kids-app/__tests__/components/PrintButton.test.tsx`: shows "Print" label, disables during loading, shows success message, shows error message with retry
- [ ] T035 [P] [US2] Write tests for detail screen in `kids-app/__tests__/screens/detail.test.tsx`: renders image, tags, related section, print button; handles missing related items with empty state — use `renderRouter` from `expo-router/testing-library`

**Checkpoint**: User Stories 1 + 2 complete. Child can browse, search,
view details, and print. Core end-to-end flow works.

---

## Phase 5: User Story 3 — Browse Collections (P3)

**Goal**: Child taps a collection from home grid, sees collection
images in "Detail" section and related images in "Related" section,
can navigate to individual image detail pages.

**Independent Test**: Tap a collection item, verify two visually
distinct sections, tap an image to reach detail page (US2).

**Depends on**: US2 (detail page exists to navigate to from collection)

### Implementation

- [ ] T036 [US3] Implement collection screen in `kids-app/app/collection/[id].tsx`: reads `id` param (item index) via `useLocalSearchParams`, uses `useRelated(itemIndex)` to get collection prints (backend returns `prints[]` for collections), renders "Detail" section with collection images and "Related" section with tag-matched images, visually differentiated (separate headings, dividers or background); tapping any image navigates to `/detail/{itemIndex}`; Stack header provides back arrow — per FR-006, FR-007, FR-017, acceptance scenarios 1-3
- [ ] T037 [US3] Verify via Expo Go on physical Android device: tap collection from home → collection page with two distinct sections; tap image from either section → navigates to detail page (US2); back arrow works

### Tests

- [ ] T038 [P] [US3] Write tests for collection screen in `kids-app/__tests__/screens/collection.test.tsx`: renders Detail and Related sections, visually distinct headings, tapping image navigates to detail, shows empty state for empty sections — use `renderRouter`

**Checkpoint**: User Stories 1 + 2 + 3 complete. Full browsing
experience: home grid → collections → individual images → print.

---

## Phase 6: User Story 4 — Configure Server Endpoint (P4)

**Goal**: Parent or child can configure the backend server IP and
port via settings page, with validation and persistence.

**Independent Test**: Tap gear icon, enter IP/port, save, restart
app, verify endpoint persisted.

**Depends on**: US1 (home screen exists for gear icon placement)

### Implementation

- [ ] T039 [US4] Add gear icon to home screen header in `kids-app/app/index.tsx`: add a touchable gear/settings icon in the top area (Stack `headerRight` or custom header component) that navigates to `/settings` — per FR-011
- [ ] T040 [US4] Implement settings screen in `kids-app/app/settings.tsx`: two `TextInput` fields (IP address, optional port), "Save" button, uses `useServerConfig` to load current values and persist updates; validates IP format before saving (FR-014), shows validation error for invalid IP, uses default port 80 when port is empty; Stack header provides back arrow — per FR-012, FR-013, FR-014, acceptance scenarios 1-5
- [ ] T041 [US4] Verify via Expo Go on physical Android device: tap gear icon → settings opens; enter valid IP + port → saves; close and reopen app → settings persist; enter invalid IP → validation message shown

### Tests

- [ ] T042 [P] [US4] Write tests for `useServerConfig` hook in `kids-app/__tests__/hooks/useServerConfig.test.ts`: loads default from env vars, persists to AsyncStorage, reads persisted value on reload, handles missing AsyncStorage data — mock AsyncStorage
- [ ] T043 [P] [US4] Write tests for settings screen in `kids-app/__tests__/screens/settings.test.tsx`: renders IP and port inputs, validates IP format, saves valid config, rejects invalid IP — use `renderRouter`

**Checkpoint**: All 4 user stories complete. Full app functionality.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Error handling, empty states, accessibility, and
final validation across all screens

- [ ] T044 [P] Add connection error state to home screen in `kids-app/app/index.tsx`: when `useItems`/`useSearch` returns `isError`, show child-friendly "Cannot connect to server" message with retry button — per FR-015, edge case
- [ ] T045 [P] Add connection error state to detail screen in `kids-app/app/detail/[id].tsx`: handle `useRelated` error with child-friendly message — per FR-015
- [ ] T046 [P] Add connection error state to collection screen in `kids-app/app/collection/[id].tsx`: handle `useRelated` error with child-friendly message — per FR-015
- [ ] T047 Verify all empty-state messages across screens: search with no results, collection with no prints, image with no related items — per FR-016, edge cases
- [ ] T048 Add accessibility basics: `accessibilityLabel` on images, `accessibilityRole="button"` on touchables, sufficient contrast on text — per constitution IV shared rules
- [ ] T049 Run ESLint + Prettier across entire `kids-app/` codebase and fix all violations
- [ ] T050 Run full test suite (`npm test`) and fix any failures
- [ ] T051 Final validation via Expo Go on physical Android device: walk through all 4 user stories end-to-end, verify all acceptance scenarios pass, verify smooth scrolling and <3s load time

---

## Dependencies & Execution Order

### Phase Dependencies

```
Phase 1 (Setup) ─────────────► Phase 2 (Foundational) ─────┐
                                                            │
                               ┌────────────────────────────┤
                               │                            │
                               ▼                            ▼
                     Phase 3 (US1/P1) ──► Phase 4 (US2/P2) ──► Phase 5 (US3/P3)
                               │
                               ▼
                     Phase 6 (US4/P4)
                               │
                               ▼
                     Phase 7 (Polish) ◄── all stories complete
```

### User Story Dependencies

- **US1 (P1)**: Starts after Phase 2 — no other story dependencies
- **US2 (P2)**: Starts after US1 (home grid provides navigation source)
- **US3 (P3)**: Starts after US2 (detail page must exist for collection→detail navigation)
- **US4 (P4)**: Starts after US1 (gear icon added to home screen) — independent of US2/US3

### Parallel Opportunities

Within each phase, tasks marked `[P]` can execute concurrently:

- **Phase 2**: T007, T008, T009 in parallel (types, debounce, empty state)
- **Phase 3**: T013, T014, T015 in parallel (all three hooks); T021-T024 in parallel (all tests)
- **Phase 4**: T025, T026, T027, T028 in parallel (hooks + leaf components); T033-T035 in parallel (tests)
- **Phase 6**: T042, T043 in parallel (tests)
- **Phase 7**: T044, T045, T046 in parallel (error states)

**Cross-story parallelism**: US4 can be built in parallel with US2/US3 since it only depends on US1.

---

## Parallel Example: User Story 1

```text
# Step 1: Launch hooks in parallel (T013, T014, T015)
Task: "Create useItems hook in kids-app/src/hooks/useItems.ts"
Task: "Create useSearch hook in kids-app/src/hooks/useSearch.ts"
Task: "Create useTags hook in kids-app/src/hooks/useTags.ts"

# Step 2: Components sequentially (T016 → T017 → T018 → T019)
Task: "Create ImageCard component in kids-app/src/components/ImageCard.tsx"
Task: "Create ImageGrid component in kids-app/src/components/ImageGrid.tsx"
Task: "Create SearchBar component in kids-app/src/components/SearchBar.tsx"
Task: "Implement home screen in kids-app/app/index.tsx"

# Step 3: Tests in parallel (T021, T022, T023, T024)
Task: "Write tests for useItems hook"
Task: "Write tests for useSearch hook"
Task: "Write tests for SearchBar component"
Task: "Write tests for ImageGrid component"
```

---

## Implementation Strategy

### MVP First (Tracer Bullet — US1 Only)

1. Complete Phase 1: Setup → Expo project scaffolded
2. Complete Phase 2: Foundational → Types, API client, root layout ready
3. Complete Phase 3: US1 → **App is a working image browser**
4. **STOP and VALIDATE**: Deploy to device, verify all US1 acceptance scenarios
5. This is the tracer bullet — architecture validated end-to-end

### Incremental Delivery

1. Setup + Foundational → Foundation ready
2. Add US1 → Test independently → Deploy (**MVP!** — image browser)
3. Add US2 → Test independently → Deploy (browse + print)
4. Add US3 → Test independently → Deploy (browse + collections + print)
5. Add US4 → Test independently → Deploy (full app with settings)
6. Polish → Final validation → Release

Each increment keeps the app in a working, deployable state per
constitution principle III (bullet-tracing development).

---

## Notes

- `[P]` tasks = different files, no dependencies on incomplete tasks
- `[Story]` label maps task to specific user story for traceability
- All file paths relative to `kids-app/` project root
- Commit after each task or logical group
- Stop at any checkpoint to validate independently
- Constitution requires: tests before feature complete, ESLint/Prettier passing, device testing
- Device testing uses **Expo Go** on a physical Android device (no emulator)
