import { memo, useCallback } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { useApiClient } from '../api/apiClientContext';
import { colors } from '../theme';
import type { Item } from '../types/api';

interface RecommendationRowProps {
  items: Item[];
  onItemPress: (item: Item) => void;
}

const ITEM_WIDTH = 120;

const RecommendationItem = memo(function RecommendationItem({
  item,
  onPress,
}: {
  item: Item;
  onPress: () => void;
}) {
  const client = useApiClient();
  return (
    <Pressable
      style={styles.itemContainer}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={item.searches[0]?.text ?? 'Recommended image'}
    >
      <Image
        source={{ uri: client.proxyImageUrl(item.thumbnail) }}
        style={styles.itemImage}
        contentFit="cover"
        recyclingKey={item.url}
      />
    </Pressable>
  );
});

export function RecommendationRow({ items, onItemPress }: RecommendationRowProps) {
  const renderItem = useCallback(
    ({ item }: { item: Item }) => (
      <RecommendationItem item={item} onPress={() => onItemPress(item)} />
    ),
    [onItemPress],
  );

  const keyExtractor = useCallback((item: Item) => item.url, []);

  if (items.length < 2) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Kamu mungkin suka</Text>
      <FlatList
        data={items}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        horizontal
        showsHorizontalScrollIndicator={false}
        initialNumToRender={5}
        maxToRenderPerBatch={5}
        windowSize={3}
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  listContent: {
    paddingHorizontal: 8,
  },
  itemContainer: {
    width: ITEM_WIDTH,
    height: ITEM_WIDTH,
    marginHorizontal: 4,
  },
  itemImage: {
    flex: 1,
    borderRadius: 8,
    backgroundColor: colors.placeholder,
  },
});
