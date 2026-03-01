import { useCallback, useEffect, useRef, useState } from 'react';
import { createDeviceApiClient } from '../api/devices';
import { deviceStorage } from '../storage/deviceStorage';
import { getBaseUrl, useServerConfig } from './useServerConfig';

export type RegistrationStatus = 'idle' | 'registering' | 'registered' | 'error';

export interface DeviceRegistrationState {
  status: RegistrationStatus;
  deviceId: string | null;
  deviceName: string | null;
  error: string | null;
}

export function useDeviceRegistration() {
  const { config } = useServerConfig();
  const [state, setState] = useState<DeviceRegistrationState>({
    status: 'idle',
    deviceId: null,
    deviceName: null,
    error: null,
  });
  const registeredForUrl = useRef<string | null>(null);

  const ensureRegistered = useCallback(async () => {
    const baseUrl = getBaseUrl(config);

    // Already attempted for this server URL in this session
    if (registeredForUrl.current === baseUrl) return;
    registeredForUrl.current = baseUrl;

    // Check if already registered
    const alreadyRegistered = await deviceStorage.isRegistered();
    if (alreadyRegistered) {
      const deviceId = await deviceStorage.getDeviceId();
      const deviceName = await deviceStorage.getDeviceName();
      setState({ status: 'registered', deviceId, deviceName, error: null });
      return;
    }

    setState((s) => ({ ...s, status: 'registering', error: null }));
    try {
      const client = createDeviceApiClient(baseUrl);
      const result = await client.register({ initial_name: 'My Device' });
      await deviceStorage.setToken(result.device_token);
      await deviceStorage.setDeviceId(result.device_id);
      await deviceStorage.setDeviceName(result.device_name);
      await deviceStorage.setRegistered(true);
      setState({
        status: 'registered',
        deviceId: result.device_id,
        deviceName: result.device_name,
        error: null,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Registration failed';
      setState((s) => ({ ...s, status: 'error', error: msg }));
      // Reset so next mount can retry
      registeredForUrl.current = null;
    }
  }, [config]);

  useEffect(() => {
    ensureRegistered();
  }, [ensureRegistered]);

  return { ...state, ensureRegistered };
}
