import { useQuery } from '@tanstack/react-query';
import { createDeviceApiClient } from '../api/devices';
import { deviceStorage } from '../storage/deviceStorage';
import { getBaseUrl, useServerConfig } from './useServerConfig';
import type { Item } from '../types/api';

export function useRecommendations() {
  const { config } = useServerConfig();

  return useQuery<Item[]>({
    queryKey: ['recommendations', config.ip, config.port],
    queryFn: async () => {
      const deviceId = await deviceStorage.getDeviceId();
      const token = await deviceStorage.getToken();
      if (!deviceId || !token) return [];

      const client = createDeviceApiClient(getBaseUrl(config));
      return client.getRecommendations(deviceId, token);
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
