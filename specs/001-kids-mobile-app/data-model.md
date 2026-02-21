# Data Model: Kids Mobile App

**Date**: 2026-02-21 | **Branch**: `001-kids-mobile-app`

## Entities

### SearchTag

A keyword associated with an item, used for search filtering and
finding related content.

```typescript
interface SearchTag {
  /** URL to krokotak search page for this tag */
  link: string;
  /** Tag text in kebab-case (e.g., "craft-coloring", "fine-motor") */
  text: string;
}
```

**Source**: `searches` array on each item from `/api/items` response.

### Item (base)

A browsable entry on the home screen. Discriminated union on `type`.

```typescript
interface BaseItem {
  /** WebP thumbnail URL (e.g., ".../hash_page.t.webp") */
  thumbnail: string;
  /** Full URL to krokotak page (print or collection) */
  url: string;
  /** Tags for search and related-item matching */
  searches: SearchTag[];
  /** Discriminator: "print" or "collection" */
  type: 'print' | 'collection';
}
```

### PrintItem

An individual printable image. Extends BaseItem with `type: "print"`.

```typescript
interface PrintItem extends BaseItem {
  type: 'print';
}
```

**Identity**: Identified by its zero-based index in the backend data
array (`item_index`). The index is the item's position in the
`/api/items` response (accounting for `skip`).

**Uniqueness**: The `url` field is unique across all items.

**Lifecycle**: Stateless from the mobile app's perspective. The item
exists in the backend data.json and is read-only.

### CollectionItem

A group of related prints. Extends BaseItem with `type: "collection"`
and a nested `prints` array.

```typescript
interface CollectionItem extends BaseItem {
  type: 'collection';
  /** Child prints belonging to this collection */
  prints: PrintItem[];
}
```

**Note**: The `prints` array is only present on collection items.
When fetched via `/api/items`, collections include their nested prints.

### Item (discriminated union)

```typescript
type Item = PrintItem | CollectionItem;
```

**Type guard**:

```typescript
function isCollection(item: Item): item is CollectionItem {
  return item.type === 'collection';
}
```

### ServerConfig

The persisted backend endpoint configuration.

```typescript
interface ServerConfig {
  /** IPv4 address (e.g., "192.168.68.254") */
  ip: string;
  /** Port number (default: 80) */
  port: number;
}
```

**Storage**: AsyncStorage key `"server_config"`, serialized as JSON.

**Lifecycle**:
- Initialized from build-time Expo env var on first launch
- Updated via settings page
- Persists across app restarts
- Read on every API call to construct the base URL

### PrintResponse

Response from the `/api/print-image` endpoint.

```typescript
interface PrintResponse {
  status: 'sent_to_printer';
  message: string;
}
```

**Error case**: HTTP 500 with `{ detail: string }`.

```typescript
interface ApiError {
  detail: string;
}
```

## Relationships

```
CollectionItem  ──1:N──  PrintItem     (collection.prints[])
Item            ──N:M──  SearchTag     (item.searches[])
Item            ──1:N──  Item          (via /api/related/{index})
ServerConfig    ──1:1──  API Client    (base URL construction)
```

## Derived Computations

| Computation | Input | Output | Used by |
|-------------|-------|--------|---------|
| Base URL | ServerConfig | `http://{ip}:{port}` | API client |
| Item index | Page number + position in page | `skip + index` | Navigation to detail/collection, /api/related call |
| Is collection | `item.type` | boolean | Home screen tap routing |
| Tag list | `item.searches` | `string[]` (map `.text`) | Detail page tags, search matching |

## Data Volume

| Entity | Count | Notes |
|--------|-------|-------|
| Items (total) | 2,140 | 93 collections + 2,047 prints |
| Tags (unique) | 333 | Alphabetically sorted by backend |
| Items per page | 20 | Default `limit` parameter |
| Max pages | ~107 | 2,140 / 20 |
