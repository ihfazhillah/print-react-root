import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useApiClient } from '../api/apiClientContext';
import type { Category } from '../types/api';

const CATEGORIES_STALE_TIME = 1000 * 60 * 60 * 24; // 24 hours

export interface UseCategoriesOptions {
  limit?: number;
  offset?: number;
  enabled?: boolean;
}

export function useCategories(options: UseCategoriesOptions = {}) {
  const client = useApiClient();
  const { limit = 50, offset = 0, enabled = true } = options;

  return useQuery<Category[], Error>({
    queryKey: ['categories', limit, offset],
    queryFn: () => client.getCategories(limit, offset),
    staleTime: CATEGORIES_STALE_TIME,
    placeholderData: keepPreviousData,
    enabled,
  });
}
