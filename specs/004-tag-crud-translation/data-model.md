# Data Model: Tag CRUD & Indonesian Translation

**Feature**: 004-tag-crud-translation
**Date**: 2026-03-01

## Entity Changes

### tags (modified)

Existing table with one new column added.

| Field          | Type    | Constraints                          | Notes                      |
|----------------|---------|--------------------------------------|----------------------------|
| id             | INTEGER | PRIMARY KEY AUTOINCREMENT            | Existing                   |
| name           | TEXT    | NOT NULL UNIQUE                      | Existing — English tag name |
| id_translation | TEXT    | NOT NULL DEFAULT ''                  | **NEW** — Indonesian translation |

**New index**: `idx_tags_id_translation ON tags(id_translation)` — supports efficient search by Indonesian text.

**Migration**: `ALTER TABLE tags ADD COLUMN id_translation TEXT NOT NULL DEFAULT '';` followed by `CREATE INDEX IF NOT EXISTS idx_tags_id_translation ON tags(id_translation);`

### page_tags (unchanged)

| Field   | Type    | Constraints                                      |
|---------|---------|--------------------------------------------------|
| page_id | INTEGER | NOT NULL, FK → printable_pages(id) ON DELETE CASCADE |
| tag_id  | INTEGER | NOT NULL, FK → tags(id) ON DELETE CASCADE         |
| link    | TEXT    | nullable                                          |

Primary key: (page_id, tag_id)

### printable_pages (unchanged)

No changes to this table.

## Relationships

```
printable_pages 1──N page_tags N──1 tags
                                     ├── name (English)
                                     └── id_translation (Indonesian)
```

## State Transitions

Tags have no formal lifecycle states. The `id_translation` field transitions:
- Empty string → populated (via manual edit or bulk translate)
- Populated → different value (via manual edit or re-translate after clearing)

## Data Volume Assumptions

- Current tag count: ~100-500 tags (based on existing krokotak scrape data)
- Expected growth: Slow (tags are created per unique search term from source)
- Bulk translate affects all tags with empty `id_translation` — typically run once, then incrementally for new tags
