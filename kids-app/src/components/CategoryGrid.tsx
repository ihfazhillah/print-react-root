

import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
import type { Category } from '../types/api';
import { CategoryCard } from './CategoryCard';
import { useApiClient } from '../api/ApiClientProvider';

interface CategoryGridProps {
  onCategoryPress: (category: Category) => void;
}

export function CategoryGrid({ onCategoryPress }: CategoryGridProps) {
  const apiClient = useApiClient();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchCategories() {
      try {
        setLoading(true);
        const data = await apiClient.getCategories(50, 0);
        setCategories(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load categories');
      } finally {
        setLoading(false);
      }
    }

    fetchCategories();
  }, [apiClient]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#4CAF50" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={categories}
      numColumns={2}
      renderItem={({ item }) => (
        <CategoryCard category={item} onPress={onCategoryPress} />
      )}
      keyExtractor={(item) => `category-${item.id}`}
      contentContainerStyle={styles.grid}
      columnWrapperStyle={styles.row}
    />
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    color: '#f44336',
    fontSize: 16,
    textAlign: 'center',
  },
  grid: {
    padding: 8,
  },
  row: {
    justifyContent: 'space-between',
  },
});

