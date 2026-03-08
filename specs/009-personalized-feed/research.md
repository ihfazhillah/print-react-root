# Research: Personalized Feed

## R1: Personalization Strategy for SQLite at ~95k Items

**Decision**: Tag-affinity scoring with SQL-level ordering.

**Rationale**: The dataset is small enough (~95k pages, ~4k tags) that a single SQL query can compute personalized ordering in real-time without caching or precomputation. The approach:

1. Compute tag affinity scores from `activity_events` (print=3, detail=2, view=1 weighting).
2. For each page, compute a relevance score = sum of affinity scores for its tags.
3. Subtract a "seen penalty" for pages the child has already interacted with.
4. Order by: relevance score DESC, then RANDOM() for tie-breaking (introduces variety).

**Alternatives considered**:
- **Precomputed affinity table**: More complex, requires cache invalidation. Not needed at this scale.
- **Collaborative filtering**: Requires multiple users with overlapping interests. Only 5 devices — insufficient data.
- **Embedding-based similarity**: Over-engineered for tag-based content with ~4k tags.

## R2: Pagination with Personalized Ordering

**Decision**: Use a seed-based RANDOM() for consistent pagination within a session.

**Rationale**: If we use `ORDER BY score DESC, RANDOM()`, each page request would shuffle differently, causing items to appear/disappear between pages. Solution: accept an optional `seed` parameter (integer). SQLite's `RANDOM()` is not seedable, but we can use a deterministic hash: `ORDER BY score DESC, (page_id * seed) % large_prime`. This gives consistent ordering within a session while varying across sessions.

**Alternatives considered**:
- **Cursor-based pagination**: Complex with computed scores. Would require materializing the scored list.
- **Ignore the problem**: Acceptable for MVP — small inconsistencies in infinite scroll are barely noticeable. Start with simple approach, add seed later if needed.

**Final call**: Start without seed (simple RANDOM() tie-breaking). Add seed parameter in a follow-up if pagination inconsistency is noticeable.

## R3: Recommendations Endpoint Enhancement

**Decision**: Enhance existing `get_recommendations()` in db.py.

**Rationale**: The current implementation already does tag-based recommendations but has limitations:
- Returns empty list if < 2 prints (too strict — should use views too)
- Only excludes printed items (should also exclude recently viewed)
- No fallback for devices with no history

Enhancements:
1. Lower threshold: recommend if device has ANY interaction (not just 2+ prints).
2. Include view events in affinity calculation (lower weight than prints).
3. Fallback: if no tag affinity exists, return globally popular items (most printed/viewed across all devices).
4. Exclude recently viewed items (last 50) in addition to printed items.

## R4: Mobile Integration Approach

**Decision**: Add optional `device_id` query parameter to existing `/api/items` endpoint.

**Rationale**:
- Backward compatible: omitting `device_id` returns the current unpersonalized list.
- No auth required for browsing (unlike `/api/devices/{id}/recommendations` which needs Bearer token).
- The mobile app already has `deviceStorage.getDeviceId()` available — just needs to pass it.

For the recommendation section, the app already has `useRecommendations` hook — just needs to be displayed on the home screen.

## R5: "Kamu Mungkin Suka" UI Component

**Decision**: Horizontal scrollable row above the main FlatList.

**Rationale**: Standard mobile pattern for recommendation sections (Netflix, Play Store). Keeps the main vertical list untouched. Uses existing `useRecommendations` hook. Hidden when empty (no history, no popular items).

Constitution compliance: FlatList horizontal with capped items (20 max), React.memo on items, stable keyExtractor using page ID.
