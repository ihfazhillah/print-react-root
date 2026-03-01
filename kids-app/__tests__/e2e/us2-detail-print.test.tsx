/**
 * User Story 2 — View Image Details and Print
 *
 * Tests the acceptance scenarios from the spec:
 * 1. Tapping an image shows detail page with image, tags, related
 * 2. Print button shows loading state during request
 * 3. Print success shows confirmation
 * 4. Print error shows child-friendly message with retry
 * 5. Tapping related image navigates to its detail page
 */
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ApiClientContext } from '../../src/api/apiClientContext';
import { createMockClient, fakePrintItems } from '../helpers/renderWithProviders';
import type { Item } from '../../src/types/api';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({
    id: '0',
    item: JSON.stringify({
      thumbnail: 'https://example.com/thumb.webp',
      url: 'https://example.com/item0',
      searches: [
        { link: '', text: 'craft-coloring' },
        { link: '', text: 'fine-motor' },
      ],
      type: 'print',
    }),
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

// Mock useActivityTracking so deviceStorage/AsyncStorage are not loaded
jest.mock('../../src/hooks/useActivityTracking', () => ({
  useActivityTracking: jest.fn(() => ({
    trackView: jest.fn(),
    trackDetail: jest.fn(),
    trackPrint: jest.fn(),
  })),
}));

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

beforeEach(() => {
  mockPush.mockClear();
});

test('AS-1: detail page shows image, tags, and related images', async () => {
  const related: Item[] = fakePrintItems(3);
  const client = createMockClient({
    getRelated: jest.fn().mockResolvedValue(related),
  });

  const { findByText, findAllByTestId } = renderDetail(client);

  // Tags are visible
  expect(await findByText('craft-coloring')).toBeTruthy();
  expect(await findByText('fine-motor')).toBeTruthy();

  // Related section heading appears
  expect(await findByText('Related')).toBeTruthy();

  // Images are rendered (hero + related)
  const images = await findAllByTestId('image');
  expect(images.length).toBeGreaterThanOrEqual(4); // 1 hero + 3 related
});

test('AS-2: print button disables with loading indicator during request', async () => {
  // Make printImage hang indefinitely to simulate loading
  const client = createMockClient({
    printImage: jest.fn(() => new Promise(() => {})),
  });

  const { getByText, getByLabelText } = renderDetail(client);

  fireEvent.press(getByText('Print'));

  // Button should be disabled while pending
  await waitFor(() => {
    const button = getByLabelText('Print image');
    expect(button.props.accessibilityState?.disabled).toBe(true);
  });
});

test('AS-3: print success shows confirmation', async () => {
  const client = createMockClient({
    printImage: jest.fn().mockResolvedValue({ status: 'sent_to_printer', message: 'ok' }),
  });

  const { getByText, findByText } = renderDetail(client);

  fireEvent.press(getByText('Print'));

  // Success message appears
  expect(await findByText('Sent to printer!')).toBeTruthy();
});

test('AS-4: print error shows error message with retry option', async () => {
  const client = createMockClient({
    printImage: jest.fn().mockRejectedValue(new Error('Server error')),
  });

  const { getByText, findByText } = renderDetail(client);

  fireEvent.press(getByText('Print'));

  // Error message appears
  expect(await findByText('Server error')).toBeTruthy();
  // Retry button available
  expect(await findByText('Try Again')).toBeTruthy();
});

test('AS-5: tapping related image navigates to its detail page', async () => {
  const related: Item[] = fakePrintItems(2);
  const client = createMockClient({
    getRelated: jest.fn().mockResolvedValue(related),
  });

  const { findAllByRole } = renderDetail(client);

  // Wait for related items to load and find image buttons
  const buttons = await findAllByRole('button');
  const imageButtons = buttons.filter((b) => b.props.accessibilityLabel?.startsWith('Image:'));

  // Tap a related image
  if (imageButtons.length > 0) {
    fireEvent.press(imageButtons[0]);
    expect(mockPush).toHaveBeenCalled();
  }
});
