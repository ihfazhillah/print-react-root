import { renderHook, waitFor } from '@testing-library/react-native';
import { useCategories } from '../../src/hooks/useCategories';
import { createMockClient, createWrapper } from '../helpers/renderWithProviders';
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
      { id: 2, url: 'https://example.com/img2', print_count: 40 },
    ],
  },
  {
    id: 2,
    name: 'Hewan Laut',
    emoji: '🐠',
    tag_count: 10,
    print_count: 80,
    example_images: [
      { id: 3, url: 'https://example.com/img3', print_count: 30 },
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

test('fetches categories on mount', async () => {
  const client = createMockClient({
    getCategories: jest.fn().mockResolvedValue(mockCategories),
  });

  const { result } = renderHook(() => useCategories(), {
    wrapper: createWrapper(client),
  });

  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(result.current.data).toEqual(mockCategories);
  expect(client.getCategories).toHaveBeenCalledWith(50, 0);
});

test('supports custom limit and offset', async () => {
  const client = createMockClient({
    getCategories: jest.fn().mockResolvedValue(mockCategories.slice(0, 1)),
  });

  const { result } = renderHook(
    () => useCategories({ limit: 10, offset: 20 }),
    { wrapper: createWrapper(client) },
  );

  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(client.getCategories).toHaveBeenCalledWith(10, 20);
});

test('handles API error gracefully', async () => {
  const client = createMockClient({
    getCategories: jest.fn().mockRejectedValue(new Error('Network error')),
  });

  const { result } = renderHook(() => useCategories(), {
    wrapper: createWrapper(client),
  });

  await waitFor(() => expect(result.current.isError).toBe(true));
  expect(result.current.error?.message).toBe('Network error');
});

test('does not fetch when enabled is false', async () => {
  const getCategories = jest.fn();
  const client = createMockClient({ getCategories });

  renderHook(() => useCategories({ enabled: false }), {
    wrapper: createWrapper(client),
  });

  expect(getCategories).not.toHaveBeenCalled();
});

test('returns empty array when API returns empty', async () => {
  const client = createMockClient({
    getCategories: jest.fn().mockResolvedValue([]),
  });

  const { result } = renderHook(() => useCategories(), {
    wrapper: createWrapper(client),
  });

  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(result.current.data).toEqual([]);
});

test('category data has correct shape', async () => {
  const client = createMockClient({
    getCategories: jest.fn().mockResolvedValue(mockCategories),
  });

  const { result } = renderHook(() => useCategories(), {
    wrapper: createWrapper(client),
  });

  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  const cat = result.current.data![0];
  expect(cat).toHaveProperty('id');
  expect(cat).toHaveProperty('name');
  expect(cat).toHaveProperty('emoji');
  expect(cat).toHaveProperty('tag_count');
  expect(cat).toHaveProperty('print_count');
  expect(cat).toHaveProperty('example_images');
  expect(typeof cat.id).toBe('number');
  expect(typeof cat.name).toBe('string');
  expect(typeof cat.emoji).toBe('string');
  expect(typeof cat.tag_count).toBe('number');
  expect(typeof cat.print_count).toBe('number');
});

test('caches results (staleTime 24h)', async () => {
  const client = createMockClient({
    getCategories: jest.fn().mockResolvedValue(mockCategories),
  });

  const { result, rerender } = renderHook(() => useCategories(), {
    wrapper: createWrapper(client),
  });

  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  const firstData = result.current.data;

  // Re-render with different options but same query key
  rerender(() => useCategories({ limit: 100, offset: 0 }));

  // Should still have data from cache (staleTime is 24h)
  expect(result.current.data).toEqual(firstData);
  // Should only have been called once
  expect(client.getCategories).toHaveBeenCalledTimes(1);
});
