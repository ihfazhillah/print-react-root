import { renderHook, act } from '@testing-library/react-native';
import { useModeToggle } from '../../src/hooks/useModeToggle';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
}));

test('defaults to search mode', () => {
  const { result } = renderHook(() => useModeToggle());
  expect(result.current.mode).toBe('search');
  expect(result.current.isExploreMode).toBe(false);
});

test('switches to explore mode', async () => {
  const { result } = renderHook(() => useModeToggle());

  await act(async () => {
    result.current.setMode('explore');
  });

  expect(result.current.mode).toBe('explore');
  expect(result.current.isExploreMode).toBe(true);
});

test('switches back to search mode', async () => {
  const { result } = renderHook(() => useModeToggle());

  await act(async () => {
    result.current.setMode('explore');
  });
  expect(result.current.mode).toBe('explore');

  await act(async () => {
    result.current.setMode('search');
  });
  expect(result.current.mode).toBe('search');
  expect(result.current.isExploreMode).toBe(false);
});

test('persists mode to AsyncStorage', async () => {
  const { result } = renderHook(() => useModeToggle());

  await act(async () => {
    result.current.setMode('explore');
  });

  // Allow async storage to settle
  await act(async () => {
    await new Promise(resolve => setTimeout(resolve, 0));
  });

  expect(require('@react-native-async-storage/async-storage').setItem).toHaveBeenCalledWith(
    '@kids_app_mode',
    'explore',
  );
});

test('loads persisted mode on mount', async () => {
  const { setItem, getItem } = require('@react-native-async-storage/async-storage') as {
    setItem: jest.Mock;
    getItem: jest.Mock;
  };
  getItem.mockResolvedValueOnce('explore');

  const { result } = renderHook(() => useModeToggle());

  // Allow async load to settle
  await act(async () => {
    await new Promise(resolve => setTimeout(resolve, 0));
  });

  expect(result.current.mode).toBe('explore');
  expect(result.current.isExploreMode).toBe(true);
});

test('ignores invalid persisted mode values', async () => {
  const { getItem } = require('@react-native-async-storage/async-storage') as {
    getItem: jest.Mock;
  };
  getItem.mockResolvedValueOnce('invalid_mode');

  const { result } = renderHook(() => useModeToggle());

  await act(async () => {
    await new Promise(resolve => setTimeout(resolve, 0));
  });

  expect(result.current.mode).toBe('search');
});

test('handles AsyncStorage error gracefully', async () => {
  const { getItem } = require('@react-native-async-storage/async-storage') as {
    getItem: jest.Mock;
  };
  getItem.mockRejectedValueOnce(new Error('Storage error'));

  const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

  const { result } = renderHook(() => useModeToggle());

  await act(async () => {
    await new Promise(resolve => setTimeout(resolve, 0));
  });

  expect(result.current.mode).toBe('search');
  expect(consoleSpy).toHaveBeenCalledWith('Failed to load mode:', expect.any(Error));
  consoleSpy.mockRestore();
});
