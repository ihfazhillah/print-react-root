import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { ApiClientContext } from '../../src/api/apiClientContext';
import { createMockClient, fakePrintItems } from '../helpers/renderWithProviders';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { Item } from '../../src/types/api';

// Mock expo-router
const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({
    id: '0',
    item: JSON.stringify({
      thumbnail: 'https://example.com/thumb0.webp',
      url: 'https://example.com/item0',
      searches: [{ link: '', text: 'tag-0' }],
      type: 'print',
    }),
  }),
  useRouter: () => ({ push: mockPush }),
  Stack: { Screen: () => null },
}));

// Mock expo-image to a simple View
jest.mock('expo-image', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { View } = require('react-native');
  return {
    Image: (props: Record<string, unknown>) => <View testID="expo-image" {...props} />,
  };
});

// Must import after jest.mock calls
// eslint-disable-next-line import/first
import DetailScreen from '../../app/detail/[id]';

function renderDetail(client = createMockClient()) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <ApiClientContext.Provider value={client}>
        <DetailScreen />
      </ApiClientContext.Provider>
    </QueryClientProvider>,
  );
}

test('renders hero image and tags', () => {
  const { getByTestId, getByText } = renderDetail();
  expect(getByTestId('expo-image')).toBeTruthy();
  expect(getByText('tag-0')).toBeTruthy();
});

test('renders print button', () => {
  const { getByText } = renderDetail();
  expect(getByText('Print')).toBeTruthy();
});

test('calls printImage on print button press', async () => {
  const client = createMockClient();
  const { getByText } = renderDetail(client);

  fireEvent.press(getByText('Print'));

  await waitFor(() => expect(client.printImage).toHaveBeenCalledTimes(1));
});

test('shows related section heading when related items load', async () => {
  const related: Item[] = fakePrintItems(2);
  const client = createMockClient({
    getRelated: jest.fn().mockResolvedValue(related),
  });

  const { findByText } = renderDetail(client);
  expect(await findByText('Related')).toBeTruthy();
});

test('shows empty state when no related items', async () => {
  const client = createMockClient({
    getRelated: jest.fn().mockResolvedValue([]),
  });

  const { findByText } = renderDetail(client);
  expect(await findByText('No related images')).toBeTruthy();
});
