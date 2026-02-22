import { useQuery } from '@tanstack/react-query';
import { useApiClient } from '../api/apiClientContext';
import type { Item } from '../types/api';

export function useRelated(itemIndex: number) {
  const client = useApiClient();

  return useQuery<Item[], Error>({
    queryKey: ['related', itemIndex],
    queryFn: () => client.getRelated(itemIndex),
  });
}
