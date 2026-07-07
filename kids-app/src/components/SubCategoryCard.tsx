

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import type { CategorySubcategory, ImageItem } from '../types/api';

interface SubCategoryCardProps {
  subcategory: CategorySubcategory;
  onPress: (subcategory: CategorySubcategory) => void;
}

export function SubCategoryCard({ subcategory, onPress }: SubCategoryCardProps) {
  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => onPress(subcategory)}
      activeOpacity={0.7}
    >
      <View style={styles.emojiContainer}>
        <Text style={styles.emoji}>{subcategory.emoji}</Text>
      </View>
      <Text style={styles.name} numberOfLines={2}>
        {subcategory.name}
      </Text>
      <View style={styles.imageGrid}>
        {subcategory.example_images.slice(0, 4).map((img: ImageItem, index: number) => (
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
    borderRadius: 8,
    padding: 8,
    margin: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    alignItems: 'center',
    minWidth: 140,
    minHeight: 140,
  },
  emojiContainer: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  emoji: {
    fontSize: 24,
  },
  name: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 4,
    color: '#333',
    lineHeight: 18,
  },
  imageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: '100%',
  },
  gridImage: {
    width: 50,
    height: 50,
    margin: 1,
    borderRadius: 4,
  },
});

