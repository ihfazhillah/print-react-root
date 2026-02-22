import { ActivityIndicator, FlatList, StyleSheet, View } from 'react-native';
import type { Item } from '../types/api';
import { ImageCard } from './ImageCard';
import { EmptyState } from './EmptyState';

interface ImageGridProps {
  items: Item[];
  onItemPress: (item: Item, globalIndex: number) => void;
  onEndReached: () => void;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  isLoading: boolean;
  isError?: boolean;
  onRetry?: () => void;
  emptyMessage?: string;
}

export function ImageGrid({
  items,
  onItemPress,
  onEndReached,
  hasNextPage,
  isFetchingNextPage,
  isLoading,
  isError,
  onRetry,
  emptyMessage = 'Nothing to show',
}: ImageGridProps) {
  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (isError) {
    return <EmptyState message="Could not load images. Check your connection!" onRetry={onRetry} />;
  }

  return (
    <FlatList
      data={items}
      numColumns={3}
      keyExtractor={(_, index) => String(index)}
      renderItem={({ item, index }) => (
        <ImageCard item={item} onPress={() => onItemPress(item, index)} />
      )}
      onEndReached={() => {
        if (hasNextPage && !isFetchingNextPage) {
          onEndReached();
        }
      }}
      onEndReachedThreshold={0.5}
      ListFooterComponent={
        isFetchingNextPage ? <ActivityIndicator style={styles.footer} size="small" /> : null
      }
      ListEmptyComponent={<EmptyState message={emptyMessage} />}
      contentContainerStyle={items.length === 0 ? styles.emptyContainer : styles.gridContent}
    />
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    paddingVertical: 16,
  },
  gridContent: {
    paddingHorizontal: 12,
  },
  emptyContainer: {
    flexGrow: 1,
    paddingHorizontal: 12,
  },
});
