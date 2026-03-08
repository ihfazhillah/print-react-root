# Data Model: Personalized Feed

## Existing Entities (no schema changes needed)

### printable_pages
Already has all needed fields: `id`, `url`, `thumbnail`, `type`, `source`, `parent_id`.
Tags linked via `page_tags` → `tags`.

### activity_events
Already tracks per-device interactions: `device_id`, `event_type` (view/detail/print), `image_id`, `event_timestamp`.

### tags
Already has `blocked` flag for content moderation filtering.

## Derived Concepts (computed at query time, not stored)

### Tag Affinity (per device)
- Computed from `activity_events` JOIN `page_tags` JOIN `tags`
- Score per tag = SUM(weight per event type):
  - `print` → weight 3
  - `detail` → weight 2
  - `view` → weight 1
- Top N tags (default 10) used for personalization

### Page Relevance Score (per device, per page)
- For each page: sum of tag affinity scores for all its tags
- Pages with higher relevance scores appear first
- Pages already interacted with receive a penalty (deprioritized, not hidden)
- Tie-breaking: deterministic pseudo-random ordering

### Popularity Score (global, for fallback)
- Total interaction count per page across all non-admin devices
- Used when a device has no history
- Provides the "trending/popular" fallback for recommendations

## No New Tables Required

All personalization is computed from existing data at query time. At the current scale (~95k pages, ~500 events), this is performant without materialized views or caching.
