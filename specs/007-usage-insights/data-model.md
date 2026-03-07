# Data Model: Usage Insights & Personalized Feed

**Feature**: 007-usage-insights | **Date**: 2026-03-06

## Entity Changes

### Device (extended)

**Table**: `devices` (existing)

| Column | Type | Change | Notes |
|--------|------|--------|-------|
| is_admin | INTEGER NOT NULL DEFAULT 0 | **NEW** | Boolean flag. 1 = exclude from analytics |

**Migration**: `ALTER TABLE devices ADD COLUMN is_admin INTEGER NOT NULL DEFAULT 0`

### Existing Tables Used (no changes)

- **activity_events**: `id, device_id, event_type, image_id, event_timestamp, created_at`
  - `event_type` IN ('view', 'detail', 'print')
  - `image_id` maps to `printable_pages.id` (stored as TEXT, cast to INTEGER for joins)
- **printable_pages**: `id, url, thumbnail, type, source, parent_id, created_at`
- **page_tags**: `page_id, tag_id, link`
- **tags**: `id, name, id_translation`

## Aggregated Views (query-time, not materialized)

### Device Usage Summary

Computed per non-admin device from `activity_events`:

| Field | Derivation |
|-------|-----------|
| device_id | GROUP BY device_id |
| device_name | JOIN devices |
| total_views | COUNT WHERE event_type = 'view' |
| total_details | COUNT WHERE event_type = 'detail' |
| total_prints | COUNT WHERE event_type = 'print' |

### Tag Preference (per device)

Computed from `activity_events` JOIN `printable_pages` JOIN `page_tags` JOIN `tags`:

| Field | Derivation |
|-------|-----------|
| device_id | GROUP BY |
| tag_id | GROUP BY |
| tag_name | JOIN tags |
| print_count | COUNT WHERE event_type = 'print' |
| rank | ROW_NUMBER() ordered by print_count DESC |

### Shared/Unique Interests

Computed by comparing tag preferences across devices:
- **Shared**: Tags appearing in top-5 of 2+ devices
- **Unique**: Tags appearing in top-5 of exactly 1 device

## Relationships

```
devices (1) ──── (N) activity_events (N) ──── (1) printable_pages
                                                       |
                                              page_tags (N) ──── (1) tags
```

Key join: `activity_events.image_id` → `printable_pages.id` (cast required: `CAST(image_id AS INTEGER)`)
