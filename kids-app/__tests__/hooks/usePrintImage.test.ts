import { renderHook, act, waitFor } from '@testing-library/react-native';
import { usePrintImage } from '../../src/hooks/usePrintImage';
import { createMockClient, createWrapper } from '../helpers/renderWithProviders';

test('returns print response on success', async () => {
  const client = createMockClient({
    printImage: jest.fn().mockResolvedValue({ status: 'sent_to_printer', message: 'ok' }),
  });

  const { result } = renderHook(() => usePrintImage(), {
    wrapper: createWrapper(client),
  });

  act(() => {
    result.current.mutate('https://example.com/print?id=abc');
  });

  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(result.current.data).toEqual({ status: 'sent_to_printer', message: 'ok' });
  expect(client.printImage).toHaveBeenCalledWith('https://example.com/print?id=abc');
});

test('returns error on failure', async () => {
  const client = createMockClient({
    printImage: jest.fn().mockRejectedValue(new Error('Server error')),
  });

  const { result } = renderHook(() => usePrintImage(), {
    wrapper: createWrapper(client),
  });

  act(() => {
    result.current.mutate('https://example.com/print?id=abc');
  });

  await waitFor(() => expect(result.current.isError).toBe(true));
  expect(result.current.error?.message).toBe('Server error');
});

test('does not retry on failure', async () => {
  const printFn = jest.fn().mockRejectedValue(new Error('fail'));
  const client = createMockClient({ printImage: printFn });

  const { result } = renderHook(() => usePrintImage(), {
    wrapper: createWrapper(client),
  });

  act(() => {
    result.current.mutate('https://example.com/print?id=abc');
  });

  await waitFor(() => expect(result.current.isError).toBe(true));
  expect(printFn).toHaveBeenCalledTimes(1);
});
