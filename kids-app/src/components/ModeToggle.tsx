



import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useModeToggle } from '../hooks/useModeToggle';

interface ModeToggleProps {
  onModeChange?: (mode: 'search' | 'explore') => void;
}

export function ModeToggle({ onModeChange }: ModeToggleProps) {
  const { mode, setMode, isExploreMode } = useModeToggle();

  const handleSearchPress = () => {
    setMode('search');
    onModeChange?.('search');
  };

  const handleExplorePress = () => {
    setMode('explore');
    onModeChange?.('explore');
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.tab, isExploreMode && styles.tabInactive]}
        onPress={handleSearchPress}
        activeOpacity={0.7}
      >
        <Text style={[styles.tabText, isExploreMode && styles.tabTextInactive]}>
          🔍 Cari
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.tab, !isExploreMode && styles.tabInactive]}
        onPress={handleExplorePress}
        activeOpacity={0.7}
      >
        <Text style={[styles.tabText, !isExploreMode && styles.tabTextInactive]}>
          🧭 Jelajah
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    height: 44,
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#e0e0e0',
  },
  tab: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1976D2',
  },
  tabInactive: {
    backgroundColor: 'transparent',
  },
  tabText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  tabTextInactive: {
    fontSize: 16,
    fontWeight: '400',
    color: '#666',
  },
});


