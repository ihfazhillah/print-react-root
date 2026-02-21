import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import type { ServerConfig } from '../types/api';

const STORAGE_KEY = 'server_config';

function getDefaultConfig(): ServerConfig {
  const extra = Constants.expoConfig?.extra;
  return {
    ip: extra?.EXPO_PUBLIC_API_IP ?? process.env.EXPO_PUBLIC_API_IP ?? '192.168.68.254',
    port: Number(extra?.EXPO_PUBLIC_API_PORT ?? process.env.EXPO_PUBLIC_API_PORT ?? 8080),
  };
}

export function useServerConfig() {
  const [config, setConfig] = useState<ServerConfig>(getDefaultConfig());
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (raw) {
        try {
          setConfig(JSON.parse(raw) as ServerConfig);
        } catch {
          // corrupted data — keep defaults
        }
      }
      setIsLoading(false);
    });
  }, []);

  const updateConfig = useCallback(async (next: ServerConfig) => {
    setConfig(next);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }, []);

  return { config, updateConfig, isLoading };
}

export function getBaseUrl(config: ServerConfig): string {
  return `http://${config.ip}:${config.port}`;
}
