import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { useApiClient } from '../api/apiClientContext';
import { isCollection } from '../types/api';
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
      accessibilityLabel={`${isCollection(item) ? 'Collection' : 'Image'}: ${item.searches[0]?.text ?? 'untitled'}`}
    >
      <Image
        source={{ uri: client.proxyImageUrl(item.thumbnail) }}
        style={styles.image}
        contentFit="cover"
        recyclingKey={item.url}
      />
      {isCollection(item) && (
        <View style={styles.ribbon}>
          <Text style={styles.ribbonText}>Collection</Text>
        </View>
      )}
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
  ribbon: {
    position: 'absolute',
    bottom: 8,
    left: 4,
    right: 4,
    backgroundColor: 'rgba(90, 60, 180, 0.85)',
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    paddingVertical: 3,
    alignItems: 'center',
  },
  ribbonText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
