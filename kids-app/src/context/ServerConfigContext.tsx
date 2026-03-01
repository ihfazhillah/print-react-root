import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ServerConfig } from '../types/api';

const STORAGE_KEY = 'server_config';

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

interface ServerConfigContextValue {
  config: ServerConfig;
  updateConfig: (next: ServerConfig) => Promise<void>;
  isLoading: boolean;
}

export const ServerConfigContext = createContext<ServerConfigContextValue | null>(null);

export function ServerConfigProvider({
  children,
  storage = defaultStorage,
}: {
  children: React.ReactNode;
  storage?: KvStorage;
}) {
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

  return (
    <ServerConfigContext.Provider value={{ config, updateConfig, isLoading }}>
      {children}
    </ServerConfigContext.Provider>
  );
}

export function useSharedServerConfig(): ServerConfigContextValue | null {
  return useContext(ServerConfigContext);
}
