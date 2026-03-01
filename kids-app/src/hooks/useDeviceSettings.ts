import { useCallback, useEffect, useState } from 'react';
import { createDeviceApiClient } from '../api/devices';
import { deviceStorage } from '../storage/deviceStorage';
import { getBaseUrl, useServerConfig } from './useServerConfig';

export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'error';

export interface DeviceSettingsState {
  deviceName: string;
  syncStatus: SyncStatus;
  syncError: string | null;
}

export function useDeviceSettings() {
  const { config } = useServerConfig();
  const [deviceName, setDeviceNameState] = useState('');
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const [syncError, setSyncError] = useState<string | null>(null);

  // Load stored name on mount
  useEffect(() => {
    deviceStorage.getDeviceName().then((name) => {
      if (name) setDeviceNameState(name);
    });
  }, []);

  const saveName = useCallback(
    async (name: string) => {
      const trimmed = name.trim();
      if (!trimmed) return;

      setSyncStatus('syncing');
      setSyncError(null);

      // Persist locally first
      await deviceStorage.setDeviceName(trimmed);
      setDeviceNameState(trimmed);

      // Sync to backend
      const deviceId = await deviceStorage.getDeviceId();
      const token = await deviceStorage.getToken();
      if (!deviceId || !token) {
        // Not registered yet — local save is enough
        setSyncStatus('synced');
        return;
      }

      try {
        const client = createDeviceApiClient(getBaseUrl(config));
        await client.updateName(deviceId, token, { name: trimmed });
        setSyncStatus('synced');
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Sync failed';
        setSyncError(msg);
        setSyncStatus('error');
      }
    },
    [config],
  );

  return { deviceName, syncStatus, syncError, saveName };
}
