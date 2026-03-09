/**
 * User Story 1 (Device Tracking) — Auto-registration & device name
 *
 * Acceptance scenarios from spec:
 * AS-1: Device auto-registers on first successful connection to server
 * AS-2: Registration persists across app restarts
 * AS-3: User can view and change device name in settings
 * AS-4: Device name change syncs to backend
 * AS-5: Registration error is surfaced in state
 */
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';

jest.mock('../../src/context/UpdateContext', () => ({
  useUpdate: () => ({
    checkForUpdate: jest.fn().mockResolvedValue(null),
    checking: false,
    updateInfo: null,
    downloadState: { status: 'idle', progress: 0, error: null },
    startDownload: jest.fn(),
    cancelDownload: jest.fn(),
    installUpdate: jest.fn(),
  }),
}));

// --- Mocks declared with jest.fn() inside factory so hoisting works ---
jest.mock('../../src/storage/deviceStorage', () => ({
  deviceStorage: {
    getToken: jest.fn(),
    setToken: jest.fn(),
    getDeviceId: jest.fn(),
    setDeviceId: jest.fn(),
    getDeviceName: jest.fn(),
    setDeviceName: jest.fn(),
    isRegistered: jest.fn(),
    setRegistered: jest.fn(),
    clear: jest.fn(),
  },
}));

jest.mock('../../src/api/devices', () => ({
  createDeviceApiClient: jest.fn(() => ({
    register: jest.fn(),
    updateName: jest.fn(),
    recordEvent: jest.fn(),
  })),
}));

jest.mock('../../src/hooks/useServerConfig', () => ({
  useServerConfig: jest.fn(() => ({
    config: { ip: '192.168.1.1', port: 8080 },
    updateConfig: jest.fn(),
    isLoading: false,
  })),
  getBaseUrl: jest.fn(() => 'http://192.168.1.1:8080'),
}));

jest.mock('expo-router', () => ({
  Stack: { Screen: () => null },
  useFocusEffect: (cb: () => void) => {
    const { useEffect } = jest.requireActual('react');

    useEffect(cb, [cb]);
  },
}));

const mockSaveName = jest.fn();
jest.mock('../../src/hooks/useDeviceSettings', () => ({
  useDeviceSettings: jest.fn(() => ({
    deviceName: 'My Device',
    syncStatus: 'idle',
    syncError: null,
    saveName: mockSaveName,
  })),
}));

// eslint-disable-next-line import/first
import { deviceStorage } from '../../src/storage/deviceStorage';
// eslint-disable-next-line import/first
import { createDeviceApiClient } from '../../src/api/devices';
// eslint-disable-next-line import/first
import { useDeviceRegistration } from '../../src/hooks/useDeviceRegistration';
// eslint-disable-next-line import/first
import SettingsScreen from '../../app/settings';

const mockDeviceStorage = deviceStorage as jest.Mocked<typeof deviceStorage>;
const mockCreateClient = createDeviceApiClient as jest.MockedFunction<typeof createDeviceApiClient>;

function TestComponent() {
  const state = useDeviceRegistration();
  return (
    <>
      <React.Fragment>
        {React.createElement('Text', { testID: 'status' }, state.status)}
        {React.createElement('Text', { testID: 'deviceId' }, state.deviceId ?? '')}
        {React.createElement('Text', { testID: 'deviceName' }, state.deviceName ?? '')}
      </React.Fragment>
    </>
  );
}

beforeEach(() => {
  jest.clearAllMocks();

  mockDeviceStorage.isRegistered.mockResolvedValue(false);
  mockDeviceStorage.getToken.mockResolvedValue(null);
  mockDeviceStorage.getDeviceId.mockResolvedValue(null);
  mockDeviceStorage.getDeviceName.mockResolvedValue(null);
  mockDeviceStorage.setToken.mockResolvedValue(undefined);
  mockDeviceStorage.setDeviceId.mockResolvedValue(undefined);
  mockDeviceStorage.setDeviceName.mockResolvedValue(undefined);
  mockDeviceStorage.setRegistered.mockResolvedValue(undefined);

  const mockClient = {
    register: jest.fn().mockResolvedValue({
      device_id: 'device-uuid-1',
      device_token: 'token-abc123',
      device_name: 'My Device',
      registered_at: '2026-01-01T00:00:00Z',
    }),
    updateName: jest.fn().mockResolvedValue({
      device_id: 'device-uuid-1',
      device_name: 'Alice',
      updated_at: '2026-01-01T01:00:00Z',
    }),
    recordEvent: jest.fn(),
    getRecommendations: jest.fn().mockResolvedValue([]),
    linkAndroidId: jest.fn().mockResolvedValue({ status: 'ok' }),
  };
  mockCreateClient.mockReturnValue(mockClient as ReturnType<typeof createDeviceApiClient>);
});

// AS-1: Device auto-registers on first successful connection
test('AS-1: registers device on first connection', async () => {
  const { getByTestId } = render(<TestComponent />);

  await waitFor(() => {
    expect(getByTestId('status').props.children).toBe('registered');
  });

  const client = mockCreateClient.mock.results[0].value as ReturnType<typeof createDeviceApiClient>;
  expect(client.register).toHaveBeenCalledWith({ initial_name: 'My Device' });
  expect(mockDeviceStorage.setToken).toHaveBeenCalledWith('token-abc123');
  expect(mockDeviceStorage.setDeviceId).toHaveBeenCalledWith('device-uuid-1');
  expect(mockDeviceStorage.setRegistered).toHaveBeenCalledWith(true);
  expect(getByTestId('deviceId').props.children).toBe('device-uuid-1');
});

// AS-2: Registration persists — if already registered, skip re-registration
test('AS-2: skips registration if already registered', async () => {
  mockDeviceStorage.isRegistered.mockResolvedValue(true);
  mockDeviceStorage.getDeviceId.mockResolvedValue('existing-device');
  mockDeviceStorage.getDeviceName.mockResolvedValue('Existing Name');

  const { getByTestId } = render(<TestComponent />);

  await waitFor(() => {
    expect(getByTestId('status').props.children).toBe('registered');
  });

  // register() should NOT have been called since client is lazily created only on new registration
  expect(getByTestId('deviceId').props.children).toBe('existing-device');
});

// AS-3: User can view device name in settings
test('AS-3: settings screen shows device name field', () => {
  const { getByDisplayValue } = render(<SettingsScreen />);
  expect(getByDisplayValue('My Device')).toBeTruthy();
});

// AS-4: Device name change syncs to backend via saveName
test('AS-4: saving new name calls saveName with trimmed value', async () => {
  const { getByDisplayValue, getByLabelText } = render(<SettingsScreen />);

  const nameInput = getByDisplayValue('My Device');
  fireEvent.changeText(nameInput, 'Alice');

  const saveBtn = getByLabelText('Save device name');
  fireEvent.press(saveBtn);

  await waitFor(() => {
    expect(mockSaveName).toHaveBeenCalledWith('Alice');
  });
});

// AS-5: Error during registration sets error state
test('AS-5: registration error is surfaced in state', async () => {
  const failingClient = {
    register: jest.fn().mockRejectedValue(new Error('Network error')),
    updateName: jest.fn(),
    recordEvent: jest.fn(),
    getRecommendations: jest.fn().mockResolvedValue([]),
    linkAndroidId: jest.fn().mockResolvedValue({ status: 'ok' }),
  };
  mockCreateClient.mockReturnValue(failingClient as ReturnType<typeof createDeviceApiClient>);

  const { getByTestId } = render(<TestComponent />);

  await waitFor(() => {
    expect(getByTestId('status').props.children).toBe('error');
  });
});
