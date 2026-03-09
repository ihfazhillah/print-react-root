import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Stack, useRouter } from 'expo-router';
import { SearchBar } from '../src/components/SearchBar';
import { ImageGrid } from '../src/components/ImageGrid';
import { RecommendationRow } from '../src/components/RecommendationRow';
import { SuggestionList } from '../src/components/SuggestionList';
import { useItems } from '../src/hooks/useItems';
import { useSearch } from '../src/hooks/useSearch';
import { useRecommendations } from '../src/hooks/useRecommendations';
import { useActivityTracking } from '../src/hooks/useActivityTracking';
import { useAutocomplete, useDiscovery } from '../src/hooks/useSuggestions';
import { isCollection } from '../src/types/api';
import { colors } from '../src/theme';
import type { Item } from '../src/types/api';

export default function HomeScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const router = useRouter();
  const { trackView } = useActivityTracking();

  const showAutocomplete = searchQuery.length >= 2;
  const showDiscovery = searchFocused && searchQuery.length === 0;
  const showSuggestions = showAutocomplete || showDiscovery;

  const isSearching = searchQuery.length > 0 && !showSuggestions;

  const autocompleteQuery = useAutocomplete(searchQuery);
  const discoveryQuery = useDiscovery();
  const itemsQuery = useItems();
  const searchQ = useSearch(searchQuery, !showSuggestions);
  const recsQuery = useRecommendations();
  const recommendations = useMemo(() => recsQuery.data ?? [], [recsQuery.data]);

  const activeQuery = isSearching ? searchQ : itemsQuery;
  const items = useMemo(() => activeQuery.data?.pages.flat() ?? [], [activeQuery.data?.pages]);

  // Track a view event whenever items load (fire-and-forget)
  useEffect(() => {
    if (!isSearching && items.length > 0) {
      trackView();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSearching, items.length]);

  const handleSuggestionSelect = useCallback((term: string) => {
    setSearchQuery(term);
    setSearchFocused(false);
  }, []);

  const handleSubmit = useCallback((query: string) => {
    if (query.length > 0) {
      setSearchFocused(false);
    }
  }, []);

  const handleItemPress = useCallback(
    (item: Item, globalIndex: number) => {
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

  const activeSuggestions = showAutocomplete
    ? (autocompleteQuery.data ?? [])
    : (discoveryQuery.data ?? []);
  const suggestionsLoading = showAutocomplete
    ? autocompleteQuery.isLoading
    : discoveryQuery.isLoading;

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Browse',
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
      <SearchBar
        onSearch={setSearchQuery}
        onFocus={() => setSearchFocused(true)}
        onBlur={() => setSearchFocused(false)}
        onSubmit={handleSubmit}
      />
      {showSuggestions ? (
        <SuggestionList
          suggestions={activeSuggestions}
          isLoading={suggestionsLoading}
          onSelect={handleSuggestionSelect}
        />
      ) : (
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
      )}
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
});
