import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';

// Mock expo-router
jest.mock('expo-router', () => ({
  Stack: { Screen: () => null },
  useFocusEffect: (cb: () => void) => {
    const { useEffect } = jest.requireActual('react');

    useEffect(cb, [cb]);
  },
}));

// Mock useUpdate
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

// Mock useServerConfig
const mockUpdateConfig = jest.fn().mockResolvedValue(undefined);
jest.mock('../../src/hooks/useServerConfig', () => ({
  useServerConfig: () => ({
    config: { ip: '192.168.68.254', port: 8080 },
    updateConfig: mockUpdateConfig,
    isLoading: false,
  }),
}));

// Mock useDeviceSettings so deviceStorage/AsyncStorage are not loaded
jest.mock('../../src/hooks/useDeviceSettings', () => ({
  useDeviceSettings: jest.fn(() => ({
    deviceName: 'Test Device',
    syncStatus: 'idle',
    syncError: null,
    saveName: jest.fn(),
  })),
}));

// Must import after jest.mock calls
// eslint-disable-next-line import/first
import SettingsScreen from '../../app/settings';

beforeEach(() => {
  mockUpdateConfig.mockClear();
});

test('renders IP and port input fields with current values', () => {
  const { getByDisplayValue } = render(<SettingsScreen />);
  expect(getByDisplayValue('192.168.68.254')).toBeTruthy();
  expect(getByDisplayValue('8080')).toBeTruthy();
});

test('renders Save button', () => {
  const { getByText } = render(<SettingsScreen />);
  expect(getByText('Save')).toBeTruthy();
});

test('saves valid IP and port', async () => {
  const { getByText } = render(<SettingsScreen />);

  fireEvent.press(getByText('Save'));

  await waitFor(() => {
    expect(mockUpdateConfig).toHaveBeenCalledWith({ ip: '192.168.68.254', port: 8080 });
  });
});

test('shows validation error for invalid IP', () => {
  const { getByDisplayValue, getByText } = render(<SettingsScreen />);

  fireEvent.changeText(getByDisplayValue('192.168.68.254'), '999.999.999.999');
  fireEvent.press(getByText('Save'));

  expect(getByText('Please enter a valid IP address (e.g., 192.168.1.100)')).toBeTruthy();
  expect(mockUpdateConfig).not.toHaveBeenCalled();
});

test('shows validation error for non-IP text', () => {
  const { getByDisplayValue, getByText } = render(<SettingsScreen />);

  fireEvent.changeText(getByDisplayValue('192.168.68.254'), 'not-an-ip');
  fireEvent.press(getByText('Save'));

  expect(getByText('Please enter a valid IP address (e.g., 192.168.1.100)')).toBeTruthy();
  expect(mockUpdateConfig).not.toHaveBeenCalled();
});

test('uses default port 80 when port field is empty', async () => {
  const { getByDisplayValue, getByText } = render(<SettingsScreen />);

  fireEvent.changeText(getByDisplayValue('8080'), '');
  fireEvent.press(getByText('Save'));

  await waitFor(() => {
    expect(mockUpdateConfig).toHaveBeenCalledWith({ ip: '192.168.68.254', port: 80 });
  });
});

test('shows success message after saving', async () => {
  const { getByText, findByText } = render(<SettingsScreen />);

  fireEvent.press(getByText('Save'));

  expect(await findByText('Settings saved!')).toBeTruthy();
});
