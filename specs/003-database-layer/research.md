# Research: Database Layer for Printable Pages

**Date**: 2026-03-01 | **Branch**: `003-database-layer`

## R1: aiosqlite Usage Patterns for FastAPI

**Decision**: Use `aiosqlite` 0.22.1 with context manager pattern for all database access.

**Rationale**: aiosqlite wraps stdlib `sqlite3` with async/await, using a single shared thread per connection. This prevents blocking FastAPI's event loop during queries. The context manager pattern ensures connections are properly closed.

**Key patterns**:

```python
# Connection with context manager (preferred)
async with aiosqlite.connect("printable_pages.db") as db:
    db.row_factory = aiosqlite.Row  # dict-like access
    await db.execute("INSERT INTO ...")
    await db.commit()

    async with db.execute("SELECT * FROM ...") as cursor:
        rows = await cursor.fetchall()

# Row factory for dict-style access
db.row_factory = aiosqlite.Row
```

**Connection management in FastAPI**: Use a module-level helper that provides a connection per request. Since SQLite is file-based and single-writer, keep connections short-lived (open per request, close after). For the seed script (standalone), a single long-lived connection with a transaction is fine.

**Alternatives considered**:
- stdlib `sqlite3` (sync — would block the event loop)
- SQLAlchemy async (too heavy for 3 simple tables)

## R1b: Database Query Layer — Swappable for Tests

**Decision**: Wrap all database queries in functions within `db.py`. API route handlers call these functions rather than executing SQL directly. Tests can mock/replace these functions without needing a real database.

**Rationale**: User preference for E2E/behavior tests that don't break on internal refactors. By isolating queries into named functions (e.g., `get_items(skip, limit)`, `search_by_tag(query, skip, limit)`, `create_page(data)`, `record_interaction(data)`), tests can swap the DB layer entirely — testing endpoint behavior without coupling to SQLite internals.

**Pattern**:
```python
# db.py — all queries as standalone async functions
async def get_items(db, skip: int, limit: int) -> list[dict]: ...
async def search_by_tag(db, query: str, skip: int, limit: int) -> list[dict]: ...
async def create_page(db, data: dict) -> dict: ...
async def record_interaction(db, data: dict) -> dict: ...

# main.py — routes call db functions
@app.get("/api/items")
async def api_items(skip: int = 0, limit: int = 20):
    async with get_db() as db:
        return await get_items(db, skip, limit)
```

**Alternatives considered**:
- Repository class pattern — over-engineered for this scale
- Direct SQL in route handlers — not swappable in tests

## R2: Idempotent Seeding Strategy

**Decision**: Use `INSERT OR IGNORE` with URL as the natural unique key for PrintablePage.

**Rationale**: Each krokotak entry has a unique URL. Using `UNIQUE` constraint on the `url` column plus `INSERT OR IGNORE` makes the seed script naturally idempotent — re-running skips existing entries without error.

**Implementation**:
```sql
CREATE TABLE IF NOT EXISTS printable_pages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    url TEXT NOT NULL UNIQUE,
    ...
);

INSERT OR IGNORE INTO printable_pages (url, ...) VALUES (?, ...);
```

**Alternatives considered**:
- `UPSERT` (`INSERT ... ON CONFLICT ... DO UPDATE`) — unnecessary since seed data doesn't change
- Check-then-insert — race-condition-prone and slower
- Truncate-and-reload — loses any manually added entries

## R3: Tag Storage (Many-to-Many)

**Decision**: Separate `tags` table with a `page_tags` junction table for the many-to-many relationship.

**Rationale**: Tags are shared across pages (e.g., "animals" appears on many pages). A normalized design avoids duplication, enables efficient tag-based search via indexed joins, and supports the existing `/api/tags` endpoint cleanly.

**Alternatives considered**:
- JSON array column for tags — harder to query/index, no referential integrity
- Comma-separated string — same drawbacks, worse
- Denormalized tag copies per page — wastes space, update anomalies

## R4: View Inference from Existing API Calls

**Decision**: Record a "view" interaction as a side effect when the existing page-detail or related-items endpoint is called, by matching the item being accessed.

**Rationale**: The spec says views are inferred server-side from existing API calls (FR-007). The `/api/related/{item_index}` endpoint is the closest to a "page detail view" — when a user taps an item in the mobile app, this endpoint is called to show related items. Recording a view interaction here requires no mobile app changes.

**Implementation**: Add an optional `session_id` query parameter to existing endpoints. If present, record the view. If absent, skip tracking (backward compatible).

**Alternatives considered**:
- Middleware that tracks all requests — too noisy, can't distinguish real views from prefetches
- Separate view endpoint — requires mobile app changes (contradicts spec)

## R5: Concurrent Seed Script Runs

**Decision**: Use SQLite's built-in file locking. If a second seed run starts while one is active, it will get a `database is locked` error. Document this as expected behavior.

**Rationale**: SQLite provides file-level locking. With `INSERT OR IGNORE`, even if two runs complete, the result is still correct (idempotent). The practical scenario of concurrent seed runs is unlikely since it's a manual admin operation.

**Alternatives considered**:
- Advisory lock file — extra complexity for an unlikely scenario
- `BEGIN EXCLUSIVE` transaction — blocks too aggressively for a long-running import

## R6: Missing Session Identifier in Interaction Tracking

**Decision**: Record the interaction with `session_id = NULL`. The interaction is still valuable for aggregate analytics (popular pages, time-of-day patterns) even without session attribution.

**Rationale**: Rejecting the interaction loses data unnecessarily. The `session_id` column is nullable, and queries can filter by `WHERE session_id IS NOT NULL` when per-child analysis is needed.

**Alternatives considered**:
- Reject with HTTP 400 — loses potentially useful data
- Generate a random session ID — creates fake attribution, worse than null
