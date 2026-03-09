/**
 * Feature 011 — Search Autosuggest & Discovery
 *
 * User Story 1 — Autocomplete While Typing
 * AS-1: Typing 2+ chars replaces content area with suggestion list
 * AS-2: Tapping a suggestion runs the search and shows results
 * AS-3: Clearing the input dismisses suggestions and restores normal view
 * AS-6: Manual submit (keyboard search button) runs search and dismisses suggestions
 *
 * User Story 2 — Suggested Terms Discovery
 * AS-1: Focusing the empty search input shows popular tag suggestions
 * AS-2: Tapping a discovery suggestion runs the search
 * AS-5: Blurring the input dismisses discovery suggestions and restores normal view
 */
import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ApiClientContext } from '../../src/api/apiClientContext';
import { createMockClient, fakePrintItems } from '../helpers/renderWithProviders';
import type { Suggestion } from '../../src/types/api';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
  Stack: { Screen: () => null },
}));

jest.mock('expo-status-bar', () => ({
  StatusBar: () => null,
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

jest.mock('../../src/hooks/useRecommendations', () => ({
  useRecommendations: () => ({ data: [], isLoading: false }),
}));

// eslint-disable-next-line import/first
import HomeScreen from '../../app/index';

const autocompleteSuggestions: Suggestion[] = [
  { name: 'cat', id_translation: 'Kucing' },
  { name: 'caterpillar', id_translation: 'Ulat Bulu' },
];

const discoverySuggestions: Suggestion[] = [
  { name: 'unicorn', id_translation: 'Unicorn' },
  { name: 'dragon', id_translation: 'Naga' },
];

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

// ---------------------------------------------------------------------------
// User Story 1 — Autocomplete While Typing
// ---------------------------------------------------------------------------

test('AS-1 (US1): typing 2+ chars replaces content area with suggestion list', async () => {
  const client = createMockClient({
    getItems: jest.fn().mockResolvedValue(fakePrintItems(6)),
    getSuggestions: jest.fn().mockResolvedValue(autocompleteSuggestions),
  });

  const { getByPlaceholderText, getAllByTestId, queryAllByTestId, findByText } = renderHome(client);

  // Wait for initial browse items
  await waitFor(() => expect(getAllByTestId('image').length).toBe(6));

  // Type 2+ chars
  fireEvent.changeText(getByPlaceholderText('Search images...'), 'ca');
  act(() => jest.advanceTimersByTime(500));

  // Suggestions appear; image grid is hidden
  await findByText('Kucing');
  expect(queryAllByTestId('image')).toHaveLength(0);

  // Search must not have fired
  expect(client.search).not.toHaveBeenCalled();
});

test('AS-2 (US1): tapping a suggestion runs search and shows results', async () => {
  const searchResults = fakePrintItems(3);
  const client = createMockClient({
    getItems: jest.fn().mockResolvedValue(fakePrintItems(6)),
    getSuggestions: jest.fn().mockResolvedValue(autocompleteSuggestions),
    search: jest.fn().mockResolvedValue(searchResults),
  });

  const { getByPlaceholderText, getAllByTestId, findByText, getByLabelText } = renderHome(client);

  await waitFor(() => expect(getAllByTestId('image').length).toBe(6));

  fireEvent.changeText(getByPlaceholderText('Search images...'), 'ca');
  act(() => jest.advanceTimersByTime(500));
  await findByText('Kucing');

  // Tap the suggestion
  fireEvent.press(getByLabelText('Kucing'));
  act(() => jest.advanceTimersByTime(500));

  // Search results appear; suggestion list dismissed
  await waitFor(() => expect(getAllByTestId('image').length).toBe(3));
  expect(client.search).toHaveBeenCalledWith('cat', 0, 20);
});

test('AS-3 (US1): clearing input dismisses suggestions and restores browse view', async () => {
  const client = createMockClient({
    getItems: jest.fn().mockResolvedValue(fakePrintItems(6)),
    getSuggestions: jest.fn().mockResolvedValue(autocompleteSuggestions),
  });

  const { getByPlaceholderText, getAllByTestId, findByText, queryByText } = renderHome(client);

  await waitFor(() => expect(getAllByTestId('image').length).toBe(6));

  const input = getByPlaceholderText('Search images...');
  fireEvent.changeText(input, 'ca');
  act(() => jest.advanceTimersByTime(500));
  await findByText('Kucing');

  // Clear input
  fireEvent.changeText(input, '');
  act(() => jest.advanceTimersByTime(500));

  // Browse view restored; suggestions gone
  await waitFor(() => expect(getAllByTestId('image').length).toBe(6));
  expect(queryByText('Kucing')).toBeNull();
});

test('AS-6 (US1): manual submit runs search for typed term and dismisses suggestions', async () => {
  const searchResults = fakePrintItems(2);
  const client = createMockClient({
    getItems: jest.fn().mockResolvedValue(fakePrintItems(6)),
    getSuggestions: jest.fn().mockResolvedValue(autocompleteSuggestions),
    search: jest.fn().mockResolvedValue(searchResults),
  });

  const { getByPlaceholderText, getAllByTestId, findByText, queryByText } = renderHome(client);

  await waitFor(() => expect(getAllByTestId('image').length).toBe(6));

  const input = getByPlaceholderText('Search images...');
  fireEvent.changeText(input, 'ca');
  act(() => jest.advanceTimersByTime(500));
  await findByText('Kucing');

  // Simulate keyboard submit
  fireEvent(input, 'submitEditing');
  act(() => jest.advanceTimersByTime(500));

  // Search runs, suggestions gone
  await waitFor(() => expect(getAllByTestId('image').length).toBe(2));
  expect(client.search).toHaveBeenCalledWith('ca', 0, 20);
  expect(queryByText('Kucing')).toBeNull();
});

// ---------------------------------------------------------------------------
// User Story 2 — Suggested Terms Discovery
// ---------------------------------------------------------------------------

test('AS-1 (US2): focusing empty search input shows popular discovery suggestions', async () => {
  const client = createMockClient({
    getItems: jest.fn().mockResolvedValue(fakePrintItems(6)),
    getDiscoverySuggestions: jest.fn().mockResolvedValue(discoverySuggestions),
  });

  const { getByPlaceholderText, getAllByTestId, queryAllByTestId, findByText } = renderHome(client);

  await waitFor(() => expect(getAllByTestId('image').length).toBe(6));

  // Focus the empty search input
  fireEvent(getByPlaceholderText('Search images...'), 'focus');
  act(() => jest.advanceTimersByTime(500));

  // Discovery suggestions appear; image grid hidden
  await findByText('Unicorn');
  expect(queryAllByTestId('image')).toHaveLength(0);
});

test('AS-2 (US2): tapping a discovery suggestion runs search and shows results', async () => {
  const searchResults = fakePrintItems(4);
  const client = createMockClient({
    getItems: jest.fn().mockResolvedValue(fakePrintItems(6)),
    getDiscoverySuggestions: jest.fn().mockResolvedValue(discoverySuggestions),
    search: jest.fn().mockResolvedValue(searchResults),
  });

  const { getByPlaceholderText, getAllByTestId, findByText, getByLabelText } = renderHome(client);

  await waitFor(() => expect(getAllByTestId('image').length).toBe(6));

  fireEvent(getByPlaceholderText('Search images...'), 'focus');
  act(() => jest.advanceTimersByTime(500));
  await findByText('Unicorn');

  // Tap the discovery suggestion
  fireEvent.press(getByLabelText('Unicorn'));
  act(() => jest.advanceTimersByTime(500));

  // Search results appear
  await waitFor(() => expect(getAllByTestId('image').length).toBe(4));
  expect(client.search).toHaveBeenCalledWith('unicorn', 0, 20);
});

test('AS-5 (US2): blurring input dismisses discovery suggestions and restores normal view', async () => {
  const client = createMockClient({
    getItems: jest.fn().mockResolvedValue(fakePrintItems(6)),
    getDiscoverySuggestions: jest.fn().mockResolvedValue(discoverySuggestions),
  });

  const { getByPlaceholderText, getAllByTestId, findByText, queryByText } = renderHome(client);

  await waitFor(() => expect(getAllByTestId('image').length).toBe(6));

  const input = getByPlaceholderText('Search images...');
  fireEvent(input, 'focus');
  act(() => jest.advanceTimersByTime(500));
  await findByText('Unicorn');

  // Blur input
  fireEvent(input, 'blur');
  act(() => jest.advanceTimersByTime(500));

  // Normal view restored; discovery suggestions gone
  await waitFor(() => expect(getAllByTestId('image').length).toBe(6));
  expect(queryByText('Unicorn')).toBeNull();
});
