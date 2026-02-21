import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ServerConfig } from '../types/api';

const STORAGE_KEY = 'server_config';

/** Minimal async key-value interface — defaults to AsyncStorage, tests pass in-memory. */
export interface KvStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
}

const defaultStorage: KvStorage = {
  getItem: (key) => AsyncStorage.getItem(key),
  setItem: (key, value) => AsyncStorage.setItem(key, value),
};

function getDefaultConfig(): ServerConfig {
  return {
    ip: process.env.EXPO_PUBLIC_API_IP ?? '192.168.68.254',
    port: Number(process.env.EXPO_PUBLIC_API_PORT ?? 8080),
  };
}

export function useServerConfig(storage: KvStorage = defaultStorage) {
  const [config, setConfig] = useState<ServerConfig>(getDefaultConfig());
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    storage.getItem(STORAGE_KEY).then((raw) => {
      if (raw) {
        try {
          setConfig(JSON.parse(raw) as ServerConfig);
        } catch {
          // corrupted data — keep defaults
        }
      }
      setIsLoading(false);
    });
  }, [storage]);

  const updateConfig = useCallback(
    async (next: ServerConfig) => {
      setConfig(next);
      await storage.setItem(STORAGE_KEY, JSON.stringify(next));
    },
    [storage],
  );

  return { config, updateConfig, isLoading };
}

export function getBaseUrl(config: ServerConfig): string {
  return `http://${config.ip}:${config.port}`;
}
