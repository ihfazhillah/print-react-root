# Tasks: Tag CRUD & Indonesian Translation

**Input**: Design documents from `/specs/004-tag-crud-translation/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/

**Tests**: Not explicitly requested in the feature specification. Tests omitted.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Add new dependency and prepare database schema

- [x] T001 Add `deep-translator>=1.11.4` to `fastapi-image-search/pyproject.toml` dependencies
- [x] T002 Add `id_translation TEXT NOT NULL DEFAULT ''` column to tags table schema in `fastapi-image-search/db.py` — update SCHEMA_SQL to include the column in CREATE TABLE, and add a migration in `init_db()` that runs `ALTER TABLE tags ADD COLUMN id_translation TEXT NOT NULL DEFAULT ''` for existing databases (wrapped in try/except to handle already-migrated case)
- [x] T003 Add index `CREATE INDEX IF NOT EXISTS idx_tags_id_translation ON tags(id_translation)` in SCHEMA_SQL in `fastapi-image-search/db.py`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Database query functions for tag CRUD that all user stories depend on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T004 Add `get_all_tags(db, skip, limit)` function in `fastapi-image-search/db.py` — returns list of dicts with id, name, id_translation; paginated
- [x] T005 [P] Add `create_tag(db, data)` function in `fastapi-image-search/db.py` — inserts tag with name and optional id_translation (default empty string), returns created tag dict
- [x] T006 [P] Add `get_tag(db, tag_id)` function in `fastapi-image-search/db.py` — returns single tag dict or None
- [x] T007 [P] Add `update_tag(db, tag_id, data)` function in `fastapi-image-search/db.py` — updates name and/or id_translation, returns updated tag dict or None
- [x] T008 [P] Add `delete_tag(db, tag_id)` function in `fastapi-image-search/db.py` — deletes tag (CASCADE handles page_tags cleanup), returns True/False
- [x] T009 Update existing `get_tags(db, limit)` in `fastapi-image-search/db.py` to return list of dicts `{id, name, id_translation}` instead of list of strings

**Checkpoint**: Foundation ready - tag CRUD DB layer complete, user story implementation can begin

---

## Phase 3: User Story 1 — Admin Manages Tags via Dedicated CRUD Page (Priority: P1) 🎯 MVP

**Goal**: Admin can view, create, edit, and delete tags with their Indonesian translations through a dedicated Tags tab in the admin UI

**Independent Test**: Navigate to Admin → Tags, create a tag with name and id_translation, edit it, delete it — each operation persists correctly

### Implementation for User Story 1

- [x] T010 [US1] Add Pydantic models `TagCreate(name: str, id_translation: str = "")` and `TagUpdate(name: str | None = None, id_translation: str | None = None)` in `fastapi-image-search/main.py`
- [x] T011 [US1] Add `GET /api/tags/all` endpoint in `fastapi-image-search/main.py` — query params skip/limit, calls `get_all_tags()`
- [x] T012 [P] [US1] Add `POST /api/tags` endpoint in `fastapi-image-search/main.py` — validates non-empty name, calls `create_tag()`, returns 201; 409 on duplicate
- [x] T013 [P] [US1] Add `PUT /api/tags/{tag_id}` endpoint in `fastapi-image-search/main.py` — calls `update_tag()`, returns 200; 404 if not found, 409 on duplicate name
- [x] T014 [P] [US1] Add `DELETE /api/tags/{tag_id}` endpoint in `fastapi-image-search/main.py` — calls `delete_tag()`, returns 204; 404 if not found
- [x] T015 [US1] Add imports for new db functions (`get_all_tags`, `create_tag`, `get_tag`, `update_tag`, `delete_tag`) in `fastapi-image-search/main.py`
- [x] T016 [US1] Add Tags sub-tab HTML within the admin view in `fastapi-image-search/templates/index.html` — add "Pages" / "Tags" sub-navigation buttons inside adminView div, a tags table (columns: Name, Indonesian Translation, Actions), an "Add Tag" button, a "Translate All" button (disabled for now), and a tag modal with name + id_translation fields
- [x] T017 [US1] Add tag admin JavaScript in `fastapi-image-search/static/js/app.js` — implement `switchAdminTab(tab)` for Pages/Tags sub-tabs, `loadTagTable()` calling GET /api/tags/all, `renderTagTable(tags)`, tag pagination, `openAddTagModal()`, `openEditTagModal(tag)`, `handleTagSubmit(e)` calling POST/PUT /api/tags, `confirmDeleteTag(tagId)` calling DELETE /api/tags/{tag_id}, and wire up event listeners
- [x] T018 [US1] Add CSS styles for tag sub-tabs in `fastapi-image-search/templates/index.html` or `fastapi-image-search/static/css/` (if exists) — style the Pages/Tags sub-navigation buttons, reuse existing admin table/modal classes

**Checkpoint**: Tag CRUD admin page fully functional — admin can view, add, edit, delete tags with id_translation field

---

## Phase 4: User Story 2 — Bulk Translation of Tags to Indonesian (Priority: P2)

**Goal**: Admin clicks "Translate All" and all untranslated tags get their id_translation populated with Indonesian translations via deep-translator

**Independent Test**: Have tags with empty id_translation, click "Translate All", verify translations appear in the table and persist on refresh

### Implementation for User Story 2

- [x] T019 [US2] Add `bulk_translate_tags(db)` function in `fastapi-image-search/db.py` — fetches all tags where `id_translation = ''`, uses `deep_translator.GoogleTranslator(source='en', target='id')` to translate names in batch, updates each tag's id_translation, returns summary dict `{translated, skipped, failed, errors}`; continues on individual translation failures
- [x] T020 [US2] Add `POST /api/tags/translate` endpoint in `fastapi-image-search/main.py` — calls `bulk_translate_tags()`, returns 200 with summary JSON
- [x] T021 [US2] Enable and wire "Translate All" button in `fastapi-image-search/static/js/app.js` — calls POST /api/tags/translate, shows loading state during translation, displays toast with results summary (translated/skipped/failed counts), refreshes tag table on completion

**Checkpoint**: Bulk translation works end-to-end — admin triggers translate, tags get Indonesian translations, table refreshes to show them

---

## Phase 5: User Story 3 — Child Searches Using Indonesian Words (Priority: P3)

**Goal**: The existing search bar returns results when searching with Indonesian words, matching against tag id_translations

**Independent Test**: Search for an Indonesian word (e.g., "mewarnai") that matches a tag's id_translation and verify matching pages are returned

### Implementation for User Story 3

- [x] T022 [US3] Update `search_by_tag()` in `fastapi-image-search/db.py` — add `OR LOWER(t.id_translation) LIKE LOWER(?)` to both the direct tag match and the child-page tag match clauses in the query, passing the like_pattern parameter for each new condition
- [x] T023 [US3] Update frontend tag suggestion handling in `fastapi-image-search/static/js/app.js` — update any code that consumes `GET /api/tags` response to handle the new object format `{id, name, id_translation}` instead of bare strings (check `loadTags()` or similar function that populates tag suggestions)

**Checkpoint**: Indonesian search works transparently — searching "mewarnai" finds pages tagged with "coloring" if that tag's id_translation is "mewarnai"

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final validation and cleanup

- [x] T024 Verify all endpoints work by running through quickstart.md validation steps manually — start server, test tag CRUD, bulk translate, Indonesian search
- [x] T025 Update existing `GET /api/tags` endpoint response in `fastapi-image-search/main.py` to use the updated `get_tags()` that returns objects (ensure mobile app tag suggestions still work if they consume this endpoint)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 (schema must exist before queries)
- **User Story 1 (Phase 3)**: Depends on Phase 2 (needs tag CRUD DB functions)
- **User Story 2 (Phase 4)**: Depends on Phase 2 (needs DB functions); benefits from US1 being done (UI to see results), but the endpoint works independently
- **User Story 3 (Phase 5)**: Depends on Phase 2 (needs updated search query); benefits from US2 (needs translations to exist), but the search logic works independently
- **Polish (Phase 6)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Phase 2 — No dependencies on other stories
- **User Story 2 (P2)**: Can start after Phase 2 — Independent, but best tested after US1 provides the UI
- **User Story 3 (P3)**: Can start after Phase 2 — Independent, but requires translations to exist for meaningful testing

### Within Each User Story

- Pydantic models before endpoints
- Endpoints before UI integration
- Core implementation before polish

### Parallel Opportunities

- T005, T006, T007, T008 can all run in parallel (different DB functions, same file but independent)
- T012, T013, T014 can run in parallel (independent endpoints)
- US2 and US3 can technically start in parallel after Phase 2, but sequential (P1→P2→P3) is recommended for a single developer

---

## Parallel Example: Phase 2 (Foundational)

```bash
# These DB functions can be written in parallel (independent logic):
Task T005: "Add create_tag() in db.py"
Task T006: "Add get_tag() in db.py"
Task T007: "Add update_tag() in db.py"
Task T008: "Add delete_tag() in db.py"
```

## Parallel Example: User Story 1

```bash
# These endpoints can be written in parallel (independent routes):
Task T012: "POST /api/tags endpoint in main.py"
Task T013: "PUT /api/tags/{tag_id} endpoint in main.py"
Task T014: "DELETE /api/tags/{tag_id} endpoint in main.py"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001–T003)
2. Complete Phase 2: Foundational (T004–T009)
3. Complete Phase 3: User Story 1 (T010–T018)
4. **STOP and VALIDATE**: Test tag CRUD independently in browser
5. Deploy/demo if ready — admin can manage tags with id_translation field

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test tag CRUD → Deploy/Demo (MVP!)
3. Add User Story 2 → Test bulk translate → Deploy/Demo
4. Add User Story 3 → Test Indonesian search → Deploy/Demo
5. Each story adds value without breaking previous stories

---

## Notes

- [P] tasks = different files or independent logic, no dependencies
- [Story] label maps task to specific user story for traceability
- All changes are within `fastapi-image-search/` directory
- Commit after each phase completion
- Stop at any checkpoint to validate independently
