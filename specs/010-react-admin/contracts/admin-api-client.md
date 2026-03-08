# Contract: Admin API Client

The admin dashboard API client follows the same architecture as `kids-app/src/api/client.ts` — a factory function returning typed methods using native `fetch`.

## Interface

```typescript
interface AdminApiClient {
  baseUrl: string;

  // Content browsing
  getItems(skip?: number, limit?: number): Promise<Page[]>;
  getItemCount(): Promise<number>;
  search(q: string, skip?: number, limit?: number): Promise<Page[]>;
  getRelated(itemId: number): Promise<Page[]>;
  getTags(limit?: number): Promise<string[]>;

  // Page CRUD
  createPage(data: PageCreate): Promise<Page>;
  updatePage(pageId: number, data: PageUpdate): Promise<Page>;
  deletePage(pageId: number): Promise<void>;

  // Tag CRUD
  getAllTags(skip?: number, limit?: number, blockedOnly?: boolean): Promise<Tag[]>;
  createTag(data: TagCreate): Promise<Tag>;
  updateTag(tagId: number, data: TagUpdate): Promise<Tag>;
  deleteTag(tagId: number): Promise<void>;
  translateAllTags(): Promise<TranslationResult>;
  toggleTagBlocked(tagId: number, blocked: boolean): Promise<Tag>;
  bulkToggleBlocked(tagIds: number[], blocked: boolean): Promise<{ updated: number }>;

  // Device management
  getDevices(includeInactive?: boolean): Promise<Device[]>;
  renameDevice(deviceId: string, name: string): Promise<Device>;
  toggleDeviceAdmin(deviceId: string, isAdmin: boolean): Promise<Device>;
  deactivateDevice(deviceId: string): Promise<void>;
  mergeDevices(sourceId: string, targetId: string): Promise<MergeResult>;

  // Insights
  getInsightsSummary(): Promise<InsightsSummary>;
  getTopTags(limit?: number): Promise<TopTagsResult>;
  getTopImages(limit?: number): Promise<TopImagesResult>;
  getDeviceTimeline(deviceId: string, limit?: number, offset?: number): Promise<TimelineDay[]>;
  getInterests(): Promise<InterestsResult>;

  // Utilities
  proxyImageUrl(url: string): string;
  printImage(url: string): Promise<PrintResult>;
}
```

## Factory

```typescript
function createAdminApiClient(baseUrl: string): AdminApiClient
```

## Context Provider

```typescript
// Same pattern as kids-app/src/api/apiClientContext.ts
const AdminApiClientContext = React.createContext<AdminApiClient | null>(null);
const useAdminApiClient = () => useContext(AdminApiClientContext);
```

## Error Handling

Same as kids-app: `ApiRequestError` class with `status` and `detail` fields.

```typescript
class ApiRequestError extends Error {
  status: number;
  detail: string;
}
```
