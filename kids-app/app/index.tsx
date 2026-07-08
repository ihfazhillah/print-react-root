import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Stack, useRouter } from 'expo-router';
import { SearchBar } from '../src/components/SearchBar';
import { ModeToggle } from '../src/components/ModeToggle';
import { ImageGrid } from '../src/components/ImageGrid';
import { RecommendationRow } from '../src/components/RecommendationRow';
import { SuggestionList } from '../src/components/SuggestionList';
import { CategoryGrid } from '../src/components/CategoryGrid';
import { SubCategoryGrid } from '../src/components/SubCategoryGrid';
import { useItems } from '../src/hooks/useItems';
import { useSearch } from '../src/hooks/useSearch';
import { useRecommendations } from '../src/hooks/useRecommendations';
import { useActivityTracking } from '../src/hooks/useActivityTracking';
import { useAutocomplete, useDiscovery } from '../src/hooks/useSuggestions';
import { useModeToggle } from '../src/hooks/useModeToggle';
import { analytics } from '../src/services/AnalyticsService';
import { isCollection } from '../src/types/api';
import { colors } from '../src/theme';
import type { Item } from '../src/types/api';
import type { Category, CategorySubcategory } from '../src/types/api';

type HomeView = 'search' | 'subcategories' | 'category-items';

