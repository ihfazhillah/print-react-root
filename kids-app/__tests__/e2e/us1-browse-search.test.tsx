/**
 * User Story 1 — Browse and Search Images
 *
 * Tests the acceptance scenarios from the spec:
 * 1. Home screen shows search input and image grid
 * 2. Scrolling loads more images (infinite scroll)
 * 3. Typing a search term filters images (search-as-you-type)
 * 4. Clearing search restores full list
 *
 * These tests exercise full screens with providers, verifying
 * user-visible behavior — not internal component structure.
 */
import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ApiClientContext } from '../../src/api/apiClientContext';
import { createMockClient, fakePrintItems } from '../helpers/renderWithProviders';

// Mock navigation — we only care that it's called, not the implementation
const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
  Stack: { Screen: () => null },
}));

jest.mock('expo-status-bar', () => ({
  StatusBar: () => null,
}));

// Mock useActivityTracking so deviceStorage/AsyncStorage are not loaded
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

jest.mock('../../src/hooks/useRecommendations', () => ({
  useRecommendations: () => ({ data: [], isLoading: false }),
}));

// eslint-disable-next-line import/first
import HomeScreen from '../../app/index';

function renderHome(client = createMockClient()) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <ApiClientContext.Provider value={client}>
        <HomeScreen />
      </ApiClientContext.Provider>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  jest.useFakeTimers();
  mockPush.mockClear();
});

afterEach(() => {
  jest.useRealTimers();
});

test('AS-1: home screen shows search input and image thumbnails', async () => {
  const items = fakePrintItems(6);
  const client = createMockClient({
    getItems: jest.fn().mockResolvedValue(items),
  });

  const { getByPlaceholderText, findAllByTestId } = renderHome(client);

  // Search input is visible
  expect(getByPlaceholderText('Search images...')).toBeTruthy();

  // Image thumbnails appear
  const images = await findAllByTestId('image');
  expect(images.length).toBe(6);
});

test('AS-3: typing 2+ chars shows suggestion list, not search results', async () => {
  const allItems = fakePrintItems(6);
  const suggestions = [{ name: 'craft', id_translation: 'Kerajinan' }];

  const client = createMockClient({
    getItems: jest.fn().mockResolvedValue(allItems),
    getSuggestions: jest.fn().mockResolvedValue(suggestions),
  });

  const { getByPlaceholderText, getAllByTestId, queryAllByTestId, findByText } = renderHome(client);

  await waitFor(() => expect(getAllByTestId('image').length).toBe(6));

  fireEvent.changeText(getByPlaceholderText('Search images...'), 'cr');
  act(() => jest.advanceTimersByTime(500));

  // Suggestion list shown, image grid hidden
  await findByText('Kerajinan');
  expect(queryAllByTestId('image')).toHaveLength(0);
  // Search-as-you-type must NOT fire while suggestions are active
  expect(client.search).not.toHaveBeenCalled();
});

test('AS-4: clearing search dismisses suggestions and restores full list', async () => {
  const allItems = fakePrintItems(6);
  const suggestions = [{ name: 'craft', id_translation: 'Kerajinan' }];

  const client = createMockClient({
    getItems: jest.fn().mockResolvedValue(allItems),
    getSuggestions: jest.fn().mockResolvedValue(suggestions),
  });

  const { getByPlaceholderText, getAllByTestId, findByText, queryByText } = renderHome(client);

  await waitFor(() => expect(getAllByTestId('image').length).toBe(6));

  const searchInput = getByPlaceholderText('Search images...');

  // Type to trigger suggestions
  fireEvent.changeText(searchInput, 'cr');
  act(() => jest.advanceTimersByTime(500));
  await findByText('Kerajinan');

  // Clear search
  fireEvent.changeText(searchInput, '');
  act(() => jest.advanceTimersByTime(500));

  // Full list restored, suggestions gone
  await waitFor(() => expect(getAllByTestId('image').length).toBe(6));
  expect(queryByText('Kerajinan')).toBeNull();
});

test('AS-5: tapping an image navigates to detail', async () => {
  const items = fakePrintItems(3);
  const client = createMockClient({
    getItems: jest.fn().mockResolvedValue(items),
  });

  const { findAllByRole } = renderHome(client);

  const buttons = await findAllByRole('button');
  // First button might be the gear icon; find image buttons
  const imageButtons = buttons.filter(
    (b) =>
      b.props.accessibilityLabel?.startsWith('Image:') ||
      b.props.accessibilityLabel?.startsWith('Collection:'),
  );
  expect(imageButtons.length).toBeGreaterThan(0);

  fireEvent.press(imageButtons[0]);
  expect(mockPush).toHaveBeenCalled();
});
