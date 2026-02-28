# API Contracts: Database Layer for Printable Pages

**Date**: 2026-03-01 | **Branch**: `003-database-layer`

## Existing Endpoints (Modified)

These endpoints already exist. Their **response format is unchanged** (FR-004). The only difference is the data source switches from in-memory `data` list to SQLite queries.

### GET /api/items

Returns paginated list of all printable pages.

**Parameters** (unchanged):
- `skip` (int, default 0): Offset
- `limit` (int, default 20): Page size

**Response** (unchanged): `200 OK`
```json
[
  {
    "thumbnail": "https://print.krokotak.com/...",
    "url": "https://print.krokotak.com/print?id=...",
    "searches": [{"link": "https://...", "text": "baba-marta"}],
    "type": "print"
  }
]
```

**Change**: Query from `printable_pages` + `page_tags` tables. Reconstruct `searches` array from joined tags (each tag produces `{"link": "https://print.krokotak.com/search?q={tag}", "text": "{tag}"}`).

**Error**: `503 Service Unavailable` if database unreachable.

### GET /api/search

Search items by tag text.

**Parameters** (unchanged):
- `q` (str): Search query
- `skip` (int, default 0): Offset
- `limit` (int, default 20): Page size

**Response** (unchanged): Same format as `/api/items`.

**Change**: SQL `LIKE` query on `tags.name` via join, instead of in-memory string matching.

### GET /api/related/{item_index}

Get related items for a given item.

**Parameters** (unchanged):
- `item_index` (int): Item index → will change to `item_id` (database ID)

**Note**: The `item_index` parameter currently uses array position in the in-memory list. After migration, this should accept the database `id`. The frontend (`app.js`) sends the index of the item in the displayed list — this will need to change to send the item's `id` (which must be included in API responses). This is a breaking change that must be handled carefully:
- Add `id` field to all item responses
- Accept both `item_index` (deprecated, for backward compat during transition) and `item_id` query param
- Frontend updated to use `id` field

**Response** (unchanged format):
- For collections: returns nested prints (query `WHERE parent_id = ?`)
- For prints: returns items with overlapping tags (SQL join)

**Side effect (new)**: If `session_id` query parameter is present, records a "view" interaction (FR-007 view inference).

### GET /api/tags

Returns all unique tags.

**Parameters** (unchanged):
- `limit` (int, default 10)

**Response** (unchanged): `200 OK`
```json
["animals", "autumn", "baba-marta", ...]
```

**Change**: `SELECT DISTINCT name FROM tags ORDER BY name LIMIT ?`

## New Endpoints

### POST /api/pages

Create a new printable page entry.

**Request body**:
```json
{
  "url": "https://example.com/print/123",
  "thumbnail": "https://example.com/thumb/123.webp",
  "type": "print",
  "source": "custom",
  "tags": ["animals", "coloring"],
  "parent_id": null
}
```

| Field | Type | Required | Default | Notes |
|-------|------|----------|---------|-------|
| url | string | yes | — | Must be unique |
| thumbnail | string | yes | — | |
| type | string | no | "print" | "print" or "collection" |
| source | string | no | "manual" | Origin identifier |
| tags | string[] | no | [] | Tag names; created if not existing |
| parent_id | int | no | null | Parent collection ID |

**Response**: `201 Created`
```json
{
  "id": 2141,
  "url": "https://example.com/print/123",
  "thumbnail": "https://example.com/thumb/123.webp",
  "type": "print",
  "source": "custom",
  "tags": ["animals", "coloring"],
  "parent_id": null,
  "created_at": "2026-03-01T10:00:00"
}
```

**Errors**:
- `400 Bad Request`: Missing required fields, invalid type
- `409 Conflict`: URL already exists
- `503 Service Unavailable`: Database unreachable

### PUT /api/pages/{page_id}

Update an existing printable page entry.

**Request body** (all fields optional):
```json
{
  "url": "https://example.com/print/123-updated",
  "thumbnail": "https://example.com/thumb/123-v2.webp",
  "type": "print",
  "source": "custom",
  "tags": ["animals", "coloring", "new-tag"]
}
```

**Response**: `200 OK` — returns updated page (same format as POST response).

**Errors**:
- `404 Not Found`: Page ID doesn't exist
- `409 Conflict`: Updated URL conflicts with existing entry
- `503 Service Unavailable`: Database unreachable

### DELETE /api/pages/{page_id}

Remove a printable page entry.

**Response**: `204 No Content`

