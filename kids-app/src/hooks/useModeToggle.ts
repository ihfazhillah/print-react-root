


import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

type Mode = 'search' | 'explore';

const MODE_STORAGE_KEY = '@kids_app_mode';

export function useModeToggle(): {
  mode: Mode;
  setMode: (mode: Mode) => void;
  isExploreMode: boolean;
} {
  const [mode, setModeState] = useState<Mode>('search');

  useEffect(() => {
    async function loadMode() {
      try {
        const saved = await AsyncStorage.getItem(MODE_STORAGE_KEY);
        if (saved === 'explore' || saved === 'search') {
          setModeState(saved);
        }
      } catch (err) {
        console.error('Failed to load mode:', err);
      }
    }
    loadMode();
  }, []);

  const setMode = useCallback((newMode: Mode) => {
    setModeState(newMode);
    AsyncStorage.setItem(MODE_STORAGE_KEY, newMode).catch((err) =>
      console.error('Failed to save mode:', err),
    );
  }, []);

  return {
    mode,
    setMode,
    isExploreMode: mode === 'explore',
  };
}

