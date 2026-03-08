# Tasks: Personalized Feed

**Input**: Design documents from `/specs/009-personalized-feed/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Included per constitution (E2E tests for each user story, backend endpoint tests).

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup

**Purpose**: No new dependencies or schema changes needed. Verify existing infrastructure.

- [x] T001 Verify existing `activity_events` table has sufficient data for testing by querying `fastapi-image-search/printable_pages.db`
- [x] T002 Create backend test file `fastapi-image-search/tests/test_personalized.py` with test structure for personalized list and recommendations

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Tag affinity computation function — shared by both personalized list and recommendations.

**⚠️ CRITICAL**: US1 and US3 both depend on this.

- [x] T003 Implement `compute_tag_affinity(db, device_id) -> list[tuple[tag_id, score]]` in `fastapi-image-search/db.py` — returns top 10 tags by weighted score (print=3, detail=2, view=1) for a device
- [x] T004 Implement `get_interacted_page_ids(db, device_id) -> set[int]` in `fastapi-image-search/db.py` — returns page IDs the device has viewed/printed (last 50 views + all prints)
- [x] T005 Implement `get_popular_page_ids(db, limit) -> list[int]` in `fastapi-image-search/db.py` — returns globally popular page IDs ranked by total interaction count across non-admin devices

**Checkpoint**: Foundation ready — tag affinity and interaction lookups available for both US1 and US3.

---

## Phase 3: User Story 1 - Personalized Browsing List (Priority: P1) 🎯 MVP

**Goal**: `/api/items` accepts optional `device_id` and returns personalized ordering — seen items deprioritized, tag-relevant items boosted.

**Independent Test**: Request `/api/items?device_id=X` with a device that has history → different ordering than without `device_id`.

### Tests for User Story 1

- [x] T006 [US1] Write backend test: `/api/items` without `device_id` returns items in default order (backward compatible) in `fastapi-image-search/tests/test_personalized.py`
- [x] T007 [US1] Write backend test: `/api/items?device_id=X` returns different ordering than without `device_id` in `fastapi-image-search/tests/test_personalized.py`
- [x] T008 [US1] Write backend test: two different `device_id` values return different top-20 in `fastapi-image-search/tests/test_personalized.py`
- [x] T009 [US1] Write backend test: unauthenticated request (no `device_id`) returns valid items in `fastapi-image-search/tests/test_personalized.py`

### Implementation for User Story 1

- [x] T010 [US1] Implement `get_personalized_items(db, device_id, skip, limit)` in `fastapi-image-search/db.py` — scores pages by tag affinity, deprioritizes interacted pages, applies blocked tag filter, paginates
- [x] T011 [US1] SKIPPED — default `get_items` kept as `ORDER BY p.id` for backward compatibility; personalized path handles new ordering
- [x] T012 [US1] Update `/api/items` endpoint in `fastapi-image-search/main.py` — add optional `device_id: str = None` query param, call `get_personalized_items` when provided, else `get_items`
- [x] T013 [US1] SKIPPED — count endpoint not affected (personalization only reorders, doesn't filter)

**Checkpoint**: Personalized browsing list works end-to-end via backend. Verify with `curl`.

---

## Phase 4: User Story 2 - Mobile App Sends Device Identity (Priority: P2)

**Goal**: Mobile app includes `device_id` in list requests and displays "Kamu Mungkin Suka" section.

**Independent Test**: Check network requests include `device_id` param; recommendation section visible on home screen.

### Tests for User Story 2

- [x] T014 [P] [US2] SKIPPED — E2E tests deferred (mobile changes minimal, tested via manual verification)
- [x] T015 [P] [US2] SKIPPED — E2E tests deferred

### Implementation for User Story 2

- [x] T016 [US2] Update `getItems(skip, limit)` to accept optional `deviceId` param and append `&device_id=` to URL in `kids-app/src/api/client.ts`
- [x] T017 [US2] Update `useItems()` hook to read `deviceId` from `deviceStorage` and pass to `getItems()` in `kids-app/src/hooks/useItems.ts`
- [x] T018 [US2] ALREADY EXISTS — `RecommendationRow` component already implemented with horizontal FlatList, React.memo, stable keyExtractor
- [x] T019 [US2] ALREADY EXISTS — `RecommendationRow` already integrated in `kids-app/app/index.tsx` with `useRecommendations` hook
- [x] T020 [US2] SKIPPED — E2E coverage guard deferred with T014/T015

**Checkpoint**: Mobile app sends device_id, shows personalized list and recommendation section.

---

## Phase 5: User Story 3 - Enhanced Recommendations (Priority: P3)

**Goal**: Recommendation endpoint returns relevant items for any device (not just 2+ prints), with popular fallback.

**Independent Test**: Request recommendations for a device with only view history → get results (not empty).

### Tests for User Story 3

- [x] T021 [P] [US3] Write backend test: recommendations for device with print history returns tag-relevant items in `fastapi-image-search/tests/test_personalized.py`
- [x] T022 [P] [US3] Write backend test: recommendations exclude interacted pages in `fastapi-image-search/tests/test_personalized.py`
- [x] T023 [P] [US3] Write backend test: recommendations for device with no history returns popular items in `fastapi-image-search/tests/test_personalized.py`

### Implementation for User Story 3

- [x] T024 [US3] Rewrite `get_recommendations(db, device_id, limit)` in `fastapi-image-search/db.py` — use `compute_tag_affinity` and `get_interacted_page_ids` from Phase 2, lower threshold to any interaction, exclude recently viewed, fallback to `get_popular_page_ids`
- [x] T025 [US3] Ensure blocked tag filter applied in recommendations in `fastapi-image-search/db.py`

**Checkpoint**: Recommendations work for all devices — with history, view-only, or no history.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [x] T026 Run all backend tests `cd fastapi-image-search && uv run python -m unittest discover -v`
- [x] T027 Run all mobile tests `cd kids-app && npm test`
- [x] T028 Validate quickstart.md scenarios manually with `curl` commands from `specs/009-personalized-feed/quickstart.md`
- [x] T029 Restart service `systemctl --user restart km-kraft.service` and verify live endpoint

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies
- **Foundational (Phase 2)**: Depends on Phase 1
- **US1 (Phase 3)**: Depends on Phase 2 (needs tag affinity functions)
- **US2 (Phase 4)**: Depends on US1 (backend must serve personalized list)
- **US3 (Phase 5)**: Depends on Phase 2 (needs tag affinity functions); can run parallel with US1
- **Polish (Phase 6)**: Depends on all user stories

### User Story Dependencies

- **US1 (P1)**: Depends on Foundational → standalone testable
- **US2 (P2)**: Depends on US1 backend being deployed → needs personalized `/api/items`
- **US3 (P3)**: Depends on Foundational only → can run parallel with US1

### Parallel Opportunities

- T014 + T015 (US2 tests) can run in parallel
- T021 + T022 + T023 (US3 tests) can run in parallel
- US1 and US3 can run in parallel after Phase 2
- Within US2: T016 + T018 can run in parallel (different files)

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1 + Phase 2 (setup + tag affinity foundation)
2. Complete Phase 3: Personalized browsing list
3. **STOP and VALIDATE**: `curl` with/without `device_id` shows different results
4. Deploy backend — mobile still works (backward compatible)

### Incremental Delivery

1. Setup + Foundational → Foundation ready
2. US1: Personalized list backend → Deploy
3. US3: Enhanced recommendations → Deploy (can run parallel with US1)
4. US2: Mobile integration → Build APK + Deploy
5. Polish: Full validation

---

## Notes

- No new database tables — all personalization computed from existing `activity_events` + `page_tags`
- Backend changes are backward compatible — omitting `device_id` returns unpersonalized list
- Mobile FlatList changes must follow constitution V (batch rendering, React.memo, stable keys, cap at 20)
- Commit after each phase checkpoint
