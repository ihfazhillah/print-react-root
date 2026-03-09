# API Contracts: Search Autosuggest & Discovery

**Branch**: `011-search-autosuggest` | **Date**: 2026-03-09

---

## Backend API Changes

### `GET /api/tags` — Extended (existing endpoint)

Adds two new optional query parameters. All existing behavior is preserved when neither is provided.

**New parameters**:

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `q` | string | `null` | Prefix filter — returns only tags whose `name` starts with this string (case-insensitive). When provided, results are sorted by print count descending. |
| `order_by` | string | `"name"` | Sort order. Accepted values: `"name"` (alphabetical, existing default), `"popularity"` (print count desc, alpha tiebreak). |

**Existing parameters unchanged**:

| Parameter | Type | Default |
|-----------|------|---------|
| `limit` | int | 10 |

**Response shape** (unchanged):

```json
[
  { "name": "dinosaur", "id_translation": "dinosaurus" },
  { "name": "dog", "id_translation": "anjing" }
]
```

Note: `id` field is dropped from the public response (clients don't need it for suggestions). **If dropping `id` breaks existing callers**, keep it — the mobile client ignores unknown fields.

**Behaviour rules**:
- Blocked tags (`blocked = 1`) are always excluded.
- `q` uses SQL `LIKE 'prefix%'` (prefix match only, not contains).
- When `q` is provided, `order_by` defaults to `"popularity"` (can be overridden to `"name"`).
- `limit` applies after filtering and sorting.

**Example calls**:
```
GET /api/tags?q=di&limit=8              → autocomplete for "di", top 8 by popularity
GET /api/tags?limit=10&order_by=popularity → discovery: top 10 most-printed tags
GET /api/tags?limit=30                  → existing behavior unchanged
```

**Error responses**:
- Invalid `order_by` value → `400 Bad Request`
- All other params: use existing validation behavior

---

## Mobile Client Contract

### New method: `getSuggestions(q: string, limit?: number): Promise<Suggestion[]>`

Calls `GET /api/tags?q={q}&limit={limit}` (default limit=8).

### New method: `getDiscoverySuggestions(limit?: number): Promise<Suggestion[]>`

Calls `GET /api/tags?order_by=popularity&limit={limit}` (default limit=10).

### Type: `Suggestion`

```typescript
interface Suggestion {
  name: string;
  id_translation: string | null;
}
```

### Display helper

```
primaryLabel = suggestion.id_translation || suggestion.name
subtitleLabel = suggestion.id_translation ? suggestion.name : null
```

