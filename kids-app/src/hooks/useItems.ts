import { useInfiniteQuery } from '@tanstack/react-query';
import { useApiClient } from '../api/apiClientContext';
import type { Item } from '../types/api';

const PAGE_SIZE = 20;

export function useItems() {
  const client = useApiClient();

  return useInfiniteQuery<Item[], Error>({
    queryKey: ['items'],
    queryFn: ({ pageParam = 0 }) => client.getItems(pageParam as number, PAGE_SIZE),
    initialPageParam: 0,
    getNextPageParam: (lastPage, _allPages, lastPageParam) =>
      lastPage.length === PAGE_SIZE ? (lastPageParam as number) + PAGE_SIZE : undefined,
  });
}
