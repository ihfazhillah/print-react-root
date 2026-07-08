import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useApiClient } from '../api/apiClientContext';
import { deviceStorage } from '../storage/deviceStorage';
import type { Item } from '../types/api';

const MAX_RELATED = 48;

export function useRelated(itemIndex: number) {
  const client = useApiClient();
  const [deviceId, setDeviceId] = useState<string | undefined>(undefined);

  useEffect(() => {
    deviceStorage.getDeviceId().then((id) => {
      if (id) setDeviceId(id);
    });
  }, []);

  return useQuery<Item[], Error>({
    queryKey: ['related', itemIndex, deviceId],
    queryFn: () => client.getRelated(itemIndex, deviceId),
    select: (items) => items.slice(0, MAX_RELATED),
  });
}
