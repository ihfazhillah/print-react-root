# API Contracts: Usage Insights & Analytics

## Admin Analytics Endpoints

### GET /api/admin/insights/summary

Per-device usage statistics (excludes admin devices).

**Response** `200 OK`:
```json
[
  {
    "device_id": "uuid",
    "device_name": "Mimi",
    "is_active": true,
    "total_views": 120,
    "total_details": 80,
    "total_prints": 30
  }
]
```

### GET /api/admin/insights/top-tags

Top printed tags per device.

**Query params**: `?limit=5` (default 5, max 20)

**Response** `200 OK`:
```json
[
  {
    "device_id": "uuid",
    "device_name": "Mimi",
    "top_tags": [
      { "tag_id": 1, "tag_name": "craft-coloring", "id_translation": "kerajinan-mewarnai", "print_count": 12 },
      { "tag_id": 5, "tag_name": "valentine", "id_translation": "valentine", "print_count": 8 }
    ]
  }
]
```

### GET /api/admin/insights/top-images

Most printed images overall and per device.

**Query params**: `?limit=10` (default 10)

**Response** `200 OK`:
```json
{
  "overall": [
    { "image_id": 92, "thumbnail": "https://...", "url": "https://...", "print_count": 42, "tags": ["bird", "craft"] }
  ],
  "per_device": [
    {
      "device_id": "uuid",
      "device_name": "Mimi",
      "top_images": [
        { "image_id": 45, "thumbnail": "https://...", "url": "https://...", "print_count": 90, "tags": ["gift-box"] }
      ]
    }
  ]
}
```

### GET /api/admin/insights/interests

Shared and unique tag preferences across devices.

**Response** `200 OK`:
```json
{
  "shared": [
    { "tag_name": "craft-coloring", "devices": ["Mimi", "LuLu"] }
  ],
  "unique": [
    { "device_name": "Mimi", "tags": ["valentine", "mother-day"] },
    { "device_name": "LuLu", "tags": ["butterfly", "insect"] }
  ]
}
```

### GET /api/admin/devices/{device_id}/timeline

Activity timeline for a specific device. P2 priority.

**Query params**: `?limit=50&offset=0`

**Response** `200 OK`:
```json
{
  "device_name": "Mimi",
  "events": [
    {
      "date": "2026-03-05",
      "items": [
        { "event_type": "print", "image_id": 45, "thumbnail": "https://...", "timestamp": "2026-03-05T14:30:00Z" }
      ]
    }
  ]
}
```

## Admin Device Management Extension

### PATCH /api/admin/devices/{device_id}/admin

Toggle `is_admin` flag on a device.

**Request body**:
```json
{ "is_admin": true }
```

**Response** `200 OK`:
```json
{ "device_id": "uuid", "device_name": "Babah", "is_admin": true }
```

## Mobile Personalization Endpoint

### GET /api/devices/{device_id}/recommendations

Returns personalized image recommendations based on print history. Requires device Bearer token.

**Query params**: `?limit=20` (default 20)

**Response** `200 OK`:
```json
[
  {
    "id": 123,
    "thumbnail": "https://...",
    "url": "https://...",
    "type": "print",
    "source": "krokotak",
    "searches": [{ "text": "craft-coloring" }]
  }
]
```

Returns empty array `[]` if device has fewer than 2 prints (client hides row).

**Response** `401 Unauthorized`: Invalid/missing device token.

## Admin Dashboard Pages (HTML)

### GET /insights

Server-rendered Jinja2 page showing:
- Per-kid usage summary cards
- Top tags per kid (bar/list)
- Most printed images (thumbnails)
- Shared vs unique interests comparison
- Link to per-kid timeline

### GET /insights/{device_id}

Per-kid detail page with activity timeline (P2).
