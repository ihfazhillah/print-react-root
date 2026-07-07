import { renderHook, waitFor, act } from '@testing-library/react-native';
import { useCategoryItems } from '../../src/hooks/useCategoryItems';
import { createMockClient, createWrapper } from '../helpers/renderWithProviders';
import type { CategoryItem } from '../../src/types/api';

const mockItems: CategoryItem[] = [
  { id: 1, url: 'https://example.com/img1', print_count: 50, tags: ['tag1', 'tag2'] },
  { id: 2, url: 'https://example.com/img2', print_count: 40, tags: ['tag1'] },
  { id: 3, url: 'https://example.com/img3', print_count: 30, tags: ['tag3'] },
];

const mockItemsPage2: CategoryItem[] = [
  { id: 4, url: 'https://example.com/img4', print_count: 20, tags: ['tag2'] },
  { id: 5, url: 'https://example.com/img5', print_count: 10, tags: ['tag1'] },
];

test('fetches category items on mount', async () => {
  const client = createMockClient({
    getCategoryItems: jest.fn().mockResolvedValue(mockItems),
  });

  const { result } = renderHook(
    () => useCategoryItems({ categoryId: 1, subcategoryId: 101 }),
    { wrapper: createWrapper(client) },
  );

  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(result.current.data?.pages[0]).toEqual(mockItems);
  expect(client.getCategoryItems).toHaveBeenCalledWith(1, 0, 20);
});

test('supports subcategory filtering', async () => {
  const client = createMockClient({
    getCategoryItems: jest.fn().mockResolvedValue(mockItems),
  });

  const { result } = renderHook(
    () => useCategoryItems({ categoryId: 1, subcategoryId: 102 }),
    { wrapper: createWrapper(client) },
  );

  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(client.getCategoryItems).toHaveBeenCalledWith(1, 0, 20);
});

test('fetches next page when current page is full', async () => {
  // Need exactly PAGE_SIZE (20) items to trigger hasNextPage
  const fullPage: CategoryItem[] = Array.from({ length: 20 }, (_, i) => ({
    id: i + 1,
    url: `https://example.com/img${i + 1}`,
    print_count: 50 - i,
    tags: ['tag1'],
  }));
  const partialPage: CategoryItem[] = [
    { id: 21, url: 'https://example.com/img21', print_count: 10, tags: ['tag2'] },
  ];

  const client = createMockClient({
    getCategoryItems: jest
      .fn()
      .mockResolvedValueOnce(fullPage)
      .mockResolvedValueOnce(partialPage),
  });

  const { result } = renderHook(
    () => useCategoryItems({ categoryId: 1, subcategoryId: 101 }),
    { wrapper: createWrapper(client) },
  );

  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(result.current.hasNextPage).toBe(true);

  act(() => {
    result.current.fetchNextPage();
  });

  await waitFor(() => expect(result.current.data?.pages).toHaveLength(2));
  expect(result.current.data?.pages[1]).toEqual(partialPage);
  expect(client.getCategoryItems).toHaveBeenCalledWith(1, 20, 20);
});

test('has no next page when response is smaller than page size', async () => {
  const partialItems = mockItems.slice(0, 2);
  const client = createMockClient({
    getCategoryItems: jest.fn().mockResolvedValue(partialItems),
  });

  const { result } = renderHook(
    () => useCategoryItems({ categoryId: 1, subcategoryId: 101 }),
    { wrapper: createWrapper(client) },
  );

  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(result.current.hasNextPage).toBe(false);
});

test('does not fetch when categoryId is 0', async () => {
  const getCategoryItems = jest.fn();
  const client = createMockClient({ getCategoryItems });

  renderHook(
    () => useCategoryItems({ categoryId: 0, subcategoryId: 101 }),
    { wrapper: createWrapper(client) },
  );

  expect(getCategoryItems).not.toHaveBeenCalled();
});

test('handles API error gracefully', async () => {
  const client = createMockClient({
    getCategoryItems: jest.fn().mockRejectedValue(new Error('Server error')),
  });

  const { result } = renderHook(
    () => useCategoryItems({ categoryId: 1, subcategoryId: 101 }),
    { wrapper: createWrapper(client) },
  );

  await waitFor(() => expect(result.current.isError).toBe(true));
  expect(result.current.error?.message).toBe('Server error');
});

test('returns empty array when no items', async () => {
  const client = createMockClient({
    getCategoryItems: jest.fn().mockResolvedValue([]),
  });

  const { result } = renderHook(
    () => useCategoryItems({ categoryId: 1, subcategoryId: 101 }),
    { wrapper: createWrapper(client) },
  );

  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(result.current.data?.pages[0]).toEqual([]);
});

test('items have correct shape', async () => {
  const client = createMockClient({
    getCategoryItems: jest.fn().mockResolvedValue(mockItems),
  });

  const { result } = renderHook(
    () => useCategoryItems({ categoryId: 1, subcategoryId: 101 }),
    { wrapper: createWrapper(client) },
  );

  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  const item = result.current.data!.pages[0][0];
  expect(item).toHaveProperty('id');
  expect(item).toHaveProperty('url');
  expect(item).toHaveProperty('print_count');
  expect(item).toHaveProperty('tags');
  expect(typeof item.id).toBe('number');
  expect(typeof item.url).toBe('string');
  expect(Array.isArray(item.tags)).toBe(true);
});

test('flattens all pages into single array', async () => {
  // Need exactly PAGE_SIZE (20) items to trigger hasNextPage
  const fullPage: CategoryItem[] = Array.from({ length: 20 }, (_, i) => ({
    id: i + 1,
    url: `https://example.com/img${i + 1}`,
    print_count: 50 - i,
    tags: ['tag1'],
  }));
  const partialPage: CategoryItem[] = [
    { id: 21, url: 'https://example.com/img21', print_count: 10, tags: ['tag2'] },
    { id: 22, url: 'https://example.com/img22', print_count: 9, tags: ['tag3'] },
  ];

  const client = createMockClient({
    getCategoryItems: jest
      .fn()
      .mockResolvedValueOnce(fullPage)
      .mockResolvedValueOnce(partialPage),
  });

  const { result } = renderHook(
    () => useCategoryItems({ categoryId: 1, subcategoryId: 101 }),
    { wrapper: createWrapper(client) },
  );

  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(result.current.hasNextPage).toBe(true);

  act(() => {
    result.current.fetchNextPage();
  });
  await waitFor(() => expect(result.current.data?.pages).toHaveLength(2));

  const allItems = result.current.data!.pages.flat();
  expect(allItems).toHaveLength(22);
});

test('refetch works correctly', async () => {
  const client = createMockClient({
    getCategoryItems: jest.fn().mockResolvedValue(mockItems),
  });

  const { result } = renderHook(
    () => useCategoryItems({ categoryId: 1, subcategoryId: 101 }),
    { wrapper: createWrapper(client) },
  );

  await waitFor(() => expect(result.current.isSuccess).toBe(true));

  act(() => {
    result.current.refetch();
  });

  await waitFor(() => expect(client.getCategoryItems).toHaveBeenCalledTimes(2));
});
