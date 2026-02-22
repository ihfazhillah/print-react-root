import { useCallback } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';
import { useRelated } from '../hooks/useRelated';
import { ImageCard } from './ImageCard';
import { EmptyState } from './EmptyState';
import { colors } from '../theme';
import type { Item } from '../types/api';

interface RelatedSectionProps {
  itemIndex: number;
  onItemPress: (item: Item, index: number) => void;
}

export function RelatedSection({ itemIndex, onItemPress }: RelatedSectionProps) {
  const { data: related, isLoading, isError, refetch } = useRelated(itemIndex);

  const renderItem = useCallback(
    ({ item, index }: { item: Item; index: number }) => (
      <ImageCard item={item} onPress={() => onItemPress(item, index)} />
    ),
    [onItemPress],
  );

  if (isLoading) {
    return <ActivityIndicator style={styles.loader} size="small" />;
  }

  if (isError) {
    return <EmptyState message="Could not load related images" onRetry={() => refetch()} />;
  }

  if (!related || related.length === 0) {
    return <EmptyState message="No related images" />;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Related</Text>
      <FlatList
        data={related}
        numColumns={3}
        scrollEnabled={false}
        keyExtractor={keyExtractor}
        contentContainerStyle={styles.grid}
        renderItem={renderItem}
        removeClippedSubviews
        initialNumToRender={9}
        maxToRenderPerBatch={9}
      />
    </View>
  );
}

function keyExtractor(item: Item) {
  return item.url;
}

const styles = StyleSheet.create({
  container: {
    marginTop: 16,
  },
  heading: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  grid: {
    paddingHorizontal: 12,
  },
  loader: {
    paddingVertical: 24,
  },
});
