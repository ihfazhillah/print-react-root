import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Stack, useRouter } from 'expo-router';
import { SearchBar } from '../src/components/SearchBar';
import { ImageGrid } from '../src/components/ImageGrid';
import { useItems } from '../src/hooks/useItems';
import { useSearch } from '../src/hooks/useSearch';
import { useActivityTracking } from '../src/hooks/useActivityTracking';
import { isCollection } from '../src/types/api';
import { colors } from '../src/theme';
import type { Item } from '../src/types/api';

export default function HomeScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const isSearching = searchQuery.length > 0;
  const router = useRouter();
  const { trackView } = useActivityTracking();

  const itemsQuery = useItems();
  const searchQ = useSearch(searchQuery);

  const activeQuery = isSearching ? searchQ : itemsQuery;
  const items = useMemo(() => activeQuery.data?.pages.flat() ?? [], [activeQuery.data?.pages]);

  // Track a view event whenever items load (fire-and-forget)
  useEffect(() => {
    if (!isSearching && items.length > 0) {
      trackView();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSearching, items.length]);

  const handleItemPress = useCallback(
    (item: Item, globalIndex: number) => {
      const route = isCollection(item) ? '/collection/[id]' : '/detail/[id]';
      router.push({
        pathname: route,
        params: { id: String(globalIndex), item: JSON.stringify(item) },
      });
    },
    [router],
  );

  const handleEndReached = useCallback(
    () => activeQuery.fetchNextPage(),
    [activeQuery.fetchNextPage],
  );

  const handleRetry = useCallback(() => activeQuery.refetch(), [activeQuery.refetch]);

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Browse',
          headerRight: () => (
            <Pressable
              onPress={() => router.push('/settings')}
              accessibilityRole="button"
              accessibilityLabel="Settings"
              style={styles.gearButton}
            >
              <Text style={styles.gearIcon}>&#x2699;</Text>
            </Pressable>
          ),
        }}
      />
      <StatusBar style="auto" />
      <SearchBar onSearch={setSearchQuery} />
      <ImageGrid
        items={items}
        onItemPress={handleItemPress}
        onEndReached={handleEndReached}
        hasNextPage={!!activeQuery.hasNextPage}
        isFetchingNextPage={activeQuery.isFetchingNextPage}
        isLoading={activeQuery.isLoading}
        isError={activeQuery.isError}
        onRetry={handleRetry}
        emptyMessage={isSearching ? 'No images found' : 'No images available'}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  gearButton: {
    padding: 8,
  },
  gearIcon: {
    fontSize: 24,
    color: colors.textPrimary,
  },
});
