# Implementation Plan: Database Layer for Printable Pages

**Branch**: `003-database-layer` | **Date**: 2026-03-01 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/003-database-layer/spec.md`

## Summary

Add a SQLite database layer to the `fastapi-image-search` backend, replacing the in-memory `data.json` loading with async database queries via `aiosqlite`. The implementation includes: (1) a seed script to import existing data.json entries into SQLite, (2) CRUD REST API endpoints for managing printable pages, and (3) an interaction tracking system for recording children's usage. The existing API response format is preserved so current clients (mobile app, web dashboard) are unaffected.

## Technical Context

**Language/Version**: Python 3.10+ (existing)
**Primary Dependencies**: FastAPI, httpx, BeautifulSoup4, Jinja2, uvicorn (existing); aiosqlite 0.22.1 (new)
**Storage**: SQLite (file-based, co-located with backend)
**Testing**: stdlib `unittest` with FastAPI `TestClient` (existing convention)
**Target Platform**: Linux server (local/LAN deployment)
**Project Type**: Web service (backend API + admin dashboard)
**Performance Goals**: Seed script < 30s for 2,140 entries; API responses < 500ms; new entries visible < 1s
**Constraints**: No auth on admin endpoints (trusted network); no fallback to data.json on DB failure (HTTP 503)
**Scale/Scope**: ~2,140 printable page entries initially; single-user admin; multiple children via mobile app

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Code Quality | PASS | Type hints on function signatures; constants for DB path, table names; dependencies declared in pyproject.toml via `uv add` |
| II. Testing Standards | PASS | E2E tests per user story; happy-path + error-path for all new endpoints; mocked DB for deterministic tests; test names describe scenarios |
| III. Bullet-Tracing | PASS | US1 (seed + serve from DB) is the tracer bullet — simplest end-to-end slice; US2/US3 widen iteratively |
| IV. User Experience First | PASS | Admin: CRUD endpoints with clear error responses; Children: no behavior change, existing mobile app unaffected |
| V. Performance | PASS | SQLite is sufficient for ~2K entries; no speculative optimization; aiosqlite prevents blocking the event loop |

No violations. Gate passes.

## Project Structure

### Documentation (this feature)

```text
specs/003-database-layer/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── api.md           # New/modified REST endpoints
└── tasks.md             # Phase 2 output (via /speckit.tasks)
```

### Source Code (repository root)

```text
fastapi-image-search/
├── main.py              # Modified: replace in-memory data with DB queries
├── db.py                # NEW: database connection, schema init, query helpers
├── seed.py              # NEW: seed script (reads data.json → SQLite)
├── data.json            # Existing: kept as seed source (not used at runtime after migration)
├── printable_pages.db   # NEW: SQLite database file (gitignored)
├── printer/             # Existing: unchanged
├── templates/           # Existing: unchanged
├── static/              # Existing: unchanged
├── test_main.py         # Modified: tests use DB instead of in-memory data
├── tests/               # Existing printer tests: unchanged
│   ├── test_seed.py     # NEW: seed script tests
│   ├── test_crud.py     # NEW: CRUD endpoint tests
│   └── test_interactions.py  # NEW: interaction tracking tests
└── pyproject.toml       # Modified: add aiosqlite dependency
```

**Structure Decision**: Flat module layout within existing `fastapi-image-search/` directory. New files (`db.py`, `seed.py`) sit alongside `main.py` to match the existing single-directory convention. Pydantic request models defined inline in `main.py`. No subdirectories or packages beyond what already exists.

## Complexity Tracking

No violations to justify — all gates pass.
