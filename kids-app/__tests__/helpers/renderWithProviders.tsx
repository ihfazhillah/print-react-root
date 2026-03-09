import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ApiClientContext } from '../../src/api/apiClientContext';
import type { ApiClient } from '../../src/api/client';
import type { Item } from '../../src/types/api';

/** Builds a stub ApiClient where every method returns an empty success by default.
 *  Override individual methods via the `overrides` parameter. */
export function createMockClient(overrides: Partial<ApiClient> = {}): ApiClient {
  return {
    baseUrl: 'http://test-host:8080',
    getItems: jest.fn().mockResolvedValue([]),
    search: jest.fn().mockResolvedValue([]),
    getRelated: jest.fn().mockResolvedValue([]),
    getTags: jest.fn().mockResolvedValue([]),
    getSuggestions: jest.fn().mockResolvedValue([]),
    getDiscoverySuggestions: jest.fn().mockResolvedValue([]),
    printImage: jest.fn().mockResolvedValue({ status: 'sent_to_printer', message: 'ok' }),
    proxyImageUrl: jest.fn(
      (url: string) => `http://test-host/api/proxy-image?url=${encodeURIComponent(url)}`,
    ),
    ...overrides,
  };
}

/** Returns a React wrapper component that provides QueryClient + a mock ApiClient. */
export function createWrapper(client: ApiClient) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <ApiClientContext.Provider value={client}>{children}</ApiClientContext.Provider>
      </QueryClientProvider>
    );
  };
}

/** Convenience: N fake print items. */
export function fakePrintItems(count: number): Item[] {
  return Array.from({ length: count }, (_, i) => ({
    thumbnail: `https://example.com/thumb${i}.webp`,
    url: `https://example.com/item${i}`,
    searches: [{ link: '', text: `tag-${i}` }],
    type: 'print' as const,
  }));
}
