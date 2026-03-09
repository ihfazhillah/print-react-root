/**
 * User Story 3 (Activity Tracking) — View, detail, and print events
 *
 * Acceptance scenarios from spec:
 * AS-1: View event sent when image list is displayed
 * AS-2: Detail event sent when image detail page is opened
 * AS-3: Print event sent when print button is tapped
 * AS-4: Tracking failures are fire-and-forget (don't affect UX)
 * AS-5: Correct device token used when sending events
 */
import React from 'react';
import { render, waitFor, fireEvent, act } from '@testing-library/react-native';

// --- Mock deviceStorage ---
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

// --- Mock device API client ---
jest.mock('../../src/api/devices', () => ({
  createDeviceApiClient: jest.fn(() => ({
    register: jest.fn(),
    updateName: jest.fn(),
    recordEvent: jest.fn(),
  })),
}));

// --- Mock useServerConfig ---
jest.mock('../../src/hooks/useServerConfig', () => ({
  useServerConfig: jest.fn(() => ({
    config: { ip: '192.168.1.1', port: 8080 },
    updateConfig: jest.fn(),
    isLoading: false,
  })),
  getBaseUrl: jest.fn(() => 'http://192.168.1.1:8080'),
}));

// eslint-disable-next-line import/first
import { deviceStorage } from '../../src/storage/deviceStorage';
// eslint-disable-next-line import/first
import { createDeviceApiClient } from '../../src/api/devices';
// eslint-disable-next-line import/first
import { useActivityTracking } from '../../src/hooks/useActivityTracking';

const mockDeviceStorage = deviceStorage as jest.Mocked<typeof deviceStorage>;
const mockCreateClient = createDeviceApiClient as jest.MockedFunction<typeof createDeviceApiClient>;

/** Minimal test component for useActivityTracking */
function TrackingTester({
  onReady,
}: {
  onReady: (hooks: ReturnType<typeof useActivityTracking>) => void;
}) {
  const hooks = useActivityTracking();
  React.useEffect(() => {
    onReady(hooks);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}

let mockRecordEvent: jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();

  mockDeviceStorage.getDeviceId.mockResolvedValue('device-uuid');
  mockDeviceStorage.getToken.mockResolvedValue('device-token');

  mockRecordEvent = jest.fn().mockResolvedValue({ event_id: 'evt-1', status: 'recorded' });
  mockCreateClient.mockReturnValue({
    register: jest.fn(),
    updateName: jest.fn(),
    recordEvent: mockRecordEvent,
    getRecommendations: jest.fn().mockResolvedValue([]),
    linkAndroidId: jest.fn().mockResolvedValue({ status: 'ok' }),
  } as ReturnType<typeof createDeviceApiClient>);
});

// AS-5: Correct device token is passed
test('AS-5: recordEvent is called with correct device token', async () => {
  let hooks!: ReturnType<typeof useActivityTracking>;
  render(
    <TrackingTester
      onReady={(h) => {
        hooks = h;
      }}
    />,
  );

  await act(async () => {
    await hooks.trackView();
  });

  expect(mockRecordEvent).toHaveBeenCalledWith(
    'device-uuid',
    'device-token',
    expect.objectContaining({ event_type: 'view' }),
  );
});

// AS-1: View event uses correct event_type
test('AS-1: trackView sends event_type "view"', async () => {
  let hooks!: ReturnType<typeof useActivityTracking>;
  render(
    <TrackingTester
      onReady={(h) => {
        hooks = h;
      }}
    />,
  );

  await act(async () => {
    await hooks.trackView('img-1');
  });

  expect(mockRecordEvent).toHaveBeenCalledWith(
    'device-uuid',
    'device-token',
    expect.objectContaining({ event_type: 'view', image_id: 'img-1' }),
  );
});

// AS-2: Detail event uses correct event_type
test('AS-2: trackDetail sends event_type "detail"', async () => {
  let hooks!: ReturnType<typeof useActivityTracking>;
  render(
    <TrackingTester
      onReady={(h) => {
        hooks = h;
      }}
    />,
  );

  await act(async () => {
    await hooks.trackDetail('img-2');
  });

  expect(mockRecordEvent).toHaveBeenCalledWith(
    'device-uuid',
    'device-token',
    expect.objectContaining({ event_type: 'detail', image_id: 'img-2' }),
  );
});

// AS-3: Print event uses correct event_type
test('AS-3: trackPrint sends event_type "print"', async () => {
  let hooks!: ReturnType<typeof useActivityTracking>;
  render(
    <TrackingTester
      onReady={(h) => {
        hooks = h;
      }}
    />,
  );

  await act(async () => {
    await hooks.trackPrint('img-3');
  });

  expect(mockRecordEvent).toHaveBeenCalledWith(
    'device-uuid',
    'device-token',
    expect.objectContaining({ event_type: 'print', image_id: 'img-3' }),
  );
});

// AS-4: Fire-and-forget — tracking error does NOT throw
test('AS-4: tracking error is swallowed and does not throw', async () => {
  mockRecordEvent.mockRejectedValue(new Error('Network failure'));

  let hooks!: ReturnType<typeof useActivityTracking>;
  render(
    <TrackingTester
      onReady={(h) => {
        hooks = h;
      }}
    />,
  );

  await expect(
    act(async () => {
      await hooks.trackView();
    }),
  ).resolves.toBeUndefined();
});

// Skips sending if not registered
test('skips sending event if device not registered', async () => {
  mockDeviceStorage.getDeviceId.mockResolvedValue(null);
  mockDeviceStorage.getToken.mockResolvedValue(null);

  let hooks!: ReturnType<typeof useActivityTracking>;
  render(
    <TrackingTester
      onReady={(h) => {
        hooks = h;
      }}
    />,
  );

  await act(async () => {
    await hooks.trackView();
  });

  expect(mockRecordEvent).not.toHaveBeenCalled();
});
