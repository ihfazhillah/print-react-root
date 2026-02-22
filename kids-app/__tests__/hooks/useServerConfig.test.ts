import { renderHook, act, waitFor } from '@testing-library/react-native';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
}));

// eslint-disable-next-line import/first
import { useServerConfig, type KvStorage } from '../../src/hooks/useServerConfig';

function createMemoryStorage(initial: Record<string, string> = {}): KvStorage {
  const store = new Map(Object.entries(initial));
  return {
    getItem: jest.fn((key: string) => Promise.resolve(store.get(key) ?? null)),
    setItem: jest.fn((key: string, value: string) => {
      store.set(key, value);
      return Promise.resolve();
    }),
  };
}

test('loads default config from env vars when storage is empty', async () => {
  const storage = createMemoryStorage();
  const { result } = renderHook(() => useServerConfig(storage));

  await waitFor(() => expect(result.current.isLoading).toBe(false));
  expect(result.current.config.ip).toBe(process.env.EXPO_PUBLIC_API_IP ?? '192.168.68.254');
  expect(typeof result.current.config.port).toBe('number');
});

test('loads persisted config from storage', async () => {
  const saved = JSON.stringify({ ip: '10.0.0.1', port: 3000 });
  const storage = createMemoryStorage({ server_config: saved });

  const { result } = renderHook(() => useServerConfig(storage));

  await waitFor(() => expect(result.current.isLoading).toBe(false));
  expect(result.current.config).toEqual({ ip: '10.0.0.1', port: 3000 });
});

test('updateConfig persists to storage and updates state', async () => {
  const storage = createMemoryStorage();
  const { result } = renderHook(() => useServerConfig(storage));

  await waitFor(() => expect(result.current.isLoading).toBe(false));

  await act(async () => {
    await result.current.updateConfig({ ip: '192.168.1.50', port: 9090 });
  });

  expect(result.current.config).toEqual({ ip: '192.168.1.50', port: 9090 });
  expect(storage.setItem).toHaveBeenCalledWith(
    'server_config',
    JSON.stringify({ ip: '192.168.1.50', port: 9090 }),
  );
});

test('handles corrupted storage data gracefully', async () => {
  const storage = createMemoryStorage({ server_config: 'not-valid-json' });
  const { result } = renderHook(() => useServerConfig(storage));

  await waitFor(() => expect(result.current.isLoading).toBe(false));
  // Should fall back to defaults
  expect(result.current.config.ip).toBe(process.env.EXPO_PUBLIC_API_IP ?? '192.168.68.254');
});
