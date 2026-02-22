/**
 * User Story 4 — Configure Server Endpoint
 *
 * Tests the acceptance scenarios from the spec:
 * 1. Gear icon on home screen opens settings
 * 2. Settings allows entering IP and port, saves endpoint
 * 3. Empty port defaults to 80
 * 4. Settings persist (tested via useServerConfig hook test)
 * 5. Invalid IP shows validation error
 */
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';

jest.mock('expo-router', () => ({
  Stack: { Screen: () => null },
}));

const mockUpdateConfig = jest.fn().mockResolvedValue(undefined);
jest.mock('../../src/hooks/useServerConfig', () => ({
  useServerConfig: () => ({
    config: { ip: '192.168.68.254', port: 8080 },
    updateConfig: mockUpdateConfig,
    isLoading: false,
  }),
}));

// eslint-disable-next-line import/first
import SettingsScreen from '../../app/settings';

beforeEach(() => {
  mockUpdateConfig.mockClear();
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
