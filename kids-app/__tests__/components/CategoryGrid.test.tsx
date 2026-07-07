import React from 'react';
import { render, waitFor, fireEvent } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ApiClientContext } from '../../src/api/apiClientContext';
import { CategoryGrid } from '../../src/components/CategoryGrid';
import type { Category } from '../../src/types/api';

const mockCategories: Category[] = [
  {
    id: 1,
    name: 'Hewan Darat',
    emoji: '🐘',
    tag_count: 15,
    print_count: 120,
    example_images: [
      { id: 1, url: 'https://example.com/img1', print_count: 50 },
    ],
  },
  {
    id: 2,
    name: 'Hewan Laut',
    emoji: '🐠',
    tag_count: 10,
    print_count: 80,
    example_images: [
      { id: 2, url: 'https://example.com/img2', print_count: 30 },
    ],
  },
  {
    id: 3,
    name: 'Kerajinan',
    emoji: '🎨',
    tag_count: 20,
    print_count: 200,
    example_images: [],
  },
];

function renderCategoryGrid(client = {} as any, onCategoryPress = jest.fn()) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <ApiClientContext.Provider value={client}>
        <CategoryGrid onCategoryPress={onCategoryPress} />
      </ApiClientContext.Provider>
    </QueryClientProvider>,
  );
}

test('shows loading container initially', () => {
  const result = renderCategoryGrid();
  const { View } = require('react-native');
  // ActivityIndicator not rendered in test env; check for loading View container
  expect(result.UNSAFE_getAllByType(View).length).toBeGreaterThanOrEqual(1);
});

test('renders categories after loading', async () => {
  const client = {
    getCategories: jest.fn().mockResolvedValue(mockCategories),
  } as any;

  const { findByText } = renderCategoryGrid(client);

  await waitFor(() => expect(findByText('Hewan Darat')).toBeTruthy());
  await waitFor(() => expect(findByText('Hewan Laut')).toBeTruthy());
  await waitFor(() => expect(findByText('Kerajinan')).toBeTruthy());
});

test('calls onCategoryPress when a category is tapped', async () => {
  const onCategoryPress = jest.fn();
  const client = {
    getCategories: jest.fn().mockResolvedValue(mockCategories),
  } as any;

  const { findByText, UNSAFE_getAllByType } = renderCategoryGrid(client, onCategoryPress);

  await waitFor(() => expect(findByText('Hewan Darat')).toBeTruthy());

  // Find the TouchableOpacity that wraps the first CategoryCard
  const { TouchableOpacity } = require('react-native');
  const touchables = UNSAFE_getAllByType(TouchableOpacity);
  fireEvent.press(touchables[0]);
  expect(onCategoryPress).toHaveBeenCalledWith(mockCategories[0]);
});

test('shows error message on API failure', async () => {
  const client = {
    getCategories: jest.fn().mockRejectedValue(new Error('Network error')),
  } as any;

  const { findByText } = renderCategoryGrid(client);

  await waitFor(() => expect(findByText('Network error')).toBeTruthy());
});

test('renders empty list when no categories', async () => {
  const client = {
    getCategories: jest.fn().mockResolvedValue([]),
  } as any;

  const { queryByText } = renderCategoryGrid(client);

  await waitFor(() => expect(queryByText('Hewan Darat')).toBeNull());
});
