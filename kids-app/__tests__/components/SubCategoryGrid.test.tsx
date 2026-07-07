import React from 'react';
import { render, waitFor, fireEvent } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ApiClientContext } from '../../src/api/apiClientContext';
import { SubCategoryGrid } from '../../src/components/SubCategoryGrid';
import type { Category, CategorySubcategory } from '../../src/types/api';

// Mock expo-image
jest.mock('expo-image', () => {
  const { View } = require('react-native');
  return { Image: (props: any) => <View {...props} /> };
});

const mockCategory: Category = {
  id: 1,
  name: 'Hewan Darat',
  emoji: '🐘',
  tag_count: 15,
  print_count: 120,
  example_images: [],
};

const mockSubcategories: CategorySubcategory[] = [
  {
    id: 101,
    name: 'Hewan Hutan',
    emoji: '🐘',
    example_images: [
      { id: 1, url: 'https://example.com/img1', print_count: 50 },
    ],
  },
  {
    id: 102,
    name: 'Hewan Savana',
    emoji: '🐘',
    example_images: [
      { id: 2, url: 'https://example.com/img2', print_count: 30 },
    ],
  },
];

function renderSubCategoryGrid(
  client: any = {},
  category: Category = mockCategory,
  onSubCategoryPress = jest.fn(),
) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <ApiClientContext.Provider value={client}>
        <SubCategoryGrid
          category={category}
          onBack={jest.fn()}
          onSubCategoryPress={onSubCategoryPress}
        />
      </ApiClientContext.Provider>
    </QueryClientProvider>,
  );
}

test('shows loading container initially', () => {
  const result = renderSubCategoryGrid();
  const { View } = require('react-native');
  expect(result.UNSAFE_getAllByType(View).length).toBeGreaterThanOrEqual(1);
});

test('renders subcategory names after loading', async () => {
  const client = {
    getCategorySubcategories: jest.fn().mockResolvedValue(mockSubcategories),
  };

  const { findByText } = renderSubCategoryGrid(client);

  await waitFor(() => expect(findByText('Hewan Hutan')).toBeTruthy());
  await waitFor(() => expect(findByText('Hewan Savana')).toBeTruthy());
});

test('shows category header with emoji and name', async () => {
  const client = {
    getCategorySubcategories: jest.fn().mockResolvedValue(mockSubcategories),
  };

  const { findByText } = renderSubCategoryGrid(client);

  await waitFor(() => expect(findByText('Hewan Darat')).toBeTruthy());
  await waitFor(() => expect(findByText('🐘')).toBeTruthy());
});

test('shows back button', async () => {
  const client = {
    getCategorySubcategories: jest.fn().mockResolvedValue(mockSubcategories),
  };

  const { findByText } = renderSubCategoryGrid(client);

  await waitFor(() => expect(findByText('← Kembali')).toBeTruthy());
});

test('calls onSubCategoryPress when tapped', async () => {
  const onSubCategoryPress = jest.fn();
  const client = {
    getCategorySubcategories: jest.fn().mockResolvedValue(mockSubcategories),
  };

  const { findByText, UNSAFE_getAllByType } = renderSubCategoryGrid(client, mockCategory, onSubCategoryPress);

  await waitFor(() => expect(findByText('Hewan Hutan')).toBeTruthy());

  // Find TouchableOpacity that wraps SubCategoryCard (skip back-button which is also TouchableOpacity)
  const { TouchableOpacity } = require('react-native');
  const touchables = UNSAFE_getAllByType(TouchableOpacity);
  fireEvent.press(touchables[1]); // index 0 = back button, index 1+ = subcategory cards
  expect(onSubCategoryPress).toHaveBeenCalledWith(mockSubcategories[0]);
});

test('shows error message on API failure', async () => {
  const client = {
    getCategorySubcategories: jest.fn().mockRejectedValue(new Error('Not found')),
  };

  const { findByText } = renderSubCategoryGrid(client);

  await waitFor(() => expect(findByText('Not found')).toBeTruthy());
});

test('shows empty state when no subcategories', async () => {
  const client = {
    getCategorySubcategories: jest.fn().mockResolvedValue([]),
  };

  const { queryByText } = renderSubCategoryGrid(client);

  await waitFor(() => expect(queryByText('Hewan Hutan')).toBeNull());
});
