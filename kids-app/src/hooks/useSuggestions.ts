import { useQuery } from '@tanstack/react-query';
import { useApiClient } from '../api/apiClientContext';
import { useDebounce } from './useDebounce';
import type { Suggestion } from '../types/api';

export function useAutocomplete(q: string) {
  const client = useApiClient();
  const debouncedQ = useDebounce(q, 300);

  return useQuery<Suggestion[]>({
    queryKey: ['suggestions', debouncedQ],
    queryFn: () => client.getSuggestions(debouncedQ),
    enabled: debouncedQ.length >= 2,
    staleTime: 30_000,
  });
}

export function useDiscovery() {
  const client = useApiClient();

  return useQuery<Suggestion[]>({
    queryKey: ['discovery-suggestions'],
    queryFn: () => client.getDiscoverySuggestions(),
    staleTime: 5 * 60_000,
  });
}
