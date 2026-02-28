# Quickstart: Database Layer for Printable Pages

**Branch**: `003-database-layer`

## Prerequisites

- Python 3.10+
- `uv` package manager
- Existing `fastapi-image-search/` setup working

## Setup

```bash
cd fastapi-image-search

# Install new dependency
uv add aiosqlite

# Run the seed script to populate the database from data.json
uv run python seed.py

# Start the server (unchanged)
uv run uvicorn main:app --host 0.0.0.0 --port 8080
```

## Verify

```bash
# Should return same data as before (now from SQLite)
curl http://localhost:8080/api/items?limit=5

# Check tags still work
curl http://localhost:8080/api/tags

# Search still works
curl "http://localhost:8080/api/search?q=animals"
```

## New Endpoints

```bash
# Add a new page
curl -X POST http://localhost:8080/api/pages \
  -H "Content-Type: application/json" \
  -d '{"url":"https://example.com/p/1","thumbnail":"https://example.com/t/1.webp","tags":["test"]}'

# Update a page
curl -X PUT http://localhost:8080/api/pages/2141 \
  -H "Content-Type: application/json" \
  -d '{"tags":["test","updated"]}'

# Delete a page
curl -X DELETE http://localhost:8080/api/pages/2141

# Record an interaction
curl -X POST http://localhost:8080/api/interactions \
  -H "Content-Type: application/json" \
  -d '{"page_id":1,"interaction_type":"select","session_id":"dev-test"}'

# Query interactions
curl "http://localhost:8080/api/interactions?session_id=dev-test"
```

## Running Tests

```bash
cd fastapi-image-search
uv run python -m unittest discover -v
```

## Database File

- Location: `fastapi-image-search/printable_pages.db`
- Inspect manually: `sqlite3 printable_pages.db ".tables"` / `.schema`
- The DB file is gitignored; regenerate by running `seed.py`

## Key Design Decisions

- **aiosqlite**: Async SQLite wrapper so DB queries don't block FastAPI's event loop
- **Idempotent seed**: Uses `INSERT OR IGNORE` with `url` as unique key — safe to re-run
- **No auth**: Admin endpoints are unprotected (local/LAN deployment)
- **View inference**: Views are recorded as a side effect of existing API calls when `session_id` param is present
- **No fallback**: If DB is unavailable, API returns HTTP 503 (no data.json fallback)
