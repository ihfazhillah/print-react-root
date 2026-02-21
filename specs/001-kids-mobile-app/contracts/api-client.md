# API Client Contract: Kids Mobile App → FastAPI Backend

**Date**: 2026-02-21 | **Branch**: `001-kids-mobile-app`

## Overview

The mobile app communicates with the existing FastAPI backend over
HTTP on the local network. All endpoints are GET requests with query
or path parameters. No authentication. No request bodies.

**Base URL**: `http://{ip}:{port}` (from ServerConfig, default from
Expo env var `EXPO_PUBLIC_API_IP` and `EXPO_PUBLIC_API_PORT`).

## Endpoints

### GET /api/items

Fetch paginated list of all items (collections and prints).

**Parameters**:

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `skip` | int | 0 | Offset (number of items to skip) |
| `limit` | int | 20 | Max items to return |

**Response** (`200 OK`): `Item[]`

```typescript
// Returns Item[] — array may be empty when skip >= total count
// Length < limit indicates last page (no more items)
type GetItemsResponse = Item[];
```

**Used by**: `useItems` hook (useInfiniteQuery)
**Pagination**: `getNextPageParam` returns `skip + limit` when
`page.length === limit`, otherwise `undefined`.

---

### GET /api/search

Search items by tag substring match.

**Parameters**:

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `q` | string | "" | Search query (case-insensitive substring) |
| `skip` | int | 0 | Offset |
| `limit` | int | 20 | Max results |

**Response** (`200 OK`): `Item[]`

```typescript
// When q is empty, behaves identically to /api/items
// Matches against searches[].text (case-insensitive substring)
// For collections, also matches nested print tags
// Returns the collection item, NOT individual prints within it
type SearchResponse = Item[];
```

**Used by**: `useSearch` hook (useInfiniteQuery with debounced query key)

---

### GET /api/related/{item_index}

Get items related to a given item.

**Parameters**:

| Param | Type | Location | Description |
|-------|------|----------|-------------|
| `item_index` | int | path | Zero-based index in backend data array |

**Response** (`200 OK`): `Item[]`

```typescript
// If item is a collection: returns its prints[] array
// If item is a print: returns other items sharing >= 1 tag
// If index is invalid: returns []
type RelatedResponse = Item[];
```

**Used by**: `useRelated` hook (useQuery)

**Important**: The `item_index` is the global position in the
backend's data array. The mobile app must track each item's absolute
index: `skip + positionInPage`.

---

### GET /api/tags

Get sorted list of unique tags.

**Parameters**:

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `limit` | int | 10 | Max tags to return |

**Response** (`200 OK`): `string[]`

```typescript
// Alphabetically sorted array of tag strings
// Total available: 333 tags
type TagsResponse = string[];
```

**Used by**: `useTags` hook (useQuery) — for suggested tags in search

---

### GET /api/print-image

Trigger printing of an image via the backend.

**Parameters**:

| Param | Type | Location | Description |
|-------|------|----------|-------------|
| `url` | string | query | Full krokotak print page URL |

**Response** (`200 OK`):

```typescript
interface PrintResponse {
  status: 'sent_to_printer';
  message: string; // "Image sent to printer"
}
```

**Error** (`500 Internal Server Error`):

```typescript
interface ApiError {
  detail: string; // Human-readable error description
}
```

**Used by**: `usePrintImage` hook (useMutation)

**Notes**:
- This is a GET request (not POST) despite triggering a side effect
- The backend scrapes krokotak, converts WebP→PNG, and POSTs to
  the printer server
- The `url` parameter must be the item's `url` field as-is
- Response time varies (network scrape + image conversion + print);
  no client-side timeout per spec

### GET /api/proxy-image

Proxy an external image through the backend to bypass untrusted SSL
certificates on Android (see research.md section 16).

**Parameters**:

| Param | Type | Location | Description |
|-------|------|----------|-------------|
| `url` | string | query | Full external image URL (e.g. krokotak thumbnail) |

**Response** (`200 OK`): Raw image bytes with original `Content-Type`
header (e.g. `image/webp`).

**Error** (`502 Bad Gateway`):

```typescript
interface ApiError {
  detail: string; // Upstream fetch error description
}
```

**Used by**: `ApiClient.proxyImageUrl(url)` — returns the proxy URL
string (no fetch; used as `<Image source={{ uri }}>`).

**Caching**: In-memory LRU, 20 MB budget (~1,400 thumbnails).
First request fetches from origin; subsequent requests served from RAM.

---

## React Query Hook Mapping

| Hook | Endpoint | Query Type | Query Key |
|------|----------|------------|-----------|
| `useItems()` | `/api/items` | `useInfiniteQuery` | `['items']` |
| `useSearch(query)` | `/api/search` | `useInfiniteQuery` | `['search', debouncedQuery]` |
| `useRelated(index)` | `/api/related/{index}` | `useQuery` | `['related', index]` |
| `useTags(limit?)` | `/api/tags` | `useQuery` | `['tags', limit]` |
| `usePrintImage()` | `/api/print-image` | `useMutation` | N/A |
| `proxyImageUrl()` | `/api/proxy-image` | URL builder (sync) | N/A |

## Error Handling Contract

All endpoints return standard HTTP status codes:

| Status | Meaning | Mobile app behavior |
|--------|---------|---------------------|
| 200 | Success | Display data |
| 500 | Server error | Show child-friendly error message (FR-010, FR-015) |
| Network error | Backend unreachable | Show "cannot connect" message (edge case) |

React Query's `retry` (default 3 retries with exponential backoff)
handles transient failures automatically. For print mutations, retry
is disabled (user explicitly retaps the button).

## CORS Note

React Native's networking layer does not enforce browser CORS
policies. The mobile app can call the backend without CORS headers.
No backend changes needed for the mobile client.
