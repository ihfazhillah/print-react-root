# API Contracts: Tag CRUD & Indonesian Translation

**Feature**: 004-tag-crud-translation
**Date**: 2026-03-01

## New Endpoints

### GET /api/tags/all

List all tags with their Indonesian translations, paginated.

**Query params**: `skip` (int, default 0), `limit` (int, default 50)

**Response** `200 OK`:
```json
[
  { "id": 1, "name": "origami", "id_translation": "origami" },
  { "id": 2, "name": "coloring", "id_translation": "mewarnai" },
  { "id": 3, "name": "craft", "id_translation": "" }
]
```

### POST /api/tags

Create a new tag.

**Request body**:
```json
{ "name": "new-tag", "id_translation": "" }
```
- `name`: required, non-empty string
- `id_translation`: optional, defaults to `""`

**Response** `201 Created`:
```json
{ "id": 4, "name": "new-tag", "id_translation": "" }
```

**Errors**:
- `400`: Missing or empty name
- `409`: Tag name already exists

### PUT /api/tags/{tag_id}

Update an existing tag.

**Request body** (all fields optional, at least one required):
```json
{ "name": "updated-name", "id_translation": "nama-baru" }
```

**Response** `200 OK`:
```json
{ "id": 4, "name": "updated-name", "id_translation": "nama-baru" }
```

**Errors**:
- `400`: No fields to update
- `404`: Tag not found
- `409`: Tag name already exists (if name changed)

### DELETE /api/tags/{tag_id}

Delete a tag and its page associations.

**Response** `204 No Content`

**Errors**:
- `404`: Tag not found

### POST /api/tags/translate

Bulk translate all tags missing Indonesian translations.

**Request body**: None

**Response** `200 OK`:
```json
{
  "translated": 45,
  "skipped": 10,
  "failed": 2,
  "errors": [
    { "tag_id": 7, "name": "untranslatable-term", "error": "Translation failed" }
  ]
}
```

## Modified Endpoints

### GET /api/search (existing — modified)

Search now matches against both `tags.name` and `tags.id_translation`.

**Behavior change**: A query like `?q=mewarnai` (Indonesian for "coloring") now returns pages tagged with the tag whose `id_translation` contains "mewarnai".

No change to request/response format.

### GET /api/tags (existing — modified)

Now returns objects with `id_translation` instead of bare strings.

**Response** `200 OK`:
```json
[
  { "id": 1, "name": "origami", "id_translation": "origami" },
  { "id": 2, "name": "coloring", "id_translation": "mewarnai" }
]
```

**Breaking change**: Previously returned `["origami", "coloring"]` (list of strings). Now returns list of objects. Frontend tag suggestions will need updating.
