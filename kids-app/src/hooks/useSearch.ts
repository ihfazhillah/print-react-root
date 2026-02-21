import { keepPreviousData, useInfiniteQuery } from '@tanstack/react-query';
import { useApiClient } from '../api/apiClientContext';
import { useDebounce } from './useDebounce';
import type { Item } from '../types/api';

const PAGE_SIZE = 20;

export function useSearch(query: string) {
  const client = useApiClient();
  const debouncedQuery = useDebounce(query, 400);

  return useInfiniteQuery<Item[], Error>({
    queryKey: ['search', debouncedQuery],
    queryFn: ({ pageParam = 0 }) => client.search(debouncedQuery, pageParam as number, PAGE_SIZE),
    initialPageParam: 0,
    getNextPageParam: (lastPage, _allPages, lastPageParam) =>
      lastPage.length === PAGE_SIZE ? (lastPageParam as number) + PAGE_SIZE : undefined,
    placeholderData: keepPreviousData,
    enabled: debouncedQuery.length > 0,
  });
}
