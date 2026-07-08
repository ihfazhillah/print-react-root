import { useCallback } from 'react';
import { ActivityIndicator, FlatList, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useApiClient } from '../../src/api/apiClientContext';
import { ImageCard } from '../../src/components/ImageCard';
import { EmptyState } from '../../src/components/EmptyState';
import { analytics } from '../../src/services/AnalyticsService';
import { isCollection } from '../../src/types/api';
import { colors } from '../../src/theme';
import type { CollectionItem, Item } from '../../src/types/api';

const MAX_ITEMS = 48;

export default function CollectionScreen() {
  const { id, item: itemJson } = useLocalSearchParams<{ id: string; item: string }>();
  const itemIndex = Number(id);
  const router = useRouter();
  const client = useApiClient();

  const item: CollectionItem | null = (() => {
    try {
      const parsed = JSON.parse(itemJson ?? '') as Item;
      return isCollection(parsed) ? parsed : null;
    } catch {
      return null;
    }
  })();

  const tag = item?.searches[0]?.text ?? '';

  const {
    data: related,
    isLoading: isRelatedLoading,
    isError: isRelatedError,
    refetch: refetchRelated,
  } = useQuery<Item[], Error>({
    queryKey: ['collection-related', tag],
    queryFn: () => client.search(tag, 0, MAX_ITEMS),
    enabled: tag.length > 0,
    select: (items) => items.filter((i) => i.url !== item?.url).slice(0, MAX_ITEMS),
  });

  if (!item) return null;

  const title = item.searches[0]?.text ?? 'Collection';
  const collectionPrints = (item.prints ?? []).slice(0, MAX_ITEMS);

  const handleImagePress = useCallback(
    (pressedItem: Item) => {
      analytics.track('select', pressedItem.url);
      const route = isCollection(pressedItem) ? '/collection/[id]' : '/detail/[id]';
      router.push({
        pathname: route,
        params: { id: String(itemIndex), item: JSON.stringify(pressedItem) },
      });
    },
    [router, itemIndex],
  );

  const renderCard = useCallback(
    ({ item: cardItem }: { item: Item }) => (
      <ImageCard item={cardItem} onPress={() => handleImagePress(cardItem)} />
    ),
    [handleImagePress],
  );

  return (
    <>
      <Stack.Screen options={{ title }} />
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.section}>
          <Text style={styles.heading}>Detail</Text>
          {collectionPrints.length > 0 ? (
            <FlatList
              data={collectionPrints}
              numColumns={3}
              scrollEnabled={false}
              keyExtractor={keyExtractor}
              contentContainerStyle={styles.grid}
              renderItem={renderCard}
              removeClippedSubviews
              initialNumToRender={9}
              maxToRenderPerBatch={9}
            />
          ) : (
            <EmptyState message="No images in this collection" />
          )}
        </View>

        <View style={styles.divider} />

        <View style={styles.section}>
          <Text style={styles.heading}>Related</Text>
          {isRelatedLoading ? (
            <ActivityIndicator style={styles.loader} size="small" />
          ) : isRelatedError ? (
            <EmptyState message="Could not load related images" onRetry={() => refetchRelated()} />
          ) : related && related.length > 0 ? (
            <FlatList
              data={related}
              numColumns={3}
              scrollEnabled={false}
              keyExtractor={keyExtractor}
              contentContainerStyle={styles.grid}
              renderItem={renderCard}
              removeClippedSubviews
              initialNumToRender={9}
              maxToRenderPerBatch={9}
            />
          ) : (
            <EmptyState message="No related images" />
          )}
        </View>
      </ScrollView>
    </>
  );
}

function keyExtractor(item: Item) {
  return item.url;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingBottom: 32,
  },
  section: {
    paddingVertical: 12,
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
  divider: {
    height: 1,
    backgroundColor: colors.divider,
    marginHorizontal: 12,
    marginVertical: 8,
  },
  loader: {
    paddingVertical: 24,
  },
});