export default function HomeScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [searchSubmitted, setSearchSubmitted] = useState(false);
  const [view, setView] = useState<HomeView>('search');
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const router = useRouter();
  const { mode: exploreMode, setMode: setExploreMode } = useModeToggle();
  const { trackView } = useActivityTracking();

  const isExploreMode = exploreMode === 'explore';

  // Switching to search mode clears explore state
  const handleModeChange = useCallback(
    (newMode: 'search' | 'explore') => {
      setExploreMode(newMode);
      if (newMode === 'search') {
        setView('search');
        setSelectedCategory(null);
      }
    },
    [setExploreMode],
  );

  const showAutocomplete = searchQuery.length >= 2 && !searchSubmitted;
  const showDiscovery = searchFocused && searchQuery.length === 0 && !searchSubmitted;
  const showSuggestions = showAutocomplete || showDiscovery;

  const autocompleteQuery = useAutocomplete(searchQuery);
  const discoveryQuery = useDiscovery();

  const activeSuggestions = showAutocomplete
    ? (autocompleteQuery.data ?? [])
    : (discoveryQuery.data ?? []);
  const suggestionsPending = showAutocomplete
    ? autocompleteQuery.isPending
    : discoveryQuery.isPending;
  const suggestionsLoading = showAutocomplete
    ? autocompleteQuery.isLoading
    : discoveryQuery.isLoading;

  const showSuggestionsPanel = showSuggestions && (suggestionsPending || activeSuggestions.length > 0);
  const isSearching = searchQuery.length > 0 && !showSuggestionsPanel;

  const itemsQuery = useItems();
  const searchQ = useSearch(searchQuery, !showSuggestionsPanel);
  const recsQuery = useRecommendations();
  const recommendations = useMemo(() => recsQuery.data ?? [], [recsQuery.data]);

  const activeQuery = isSearching ? searchQ : itemsQuery;
  const items = useMemo(() => activeQuery.data?.pages.flat() ?? [], [activeQuery.data?.pages]);

  // Track a view event whenever items load (fire-and-forget)
  useEffect(() => {
    if (!isSearching && items.length > 0 && view === 'search') {
      trackView();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSearching, items.length, view]);

  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value);
    setSearchSubmitted(false);
  }, []);

  const handleSuggestionSelect = useCallback((term: string) => {
    setSearchQuery(term);
    setSearchFocused(false);
    setSearchSubmitted(true);
  }, []);

  const handleSubmit = useCallback((query: string) => {
    if (query.length > 0) {
      setSearchFocused(false);
      setSearchSubmitted(true);
    }
  }, []);

  const handleItemPress = useCallback(
    (item: Item, globalIndex: number) => {
      analytics.track('select', item.url);
      const route = isCollection(item) ? '/collection/[id]' : '/detail/[id]';
      router.push({
        pathname: route,
        params: { id: String(globalIndex), item: JSON.stringify(item) },
      });
    },
    [router],
  );

  const handleRecPress = useCallback(
    (item: Item) => {
      analytics.track('select', item.url);
      const route = isCollection(item) ? '/collection/[id]' : '/detail/[id]';
      router.push({
        pathname: route,
        params: { id: String(item.id ?? 0), item: JSON.stringify(item) },
      });
    },
    [router],
  );

  const handleEndReached = useCallback(
    () => activeQuery.fetchNextPage(),
    [activeQuery.fetchNextPage],
  );

  const handleRetry = useCallback(() => activeQuery.refetch(), [activeQuery.refetch]);

  // Explore navigation handlers
  const handleCategoryPress = useCallback((category: Category) => {
    setSelectedCategory(category);
    setView('subcategories');
  }, []);

  const handleBackFromSubcategories = useCallback(() => {
    setSelectedCategory(null);
    setView('search');
  }, []);

  const handleSubCategoryPress = useCallback((subcategory: CategorySubcategory) => {
    if (selectedCategory) {
      router.push({
        pathname: '/category-items/[categoryId]/[subcategoryId]',
        params: {
          categoryId: String(selectedCategory.id),
          subcategoryId: String(subcategory.id),
        },
      });
    }
  }, [router, selectedCategory]);

  const handleBackFromItems = useCallback(() => {
    router.back();
  }, [router]);

  // Render different views based on mode and navigation state
  const renderContent = () => {
    // Explore mode - subcategories view
    if (view === 'subcategories' && selectedCategory) {
      return (
        <SubCategoryGrid
          category={selectedCategory}
          onBack={handleBackFromSubcategories}
          onSubCategoryPress={handleSubCategoryPress}
        />
      );
    }

    // Explore mode - category grid
    if (isExploreMode && view === 'search') {
      return <CategoryGrid onCategoryPress={handleCategoryPress} />;
    }

    // Search mode - suggestions panel or image grid
    if (showSuggestionsPanel) {
      return (
        <SuggestionList
          suggestions={activeSuggestions}
          isLoading={suggestionsLoading}
          onSelect={handleSuggestionSelect}
        />
      );
    }

    return (
      <>
        {!isSearching && recommendations.length >= 2 && (
          <RecommendationRow items={recommendations} onItemPress={handleRecPress} />
        )}
        <ImageGrid
          items={items}
          onItemPress={handleItemPress}
          onEndReached={handleEndReached}
          hasNextPage={!!activeQuery.hasNextPage}
          isFetchingNextPage={activeQuery.isFetchingNextPage}
          isLoading={activeQuery.isLoading}
          isError={activeQuery.isError}
          onRetry={handleRetry}
          emptyMessage={isSearching ? 'No images found' : 'No images available'}
        />
      </>
    );
  };

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: view === 'subcategories' ? selectedCategory?.name ?? 'Subcategories' : 'Browse',
          headerRight: () => (
            <Pressable
              onPress={() => router.push('/settings')}
              accessibilityRole="button"
              accessibilityLabel="Settings"
              style={styles.gearButton}
            >
              <Text style={styles.gearIcon}>&#x2699;</Text>
            </Pressable>
          ),
        }}
      />
      <StatusBar style="auto" />

      {/* Search bar always visible */}
      <SearchBar
        value={searchQuery}
        onSearch={handleSearchChange}
        onFocus={() => setSearchFocused(true)}
        onBlur={() => setSearchFocused(false)}
        onSubmit={handleSubmit}
      />

      {/* Mode toggle */}
      <ModeToggle onModeChange={handleModeChange} />

      {/* Content area */}
      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {renderContent()}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  gearButton: {
    padding: 8,
  },
  gearIcon: {
    fontSize: 24,
    color: colors.textPrimary,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    flexGrow: 1,
  },
});
