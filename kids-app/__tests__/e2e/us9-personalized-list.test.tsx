/**
 * User Stories 1 & 2 (009-personalized-feed) — Personalized Browsing List
 *
 * US1 Acceptance scenarios:
 * AS-1: Device with history gets personalized ordering (device_id sent)
 * AS-2: New device with no history gets default ordering (no device_id)
 * AS-3: Two different devices get different orderings
 *
 * US2 Acceptance scenarios:
 * AS-1: Registered device sends device_id in list request
 * AS-2: Unregistered device omits device_id
 * AS-3: "Kamu mungkin suka" section visible for device with history
 * AS-4: "Kamu mungkin suka" hidden or shows popular for no history
 */
import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ApiClientContext } from '../../src/api/apiClientContext';
import { createMockClient, fakePrintItems } from '../helpers/renderWithProviders';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
  Stack: { Screen: () => null },
}));

jest.mock('expo-status-bar', () => ({
  StatusBar: () => null,
}));

// --- Mock deviceStorage ---
const mockGetDeviceId = jest.fn();
jest.mock('../../src/storage/deviceStorage', () => ({
  deviceStorage: {
    getDeviceId: (...args: unknown[]) => mockGetDeviceId(...args),
    getDeviceToken: jest.fn().mockResolvedValue(null),
    getDeviceName: jest.fn().mockResolvedValue(null),
    saveRegistration: jest.fn().mockResolvedValue(undefined),
    saveDeviceName: jest.fn().mockResolvedValue(undefined),
    getAndroidId: jest.fn().mockResolvedValue(null),
    saveAndroidId: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('../../src/hooks/useActivityTracking', () => ({
  useActivityTracking: jest.fn(() => ({
    trackView: jest.fn(),
    trackDetail: jest.fn(),
    trackPrint: jest.fn(),
  })),
}));

jest.mock('expo-image', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { View } = require('react-native');
  return {
    Image: (props: Record<string, unknown>) => <View testID="image" {...props} />,
  };
});

// Mock useRecommendations
const mockRecommendations = jest.fn();
jest.mock('../../src/hooks/useRecommendations', () => ({
  useRecommendations: () => mockRecommendations(),
}));

// eslint-disable-next-line import/first
import HomeScreen from '../../app/index';

const items = fakePrintItems(10);
const recItems = fakePrintItems(5);

function renderHome(client = createMockClient({ getItems: jest.fn().mockResolvedValue(items) })) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return {
    client,
    ...render(
      <QueryClientProvider client={qc}>
        <ApiClientContext.Provider value={client}>
          <HomeScreen />
        </ApiClientContext.Provider>
      </QueryClientProvider>,
    ),
  };
}

describe('US1 (009) — Personalized Browsing List', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRecommendations.mockReturnValue({ data: [], isLoading: false });
  });

  it('AS-1: sends device_id in getItems when device has history (registered)', async () => {
    mockGetDeviceId.mockResolvedValue('dev-abc');
    const { client } = renderHome();
    await waitFor(() => {
      expect(client.getItems).toHaveBeenCalledWith(
        expect.any(Number),
        expect.any(Number),
        'dev-abc',
      );
    });
  });

  it('AS-2: omits device_id when device is not registered', async () => {
    mockGetDeviceId.mockResolvedValue(null);
    const { client } = renderHome();
    await waitFor(() => {
      expect(client.getItems).toHaveBeenCalledWith(
        expect.any(Number),
        expect.any(Number),
        undefined,
      );
    });
  });

  it('AS-3: different devices would send different device_ids', async () => {
    // First render with device A
    mockGetDeviceId.mockResolvedValue('dev-a');
    const { client: clientA } = renderHome();
    await waitFor(() => {
      expect(clientA.getItems).toHaveBeenCalledWith(
        expect.any(Number),
        expect.any(Number),
        'dev-a',
      );
    });

    // Second render with device B
    jest.clearAllMocks();
    mockGetDeviceId.mockResolvedValue('dev-b');
    const { client: clientB } = renderHome();
    await waitFor(() => {
      expect(clientB.getItems).toHaveBeenCalledWith(
        expect.any(Number),
        expect.any(Number),
        'dev-b',
      );
    });
  });
});

describe('US2 (009) — Mobile Sends Device Identity', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('AS-1: registered device includes device_id in list request', async () => {
    mockGetDeviceId.mockResolvedValue('dev-registered');
    mockRecommendations.mockReturnValue({ data: recItems, isLoading: false });
    const { client } = renderHome();
    await waitFor(() => {
      expect(client.getItems).toHaveBeenCalledWith(
        expect.any(Number),
        expect.any(Number),
        'dev-registered',
      );
    });
  });

  it('AS-2: unregistered device omits device_id', async () => {
    mockGetDeviceId.mockResolvedValue(null);
    mockRecommendations.mockReturnValue({ data: [], isLoading: false });
    const { client } = renderHome();
    await waitFor(() => {
      expect(client.getItems).toHaveBeenCalledWith(
        expect.any(Number),
        expect.any(Number),
        undefined,
      );
    });
  });

  it('AS-3: "Kamu mungkin suka" section visible for device with history', async () => {
    mockGetDeviceId.mockResolvedValue('dev-with-history');
    mockRecommendations.mockReturnValue({ data: recItems, isLoading: false });
    const { getByText } = renderHome();
    await waitFor(() => {
      expect(getByText('Kamu mungkin suka')).toBeTruthy();
    });
  });

  it('AS-4: "Kamu mungkin suka" hidden when no recommendations', async () => {
    mockGetDeviceId.mockResolvedValue(null);
    mockRecommendations.mockReturnValue({ data: [], isLoading: false });
    const { queryByText } = renderHome();
    await waitFor(() => {
      expect(queryByText('Kamu mungkin suka')).toBeNull();
    });
  });
});
