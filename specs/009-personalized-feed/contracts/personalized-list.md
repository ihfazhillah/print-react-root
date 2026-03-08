# Contract: Personalized Browsing List

## Endpoint

`GET /api/items`

## Changes from Current

Current: `?skip=0&limit=20`
New: `?skip=0&limit=20&device_id=<optional-uuid>`

## Parameters

| Parameter   | Type   | Required | Default | Description |
|-------------|--------|----------|---------|-------------|
| skip        | int    | no       | 0       | Pagination offset |
| limit       | int    | no       | 20      | Page size |
| device_id   | string | no       | null    | Device UUID for personalization |

## Behavior

### With device_id (personalized)
1. Compute tag affinity from device's activity_events
2. Score each page by sum of its tags' affinity scores
3. Deprioritize pages the device has interacted with (seen/printed)
4. Order by: relevance score DESC, pseudo-random tie-breaking
5. Apply blocked tag filter
6. Return paginated results

### Without device_id (fallback)
- Return pages ordered by popularity (total interactions across all devices), then by id DESC
- New installs with no events see a varied list, not the same static order

## Response Format

Unchanged — same `Item[]` as current endpoint.

```json
[
  {
    "index": 123,
    "url": "https://...",
    "thumbnail": "https://...",
    "type": "print",
    "source": "krokotak",
    "tags": ["animals", "coloring"],
    "prints": []
  }
]
```

## Test Scenarios

1. No device_id → returns items (backward compatible)
2. device_id with history → different ordering than without
3. device_id with no history → returns items (not empty)
4. Two different device_ids → different top-20 results
5. Blocked tags still filtered regardless of personalization
