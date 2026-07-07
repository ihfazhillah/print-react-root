import { useCallback } from 'react';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { CategoryItemGrid } from '../../../src/components/CategoryItemGrid';
import { useCategoryItems } from '../../../src/hooks/useCategoryItems';
import type { CategoryItem } from '../../../src/types/api';

export default function CategoryItemsScreen() {
  const { categoryId: catId, subcategoryId: subId } = useLocalSearchParams<{
    categoryId: string;
    subcategoryId: string;
  }>();
  const router = useRouter();
  const categoryId = Number(catId);
  const subcategoryId = Number(subId);

  const {
    data,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
    isLoading,
    isError,
    refetch,
  } = useCategoryItems({ categoryId, subcategoryId });

  const items: CategoryItem[] = data?.pages.flat() ?? [];

  const handleBack = () => router.back();

  const handleItemPress = useCallback(
    (item: CategoryItem) => {
      // Open image in new browser tab / image viewer
      if (typeof window !== 'undefined') {
        window.open(item.url, '_blank');
      }
    },
    [],
  );

  const handleEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Images',
          headerBackVisible: true,
        }}
      />
      <CategoryItemGrid
        items={items}
        onItemPress={handleItemPress}
        onEndReached={handleEndReached}
        hasNextPage={!!hasNextPage}
        isFetchingNextPage={isFetchingNextPage}
        isLoading={isLoading}
        isError={isError}
        onRetry={() => refetch()}
        emptyMessage="No images found"
      />
    </>
  );
}
