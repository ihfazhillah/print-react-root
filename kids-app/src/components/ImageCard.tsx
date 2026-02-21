import { Pressable, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { useApiClient } from '../api/apiClientContext';
import type { Item } from '../types/api';

interface ImageCardProps {
  item: Item;
  onPress: () => void;
}

export function ImageCard({ item, onPress }: ImageCardProps) {
  const client = useApiClient();

  return (
    <Pressable
      style={styles.container}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Image: ${item.searches[0]?.text ?? 'untitled'}`}
    >
      <Image
        source={{ uri: client.proxyImageUrl(item.thumbnail) }}
        style={styles.image}
        contentFit="cover"
        recyclingKey={item.url}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1 / 3,
    aspectRatio: 1,
    padding: 4,
  },
  image: {
    flex: 1,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  },
});
