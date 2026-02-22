import { useQuery } from '@tanstack/react-query';
import { useApiClient } from '../api/apiClientContext';
import type { Item } from '../types/api';

const MAX_RELATED = 48;

export function useRelated(itemIndex: number) {
  const client = useApiClient();

  return useQuery<Item[], Error>({
    queryKey: ['related', itemIndex],
    queryFn: () => client.getRelated(itemIndex),
    select: (items) => items.slice(0, MAX_RELATED),
  });
}
