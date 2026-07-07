import { renderHook, waitFor } from '@testing-library/react-native';
import { useCategorySubcategories } from '../../src/hooks/useCategorySubcategories';
import { createMockClient, createWrapper } from '../helpers/renderWithProviders';
import type { CategorySubcategory } from '../../src/types/api';

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

test('fetches subcategories for a category', async () => {
  const client = createMockClient({
    getCategorySubcategories: jest.fn().mockResolvedValue(mockSubcategories),
  });

  const { result } = renderHook(() => useCategorySubcategories(1), {
    wrapper: createWrapper(client),
  });

  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(result.current.data).toEqual(mockSubcategories);
  expect(client.getCategorySubcategories).toHaveBeenCalledWith(1);
});

test('does not fetch when categoryId is 0 or negative', async () => {
  const getCategorySubcategories = jest.fn();
  const client = createMockClient({ getCategorySubcategories });

  renderHook(() => useCategorySubcategories(0), {
    wrapper: createWrapper(client),
  });

  expect(getCategorySubcategories).not.toHaveBeenCalled();
});

test('does not fetch when enabled is false', async () => {
  const getCategorySubcategories = jest.fn();
  const client = createMockClient({ getCategorySubcategories });

  renderHook(() => useCategorySubcategories(1, false), {
    wrapper: createWrapper(client),
  });

  expect(getCategorySubcategories).not.toHaveBeenCalled();
});

test('handles API error gracefully', async () => {
  const client = createMockClient({
    getCategorySubcategories: jest.fn().mockRejectedValue(new Error('Not found')),
  });

  const { result } = renderHook(() => useCategorySubcategories(999), {
    wrapper: createWrapper(client),
  });

  await waitFor(() => expect(result.current.isError).toBe(true));
  expect(result.current.error?.message).toBe('Not found');
});

test('returns empty array for category with no subcategories', async () => {
  const client = createMockClient({
    getCategorySubcategories: jest.fn().mockResolvedValue([]),
  });

  const { result } = renderHook(() => useCategorySubcategories(1), {
    wrapper: createWrapper(client),
  });

  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(result.current.data).toEqual([]);
});

test('subcategories have correct shape', async () => {
  const client = createMockClient({
    getCategorySubcategories: jest.fn().mockResolvedValue(mockSubcategories),
  });

  const { result } = renderHook(() => useCategorySubcategories(1), {
    wrapper: createWrapper(client),
  });

  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  const sub = result.current.data![0];
  expect(sub).toHaveProperty('id');
  expect(sub).toHaveProperty('name');
  expect(sub).toHaveProperty('emoji');
  expect(sub).toHaveProperty('example_images');
  expect(typeof sub.id).toBe('number');
  expect(typeof sub.name).toBe('string');
});

test('caches results (staleTime 1h)', async () => {
  const client = createMockClient({
    getCategorySubcategories: jest.fn().mockResolvedValue(mockSubcategories),
  });

  const { result, rerender } = renderHook(
    ({ id }) => useCategorySubcategories(id),
    { wrapper: createWrapper(client), initialProps: { id: 1 } },
  );

  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  const firstData = result.current.data;

  // Re-render with same id
  rerender({ id: 1 });

  expect(result.current.data).toEqual(firstData);
  expect(client.getCategorySubcategories).toHaveBeenCalledTimes(1);
});
