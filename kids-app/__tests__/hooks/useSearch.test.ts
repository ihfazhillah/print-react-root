import { renderHook, waitFor, act } from '@testing-library/react-native';
import { useSearch } from '../../src/hooks/useSearch';
import { createMockClient, createWrapper, fakePrintItems } from '../helpers/renderWithProviders';

const mockResults = fakePrintItems(1);

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

test('does not call client.search when query is empty', () => {
  const client = createMockClient();

  renderHook(() => useSearch(''), { wrapper: createWrapper(client) });

  expect(client.search).not.toHaveBeenCalled();
});

test('calls client.search with correct args', async () => {
  const client = createMockClient({
    search: jest.fn().mockResolvedValue(mockResults),
  });

  const { result } = renderHook(() => useSearch('cat'), { wrapper: createWrapper(client) });

  // Advance past the 400ms debounce
  await act(() => {
    jest.advanceTimersByTime(400);
  });

  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(client.search).toHaveBeenCalledWith('cat', 0, 20);
  expect(result.current.data?.pages[0]).toEqual(mockResults);
});

test('returns previous data while debouncing new query', async () => {
  const client = createMockClient({
    search: jest.fn().mockResolvedValue(mockResults),
  });

  const { result, rerender } = renderHook(({ q }: { q: string }) => useSearch(q), {
    wrapper: createWrapper(client),
    initialProps: { q: 'cat' },
  });

  await act(() => {
    jest.advanceTimersByTime(400);
  });

  await waitFor(() => expect(result.current.isSuccess).toBe(true));

  // Change query — old data should remain via keepPreviousData
  rerender({ q: 'dog' });
  expect(result.current.data?.pages[0]).toEqual(mockResults);
});
