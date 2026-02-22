import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Stack, useRouter } from 'expo-router';
import { SearchBar } from '../src/components/SearchBar';
import { ImageGrid } from '../src/components/ImageGrid';
import { useItems } from '../src/hooks/useItems';
import { useSearch } from '../src/hooks/useSearch';
import { isCollection } from '../src/types/api';
import { colors } from '../src/theme';
import type { Item } from '../src/types/api';

export default function HomeScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const isSearching = searchQuery.length > 0;
  const router = useRouter();

  const itemsQuery = useItems();
  const searchQ = useSearch(searchQuery);

  const activeQuery = isSearching ? searchQ : itemsQuery;
  const items = activeQuery.data?.pages.flat() ?? [];

  const handleItemPress = (item: Item, globalIndex: number) => {
    const route = isCollection(item) ? '/collection/[id]' : '/detail/[id]';
    router.push({
      pathname: route,
      params: { id: String(globalIndex), item: JSON.stringify(item) },
    });
  };

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
        onEndReached={() => activeQuery.fetchNextPage()}
        hasNextPage={!!activeQuery.hasNextPage}
        isFetchingNextPage={activeQuery.isFetchingNextPage}
        isLoading={activeQuery.isLoading}
        isError={activeQuery.isError}
        onRetry={() => activeQuery.refetch()}
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
