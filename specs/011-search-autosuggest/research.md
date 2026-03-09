# Research: Search Autosuggest & Discovery

**Branch**: `011-search-autosuggest` | **Date**: 2026-03-09

---

## Decision 1: Suggestion Data Source — Backend vs Client-side

**Decision**: Fetch suggestions from the backend (server-side filtering), not by downloading all tags client-side.

**Rationale**: The tag list can grow to hundreds or thousands of entries. Downloading all tags on every search session wastes bandwidth and memory on a mobile device. Server-side prefix filtering is fast (SQLite LIKE 'term%' with index) and keeps the client thin. The existing admin `/api/tags/all?q=` endpoint already demonstrates this pattern.

**Alternatives considered**:
- Client-side filtering of a full tag list: simpler but doesn't scale; also requires a separate full-list fetch on every app open.

---

## Decision 2: Backend Endpoint Strategy — Extend vs New Route

**Decision**: Extend the existing public `GET /api/tags` endpoint with `q=` (prefix filter) and `order_by=popularity` parameters, rather than creating a new `/api/suggestions` route.

**Rationale**: The existing `/api/tags` already filters blocked tags and returns `{name, id_translation}`. Adding two optional params (`q` for prefix, `order_by` for sort) avoids API surface bloat and reuses tested code. The popularity sort joins `printable_pages` → `page_tag` → `tags` with COUNT aggregation — a single query change.

**Alternatives considered**:
- New `GET /api/suggestions` endpoint: cleaner separation but duplicates the blocked-tag exclusion logic.
- `GET /api/tags/all` (admin endpoint): already has `q=` but is paginated and returns extra fields; not appropriate for the public mobile API.

---

## Decision 3: Popularity Ranking for Autocomplete Results

**Decision**: Autocomplete results (prefix-matched tags) are sorted by print count descending (most-printed first), with alphabetical as tiebreaker.

**Rationale**: The user specified "ranking filter" — popularity is the most meaningful signal available. A child typing "di" should see "dinosaur" (heavily printed) before "dino-craft" (rarely printed). The backend already tracks print events in the `activity_events` table.

**Alternatives considered**:
- Alphabetical only: simpler but surfaces obscure tags over popular ones.
- Recency (most recently used): more complex, requires per-device data; out of scope.

---

## Decision 4: Mobile UI Integration Point

**Decision**: Add suggestion display directly inside `kids-app/app/index.tsx` (the home screen) by introducing a `SuggestionList` component that conditionally replaces the image grid when the search input is focused.

**Rationale**: Search is already on index.tsx — the `searchQuery` state and `SearchBar` are both there. The "content area below the search bar" is currently the image grid (`FlatList`). The cleanest approach is: when suggestions are active, render `<SuggestionList>` instead of the grid — no navigation, no new screen.

**State logic**:
- `searchFocused: boolean` — tracked in index.tsx
- Show discovery suggestions: `searchFocused && searchQuery.length === 0`
- Show autocomplete suggestions: `searchQuery.length >= 2`
- Show normal grid: `!searchFocused && searchQuery.length === 0` OR `searchQuery.length > 0 && !suggestionsActive`
- After tapping suggestion: sets `searchQuery`, runs search, clears focus → grid shows results

**Alternatives considered**:
- Separate suggestions screen (navigation push): unnecessary complexity; breaks the Google/YouTube inline pattern the user specified.

---

## Decision 5: Suggestion List Item Display

**Decision**: Each suggestion row shows Indonesian translation (large, primary) with English name as smaller subtitle. If no translation, English name is shown as primary with no subtitle.

**Rationale**: Children are Indonesian speakers. The primary label should be the word they recognize. English name as subtitle helps learning but doesn't confuse primary comprehension. Matches clarification Q3 answer.

---

## Decision 6: Debounce Strategy for Autocomplete

**Decision**: Use 300ms debounce for autocomplete suggestions (shorter than the existing 400ms search debounce).

**Rationale**: Suggestions feel more responsive than full search results — the expectation is near-instant. 300ms is short enough to feel live without hammering the backend. The existing `useDebounce` hook is already in the project.

**Alternatives considered**:
- 400ms (match existing search): consistent but slightly sluggish for suggestions.
- No debounce: too many requests; spikes on fast typists.

---

## Decision 7: Testing Approach

**Decision**: E2E behavior tests using Expo's web rendering + Jest (same pattern as existing `__tests__/`). No additional test tooling.

**Rationale**: Constitution requires E2E behavior tests per user story. The project uses jest-expo with Testing Library. New tests: `__tests__/search-autosuggest.test.tsx` covering US1 (autocomplete shows on 2+ chars) and US2 (discovery shows on focus+empty).

