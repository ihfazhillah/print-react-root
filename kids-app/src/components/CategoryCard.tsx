
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import type { Category, ImageItem } from '../types/api';

interface CategoryCardProps {
  category: Category;
  onPress: (category: Category) => void;
}

export function CategoryCard({ category, onPress }: CategoryCardProps) {
  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => onPress(category)}
      activeOpacity={0.7}
    >
      <View style={styles.emojiContainer}>
        <Text style={styles.emoji}>{category.emoji}</Text>
      </View>
      <Text style={styles.name}>{category.name}</Text>
      <View style={styles.imageGrid}>
        {category.example_images.slice(0, 4).map((img: ImageItem, index: number) => (
          <Image
            key={img.id || index}
            source={{ uri: img.thumbnail || img.url }}
            style={styles.gridImage}
            resizeMode="cover"
          />
        ))}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    margin: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    alignItems: 'center',
  },
  emojiContainer: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  emoji: {
    fontSize: 32,
  },
  name: {
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
    color: '#333',
  },
  imageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: '100%',
  },
  gridImage: {
    width: 60,
    height: 60,
    margin: 2,
    borderRadius: 4,
  },
});
