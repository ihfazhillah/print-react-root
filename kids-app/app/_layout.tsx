import { useEffect } from 'react';
import { AppState, Platform } from 'react-native';
import type { AppStateStatus } from 'react-native';
import { Stack } from 'expo-router';
import * as Network from 'expo-network';
import {
  QueryClient,
  QueryClientProvider,
  focusManager,
  onlineManager,
} from '@tanstack/react-query';
import { ApiClientProvider } from '../src/api/ApiClientProvider';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60, // 1 minute
      retry: 3,
    },
  },
});

// Wire expo-network to React Query's onlineManager
onlineManager.setEventListener((setOnline) => {
  const sub = Network.addNetworkStateListener((state) => {
    setOnline(!!state.isConnected);
  });
  return () => sub.remove();
});

function useAppStateFocus() {
  useEffect(() => {
    const onChange = (status: AppStateStatus) => {
      if (Platform.OS !== 'web') {
        focusManager.setFocused(status === 'active');
      }
    };
    const sub = AppState.addEventListener('change', onChange);
    return () => sub.remove();
  }, []);
}

export default function RootLayout() {
  useAppStateFocus();

  return (
    <QueryClientProvider client={queryClient}>
      <ApiClientProvider>
        <Stack>
          <Stack.Screen name="index" options={{ title: 'Browse' }} />
          <Stack.Screen name="detail/[id]" options={{ title: 'Detail' }} />
        </Stack>
      </ApiClientProvider>
    </QueryClientProvider>
  );
}
