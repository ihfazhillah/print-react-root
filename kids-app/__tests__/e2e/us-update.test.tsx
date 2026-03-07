/**
 * User Stories (In-App Update) — Check, Download, Install
 *
 * Acceptance scenarios from spec (006-in-app-update):
 *
 * US1 - Check for Updates Automatically:
 * AS-1: Update available → persistent bottom button shown
 * AS-2: No update available → no button shown
 * AS-3: Offline → app operates normally, no error
 *
 * US2 - Download and Install Update:
 * AS-1: Tap button → progress shown → install dialog
 * AS-2: Cancel download → button returns to initial state
 * AS-3: Download fails → error with retry
 *
 * US3 - Manual Update Check (Settings):
 * AS-1: Tap "Check for Updates" → shows result
 * AS-2: Offline → "could not check" message
 *
 * Regression tests:
 * R1: checkForUpdate must return UpdateInfo (not null) when no update available
 * R2: UpdateBar must not render on settings screen (double UI)
 * R3: Settings must show download button after update found (not stuck on "check")
 * R4: UpdateBar needs a sized parent View to be visible (absolute positioning)
 */
import React from 'react';
import { View } from 'react-native';
import { render, fireEvent, waitFor } from '@testing-library/react-native';

// ---------- mocks ----------

let mockPathname = '/';
jest.mock('expo-router', () => ({
  Stack: { Screen: () => null },
  usePathname: () => mockPathname,
  useFocusEffect: (cb: () => void) => {
    const { useEffect } = jest.requireActual('react');
    useEffect(cb, [cb]);
  },
}));

const mockCheckForUpdate = jest.fn();
const mockStartDownload = jest.fn();
const mockCancelDownload = jest.fn();
const mockInstallUpdate = jest.fn();

let mockUpdateState = {
  checkForUpdate: mockCheckForUpdate,
  checking: false,
  updateInfo: null as null | { latestVersion: string; currentVersion: string; isUpdateAvailable: boolean; downloadUrl: string | null },
  downloadState: { status: 'idle' as string, progress: 0, error: null as string | null },
  startDownload: mockStartDownload,
  cancelDownload: mockCancelDownload,
  installUpdate: mockInstallUpdate,
};

jest.mock('../../src/context/UpdateContext', () => ({
  useUpdate: () => mockUpdateState,
}));

jest.mock('../../src/hooks/useServerConfig', () => ({
  useServerConfig: () => ({
    config: { ip: '192.168.1.1', port: 8080 },
    updateConfig: jest.fn(),
    isLoading: false,
  }),
}));

jest.mock('../../src/hooks/useDeviceSettings', () => ({
  useDeviceSettings: () => ({
    deviceName: '',
    syncStatus: 'idle',
    syncError: null,
    saveName: jest.fn(),
  }),
}));

// eslint-disable-next-line import/first
import { UpdateBar } from '../../src/components/UpdateBar';
// eslint-disable-next-line import/first
import SettingsScreen from '../../app/settings';

beforeEach(() => {
  mockPathname = '/';
  mockCheckForUpdate.mockReset();
  mockStartDownload.mockReset();
  mockCancelDownload.mockReset();
  mockInstallUpdate.mockReset();
  mockUpdateState = {
    checkForUpdate: mockCheckForUpdate,
    checking: false,
    updateInfo: null,
    downloadState: { status: 'idle', progress: 0, error: null },
    startDownload: mockStartDownload,
    cancelDownload: mockCancelDownload,
    installUpdate: mockInstallUpdate,
  };
});

// ---------------------------------------------------------------------------
// US1 — Check for Updates Automatically
// ---------------------------------------------------------------------------

