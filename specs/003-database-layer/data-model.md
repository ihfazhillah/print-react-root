# Data Model: Database Layer for Printable Pages

**Date**: 2026-03-01 | **Branch**: `003-database-layer`

## Entity Relationship Diagram (Text)

```
PrintablePage 1──∞ PageTag ∞──1 Tag
PrintablePage 1──∞ Interaction
```

## Tables

### printable_pages

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT | Internal DB identifier |
| url | TEXT | NOT NULL, UNIQUE | Krokotak print/collection URL; natural key for idempotent seeding |
| thumbnail | TEXT | NOT NULL | WebP thumbnail URL |
| type | TEXT | NOT NULL, CHECK(type IN ('print', 'collection')) | "print" or "collection" |
| source | TEXT | NOT NULL, DEFAULT 'krokotak' | Origin source identifier (FR-005) |
| parent_id | INTEGER | REFERENCES printable_pages(id), NULL | For prints nested inside collections; NULL for top-level items |
| created_at | TEXT | NOT NULL, DEFAULT (datetime('now')) | ISO 8601 timestamp |

**Indexes**:
- `UNIQUE INDEX idx_pages_url ON printable_pages(url)` (implicit from UNIQUE constraint)
- `INDEX idx_pages_type ON printable_pages(type)`
- `INDEX idx_pages_parent ON printable_pages(parent_id)`
- `INDEX idx_pages_source ON printable_pages(source)`

**Notes**:
- `parent_id` models the collection→print nesting from data.json. Top-level items (both prints and collections) have `parent_id = NULL`. Prints inside a collection reference the collection's `id`.
- `url` is the unique key used by the seed script for `INSERT OR IGNORE` idempotency.

### tags

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT | Internal DB identifier |
| name | TEXT | NOT NULL, UNIQUE | Tag text (e.g., "animals", "baba-marta") |

**Indexes**:
- `UNIQUE INDEX idx_tags_name ON tags(name)` (implicit from UNIQUE constraint)

### page_tags (junction table)

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| page_id | INTEGER | NOT NULL, REFERENCES printable_pages(id) ON DELETE CASCADE | |
| tag_id | INTEGER | NOT NULL, REFERENCES tags(id) ON DELETE CASCADE | |
| link | TEXT | NULL | Original search link from source (e.g., krokotak search URL). NULL for manually added tags via CRUD. |

**Constraints**:
- `PRIMARY KEY (page_id, tag_id)` — composite primary key prevents duplicate associations

**Indexes**:
- `INDEX idx_page_tags_tag ON page_tags(tag_id)` — fast lookup by tag for search

### interactions

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT | Internal DB identifier |
| page_id | INTEGER | NOT NULL, REFERENCES printable_pages(id) ON DELETE CASCADE | Which page was interacted with |
| interaction_type | TEXT | NOT NULL, CHECK(interaction_type IN ('view', 'select', 'print')) | Type of interaction |
| session_id | TEXT | NULL | Device/session identifier; nullable per R6 |
| created_at | TEXT | NOT NULL, DEFAULT (datetime('now')) | ISO 8601 timestamp |

**Indexes**:
- `INDEX idx_interactions_page ON interactions(page_id)`
- `INDEX idx_interactions_session ON interactions(session_id)` — for grouping by child/session
- `INDEX idx_interactions_type ON interactions(interaction_type)`
- `INDEX idx_interactions_created ON interactions(created_at)` — for time-range queries

## Data Migration (Seed)

### data.json → SQLite mapping

| data.json field | Target table.column | Transform |
|----------------|---------------------|-----------|
| `url` | printable_pages.url | Direct copy |
| `thumbnail` | printable_pages.thumbnail | Direct copy |
| `type` | printable_pages.type | Direct copy ("print" or "collection") |
| (implicit) | printable_pages.source | Set to "krokotak" |
| `searches[].text` | tags.name | Extract unique tag names; create tag rows |
| `searches[]` | page_tags | Create junction entries linking page to its tags; store `searches[].link` in `page_tags.link` column |
| `prints[]` (collections only) | printable_pages (with parent_id) | Recursively insert nested prints with parent_id pointing to the collection |

### Validation rules (FR-008)

- Skip entries missing `url` (log warning with entry index)
- Skip entries missing `thumbnail` (log warning with entry index)
- `type` defaults to "print" if missing
- `searches` defaults to empty array if missing (page has no tags)

## State Transitions

### PrintablePage lifecycle

```
[Created via seed/API] → Active → [Deleted via API] → Removed
```

No soft-delete; removal is permanent (`DELETE` with `ON DELETE CASCADE` for related page_tags and interactions).

### Interaction lifecycle

```
[Recorded] → Stored (immutable, append-only)
```

Interactions are never modified or deleted. They form an append-only log.
