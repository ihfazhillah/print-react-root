import { keepPreviousData, useInfiniteQuery } from '@tanstack/react-query';
import { useApiClient } from '../api/apiClientContext';
import type { CategoryItem } from '../types/api';

const PAGE_SIZE = 20;

export interface UseCategoryItemsOptions {
  categoryId: number;
  subcategoryId?: number;
  enabled?: boolean;
}

export function useCategoryItems({ categoryId, subcategoryId, enabled = true }: UseCategoryItemsOptions) {
  const client = useApiClient();

  return useInfiniteQuery<CategoryItem[], Error>({
    queryKey: ['categoryItems', categoryId, subcategoryId],
    queryFn: ({ pageParam = 0 }) =>
      client.getCategoryItems(categoryId, pageParam as number, PAGE_SIZE),
    initialPageParam: 0,
    getNextPageParam: (lastPage, _allPages, lastPageParam) =>
      lastPage.length === PAGE_SIZE ? (lastPageParam as number) + PAGE_SIZE : undefined,
    placeholderData: keepPreviousData,
    enabled: enabled && categoryId > 0,
  });
}
