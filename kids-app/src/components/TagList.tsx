import { ScrollView, StyleSheet, Text, View } from 'react-native';
import type { SearchTag } from '../types/api';

interface TagListProps {
  tags: SearchTag[];
}

export function TagList({ tags }: TagListProps) {
  if (tags.length === 0) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {tags.map((tag) => (
        <View key={tag.text} style={styles.chip}>
          <Text style={styles.chipText}>{tag.text}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  chip: {
    backgroundColor: '#e8e8e8',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  chipText: {
    fontSize: 14,
    color: '#333',
  },
});
