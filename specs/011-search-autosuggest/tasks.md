# Tasks: Search Autosuggest & Discovery

**Input**: Design documents from `/specs/011-search-autosuggest/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Organization**: Tasks grouped by user story for independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to
- Include exact file paths in descriptions

---

## Phase 1: Setup

**Purpose**: No new project setup needed — this feature extends existing backend and mobile app. Verify dev environment is ready.

- [ ] T001 Verify backend is running and `GET /api/tags?limit=5` returns `{id, name, id_translation}` array (smoke test from `quickstart.md`)
- [ ] T002 Confirm `kids-app/src/api/client.ts` and `kids-app/src/hooks/useSearch.ts` are the integration points per `contracts/ui-components.md`

---

## Phase 2: Foundational — Backend API Extension

**Purpose**: Extend `GET /api/tags` with `q=` prefix filter and `order_by=popularity` — required by both US1 and US2.

**⚠️ CRITICAL**: Both user story phases depend on this. Complete before mobile work.

- [ ] T003 In `fastapi-image-search/db.py`: update `get_tags(db, limit)` to accept `q: str | None = None` and `order_by: str = "name"` params. When `q` provided: add `WHERE t.name LIKE 'q%'` (case-insensitive prefix). When `order_by="popularity"`: LEFT JOIN `page_tag` and `activity_events` on `event_type='print'`, ORDER BY print count DESC then name ASC. Blocked tags always excluded.
- [ ] T004 In `fastapi-image-search/main.py`: update `GET /api/tags` route to expose `q: str | None = None` and `order_by: str = "name"` query params; pass both to `get_tags()`. Validate `order_by` is `"name"` or `"popularity"` (return 400 otherwise).
- [ ] T005 Smoke test backend changes: `curl "http://localhost:8080/api/tags?q=dino&limit=8"` must return only tags starting with "dino", ordered by print count. `curl "http://localhost:8080/api/tags?order_by=popularity&limit=10"` must return 10 tags ordered by popularity (not alphabetical).
- [ ] T006 In `fastapi-image-search/tests/` (or nearest test file): add `unittest` test for `get_tags` with `q=` prefix filter (happy path + no-match case) and `order_by=popularity` (verify ordering). Use existing test pattern from the project.

**Checkpoint**: `GET /api/tags?q=dino&limit=8` returns dinosaur-prefixed tags ranked by popularity. `GET /api/tags?order_by=popularity&limit=10` returns top tags. Existing `GET /api/tags?limit=30` behavior unchanged.

---

## Phase 3: User Story 1 — Autocomplete While Typing (P1) 🎯 MVP

**Goal**: Child types 2+ characters → content area shows matching tag suggestions → tap to search.

**Independent Test**: Type "di" in search bar → suggestion list appears with "dinosaurus" as primary label → tap it → search results for "dinosaur" appear.

### Implementation for User Story 1

- [ ] T007 [US1] In `kids-app/src/api/client.ts`: add `getSuggestions(q: string, limit?: number): Promise<Suggestion[]>` method calling `GET /api/tags?q={q}&limit={limit||8}`. Add `Suggestion` type `{ name: string; id_translation: string | null }`.
- [ ] T008 [US1] Create `kids-app/src/hooks/useSuggestions.ts`: export `useAutocomplete(q: string)` hook using `useQuery` with 300ms debounce (reuse existing `useDebounce` hook). Enabled only when `q.length >= 2`. Query key: `['suggestions', q]`.
- [ ] T009 [US1] Create `kids-app/src/components/SuggestionList.tsx`: accepts `{ suggestions: Suggestion[], isLoading: boolean, onSelect: (term: string) => void }`. Renders a `ScrollView` of tappable rows. Each row: Indonesian translation as large primary text, English name as smaller muted subtitle (fallback: English as primary if no translation). Show loading spinner when `isLoading && suggestions.length === 0`. Empty suggestions → render nothing.
- [ ] T010 [US1] In `kids-app/src/components/SearchBar.tsx`: add `onFocus?: () => void` and `onBlur?: () => void` props, wire to the `TextInput`'s `onFocus` and `onBlur` events. No other changes.
- [ ] T011 [US1] In `kids-app/app/index.tsx`: add `searchFocused` state (`useState(false)`). Pass `onFocus`/`onBlur` to `SearchBar`. Compute `showSuggestions = searchQuery.length >= 2`. When `showSuggestions` is true, render `<SuggestionList>` (from T009) in place of the image grid/FlatList. On suggestion select: call `setSearchQuery(term)` and `setSearchFocused(false)`. Suppress `useSearch` while `showSuggestions` is true by adding `enabled: !showSuggestions` to the search query options (or gating the hook call).
- [ ] T012 [US1] In `kids-app/app/index.tsx`: wire `SearchBar`'s submit event (`onSubmitEditing`) to run search for the currently typed term — sets `setSearchFocused(false)` to dismiss suggestions and allow `useSearch` to fire.

**Checkpoint**: US1 fully working. Type "cat" → see "kucing / cat" suggestion → tap → cat images appear. Type and press Enter → search runs for typed term directly.

---

## Phase 4: User Story 2 — Discovery Suggestions (P2)

**Goal**: Child focuses empty search bar → content area shows popular tags → tap to search.

**Independent Test**: Tap search bar without typing → popular tags appear (≥10) → tap first → search results shown.

### Implementation for User Story 2

- [ ] T013 [US2] In `kids-app/src/api/client.ts`: add `getDiscoverySuggestions(limit?: number): Promise<Suggestion[]>` method calling `GET /api/tags?order_by=popularity&limit={limit||10}`.
- [ ] T014 [US2] In `kids-app/src/hooks/useSuggestions.ts`: add `useDiscovery()` hook using `useQuery` with query key `['discovery-suggestions']`. No debounce needed — fetched once on mount. `staleTime: 5 * 60 * 1000` (5 min cache — popular tags don't change often).
- [ ] T015 [US2] In `kids-app/app/index.tsx`: add `showDiscovery = searchFocused && searchQuery.length === 0` state. When `showDiscovery` is true, render `<SuggestionList suggestions={discoverySuggestions} ...>` in place of the image grid. `SuggestionList` is the same component as US1 — reused as-is. On blur (unfocus without selecting): `setSearchFocused(false)` → normal grid restores.

**Checkpoint**: US2 fully working. Focus search bar → popular tags appear → tap → results shown. Unfocus → normal grid restores.

---

## Phase 5: Polish & Cross-Cutting Concerns

- [ ] T016 Run quickstart.md smoke tests end-to-end: all 3 US1 scenarios and 3 US2 scenarios from `specs/011-search-autosuggest/quickstart.md`
- [ ] T017 Verify edge cases from spec: slow backend (loading spinner shows), no match (no list shown), long tag name (truncated with ellipsis via `numberOfLines={1}` on Text), keyboard open (SuggestionList scrollable above keyboard using `KeyboardAvoidingView` or existing scroll behavior)
- [ ] T018 [P] Verify existing search-as-you-type still works after suggestions dismissed: type → suggestions show → press Enter → results appear → type again in same session → suggestions reappear correctly
- [ ] T019 [P] Verify blocked tags do not appear in suggestions: check a known blocked tag does not show in autocomplete or discovery results

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies
- **Phase 2 (Backend)**: Depends on Phase 1
- **Phase 3 (US1)**: Depends on Phase 2 (needs `GET /api/tags?q=`)
- **Phase 4 (US2)**: Depends on Phase 2 (needs `GET /api/tags?order_by=popularity`); can start parallel with US1 after Phase 2
- **Phase 5 (Polish)**: Depends on US1 + US2 complete

### User Story Dependencies

- **US1 (P1)**: Depends on backend Phase 2 → standalone testable
- **US2 (P2)**: Depends on backend Phase 2 → can run parallel with US1 (different hooks/state)

### Parallel Opportunities

- T007 + T008 + T009 + T010 (client, hook, component, SearchBar) can run in parallel — different files
- T013 + T014 (US2 client method + hook) can run parallel with US1 after T003/T004 done
- T016 + T017 + T018 + T019 (polish validation tasks) can run in parallel

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 2: backend `GET /api/tags?q=` with popularity ranking
2. Complete Phase 3: autocomplete component + hook + index.tsx integration
3. **STOP and VALIDATE**: Type "di" in app → see suggestions → tap → results appear
4. US2 (discovery) is additive — US1 alone is already a meaningful improvement

### Incremental Delivery

1. Phase 2: Backend extension → verified with curl
2. Phase 3 (T007–T010): Client method + hook + SuggestionList component (no UI wiring yet)
3. Phase 3 (T011–T012): Wire into index.tsx → US1 complete
4. Phase 4 (T013–T015): Discovery hook + wire into index.tsx → US2 complete
5. Phase 5: Polish and edge case validation

---

## Notes

- No new dependencies required — `useDebounce` already exists in the project
- `SuggestionList` is shared between US1 and US2 — same component, different data sources
- `useSearch` suppression while suggestions active: set `enabled: !showSuggestions` on the query or conditionally call the hook — prevents redundant search-as-you-type requests
- Backend test file: use stdlib `unittest` per CLAUDE.md convention (no pytest)
- `Suggestion` type in `client.ts` should be exported so `SuggestionList` and hooks can import it
