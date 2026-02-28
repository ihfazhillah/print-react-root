# Tasks: Database Layer for Printable Pages

**Input**: Design documents from `/specs/003-database-layer/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/api.md, quickstart.md

**Tests**: Included per constitution (II. Testing Standards) — E2E behavior tests per user story using stdlib `unittest` + FastAPI `TestClient`. Tests validate user-visible behavior, not internals.

**Organization**: Tasks grouped by user story. All DB queries wrapped in functions in `db.py` for test swappability (R1b).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Add dependency, create DB module, gitignore DB files

- [x] T001 Add aiosqlite dependency via `uv add aiosqlite` in fastapi-image-search/pyproject.toml
- [x] T002 Create fastapi-image-search/db.py with: `get_db()` async context manager (returns aiosqlite connection with Row factory), `init_db()` function that creates all 4 tables (printable_pages, tags, page_tags, interactions) with indexes per data-model.md, and DB_PATH constant defaulting to `printable_pages.db`
- [x] T003 [P] Add `*.db` to fastapi-image-search/.gitignore

---

## Phase 2: User Story 1 — Seed Database from Existing Data (Priority: P1) 🎯 MVP

**Goal**: Import all 2,140 data.json entries into SQLite and serve existing API endpoints from the database instead of the in-memory JSON list. Zero regression for current clients.

**Independent Test**: Run seed script, then call existing API endpoints and verify responses match what data.json previously returned.

### Implementation for User Story 1

- [x] T004 [US1] Create fastapi-image-search/seed.py: standalone script that reads data.json, calls `init_db()`, inserts all entries using `INSERT OR IGNORE` on url (idempotent). Handle collections with nested prints via `parent_id`. Extract tags from `searches[].text` into tags + page_tags tables; store `searches[].link` in `page_tags.link` column. Set source="krokotak". Validate entries: skip those missing thumbnail or url (log warning with index). Print summary (imported count, tags created, skipped count, elapsed time). Accept `--data` and `--db` CLI args via argparse.
- [x] T005 [US1] Implement query functions in fastapi-image-search/db.py: `get_items(db, skip, limit)` — returns paginated items with reconstructed `searches` array from joined page_tags + tags (each entry → `{"link": page_tags.link, "text": tags.name}`; omit `link` key if NULL). Include `id` field in response. `get_item_count(db)` — returns total count.
- [x] T006 [P] [US1] Implement query function in fastapi-image-search/db.py: `search_by_tag(db, query, skip, limit)` — SQL LIKE on tags.name via join, returns same format as get_items. Also search within nested collection prints.
- [x] T007 [P] [US1] Implement query functions in fastapi-image-search/db.py: `get_related(db, item_id)` — for collections: return child prints (WHERE parent_id = item_id); for prints: return items sharing overlapping tags. `get_tags(db, limit)` — return sorted unique tag names.
- [x] T008 [US1] Migrate existing endpoints in fastapi-image-search/main.py: replace in-memory `data` list usage in `/api/items`, `/api/search`, `/api/related/{item_index}`, `/api/tags` with calls to db.py query functions via `async with get_db()`. Add `id` field to all item responses. Add startup event that calls `init_db()`. Remove `load_data()` and global `data` list. Handle DB errors with HTTP 503 per FR-009.
- [x] T009 [US1] Update `/api/related/{item_index}` in fastapi-image-search/main.py: accept database `id` (transition from array index). Add `item_id` query param alongside existing `item_index` path param for backward compat. Update fastapi-image-search/static/js/app.js to send item `id` instead of array index.
- [x] T010 [US1] Update fastapi-image-search/test_main.py: tests now seed a temporary in-memory SQLite DB (via `init_db()` + seed helper) before running. Verify `/api/items` returns paginated results with `id` field, `/api/search` finds matching tags, `/api/related` returns related items, `/api/tags` returns tag list. Add test for HTTP 503 on DB failure. Verify response format matches original data.json structure.
- [x] T011 [US1] Create fastapi-image-search/tests/test_seed.py: test idempotent seeding (run twice, count unchanged), test malformed entry skipping (missing url/thumbnail), test all 2,140 entries import with correct tag associations, test collection→print parent_id relationships.

**Checkpoint**: Seed script works, all existing endpoints serve data from SQLite, existing tests pass, response format unchanged.

---

## Phase 3: User Story 2 — Manage Printable Pages via Database (Priority: P2)

**Goal**: REST API endpoints + admin web UI for adding, updating, and removing printable page entries. Tracks source origin per entry.

**Independent Test**: Add a new page via API/UI, verify it appears in search results. Update its tags, verify reflected. Delete it, verify gone.

### Implementation for User Story 2

- [x] T012 [US2] Implement CRUD query functions in fastapi-image-search/db.py: `create_page(db, data)` — insert page + tags (create tags if new), return created page with id. `update_page(db, page_id, data)` — update fields + replace tags, return updated page. `delete_page(db, page_id)` — delete with cascade. `get_page(db, page_id)` — get single page by id.
- [x] T013 [US2] Add CRUD endpoints in fastapi-image-search/main.py: `POST /api/pages` (201 Created, 400 validation, 409 duplicate url), `PUT /api/pages/{page_id}` (200 OK, 404, 409), `DELETE /api/pages/{page_id}` (204 No Content, 404). All return 503 on DB failure. Use Pydantic models for request validation (define inline or in models.py).
- [x] T014 [US2] Add admin tab toggle to fastapi-image-search/templates/index.html: add [Search] [Admin] toggle buttons in header. Add admin container div with table structure and "Add New Page" button. Toggle visibility between search view and admin view via JS.
- [x] T015 [US2] Implement admin table view in fastapi-image-search/static/js/app.js (or new admin.js): fetch paginated items from `/api/items`, render as table (thumbnail, url, tags, source, edit/delete action buttons). Add pagination controls (Prev/Next with page number).
- [x] T016 [US2] Implement add/edit modal in fastapi-image-search/static/js/app.js: modal form with fields (url, thumbnail, type radio, source, tags comma-separated). Add mode: POST to `/api/pages`. Edit mode: pre-fill from existing data, PUT to `/api/pages/{id}`. Show success/error toast after operation, refresh table.
- [x] T017 [US2] Implement delete with confirmation in fastapi-image-search/static/js/app.js: confirmation prompt on delete button click, DELETE to `/api/pages/{id}`, show toast, refresh table.
- [x] T018 [US2] Add admin CSS styles in fastapi-image-search/static/css/style.css: table styling, modal form layout, toast notifications, tab toggle active state, action buttons.
- [x] T019 [US2] CRUD tests in test_main.py (TestCRUD class): test POST creates page and appears in GET /api/items, test PUT updates tags and reflected in search, test DELETE removes page from responses, test 409 on duplicate URL, test 404 on nonexistent page_id, test source field preserved.

**Checkpoint**: Admin can add/edit/delete pages via both API and web UI. New entries appear in search. Source origin tracked.

---

## Phase 4: User Story 3 — Track Children's Interactions (Priority: P3)

**Goal**: Record view/select/print interactions with timestamps and session identifiers. Interaction history queryable by admin.

**Independent Test**: Simulate a child selecting a page (POST to /interactions), query interactions endpoint, verify recorded with correct details.

### Implementation for User Story 3

- [x] T020 [US3] Implement interaction query functions in fastapi-image-search/db.py: `record_interaction(db, data)` — insert interaction row (page_id, interaction_type, session_id nullable, auto timestamp). `get_interactions(db, filters, skip, limit)` — filtered query with optional session_id, page_id, interaction_type params.
- [x] T021 [US3] Add interaction endpoints in fastapi-image-search/main.py: `POST /api/interactions` (201 Created; validate interaction_type in [select, print]; validate page_id exists; session_id optional). `GET /api/interactions` (200 OK; query params: session_id, page_id, interaction_type, skip, limit). Both return 503 on DB failure.
- [x] T022 [US3] Add view inference to existing endpoint in fastapi-image-search/main.py: in `/api/related/{item_index}` handler, if `session_id` query param is present, call `record_interaction(db, {page_id, type="view", session_id})` as a side effect. This is backward compatible — no session_id means no tracking.
- [x] T023 [US3] Interaction tests in test_main.py (TestInteractions class): test POST records interaction and GET retrieves it, test view inference via /api/related with session_id param, test missing session_id records with null, test invalid interaction_type returns 400, test nonexistent page_id returns 400, test filtering by session_id/page_id/type.

**Checkpoint**: Interactions recorded for select/print via explicit endpoint, views inferred from existing API calls. Admin can query interaction history.

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Final validation and cleanup

- [x] T024 Run full test suite: `cd fastapi-image-search && uv run python -m unittest discover -v` — all tests must pass
- [x] T025 [P] Run linting and formatting (skipped — ruff not installed, no dev deps per convention): `cd fastapi-image-search && uv run ruff check . && uv run ruff format --check .` — fix any violations
- [x] T026 Run quickstart.md validation: execute all commands from quickstart.md manually and verify expected output
- [x] T027 Verify backward compatibility: existing mobile app API calls return same response structure (with added `id` field)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **US1 (Phase 2)**: Depends on Setup — BLOCKS US2 and US3 (they need DB schema and seeded data)
- **US2 (Phase 3)**: Depends on US1 (needs DB schema, query patterns, seeded data for testing)
- **US3 (Phase 4)**: Depends on US1 (needs DB schema and page records to reference). Independent of US2.
- **Polish (Phase 5)**: Depends on all desired user stories being complete

### User Story Dependencies

```
Setup (Phase 1)
  └─► US1 - Seed & Migrate (Phase 2) 🎯 MVP
        ├─► US2 - CRUD + Admin UI (Phase 3)
        └─► US3 - Interaction Tracking (Phase 4)  [parallel with US2]
                    └─► Polish (Phase 5) [after both US2 and US3]
