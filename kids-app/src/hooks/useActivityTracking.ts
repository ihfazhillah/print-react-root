import { useCallback } from 'react';
import { createDeviceApiClient } from '../api/devices';
import { deviceStorage } from '../storage/deviceStorage';
import { getBaseUrl, useServerConfig } from './useServerConfig';

function nowIso(): string {
  return new Date().toISOString();
}

export function useActivityTracking() {
  const { config } = useServerConfig();

  const sendEvent = useCallback(
    async (eventType: 'view' | 'detail' | 'print', imageId?: string): Promise<void> => {
      const deviceId = await deviceStorage.getDeviceId();
      const token = await deviceStorage.getToken();
      if (!deviceId || !token) return; // Not registered yet — skip silently

      try {
        const client = createDeviceApiClient(getBaseUrl(config));
        await client.recordEvent(deviceId, token, {
          event_type: eventType,
          image_id: imageId,
          timestamp: nowIso(),
        });
      } catch {
        // Fire-and-forget: tracking failures must never affect UX
      }
    },
    [config],
  );

  return {
    trackView: useCallback((imageId?: string) => sendEvent('view', imageId), [sendEvent]),
    trackDetail: useCallback((imageId?: string) => sendEvent('detail', imageId), [sendEvent]),
    trackPrint: useCallback((imageId?: string) => sendEvent('print', imageId), [sendEvent]),
  };
}
