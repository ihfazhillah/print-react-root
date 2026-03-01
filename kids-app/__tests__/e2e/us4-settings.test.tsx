/**
 * User Story 4 — Configure Server Endpoint
 *
 * Tests the acceptance scenarios from the spec:
 * 1. Gear icon on home screen opens settings
 * 2. Settings allows entering IP and port, saves endpoint
 * 3. Empty port defaults to 80
 * 4. Settings persist (tested via useServerConfig hook test)
 * 5. Invalid IP shows validation error
 *
 * Regression tests:
 * - T004: Settings inputs show saved config after async load (not stale defaults)
 * - T008: Image list refetches when server endpoint changes
 */
import React from 'react';
import { Text } from 'react-native';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ApiClientContext } from '../../src/api/apiClientContext';
import { useItems } from '../../src/hooks/useItems';
import { createMockClient, fakePrintItems } from '../helpers/renderWithProviders';

jest.mock('expo-router', () => ({
  Stack: { Screen: () => null },
  // Simulate useFocusEffect: re-run the callback whenever it changes (deps = [cb])
  useFocusEffect: (cb: () => void) => {
    const { useEffect } = jest.requireActual('react');

    useEffect(cb, [cb]);
  },
}));

const mockUpdateConfig = jest.fn().mockResolvedValue(undefined);
const mockUseServerConfig = jest.fn();

jest.mock('../../src/hooks/useServerConfig', () => ({
  useServerConfig: (...args: unknown[]) => mockUseServerConfig(...args),
}));

// Mock useDeviceSettings so deviceStorage/AsyncStorage are not loaded.
// Return empty deviceName so the useEffect inside settings.tsx doesn't
// trigger an extra re-render (which would burn through mockReturnValueOnce).
jest.mock('../../src/hooks/useDeviceSettings', () => ({
  useDeviceSettings: jest.fn(() => ({
    deviceName: '',
    syncStatus: 'idle',
    syncError: null,
    saveName: jest.fn(),
  })),
}));

// eslint-disable-next-line import/first
import SettingsScreen from '../../app/settings';

beforeEach(() => {
  mockUpdateConfig.mockClear();
  mockUseServerConfig.mockReset();
  mockUseServerConfig.mockReturnValue({
    config: { ip: '192.168.68.254', port: 8080 },
    updateConfig: mockUpdateConfig,
    isLoading: false,
  });
});

test('AS-2: user can enter IP and port and save', async () => {
  const { getByDisplayValue, getByText } = render(<SettingsScreen />);

  // Fields show current values
  expect(getByDisplayValue('192.168.68.254')).toBeTruthy();
  expect(getByDisplayValue('8080')).toBeTruthy();

  // Change IP
  fireEvent.changeText(getByDisplayValue('192.168.68.254'), '10.0.0.1');
  // Change port
  fireEvent.changeText(getByDisplayValue('8080'), '3000');

  // Save
  fireEvent.press(getByText('Save'));

  await waitFor(() => {
    expect(mockUpdateConfig).toHaveBeenCalledWith({ ip: '10.0.0.1', port: 3000 });
  });

  // Success feedback shown
  expect(getByText('Settings saved!')).toBeTruthy();
});

test('AS-3: empty port defaults to 80', async () => {
  const { getByDisplayValue, getByText } = render(<SettingsScreen />);

  // Clear the port field
  fireEvent.changeText(getByDisplayValue('8080'), '');

  fireEvent.press(getByText('Save'));

  await waitFor(() => {
    expect(mockUpdateConfig).toHaveBeenCalledWith({ ip: '192.168.68.254', port: 80 });
  });
});

test('AS-5: invalid IP shows validation message and does not save', () => {
  const { getByDisplayValue, getByText } = render(<SettingsScreen />);

  // Enter invalid IP
  fireEvent.changeText(getByDisplayValue('192.168.68.254'), 'abc.def.ghi.jkl');
  fireEvent.press(getByText('Save'));

  // Validation error shown
  expect(getByText('Please enter a valid IP address (e.g., 192.168.1.100)')).toBeTruthy();
  // Config not saved
  expect(mockUpdateConfig).not.toHaveBeenCalled();
});

