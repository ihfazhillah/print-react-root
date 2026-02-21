import React from 'react';
import { render } from '@testing-library/react-native';
import { ImageGrid } from '../../src/components/ImageGrid';
import { ApiClientContext } from '../../src/api/apiClientContext';
import { createMockClient, fakePrintItems } from '../helpers/renderWithProviders';

const mockItems = fakePrintItems(2);
const mockClient = createMockClient();

test('renders image cards for each item', () => {
  const { getAllByRole } = render(
    <ApiClientContext.Provider value={mockClient}>
      <ImageGrid
        items={mockItems}
        onItemPress={jest.fn()}
        onEndReached={jest.fn()}
        hasNextPage={false}
        isFetchingNextPage={false}
        isLoading={false}
      />
    </ApiClientContext.Provider>,
  );

  expect(getAllByRole('button')).toHaveLength(2);
});

test('shows empty state when no items', () => {
  const { getByText } = render(
    <ImageGrid
      items={[]}
      onItemPress={jest.fn()}
      onEndReached={jest.fn()}
      hasNextPage={false}
      isFetchingNextPage={false}
      isLoading={false}
      emptyMessage="No images found"
    />,
  );

  expect(getByText('No images found')).toBeTruthy();
});

test('shows loading indicator when isLoading', () => {
  const { UNSAFE_getByType } = render(
    <ImageGrid
      items={[]}
      onItemPress={jest.fn()}
      onEndReached={jest.fn()}
      hasNextPage={false}
      isFetchingNextPage={false}
      isLoading={true}
    />,
  );

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { ActivityIndicator } = require('react-native');
  expect(UNSAFE_getByType(ActivityIndicator)).toBeTruthy();
});
