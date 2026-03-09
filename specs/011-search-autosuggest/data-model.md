# Data Model: Search Autosuggest & Discovery

**Branch**: `011-search-autosuggest` | **Date**: 2026-03-09

No new database tables or entities are introduced by this feature. All data is derived from existing entities.

---

## Existing Entities Used

### Tag (existing — `tags` table)

| Field | Type | Notes |
|-------|------|-------|
| id | integer | Primary key |
| name | text | English tag name — used as prefix-match target and subtitle |
| id_translation | text | Indonesian translation — used as primary display label |
| blocked | boolean | Blocked tags excluded from all suggestions |

### ActivityEvent (existing — `activity_events` table)

| Field | Type | Notes |
|-------|------|-------|
| event_type | text | `'print'`, `'view'`, `'detail'` |
| image_id | integer | FK to printable_pages |

Used to compute **print count per tag** for popularity ranking:
```sql
SELECT t.id, t.name, t.id_translation, COUNT(*) as print_count
FROM tags t
JOIN page_tag pt ON pt.tag_id = t.id
JOIN activity_events ae ON ae.image_id = pt.page_id
WHERE ae.event_type = 'print'
  AND t.blocked = 0
GROUP BY t.id
ORDER BY print_count DESC
```

---

## API Response Shape (new)

### Suggestion Item

```json
{
  "name": "dinosaur",
  "id_translation": "dinosaurus"
}
```

- `id_translation` may be `null` or `""` — client falls back to `name` as primary label in that case.
- `id` is NOT returned — suggestions are vocabulary items, not addressable resources.

### Autocomplete Response — `GET /api/tags?q=di&limit=8`

```json
[
  { "name": "dinosaur", "id_translation": "dinosaurus" },
  { "name": "dino", "id_translation": "" },
  { "name": "dirt", "id_translation": "tanah" }
]
```

Ordered by print count descending (popularity), tiebreak alphabetical.

### Discovery Response — `GET /api/tags?limit=10&order_by=popularity`

```json
[
  { "name": "cat", "id_translation": "kucing" },
  { "name": "dinosaur", "id_translation": "dinosaurus" },
  ...
]
```

Top 10 non-blocked tags by total print count.

