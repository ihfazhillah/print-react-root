import { useInfiniteQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useApiClient } from '../api/apiClientContext';
import { deviceStorage } from '../storage/deviceStorage';
import type { Item } from '../types/api';

const PAGE_SIZE = 20;

export function useItems() {
  const client = useApiClient();
  const [deviceId, setDeviceId] = useState<string | undefined>(undefined);

  useEffect(() => {
    deviceStorage.getDeviceId().then((id) => {
      if (id) setDeviceId(id);
    });
  }, []);

  return useInfiniteQuery<Item[], Error>({
    queryKey: ['items', client.baseUrl, deviceId],
    queryFn: ({ pageParam = 0 }) =>
      client.getItems(pageParam as number, PAGE_SIZE, deviceId),
    initialPageParam: 0,
    getNextPageParam: (lastPage, _allPages, lastPageParam) =>
      lastPage.length === PAGE_SIZE ? (lastPageParam as number) + PAGE_SIZE : undefined,
  });
}