```

### Within Each User Story

- Query functions in db.py before endpoint migration in main.py
- Backend endpoints before frontend UI (US2)
- Core implementation before tests (tests use seeded DB)

### Parallel Opportunities

**Within US1**:
- T006 (search_by_tag) and T007 (get_related, get_tags) can run in parallel — different functions in db.py

**Within US2**:
- T015 (admin table JS), T016 (modal JS), T017 (delete JS), T018 (admin CSS) can overlap — different concerns in different files/sections

**Between stories**:
- US2 and US3 can run in parallel after US1 completes (different endpoints, different tables)

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001–T003)
2. Complete Phase 2: US1 Seed & Migrate (T004–T011)
3. **STOP and VALIDATE**: Run seed script, test all existing endpoints, verify mobile app works unchanged
4. Deploy if ready — backend now uses SQLite, same API

### Incremental Delivery

1. Setup + US1 → Seed works, existing API on SQLite → **MVP deployed**
2. Add US2 → Admin can manage pages via API + web UI → Deploy
3. Add US3 → Interaction tracking active → Deploy
4. Polish → Full validation → Done

---

## Notes

- All DB queries in `db.py` as standalone async functions — swappable in tests (R1b)
- Tests use in-memory SQLite (`:memory:`) via `init_db()` for speed and isolation
- `aiosqlite` version 0.22.1, context manager pattern, Row factory for dict-like access
- Seed script is idempotent via `INSERT OR IGNORE` on unique `url`
- Admin UI lives in existing dashboard (tab toggle), no new HTML templates
- `item_index` → `item_id` transition requires frontend update (T009)