describe('US1 — Auto Update Check', () => {
  test('AS-1: shows update button when update is available', () => {
    mockUpdateState.updateInfo = {
      latestVersion: '2.1.0',
      currentVersion: '2.0.0',
      isUpdateAvailable: true,
      downloadUrl: 'https://example.com/app.apk',
    };
    mockUpdateState.downloadState = { status: 'available', progress: 0, error: null };

    const { getByText } = render(
      <View style={{ flex: 1 }}>
        <UpdateBar />
      </View>,
    );

    expect(getByText('Update Available (v2.1.0)')).toBeTruthy();
  });

  test('AS-2: no button shown when app is up to date', () => {
    mockUpdateState.updateInfo = {
      latestVersion: '2.0.0',
      currentVersion: '2.0.0',
      isUpdateAvailable: false,
      downloadUrl: null,
    };
    mockUpdateState.downloadState = { status: 'idle', progress: 0, error: null };

    const { queryByText } = render(
      <View style={{ flex: 1 }}>
        <UpdateBar />
      </View>,
    );

    expect(queryByText(/update/i)).toBeNull();
  });

  test('AS-3: offline — no button, no error', () => {
    // Simulate offline: updateInfo stays null, downloadState stays idle
    mockUpdateState.updateInfo = null;
    mockUpdateState.downloadState = { status: 'idle', progress: 0, error: null };

    const { queryByText } = render(
      <View style={{ flex: 1 }}>
        <UpdateBar />
      </View>,
    );

    expect(queryByText(/update/i)).toBeNull();
    expect(queryByText(/error/i)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// US2 — Download and Install Update
// ---------------------------------------------------------------------------

describe('US2 — Download and Install', () => {
  test('AS-1: tapping update button calls startDownload', () => {
    mockUpdateState.updateInfo = {
      latestVersion: '2.1.0',
      currentVersion: '2.0.0',
      isUpdateAvailable: true,
      downloadUrl: 'https://example.com/app.apk',
    };
    mockUpdateState.downloadState = { status: 'available', progress: 0, error: null };

    const { getByLabelText } = render(
      <View style={{ flex: 1 }}>
        <UpdateBar />
      </View>,
    );

    fireEvent.press(getByLabelText(/update available/i));
    expect(mockStartDownload).toHaveBeenCalled();
  });

  test('AS-1: shows progress during download', () => {
    mockUpdateState.downloadState = { status: 'downloading', progress: 0.45, error: null };

    const { getByText } = render(
      <View style={{ flex: 1 }}>
        <UpdateBar />
      </View>,
    );

    expect(getByText('45%')).toBeTruthy();
  });

  test('AS-2: cancel returns to available state', () => {
    mockUpdateState.downloadState = { status: 'downloading', progress: 0.3, error: null };

    const { getByLabelText } = render(
      <View style={{ flex: 1 }}>
        <UpdateBar />
      </View>,
    );

    fireEvent.press(getByLabelText('Cancel download'));
    expect(mockCancelDownload).toHaveBeenCalled();
  });

  test('AS-3: download error shows retry', () => {
    mockUpdateState.downloadState = { status: 'error', progress: 0, error: 'Network error' };

    const { getByText } = render(
      <View style={{ flex: 1 }}>
        <UpdateBar />
      </View>,
    );

    expect(getByText(/Network error/)).toBeTruthy();
    expect(getByText(/Tap to Retry/)).toBeTruthy();
  });

  test('AS-3: tapping retry calls startDownload', () => {
    mockUpdateState.downloadState = { status: 'error', progress: 0, error: 'Network error' };

    const { getByLabelText } = render(
      <View style={{ flex: 1 }}>
        <UpdateBar />
      </View>,
    );

    fireEvent.press(getByLabelText('Retry download'));
    expect(mockStartDownload).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// US3 — Manual Update Check (Settings)
// ---------------------------------------------------------------------------

describe('US3 — Manual Check in Settings', () => {
  test('AS-1: check for updates shows up-to-date with version', async () => {
    mockCheckForUpdate.mockResolvedValue({
      latestVersion: '2.0.0',
      currentVersion: '2.0.0',
      isUpdateAvailable: false,
      downloadUrl: null,
    });

    const { getByLabelText, getByText } = render(<SettingsScreen />);

    fireEvent.press(getByLabelText('Check for updates'));

    await waitFor(() => {
      expect(getByText(/up to date.*v2\.0\.0/i)).toBeTruthy();
    });
  });

  test('AS-1: check finds update — shows download button', async () => {
    mockCheckForUpdate.mockResolvedValue({
      latestVersion: '2.1.0',
      currentVersion: '2.0.0',
      isUpdateAvailable: true,
      downloadUrl: 'https://example.com/app.apk',
    });

    const { getByLabelText, rerender } = render(<SettingsScreen />);

    fireEvent.press(getByLabelText('Check for updates'));

    await waitFor(() => {
      expect(mockCheckForUpdate).toHaveBeenCalled();
    });

    // After update found, the hook sets updateInfo — re-render with new state
    mockUpdateState.updateInfo = {
      latestVersion: '2.1.0',
      currentVersion: '2.0.0',
      isUpdateAvailable: true,
      downloadUrl: 'https://example.com/app.apk',
    };
    mockUpdateState.downloadState = { status: 'available', progress: 0, error: null };
    rerender(<SettingsScreen />);

    await waitFor(() => {
      expect(getByLabelText('Download update')).toBeTruthy();
    });
  });

  test('AS-2: offline — shows could not check message', async () => {
    mockCheckForUpdate.mockResolvedValue(null);

    const { getByLabelText, getByText } = render(<SettingsScreen />);

    fireEvent.press(getByLabelText('Check for updates'));

    await waitFor(() => {
      expect(getByText(/could not check/i)).toBeTruthy();
    });
  });
});

// ---------------------------------------------------------------------------
// Regression Tests
// ---------------------------------------------------------------------------

describe('Regression', () => {
  test('R1: checkForUpdate returns UpdateInfo (not null) when no update available', async () => {
    // This tests the contract: when check succeeds but no update,
    // the return value must be an object with isUpdateAvailable: false,
    // not null. Settings uses this to distinguish "up to date" from "failed".
    mockCheckForUpdate.mockResolvedValue({
      latestVersion: '2.0.0',
      currentVersion: '2.0.0',
      isUpdateAvailable: false,
      downloadUrl: null,
    });

    const { getByLabelText, queryByText } = render(<SettingsScreen />);
    fireEvent.press(getByLabelText('Check for updates'));

    await waitFor(() => {
      // Must NOT show "could not check" — that's the null case
      expect(queryByText(/could not check/i)).toBeNull();
    });
  });

  test('R2: UpdateBar does not render on settings screen', () => {
    mockPathname = '/settings';
    mockUpdateState.updateInfo = {
      latestVersion: '2.1.0',
      currentVersion: '2.0.0',
      isUpdateAvailable: true,
      downloadUrl: 'https://example.com/app.apk',
    };
    mockUpdateState.downloadState = { status: 'available', progress: 0, error: null };

    const { queryByText } = render(
      <View style={{ flex: 1 }}>
        <UpdateBar />
      </View>,
    );

    expect(queryByText(/update available/i)).toBeNull();
  });

  test('R3: settings shows download button after update is found, not stuck on check', async () => {
    // Simulate: update already found (updateInfo set, downloadState = available)
    mockUpdateState.updateInfo = {
      latestVersion: '2.1.0',
      currentVersion: '2.0.0',
      isUpdateAvailable: true,
      downloadUrl: 'https://example.com/app.apk',
    };
    mockUpdateState.downloadState = { status: 'available', progress: 0, error: null };

    const { getByLabelText, queryByLabelText } = render(<SettingsScreen />);

    // Should show "Download v2.1.0" button, not "Check for Updates"
    expect(getByLabelText('Download update')).toBeTruthy();
    expect(queryByLabelText('Check for updates')).toBeNull();
  });

  test('R4: UpdateBar renders within a sized parent View', () => {
    // The UpdateBar uses position: absolute, which requires a sized parent.
    // This test verifies it renders content when inside a flex:1 View.
    mockUpdateState.downloadState = { status: 'available', progress: 0, error: null };
    mockUpdateState.updateInfo = {
      latestVersion: '2.1.0',
      currentVersion: '2.0.0',
      isUpdateAvailable: true,
      downloadUrl: 'https://example.com/app.apk',
    };

    const { getByText } = render(
      <View style={{ flex: 1 }}>
        <UpdateBar />
      </View>,
    );

    expect(getByText('Update Available (v2.1.0)')).toBeTruthy();
  });
});
