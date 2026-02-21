import { useQuery } from '@tanstack/react-query';
import { useApiClient } from '../api/apiClientContext';

export function useTags(limit = 30) {
  const client = useApiClient();

  return useQuery<string[], Error>({
    queryKey: ['tags', limit],
    queryFn: () => client.getTags(limit),
  });
}