test('AS-5: IP with octets > 255 shows validation error', () => {
  const { getByDisplayValue, getByText } = render(<SettingsScreen />);

  fireEvent.changeText(getByDisplayValue('192.168.68.254'), '192.168.300.1');
  fireEvent.press(getByText('Save'));

  expect(getByText('Please enter a valid IP address (e.g., 192.168.1.100)')).toBeTruthy();
  expect(mockUpdateConfig).not.toHaveBeenCalled();
});

// ---------------------------------------------------------------------------
// T004: Regression — settings persistence bug
// Bug: When useServerConfig starts with isLoading=true (defaults) and then
// loads saved config, the ip/port form fields are stuck on default values
// because useState() initializer only runs on the first render.
// Fix: useFocusEffect syncs inputs whenever config or loading state changes.
// ---------------------------------------------------------------------------
test('REGRESSION T004: inputs show saved config after async load, not stale defaults', async () => {
  // First render: loading state (hook returns defaults + isLoading=true)
  mockUseServerConfig
    .mockReturnValueOnce({
      config: { ip: '192.168.68.254', port: 8080 }, // defaults (not the saved config)
      updateConfig: mockUpdateConfig,
      isLoading: true,
    })
    // Subsequent renders: config loaded with saved values (different from defaults)
    .mockReturnValue({
      config: { ip: '10.10.10.1', port: 9090 },
      updateConfig: mockUpdateConfig,
      isLoading: false,
    });

  const { rerender, queryByDisplayValue, getByDisplayValue } = render(<SettingsScreen />);

  // While loading: screen renders null (isLoading guard)
  expect(queryByDisplayValue('192.168.68.254')).toBeNull();
  expect(queryByDisplayValue('10.10.10.1')).toBeNull();

  // Re-render (simulates React state update when loading completes)
  rerender(<SettingsScreen />);

  // After load: inputs MUST show saved config, not stale defaults
  await waitFor(() => {
    expect(getByDisplayValue('10.10.10.1')).toBeTruthy();
    expect(getByDisplayValue('9090')).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// T008: Regression — list endpoint caching bug
// Bug: useItems uses queryKey: ['items'] without server URL, so React Query
// returns stale cached data when the endpoint changes.
// After fix: switching ApiClient (new baseUrl) triggers a fresh fetch.
// ---------------------------------------------------------------------------
function ItemListLength() {
  const { data } = useItems();
  const count = data?.pages[0]?.length;
  return <Text>{count != null ? String(count) : 'loading'}</Text>;
}

test('REGRESSION T008: image list refetches from new endpoint after config change', async () => {
  const oldItems = fakePrintItems(2);
  const newItems = fakePrintItems(5);

  const oldClient = createMockClient({
    baseUrl: 'http://192.168.68.254:8080',
    getItems: jest.fn().mockResolvedValue(oldItems),
  });
  const newClient = createMockClient({
    baseUrl: 'http://10.10.10.1:9090',
    getItems: jest.fn().mockResolvedValue(newItems),
  });

  // Single shared QueryClient (same as the app uses)
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  const { getByText, rerender } = render(
    <QueryClientProvider client={queryClient}>
      <ApiClientContext.Provider value={oldClient}>
        <ItemListLength />
      </ApiClientContext.Provider>
    </QueryClientProvider>,
  );

  // Initial load from old endpoint
  await waitFor(() => expect(getByText('2')).toBeTruthy());
  expect(oldClient.getItems).toHaveBeenCalledTimes(1);

  // Simulate endpoint change: switch to new client with different baseUrl
  rerender(
    <QueryClientProvider client={queryClient}>
      <ApiClientContext.Provider value={newClient}>
        <ItemListLength />
      </ApiClientContext.Provider>
    </QueryClientProvider>,
  );

  // After fix: new queryKey (['items', 'http://10.10.10.1:9090']) triggers fresh fetch
  // Without fix (queryKey: ['items']): stale cache returns 2 items
  await waitFor(() => expect(getByText('5')).toBeTruthy());
  expect(newClient.getItems).toHaveBeenCalled();
});
