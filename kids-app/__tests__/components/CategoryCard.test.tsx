import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { CategoryCard } from '../../src/components/CategoryCard';
import type { Category } from '../../src/types/api';

const mockCategory: Category = {
  id: 1,
  name: 'Hewan Darat',
  emoji: '🐘',
  tag_count: 15,
  print_count: 120,
  example_images: [
    { id: 1, url: 'https://example.com/img1', print_count: 50 },
    { id: 2, url: 'https://example.com/img2', print_count: 40 },
    { id: 3, url: 'https://example.com/img3', print_count: 30 },
    { id: 4, url: 'https://example.com/img4', print_count: 20 },
  ],
};

test('renders category name and emoji', () => {
  const { getByText } = render(
    <CategoryCard category={mockCategory} onPress={jest.fn()} />,
  );

  expect(getByText('Hewan Darat')).toBeTruthy();
  expect(getByText('🐘')).toBeTruthy();
});

test('calls onPress when tapped', () => {
  const onPress = jest.fn();
  const { getByText } = render(
    <CategoryCard category={mockCategory} onPress={onPress} />,
  );

  fireEvent.press(getByText('Hewan Darat'));
  expect(onPress).toHaveBeenCalledWith(mockCategory);
});

test('renders up to 4 example images', () => {
  const { UNSAFE_getAllByType } = render(
    <CategoryCard category={mockCategory} onPress={jest.fn()} />,
  );

  const { Image } = require('react-native');
  const images = UNSAFE_getAllByType(Image);
  // Should have 4 images rendered
  expect(images).toHaveLength(4);
});

test('handles category with no example images', () => {
  const emptyCategory: Category = {
    ...mockCategory,
    example_images: [],
  };

  const { UNSAFE_getByType } = render(
    <CategoryCard category={emptyCategory} onPress={jest.fn()} />,
  );

  const { Image } = require('react-native');
  // Should not crash, images array is empty
  expect(() => UNSAFE_getByType(Image)).toThrow();
});

test('handles category with more than 4 example images', () => {
  const manyImages: Category = {
    ...mockCategory,
    example_images: [
      { id: 1, url: 'https://example.com/1', print_count: 10 },
      { id: 2, url: 'https://example.com/2', print_count: 10 },
      { id: 3, url: 'https://example.com/3', print_count: 10 },
      { id: 4, url: 'https://example.com/4', print_count: 10 },
      { id: 5, url: 'https://example.com/5', print_count: 10 },
      { id: 6, url: 'https://example.com/6', print_count: 10 },
    ],
  };

  const { UNSAFE_getAllByType } = render(
    <CategoryCard category={manyImages} onPress={jest.fn()} />,
  );

  const { Image } = require('react-native');
  // Should only render 4 images (slice(0, 4))
  const images = UNSAFE_getAllByType(Image);
  expect(images).toHaveLength(4);
});
