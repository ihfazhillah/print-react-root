# Implementation Plan: Tag CRUD & Indonesian Translation

**Branch**: `004-tag-crud-translation` | **Date**: 2026-03-01 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/004-tag-crud-translation/spec.md`

## Summary

Add a dedicated tag management CRUD page to the admin UI with an Indonesian translation column (`id_translation`), bulk translation via `deep-translator` (GoogleTranslator backend), and extend the existing search to match Indonesian translations — enabling a child to search for printables in Indonesian.

## Technical Context

**Language/Version**: Python 3.10+ (existing)
**Primary Dependencies**: FastAPI, aiosqlite (existing); deep-translator >=1.11.4 (new)
**Storage**: SQLite via aiosqlite (existing `printable_pages.db`)
**Testing**: stdlib unittest with FastAPI TestClient (existing pattern)
**Target Platform**: Linux server (existing)
**Project Type**: Web service with admin dashboard
**Performance Goals**: Tag CRUD operations <5s; bulk translate <2s/tag; search <1s
**Constraints**: No paid translation APIs; offline-friendly; single SQLite database
**Scale/Scope**: ~100-500 tags; single admin user; admin-only bulk translate

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Code Quality | PASS | Single-responsibility functions; type hints; constants for magic values; deep-translator declared in pyproject.toml |
| II. Testing Standards | PASS | E2E tests for tag CRUD endpoints + search integration; mock translation service in tests; test names describe scenarios |
| III. Bullet-Tracing | PASS | Tracer bullet: tag CRUD with id_translation column → bulk translate → search integration. Each slice is deployable independently |
| IV. User Experience First | PASS | Admin: tag table with clear actions, toast feedback. Child: Indonesian search works transparently through existing search bar |
| V. Performance | PASS | No speculative optimization; LIKE with index is standard for tag-name search at this scale; bulk translate is admin-triggered, not automatic |

**Post-Phase 1 re-check**: All gates still pass. No new dependencies beyond deep-translator. No architectural complexity added (same SQLite + FastAPI pattern).

## Project Structure

### Documentation (this feature)

```text
specs/004-tag-crud-translation/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   └── api.md           # Phase 1 output
└── tasks.md             # Phase 2 output (created by /speckit.tasks)
```

### Source Code (repository root)

```text
fastapi-image-search/
├── db.py                # Schema migration + tag CRUD queries + search update
├── main.py              # Tag CRUD endpoints + bulk translate endpoint
├── templates/
│   └── index.html       # Tags sub-tab in admin view + tag modal
├── static/
│   └── js/
│       └── app.js       # Tag admin table/modal/pagination + translate button
├── pyproject.toml       # Add deep-translator dependency
└── tests/               # Test files (mirrors source structure)
```

**Structure Decision**: Single-project backend (existing). All changes are within `fastapi-image-search/`. No new directories needed beyond tests.

## Complexity Tracking

No constitution violations to justify. This feature follows the established patterns exactly.
