# Quickstart: Search Autosuggest & Discovery

**Branch**: `011-search-autosuggest` | **Date**: 2026-03-09

Integration test scenarios for validating the feature end-to-end.

---

## US1: Autocomplete While Typing

**Setup**: App running, at least 10 tags exist in the database (including some with Indonesian translations).

**Scenario 1 — Basic autocomplete**:
1. Open the app → home screen shows image grid
2. Tap the search bar
3. Type "di"
4. **Expected**: Image grid is replaced by a suggestion list. "dinosaurus" (Indonesian) appears as primary label with "dinosaur" as subtitle.
5. Tap "dinosaurus"
6. **Expected**: Search runs for "dinosaur", suggestion list is replaced by search results.

**Scenario 2 — No match**:
1. Type "zzzz"
2. **Expected**: No suggestion list shown (or list is empty). Search input remains usable.

**Scenario 3 — Popularity ranking**:
1. Type "c"
2. **Expected**: "cat" (most printed) appears before "craft" (less printed) in the list.

---

## US2: Discovery Suggestions

**Setup**: Same as US1.

**Scenario 1 — Discovery on focus**:
1. Tap the search bar without typing anything
2. **Expected**: Image grid is replaced by a list of popular tags (at least 10). Top item is the most-printed tag.

**Scenario 2 — Tap a discovery suggestion**:
1. Tap the search bar (discovery suggestions appear)
2. Tap the first suggestion (e.g., "kucing / cat")
3. **Expected**: Search runs for "cat", results grid shows cat images.

**Scenario 3 — Dismiss suggestions**:
1. Tap the search bar (discovery appears)
2. Tap outside the search bar / press back
3. **Expected**: Suggestions disappear, normal image grid is restored.

---

## Backend Smoke Tests

```bash
# Autocomplete: prefix "di", popularity ranked
curl "http://localhost:8080/api/tags?q=di&limit=8"
# Expected: JSON array, "dinosaur" first if it has most prints

# Discovery: top 10 by popularity
curl "http://localhost:8080/api/tags?order_by=popularity&limit=10"
# Expected: JSON array of 10 tags, ordered by print count

# Blocked tag excluded
# (Assuming tag "test-blocked" exists with blocked=1 and name starts with "te")
curl "http://localhost:8080/api/tags?q=te&limit=20"
# Expected: "test-blocked" does NOT appear in results

# Existing behavior unchanged
curl "http://localhost:8080/api/tags?limit=30"
# Expected: same as before — alphabetical, non-blocked tags
```

