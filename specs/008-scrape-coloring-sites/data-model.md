# Data Model: Multi-Site Printable Activities Scraper

## Existing Entities (no schema changes)

### printable_pages

The existing table already supports multi-source data:

| Field | Type | Notes |
|-------|------|-------|
| id | INTEGER PK | Auto-increment |
| url | TEXT UNIQUE | **Print target URL**: PDF link, image URL, or detail page. Used by print handler to determine strategy |
| thumbnail | TEXT | Hotlinked thumbnail for display in app |
| type | TEXT | `'print'` or `'collection'` — scraped entries are always `'print'` |
| source | TEXT | **Per-site identifier**: `'mondaymandala'`, `'crayola'`, etc. (already indexed) |
| parent_id | INTEGER | NULL for all scraped entries (no collections) |
| created_at | TEXT | Auto-set |

### tags

| Field | Type | Notes |
|-------|------|-------|
| id | INTEGER PK | Auto-increment |
| name | TEXT UNIQUE | Case-sensitive storage, case-insensitive matching at seed time |
| id_translation | TEXT | Indonesian translation (auto-filled by existing bulk translate) |

### page_tags

| Field | Type | Notes |
|-------|------|-------|
| page_id | INTEGER FK | References printable_pages |
| tag_id | INTEGER FK | References tags |
| link | TEXT | NULL for scraped entries (no search URL) |

## New Entity: Scraper Output (JSON file, not database)

Each site produces a JSON array matching the existing `data.json` format:

```json
[
  {
    "url": "https://mondaymandala.com/wp-content/uploads/.../Cat.pdf",
    "thumbnail": "https://mondaymandala.com/wp-content/uploads/.../cat-coloring-pages-featured-image.jpg",
    "searches": [
      {"text": "cat"},
      {"text": "animals"},
      {"text": "coloring"}
    ],
    "type": "print"
  }
]
```

**Tag conventions for `searches`**:
- First tag(s): site's own category (e.g., "cat", "animals")
- Last tag: content type (e.g., "coloring", "craft", "origami", "maze", "dot-to-dot", "word-search", "spot-the-difference", "paper-doll", "tracing", "cutting-practice")

## New Entity: Scraper Checkpoint (JSON file, not database)

For resume capability after captcha or crash:

```json
{
  "source_id": "mondaymandala",
  "started_at": "2026-03-08T10:00:00",
  "completed_categories": ["cat-coloring-pages", "dog-coloring-pages"],
  "current_category": "butterfly-coloring-pages",
  "current_page": 3,
  "total_entries": 450,
  "errors": []
}
```

Stored at `scraper/output/.checkpoint_<source_id>.json`. Deleted on successful completion.

## Print Strategy Mapping

No new database fields needed. Strategy derived from existing `url` and `source` fields:

| URL Pattern | Strategy | Handler |
|-------------|----------|---------|
| `*.pdf` | direct_pdf | Fetch PDF → ImageMagick `convert pdf[0] png` → print |
| `*.jpg`, `*.png`, `*.webp` | direct_image | Fetch image → convert to PNG if needed → print |
| `*krokotak.com*` | krokotak | Existing: URL transform → `/_print` → base64 extract → print |
| Everything else | detail_page | Fetch HTML → extract `<img>` or `<a href=*.pdf>` → delegate to direct_image or direct_pdf |

## Entity Relationships

```
printable_pages (source='mondaymandala')
    ├── page_tags → tags (name='cat')
    ├── page_tags → tags (name='animals')
    └── page_tags → tags (name='coloring')    ← content type tag

printable_pages (source='craftingjeannie')
    ├── page_tags → tags (name='halloween')
    └── page_tags → tags (name='craft')       ← content type tag
```

Tags are shared across sources. If Monday Mandala and Crayola both have "animals", they share the same tag record.
