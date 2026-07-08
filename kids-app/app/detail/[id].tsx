import { useEffect } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useApiClient } from '../../src/api/apiClientContext';
import { usePrintImage } from '../../src/hooks/usePrintImage';
import { useActivityTracking } from '../../src/hooks/useActivityTracking';
import { analytics } from '../../src/services/AnalyticsService';
import { TagList } from '../../src/components/TagList';
import { PrintButton } from '../../src/components/PrintButton';
import { RelatedSection } from '../../src/components/RelatedSection';
import { colors } from '../../src/theme';
import type { Item } from '../../src/types/api';

export default function DetailScreen() {
  const { id, item: itemJson } = useLocalSearchParams<{ id: string; item: string }>();
  const itemIndex = Number(id);
  const router = useRouter();
  const client = useApiClient();
  const printMutation = usePrintImage();
  const { trackDetail, trackPrint } = useActivityTracking();

  const item: Item | null = (() => {
    try {
      return JSON.parse(itemJson ?? '') as Item;
    } catch {
      return null;
    }
  })();

  // Track detail view on mount (fire-and-forget)

  useEffect(() => {
    if (item) trackDetail(String(item.id));
  }, []);

  if (!item) return null;

  const title = item.searches[0]?.text ?? 'Detail';

  const handleRelatedPress = (relatedItem: Item) => {
    router.push({
      pathname: '/detail/[id]',
      params: { id: String(itemIndex), item: JSON.stringify(relatedItem) },
    });
  };

  return (
    <>
      <Stack.Screen options={{ title }} />
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Image
          source={{ uri: client.proxyImageUrl(item.thumbnail) }}
          style={styles.heroImage}
          contentFit="contain"
        />

        <View style={styles.section}>
          <TagList tags={item.searches} />
        </View>

        <View style={styles.section}>
          <PrintButton
            onPrint={() => {
              analytics.track('print', item.url);
              printMutation.mutate(item.url);
              trackPrint(String(item.id));
            }}
            isPending={printMutation.isPending}
            isSuccess={printMutation.isSuccess}
            isError={printMutation.isError}
            error={printMutation.error}
            reset={printMutation.reset}
          />
        </View>

        <RelatedSection itemIndex={itemIndex} onItemPress={handleRelatedPress} />
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingBottom: 32,
  },
  heroImage: {
    width: '100%',
    aspectRatio: 3 / 4,
    backgroundColor: colors.placeholder,
  },
  section: {
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
});
