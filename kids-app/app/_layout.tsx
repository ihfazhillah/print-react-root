import { useEffect } from 'react';
import { AppState, Platform, View } from 'react-native';
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
import { ServerConfigProvider } from '../src/context/ServerConfigContext';
import { useDeviceRegistration } from '../src/hooks/useDeviceRegistration';
import { getBaseUrl } from '../src/hooks/useServerConfig';
import { UpdateProvider } from '../src/context/UpdateContext';
import { analytics } from '../src/services/AnalyticsService';
import { UpdateBar } from '../src/components/UpdateBar';
import { colors } from '../src/theme';

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

/** Triggers device auto-registration and initializes analytics. */
function DeviceAutoRegister() {
  const { deviceId } = useDeviceRegistration();
  const { getBaseUrl } = useServerConfig();

  useEffect(() => {
    if (deviceId) {
      analytics.init(deviceId, getBaseUrl());
    }
  }, [deviceId]);

  return null;
}

export default function RootLayout() {
  useAppStateFocus();

  return (
    <ServerConfigProvider>
      <QueryClientProvider client={queryClient}>
        <ApiClientProvider>
          <UpdateProvider>
            <DeviceAutoRegister />
            <View style={{ flex: 1 }}>
              <Stack
                screenOptions={{
                  headerTitle: 'KM Kraft',
                  headerStyle: { backgroundColor: colors.surface },
                  headerTintColor: colors.textPrimary,
                  contentStyle: { backgroundColor: colors.background },
                }}
              />
              <UpdateBar />
            </View>
          </UpdateProvider>
        </ApiClientProvider>
      </QueryClientProvider>
    </ServerConfigProvider>
  );
}
