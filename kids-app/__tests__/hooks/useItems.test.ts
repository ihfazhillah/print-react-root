import { renderHook, waitFor } from '@testing-library/react-native';
import { useItems } from '../../src/hooks/useItems';
import { createMockClient, createWrapper, fakePrintItems } from '../helpers/renderWithProviders';

test('returns items on successful fetch', async () => {
  const items = fakePrintItems(20);
  const client = createMockClient({
    getItems: jest.fn().mockResolvedValueOnce(items),
  });

  const { result } = renderHook(() => useItems(), { wrapper: createWrapper(client) });

  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(result.current.data?.pages[0]).toHaveLength(20);
  expect(client.getItems).toHaveBeenCalledWith(0, 20);
});

test('fetches next page when current page is full', async () => {
  const page1 = fakePrintItems(20);
  const page2 = fakePrintItems(1);
  const client = createMockClient({
    getItems: jest.fn().mockResolvedValueOnce(page1).mockResolvedValueOnce(page2),
  });

  const { result } = renderHook(() => useItems(), { wrapper: createWrapper(client) });

  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(result.current.hasNextPage).toBe(true);

  result.current.fetchNextPage();

  await waitFor(() => expect(result.current.data?.pages).toHaveLength(2));
  expect(result.current.data?.pages[1]).toHaveLength(1);
  expect(client.getItems).toHaveBeenCalledWith(20, 20);
});

test('has no next page when response is smaller than page size', async () => {
  const items = fakePrintItems(5);
  const client = createMockClient({
    getItems: jest.fn().mockResolvedValueOnce(items),
  });

  const { result } = renderHook(() => useItems(), { wrapper: createWrapper(client) });

  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(result.current.hasNextPage).toBe(false);
});