**Errors**:
- `404 Not Found`: Page ID doesn't exist
- `503 Service Unavailable`: Database unreachable

**Side effects**: Cascading delete removes related `page_tags` and `interactions` rows.

### POST /api/interactions

Record a child's interaction with a printable page.

**Request body**:
```json
{
  "page_id": 42,
  "interaction_type": "select",
  "session_id": "device-abc-123"
}
```

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| page_id | int | yes | Must reference existing page |
| interaction_type | string | yes | "select" or "print" (views are inferred) |
| session_id | string | no | Device/session identifier; null if unavailable |

**Response**: `201 Created`
```json
{
  "id": 1,
  "page_id": 42,
  "interaction_type": "select",
  "session_id": "device-abc-123",
  "created_at": "2026-03-01T10:05:00"
}
```

**Errors**:
- `400 Bad Request`: Missing required fields, invalid interaction_type, page_id doesn't exist
- `503 Service Unavailable`: Database unreachable

### GET /api/interactions

Query interaction history (admin use).

**Parameters**:
- `session_id` (str, optional): Filter by session
- `page_id` (int, optional): Filter by page
- `interaction_type` (str, optional): Filter by type
- `skip` (int, default 0): Offset
- `limit` (int, default 50): Page size

**Response**: `200 OK`
```json
[
  {
    "id": 1,
    "page_id": 42,
    "interaction_type": "select",
    "session_id": "device-abc-123",
    "created_at": "2026-03-01T10:05:00"
  }
]
```

## Admin UI — Page Management

A new admin section in the existing web dashboard for CRUD operations on printable pages. Extends the current `templates/index.html` + `static/js/app.js` setup.

### Access

**GET /** — The existing dashboard gets a new "Admin" tab/section toggle. No separate page needed; a tab or toggle button switches between the existing search view and the admin management view.

### Admin View Layout

```
┌─────────────────────────────────────────────────┐
│  🎨 Fun Image Search       [Search] [Admin]     │  ← tab toggle
├─────────────────────────────────────────────────┤
│                                                 │
│  [+ Add New Page]                               │
│                                                 │
│  ┌──────┬──────────────────┬────────┬────────┐  │
│  │ Thumb│ URL              │ Tags   │ Actions│  │
│  ├──────┼──────────────────┼────────┼────────┤  │
│  │ 🖼️   │ print.krokotak…  │ ani..  │ ✏️ 🗑️  │  │
│  │ 🖼️   │ print.krokotak…  │ aut..  │ ✏️ 🗑️  │  │
│  └──────┴──────────────────┴────────┴────────┘  │
│                                                 │
│  [< Prev]  Page 1 of 107  [Next >]              │
│                                                 │
└─────────────────────────────────────────────────┘
```

### Add/Edit Modal

```
┌────────────────────────────────────┐
│  Add New Page              [×]     │
├────────────────────────────────────┤
│  URL:       [____________________] │
│  Thumbnail: [____________________] │
│  Type:      (•) Print  ( ) Collection │
│  Source:    [____________________] │
│  Tags:      [____________________] │
│             (comma-separated)      │
│                                    │
│           [Cancel]  [Save]         │
└────────────────────────────────────┘
```

### Behaviors

- **Add**: Opens modal with empty form → POST `/api/pages` → refreshes list
- **Edit**: Opens modal pre-filled with page data → PUT `/api/pages/{id}` → refreshes list
- **Delete**: Confirmation prompt ("Delete this page?") → DELETE `/api/pages/{id}` → refreshes list
- **Pagination**: Uses existing `skip`/`limit` pattern from `/api/items`
- **Search in admin**: Reuses existing search bar to filter the admin table view
- **Feedback**: Success/error toast messages after each operation

### Implementation Approach

- Add admin JS to existing `static/js/app.js` (or a new `admin.js` if it gets too large)
- Add admin CSS to existing `static/css/style.css`
- No new HTML template — toggle visibility between search view and admin view in `index.html`
- All CRUD calls go to the new REST endpoints defined above

## Seed Script CLI

```bash
cd fastapi-image-search
uv run python seed.py                    # Seeds from default data.json
uv run python seed.py --data path/to.json  # Seeds from custom path
uv run python seed.py --db custom.db     # Seeds into custom DB file
```

**Output**: Prints summary to stdout:
```
Seeding from data.json into printable_pages.db...
Imported: 2140 pages, 93 collections, 2047 prints
Tags created: 287
Skipped: 0 (malformed entries)
Done in 1.2s
```
