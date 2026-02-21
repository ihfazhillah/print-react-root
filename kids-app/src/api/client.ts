import type { ApiError, Item, PrintResponse } from '../types/api';

class ApiRequestError extends Error {
  detail: string;
  status: number;

  constructor(status: number, body: ApiError) {
    super(body.detail);
    this.name = 'ApiRequestError';
    this.detail = body.detail;
    this.status = status;
  }
}

async function request<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    const body = (await res.json().catch(() => ({ detail: res.statusText }))) as ApiError;
    throw new ApiRequestError(res.status, body);
  }
  return res.json() as Promise<T>;
}

export function getItems(baseUrl: string, skip = 0, limit = 20): Promise<Item[]> {
  return request<Item[]>(`${baseUrl}/api/items?skip=${skip}&limit=${limit}`);
}

export function search(baseUrl: string, q: string, skip = 0, limit = 20): Promise<Item[]> {
  return request<Item[]>(
    `${baseUrl}/api/search?q=${encodeURIComponent(q)}&skip=${skip}&limit=${limit}`,
  );
}

export function getRelated(baseUrl: string, itemIndex: number): Promise<Item[]> {
  return request<Item[]>(`${baseUrl}/api/related/${itemIndex}`);
}

export function getTags(baseUrl: string, limit = 10): Promise<string[]> {
  return request<string[]>(`${baseUrl}/api/tags?limit=${limit}`);
}

export function printImage(baseUrl: string, url: string): Promise<PrintResponse> {
  return request<PrintResponse>(`${baseUrl}/api/print-image?url=${encodeURIComponent(url)}`);
}
