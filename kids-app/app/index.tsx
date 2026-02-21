import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SearchBar } from '../src/components/SearchBar';
import { ImageGrid } from '../src/components/ImageGrid';
import { useItems } from '../src/hooks/useItems';
import { useSearch } from '../src/hooks/useSearch';
import type { Item } from '../src/types/api';

export default function HomeScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const isSearching = searchQuery.length > 0;

  const itemsQuery = useItems();
  const searchQ = useSearch(searchQuery);

  const activeQuery = isSearching ? searchQ : itemsQuery;
  const items = activeQuery.data?.pages.flat() ?? [];

  const handleItemPress = (_item: Item, _globalIndex: number) => {
    // Navigation will be wired in US2 (T031)
  };

  return (
    <View style={styles.container}>
      <StatusBar style="auto" />
      <SearchBar onSearch={setSearchQuery} />
      <ImageGrid
        items={items}
        onItemPress={handleItemPress}
        onEndReached={() => activeQuery.fetchNextPage()}
        hasNextPage={!!activeQuery.hasNextPage}
        isFetchingNextPage={activeQuery.isFetchingNextPage}
        isLoading={activeQuery.isLoading}
        emptyMessage={isSearching ? 'No images found' : 'No images available'}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
});
