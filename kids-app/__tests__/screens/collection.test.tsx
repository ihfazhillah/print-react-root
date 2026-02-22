import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { ApiClientContext } from '../../src/api/apiClientContext';
import { createMockClient, fakePrintItems } from '../helpers/renderWithProviders';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { CollectionItem, Item } from '../../src/types/api';

// Mock expo-router
const mockPush = jest.fn();
const mockCollectionItem: CollectionItem = {
  thumbnail: 'https://example.com/collection-thumb.webp',
  url: 'https://example.com/collection0',
  searches: [{ link: '', text: 'craft-coloring' }],
  type: 'collection',
  prints: fakePrintItems(3) as CollectionItem['prints'],
};

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({
    id: '5',
    item: JSON.stringify(mockCollectionItem),
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
import CollectionScreen from '../../app/collection/[id]';

function renderCollection(client = createMockClient()) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <ApiClientContext.Provider value={client}>
        <CollectionScreen />
      </ApiClientContext.Provider>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  mockPush.mockClear();
});

test('renders Detail and Related section headings', () => {
  const { getByText } = renderCollection();
  expect(getByText('Detail')).toBeTruthy();
  expect(getByText('Related')).toBeTruthy();
});

test('renders collection prints in Detail section', () => {
  const { getAllByTestId } = renderCollection();
  // 3 collection prints rendered as ImageCards
  const images = getAllByTestId('expo-image');
  expect(images.length).toBeGreaterThanOrEqual(3);
});

test('shows related items from tag search when loaded', async () => {
  // Related items returned by search (different from collection's own prints)
  const searchResults: Item[] = [
    ...fakePrintItems(2),
    // Include the collection itself — should be filtered out
    mockCollectionItem,
  ];
  const client = createMockClient({
    search: jest.fn().mockResolvedValue(searchResults),
  });

  const { getAllByTestId } = renderCollection(client);
  // 3 collection prints + 2 related (collection itself filtered out) = 5
  await waitFor(() => {
    expect(getAllByTestId('expo-image').length).toBe(5);
  });
  expect(client.search).toHaveBeenCalledWith('craft-coloring', 0, 30);
});

test('shows empty state when no related items', async () => {
  const client = createMockClient({
    search: jest.fn().mockResolvedValue([mockCollectionItem]),
  });

  const { findByText } = renderCollection(client);
  // Only the collection itself is returned, which gets filtered out
  expect(await findByText('No related images')).toBeTruthy();
});

test('navigates to detail screen when tapping a print image', () => {
  const { getAllByRole } = renderCollection();
  const buttons = getAllByRole('button');
  // Tap the first image card (a print item)
  fireEvent.press(buttons[0]);
  expect(mockPush).toHaveBeenCalledWith({
    pathname: '/detail/[id]',
    params: expect.objectContaining({ id: '5' }),
  });
});
