# Tasks: Usage Insights & Personalized Feed

**Input**: Design documents from `/specs/007-usage-insights/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/analytics-api.md

**Tests**: E2E tests required per constitution. Backend endpoint tests required per testing standards.

**Organization**: Tasks grouped by user story (US1=Admin Dashboard P1, US2=Personalized Feed P1, US3=Activity Timeline P2).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story (US1, US2, US3)
- Exact file paths included

---

## Phase 1: Setup

**Purpose**: Database migration and shared infrastructure

- [x] T001 Add `is_admin` column migration to devices table in fastapi-image-search/db.py (ALTER TABLE devices ADD COLUMN is_admin INTEGER NOT NULL DEFAULT 0)
- [x] T002 Add PATCH `/api/admin/devices/{device_id}/admin` endpoint to toggle is_admin flag in fastapi-image-search/main.py
- [x] T003 Update `get_all_devices` to include is_admin field in response in fastapi-image-search/db.py

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Analytics query functions used by both US1 (admin dashboard) and US2 (mobile recommendations)

**CRITICAL**: No user story work can begin until this phase is complete

- [x] T004 Add analytics query: `get_usage_summary(db)` returning per-device view/detail/print counts (excluding is_admin devices) in fastapi-image-search/db.py
- [x] T005 [P] Add analytics query: `get_top_tags_per_device(db, limit)` returning ranked tags by print count per non-admin device in fastapi-image-search/db.py
- [x] T006 [P] Add analytics query: `get_top_images(db, limit)` returning most printed images overall and per non-admin device in fastapi-image-search/db.py
- [x] T007 [P] Add analytics query: `get_shared_unique_interests(db)` returning shared and unique tag preferences across non-admin devices in fastapi-image-search/db.py
- [x] T008 Add analytics query: `get_recommendations(db, device_id, limit)` returning images from device's top tags that haven't been printed yet in fastapi-image-search/db.py

**Checkpoint**: All analytics queries available for both admin dashboard and mobile feed

---

## Phase 3: User Story 1 - Admin Usage Dashboard (Priority: P1) MVP

**Goal**: Admin opens web dashboard and sees per-kid usage analytics with tag preferences, most printed images, and interest comparisons. Admin devices excluded.

**Independent Test**: Open `/insights` in browser, verify usage data displayed correctly with admin devices excluded.

### Tests for User Story 1

- [x] T009 [US1] Write backend tests for analytics endpoints (summary, top-tags, top-images, interests, admin-toggle) in fastapi-image-search/tests/test_insights.py

### Implementation for User Story 1

- [x] T010 [P] [US1] Add GET `/api/admin/insights/summary` endpoint in fastapi-image-search/main.py
- [x] T011 [P] [US1] Add GET `/api/admin/insights/top-tags` endpoint with `?limit=5` param in fastapi-image-search/main.py
- [x] T012 [P] [US1] Add GET `/api/admin/insights/top-images` endpoint with `?limit=10` param in fastapi-image-search/main.py
- [x] T013 [P] [US1] Add GET `/api/admin/insights/interests` endpoint in fastapi-image-search/main.py
- [x] T014 [US1] Create insights CSS styles in fastapi-image-search/static/insights.css
- [x] T015 [US1] Create Jinja2 insights dashboard page at fastapi-image-search/templates/insights.html showing summary cards, top tags, top images, shared/unique interests
- [x] T016 [US1] Add GET `/insights` HTML route serving the insights template in fastapi-image-search/main.py
- [x] T017 [US1] Add navigation link to insights page from existing admin dashboard in fastapi-image-search/templates/index.html
- [x] T018 [US1] Add is_admin toggle UI to admin devices page (PATCH call to `/api/admin/devices/{id}/admin`) in fastapi-image-search/templates/index.html

**Checkpoint**: Admin can view full usage analytics at `/insights` with admin exclusion working

---

## Phase 4: User Story 2 - Personalized Home Feed (Priority: P1)

**Goal**: Mobile home screen shows "Kamu mungkin suka" horizontal scroll row at top with images from kid's preferred tags, followed by normal grid. Row hidden if < 2 prints.

**Independent Test**: Open app as device with print history, verify recommendation row appears with relevant images.

### Tests for User Story 2

- [x] T019 [US2] Write E2E test for personalized feed (row appears with history, hidden without) in kids-app/__tests__/e2e/us8-personalized-feed.test.tsx

### Implementation for User Story 2

- [x] T020 [US2] Add GET `/api/devices/{device_id}/recommendations` endpoint (auth required, uses get_recommendations query) in fastapi-image-search/main.py
- [x] T021 [US2] Add `getRecommendations(deviceId)` function to device API client in kids-app/src/api/devices.ts
- [x] T022 [US2] Create `useRecommendations` hook fetching recommendations for current device in kids-app/src/hooks/useRecommendations.ts
- [x] T023 [US2] Create `RecommendationRow` component — horizontal FlatList with "Kamu mungkin suka" label, React.memo on items, stable keyExtractor in kids-app/src/components/RecommendationRow.tsx
- [x] T024 [US2] Integrate RecommendationRow at top of home screen in kids-app/app/index.tsx (show only when >= 2 items)
- [x] T025 [US2] Update coverage-guard test to include US8 scenario mapping in kids-app/__tests__/e2e/coverage-guard.test.ts

**Checkpoint**: Kids see personalized recommendations; new devices see default grid only

---

## Phase 5: User Story 3 - Per-Kid Activity Timeline (Priority: P2)

**Goal**: Admin views chronological timeline of each kid's activity (browse, detail, print) grouped by date.

**Independent Test**: Select a kid on insights page, view timeline with timestamps and event types.

### Implementation for User Story 3

- [x] T026 [US3] Add analytics query: `get_device_timeline(db, device_id, limit, offset)` returning events grouped by date in fastapi-image-search/db.py
- [x] T027 [US3] Add GET `/api/admin/devices/{device_id}/timeline` endpoint in fastapi-image-search/main.py
- [x] T028 [US3] Create Jinja2 timeline detail page at fastapi-image-search/templates/insights_detail.html showing events grouped by date with thumbnails
- [x] T029 [US3] Add GET `/insights/{device_id}` HTML route serving per-kid timeline in fastapi-image-search/main.py
- [x] T030 [US3] Add clickable kid names on insights page linking to `/insights/{device_id}` in fastapi-image-search/templates/insights.html

**Checkpoint**: Admin can drill into per-kid activity timeline from insights page

---

## Phase 6: Polish & Cross-Cutting Concerns

- [x] T031 Run all backend tests: `cd fastapi-image-search && uv run python -m unittest discover -v`
- [x] T032 Run all mobile tests: `cd kids-app && npm test`
- [x] T033 Run quickstart.md smoke test checklist validation
- [x] T034 Handle edge cases: zero activity ("No activity yet"), deactivated device label, deleted tag display as "(deleted)", empty unique interests message

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 (needs is_admin column)
- **US1 (Phase 3)**: Depends on Phase 2 (needs analytics queries)
- **US2 (Phase 4)**: Depends on Phase 2 (needs get_recommendations query). Independent of US1.
- **US3 (Phase 5)**: Depends on Phase 3 (needs insights page to link from). Can start backend work after Phase 2.
- **Polish (Phase 6)**: Depends on all user stories

### User Story Dependencies

- **US1 (Admin Dashboard)**: Phase 2 → Phase 3. No dependency on other stories.
- **US2 (Personalized Feed)**: Phase 2 → Phase 4. No dependency on other stories.
- **US3 (Activity Timeline)**: Phase 2 → Phase 5. Links from US1 insights page but backend is independent.

### Parallel Opportunities

- T005, T006, T007 can run in parallel (independent query functions)
- T010, T011, T012, T013 can run in parallel (independent endpoints)
- US1 and US2 can be worked in parallel after Phase 2

---

## Implementation Strategy

### MVP First (US1 Only)

1. Complete Phase 1: Setup (is_admin migration)
2. Complete Phase 2: Foundational (analytics queries)
3. Complete Phase 3: US1 (admin dashboard)
4. **STOP and VALIDATE**: Browse `/insights`, verify data, verify admin exclusion
5. Deploy if ready

### Incremental Delivery

1. Setup + Foundational → Analytics queries ready
2. US1 → Admin dashboard live → Deploy
3. US2 → Mobile personalized feed → Build new APK, deploy
4. US3 → Activity timeline → Deploy
5. Each story adds value without breaking previous stories
