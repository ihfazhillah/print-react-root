# Contract: Recommendations ("Kamu Mungkin Suka")

## Endpoint

`GET /api/devices/{device_id}/recommendations`

## Changes from Current

- Lower activation threshold: any interaction (not just 2+ prints)
- Include view/detail events in affinity scoring
- Exclude recently viewed items (not just printed)
- Fallback to popular items when no history

## Parameters

| Parameter | Type   | Required | Default | Description |
|-----------|--------|----------|---------|-------------|
| device_id | string | yes      | -       | Device UUID (path param) |
| limit     | int    | no       | 20      | Max items to return |

## Authentication

Bearer token required (existing behavior).

## Behavior

1. Compute tag affinity from all event types (print=3, detail=2, view=1)
2. Get top 10 tags by affinity score
3. Find pages matching those tags
4. Exclude pages the device has interacted with (last 50 views + all prints)
5. Apply blocked tag filter
6. Order by RANDOM(), limit to requested count
7. **Fallback**: if no tag affinity or no matching unseen pages, return globally popular items

## Response Format

Same `Item[]` format as browsing list.

## Test Scenarios

1. Device with print history → relevant recommendations returned
2. Device with only view history → recommendations returned (lower threshold)
3. Device with no history → popular items returned (not empty)
4. All matching items already seen → broadens to popular items
5. Blocked tags excluded from recommendations
