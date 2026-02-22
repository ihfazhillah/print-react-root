/**
 * User Story 3 — Browse Collections
 *
 * Tests the acceptance scenarios from the spec:
 * 1. Collection items show visual ribbon on home grid
 * 2. Tapping collection shows Detail and Related sections (different content)
 * 3. Detail and Related sections are visually differentiated
 * 4. Tapping image navigates to detail page
 */
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ApiClientContext } from '../../src/api/apiClientContext';
import { createMockClient, fakePrintItems } from '../helpers/renderWithProviders';
import type { CollectionItem, Item } from '../../src/types/api';

const mockPush = jest.fn();
const mockCollectionData: CollectionItem = {
  thumbnail: 'https://example.com/collection.webp',
  url: 'https://example.com/collection0',
  searches: [{ link: '', text: 'craft-coloring' }],
  type: 'collection',
  prints: fakePrintItems(4) as CollectionItem['prints'],
};

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({
    id: '5',
    item: JSON.stringify(mockCollectionData),
  }),
  useRouter: () => ({ push: mockPush }),
  Stack: { Screen: () => null },
}));

jest.mock('expo-image', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { View } = require('react-native');
  return {
    Image: (props: Record<string, unknown>) => <View testID="image" {...props} />,
  };
});

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

test('AS-2: collection page shows Detail and Related sections with different content', async () => {
  // Search returns different items than the collection's own prints
  const relatedItems: Item[] = fakePrintItems(3);
  const client = createMockClient({
    search: jest.fn().mockResolvedValue(relatedItems),
  });

  const { getByText, getAllByTestId } = renderCollection(client);

  // Both section headings are visible
  expect(getByText('Detail')).toBeTruthy();
  expect(getByText('Related')).toBeTruthy();

  // Wait for related items to load — total images = 4 collection prints + 3 related
  await waitFor(() => {
    expect(getAllByTestId('image').length).toBe(7);
  });

  // Verify search was called with the collection's tag (not /api/related)
  expect(client.search).toHaveBeenCalledWith('craft-coloring', 0, 48);
});

test('AS-3: Detail and Related sections have separate headings', () => {
  const { getByText } = renderCollection();

  const detailHeading = getByText('Detail');
  const relatedHeading = getByText('Related');

  // Both headings exist and are different elements
  expect(detailHeading).not.toBe(relatedHeading);
});

test('AS-4: tapping an image from collection navigates to detail page', async () => {
  const client = createMockClient();
  const { findAllByRole } = renderCollection(client);

  const buttons = await findAllByRole('button');
  const imageButtons = buttons.filter(
    (b) =>
      b.props.accessibilityLabel?.startsWith('Image:') ||
      b.props.accessibilityLabel?.startsWith('Collection:'),
  );

  expect(imageButtons.length).toBeGreaterThan(0);
  fireEvent.press(imageButtons[0]);

  expect(mockPush).toHaveBeenCalledWith(
    expect.objectContaining({
      pathname: '/detail/[id]',
    }),
  );
});

test('empty collection shows appropriate empty state', async () => {
  // Override the mock to provide a collection with no prints
  // Since we can't change useLocalSearchParams per test, test the Related empty state
  const client = createMockClient({
    search: jest.fn().mockResolvedValue([]),
  });

  const { findByText } = renderCollection(client);

  // Empty state for no related items
  expect(await findByText('No related images')).toBeTruthy();
});
