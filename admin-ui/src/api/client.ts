import type {
  ApiError,
  Device,
  InterestsResult,
  MergeResult,
  Page,
  PageCreate,
  PageUpdate,
  PrintResult,
  Tag,
  TagCreate,
  TagUpdate,
  TimelineDay,
  TopImagesResult,
  TopTagsResult,
  TranslationResult,
  InsightsSummary,
} from '../types/api';

export class ApiRequestError extends Error {
  detail: string;
  status: number;

  constructor(status: number, body: ApiError) {
    super(body.detail);
    this.name = 'ApiRequestError';
    this.detail = body.detail;
    this.status = status;
  }
}

export interface AdminApiClient {
  baseUrl: string;

  // Content browsing
  getItems(skip?: number, limit?: number): Promise<Page[]>;
  search(q: string, skip?: number, limit?: number): Promise<Page[]>;
  getTopTagNames(limit?: number): Promise<string[]>;

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

export function createAdminApiClient(baseUrl: string): AdminApiClient {
  async function request<T>(url: string, options?: RequestInit): Promise<T> {
    const res = await fetch(url, options);
    if (!res.ok) {
      const body = (await res.json().catch(() => ({ detail: res.statusText }))) as ApiError;
      throw new ApiRequestError(res.status, body);
    }
    if (res.status === 204) return undefined as T;
    return res.json() as Promise<T>;
  }

  function json(method: string, body: unknown): RequestInit {
    return {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    };
  }

  return {
    baseUrl,

    // Content browsing
    getItems: (skip = 0, limit = 20) =>
      request<Page[]>(`${baseUrl}/api/items?skip=${skip}&limit=${limit}`),

    search: (q, skip = 0, limit = 20) =>
      request<Page[]>(
        `${baseUrl}/api/search?q=${encodeURIComponent(q)}&skip=${skip}&limit=${limit}`,
      ),

    getTopTagNames: (limit = 10) => request<string[]>(`${baseUrl}/api/tags?limit=${limit}`),

    // Page CRUD
    createPage: (data) => request<Page>(`${baseUrl}/api/pages`, json('POST', data)),

    updatePage: (pageId, data) =>
      request<Page>(`${baseUrl}/api/pages/${pageId}`, json('PUT', data)),

    deletePage: (pageId) => request<void>(`${baseUrl}/api/pages/${pageId}`, { method: 'DELETE' }),

    // Tag CRUD
    getAllTags: (skip = 0, limit = 50, blockedOnly = false) =>
      request<Tag[]>(
        `${baseUrl}/api/tags/all?skip=${skip}&limit=${limit}&blocked_only=${blockedOnly}`,
      ),

    createTag: (data) => request<Tag>(`${baseUrl}/api/tags`, json('POST', data)),

    updateTag: (tagId, data) =>
      request<Tag>(`${baseUrl}/api/tags/${tagId}`, json('PUT', data)),

    deleteTag: (tagId) => request<void>(`${baseUrl}/api/tags/${tagId}`, { method: 'DELETE' }),

    translateAllTags: () =>
      request<TranslationResult>(`${baseUrl}/api/tags/translate`, { method: 'POST' }),

    toggleTagBlocked: (tagId, blocked) =>
      request<Tag>(
        `${baseUrl}/api/admin/tags/${tagId}/block?blocked=${blocked}`,
        { method: 'PATCH' },
      ),

    bulkToggleBlocked: (tagIds, blocked) =>
      request<{ updated: number }>(
        `${baseUrl}/api/admin/tags/block`,
        json('POST', { tag_ids: tagIds, blocked }),
      ),

    // Device management
    getDevices: (includeInactive = false) =>
      request<Device[]>(
        `${baseUrl}/api/admin/devices?include_inactive=${includeInactive}`,
      ),

    renameDevice: (deviceId, name) =>
      request<Device>(
        `${baseUrl}/api/admin/devices/${deviceId}/name`,
        json('PATCH', { name }),
      ),

    toggleDeviceAdmin: (deviceId, isAdmin) =>
      request<Device>(
        `${baseUrl}/api/admin/devices/${deviceId}/admin`,
        json('PATCH', { is_admin: isAdmin }),
      ),

    deactivateDevice: (deviceId) =>
      request<void>(`${baseUrl}/api/admin/devices/${deviceId}`, { method: 'DELETE' }),

    mergeDevices: (sourceId, targetId) =>
      request<MergeResult>(
        `${baseUrl}/api/admin/devices/merge`,
        json('POST', { source_id: sourceId, target_id: targetId }),
      ),

    // Insights
    getInsightsSummary: () =>
      request<InsightsSummary>(`${baseUrl}/api/admin/insights/summary`),

    getTopTags: (limit = 5) =>
      request<TopTagsResult>(`${baseUrl}/api/admin/insights/top-tags?limit=${limit}`),

    getTopImages: (limit = 10) =>
      request<TopImagesResult>(`${baseUrl}/api/admin/insights/top-images?limit=${limit}`),

    getDeviceTimeline: (deviceId, limit = 50, offset = 0) =>
      request<TimelineDay[]>(
        `${baseUrl}/api/admin/devices/${deviceId}/timeline?limit=${limit}&offset=${offset}`,
      ),

    getInterests: () => request<InterestsResult>(`${baseUrl}/api/admin/insights/interests`),

    // Utilities
    proxyImageUrl: (url) => `${baseUrl}/api/proxy-image?url=${encodeURIComponent(url)}`,

    printImage: (url) =>
      request<PrintResult>(`${baseUrl}/api/print-image?url=${encodeURIComponent(url)}`),
  };
}
