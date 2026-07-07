


import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import type { Category, CategorySubcategory } from '../types/api';
import { SubCategoryCard } from './SubCategoryCard';
import { useApiClient } from '../api/ApiClientProvider';

interface SubCategoryGridProps {
  category: Category;
  onBack: () => void;
  onSubCategoryPress: (subcategory: CategorySubcategory) => void;
}

export function SubCategoryGrid({ category, onBack, onSubCategoryPress }: SubCategoryGridProps) {
  const apiClient = useApiClient();
  const [subcategories, setSubcategories] = useState<CategorySubcategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchSubcategories() {
      try {
        setLoading(true);
        const data = await apiClient.getCategorySubcategories(category.id);
        setSubcategories(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load subcategories');
      } finally {
        setLoading(false);
      }
    }

    fetchSubcategories();
  }, [apiClient, category.id]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backText}>← Kembali</Text>
        </TouchableOpacity>
        <View style={styles.headerTitle}>
          <Text style={styles.headerEmoji}>{category.emoji}</Text>
          <Text style={styles.headerName}>{category.name}</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#4CAF50" />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : (
        <FlatList
          data={subcategories}
          numColumns={2}
          renderItem={({ item }) => (
            <SubCategoryCard subcategory={item} onPress={onSubCategoryPress} />
          )}
          keyExtractor={(item) => `subcategory-${item.id}`}
          contentContainerStyle={styles.grid}
          columnWrapperStyle={styles.row}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  backText: {
    fontSize: 16,
    color: '#1976D2',
    fontWeight: '600',
  },
  headerTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerEmoji: {
    fontSize: 24,
    marginRight: 8,
  },
  headerName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
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


