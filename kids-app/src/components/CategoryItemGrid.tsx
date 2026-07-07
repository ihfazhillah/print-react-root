import { useCallback } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Image } from 'expo-image';
import type { CategoryItem } from '../types/api';
import { EmptyState } from './EmptyState';
import { colors } from '../theme';

interface CategoryItemGridProps {
  items: CategoryItem[];
  onItemPress?: (item: CategoryItem) => void;
  onEndReached: () => void;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  isLoading: boolean;
  isError?: boolean;
  onRetry?: () => void;
  emptyMessage?: string;
}

export function CategoryItemGrid({
  items,
  onItemPress,
  onEndReached,
  hasNextPage,
  isFetchingNextPage,
  isLoading,
  isError,
  onRetry,
  emptyMessage = 'No images found',
}: CategoryItemGridProps) {
  const handleEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      onEndReached();
    }
  }, [hasNextPage, isFetchingNextPage, onEndReached]);

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
      keyExtractor={(item) => String(item.id)}
      renderItem={({ item }) => (
        <TouchableOpacity style={styles.cell} onPress={() => onItemPress?.(item)}>
          <Image
            source={{ uri: item.thumbnail || item.url }}
            style={styles.image}
            contentFit="cover"
            transition={200}
          />
        </TouchableOpacity>
      )}
      onEndReached={handleEndReached}
      onEndReachedThreshold={0.5}
      removeClippedSubviews
      windowSize={5}
      maxToRenderPerBatch={9}
      initialNumToRender={12}
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
  cell: {
    flex: 1,
    margin: 2,
    borderRadius: 8,
    overflow: 'hidden',
    aspectRatio: 1,
    backgroundColor: colors.placeholder,
  },
  image: {
    width: '100%',
    height: '100%',
  },
});
