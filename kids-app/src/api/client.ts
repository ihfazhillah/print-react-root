import type { ApiError, Item, PrintResponse, Suggestion } from '../types/api';

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

export interface ApiClient {
  baseUrl: string;
  getItems(skip?: number, limit?: number, deviceId?: string): Promise<Item[]>;
  search(q: string, skip?: number, limit?: number): Promise<Item[]>;
  getRelated(itemIndex: number): Promise<Item[]>;
  getTags(limit?: number): Promise<string[]>;
  getSuggestions(q: string, limit?: number): Promise<Suggestion[]>;
  getDiscoverySuggestions(limit?: number): Promise<Suggestion[]>;
  printImage(url: string): Promise<PrintResponse>;
  proxyImageUrl(url: string): string;
}

export function createApiClient(baseUrl: string): ApiClient {
  async function request<T>(url: string): Promise<T> {
    const res = await fetch(url);
    if (!res.ok) {
      const body = (await res.json().catch(() => ({ detail: res.statusText }))) as ApiError;
      throw new ApiRequestError(res.status, body);
    }
    return res.json() as Promise<T>;
  }

  return {
    baseUrl,
    getItems: (skip = 0, limit = 20, deviceId?: string) => {
      let url = `${baseUrl}/api/items?skip=${skip}&limit=${limit}`;
      if (deviceId) url += `&device_id=${encodeURIComponent(deviceId)}`;
      return request<Item[]>(url);
    },

    search: (q, skip = 0, limit = 20) =>
      request<Item[]>(
        `${baseUrl}/api/search?q=${encodeURIComponent(q)}&skip=${skip}&limit=${limit}`,
      ),

    getRelated: (itemIndex) => request<Item[]>(`${baseUrl}/api/related/${itemIndex}`),

    getTags: (limit = 10) => request<string[]>(`${baseUrl}/api/tags?limit=${limit}`),

    getSuggestions: (q, limit = 8) =>
      request<Suggestion[]>(
        `${baseUrl}/api/tags?q=${encodeURIComponent(q)}&limit=${limit}`,
      ),

    getDiscoverySuggestions: (limit = 10) =>
      request<Suggestion[]>(
        `${baseUrl}/api/tags?order_by=popularity&limit=${limit}`,
      ),

    printImage: (url) =>
      request<PrintResponse>(`${baseUrl}/api/print-image?url=${encodeURIComponent(url)}`),

    proxyImageUrl: (url) => `${baseUrl}/api/proxy-image?url=${encodeURIComponent(url)}`,
  };
}
