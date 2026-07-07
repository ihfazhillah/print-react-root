import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { CategoryItemGrid } from '../../src/components/CategoryItemGrid';
import type { CategoryItem } from '../../src/types/api';

const mockItems: CategoryItem[] = [
  { id: 1, url: 'https://example.com/img1', print_count: 50, tags: ['tag1'] },
  { id: 2, url: 'https://example.com/img2', print_count: 40, tags: ['tag2'] },
  { id: 3, url: 'https://example.com/img3', print_count: 30, tags: ['tag3'] },
];

test('shows loading indicator when isLoading', () => {
  const { UNSAFE_getByType } = render(
    <CategoryItemGrid
      items={[]}
      onEndReached={jest.fn()}
      hasNextPage={false}
      isFetchingNextPage={false}
      isLoading={true}
    />,
  );

  const { ActivityIndicator } = require('react-native');
  expect(UNSAFE_getByType(ActivityIndicator)).toBeTruthy();
});

test('shows empty state when no items and not loading', () => {
  const { getByText } = render(
    <CategoryItemGrid
      items={[]}
      onEndReached={jest.fn()}
      hasNextPage={false}
      isFetchingNextPage={false}
      isLoading={false}
      emptyMessage="No images found"
    />,
  );

  expect(getByText('No images found')).toBeTruthy();
});

test('renders items in grid', () => {
  const { UNSAFE_getAllByType } = render(
    <CategoryItemGrid
      items={mockItems}
      onEndReached={jest.fn()}
      hasNextPage={false}
      isFetchingNextPage={false}
      isLoading={false}
    />,
  );

  const { TouchableOpacity } = require('react-native');
  // Should have 3 TouchableOpacity items
  const buttons = UNSAFE_getAllByType(TouchableOpacity);
  expect(buttons).toHaveLength(3);
});

test('calls onItemPress when item is tapped', () => {
  const onItemPress = jest.fn();
  const { UNSAFE_getAllByType } = render(
    <CategoryItemGrid
      items={mockItems}
      onItemPress={onItemPress}
      onEndReached={jest.fn()}
      hasNextPage={false}
      isFetchingNextPage={false}
      isLoading={false}
    />,
  );

  const { TouchableOpacity } = require('react-native');
  const buttons = UNSAFE_getAllByType(TouchableOpacity);

  fireEvent.press(buttons[0]);
  expect(onItemPress).toHaveBeenCalledWith(mockItems[0]);
});

test('shows error state with retry button', () => {
  const onRetry = jest.fn();
  const { getByText } = render(
    <CategoryItemGrid
      items={[]}
      onEndReached={jest.fn()}
      hasNextPage={false}
      isFetchingNextPage={false}
      isLoading={false}
      isError={true}
      onRetry={onRetry}
    />,
  );

  expect(getByText('Could not load images. Check your connection!')).toBeTruthy();
  expect(getByText('Try Again')).toBeTruthy();
});

test('calls onRetry when retry button is pressed', () => {
  const onRetry = jest.fn();
  const { getByText } = render(
    <CategoryItemGrid
      items={[]}
      onEndReached={jest.fn()}
      hasNextPage={false}
      isFetchingNextPage={false}
      isLoading={false}
      isError={true}
      onRetry={onRetry}
    />,
  );

  fireEvent.press(getByText('Try Again'));
  expect(onRetry).toHaveBeenCalledTimes(1);
});

test('shows footer loader when fetching next page', () => {
  const { UNSAFE_getByType } = render(
    <CategoryItemGrid
      items={mockItems}
      onEndReached={jest.fn()}
      hasNextPage={true}
      isFetchingNextPage={true}
      isLoading={false}
    />,
  );

  const { ActivityIndicator } = require('react-native');
  expect(UNSAFE_getByType(ActivityIndicator)).toBeTruthy();
});

test('does not call onEndReached when no next page', () => {
  const onEndReached = jest.fn();
  const { UNSAFE_getByType } = render(
    <CategoryItemGrid
      items={mockItems}
      onEndReached={onEndReached}
      hasNextPage={false}
      isFetchingNextPage={false}
      isLoading={false}
    />,
  );

  const { FlatList } = require('react-native');
  const flatList = UNSAFE_getByType(FlatList);

  // Simulate scroll to end
  fireEvent(flatList, 'onEndReached');
  expect(onEndReached).not.toHaveBeenCalled();
});

test('calls onEndReached when has next page and not fetching', () => {
  const onEndReached = jest.fn();
  const { UNSAFE_getByType } = render(
    <CategoryItemGrid
      items={mockItems}
      onEndReached={onEndReached}
      hasNextPage={true}
      isFetchingNextPage={false}
      isLoading={false}
    />,
  );

  const { FlatList } = require('react-native');
  const flatList = UNSAFE_getByType(FlatList);

  fireEvent(flatList, 'onEndReached');
  expect(onEndReached).toHaveBeenCalledTimes(1);
});

test('does not call onEndReached when already fetching next page', () => {
  const onEndReached = jest.fn();
  const { UNSAFE_getByType } = render(
    <CategoryItemGrid
      items={mockItems}
      onEndReached={onEndReached}
      hasNextPage={true}
      isFetchingNextPage={true}
      isLoading={false}
    />,
  );

  const { FlatList } = require('react-native');
  const flatList = UNSAFE_getByType(FlatList);

  fireEvent(flatList, 'onEndReached');
  expect(onEndReached).not.toHaveBeenCalled();
});
