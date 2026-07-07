import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { SubCategoryGrid } from '../../src/components/SubCategoryGrid';
import { useCategories } from '../../src/hooks/useCategories';
import type { CategorySubcategory } from '../../src/types/api';

export default function SubcategoriesScreen() {
  const { categoryId: id } = useLocalSearchParams<{ categoryId: string }>();
  const router = useRouter();
  const categoryId = Number(id);

  const { data: categories } = useCategories();
  const category = categories?.find((c) => c.id === categoryId);

  if (!category) {
    return (
      <Stack.Screen options={{ title: 'Subcategories', headerBackVisible: true }} />
    );
  }

  const handleBack = () => router.back();

  const handleSubCategoryPress = (subcategory: CategorySubcategory) => {
    router.push({
      pathname: '/category-items/[categoryId]/[subcategoryId]',
      params: {
        categoryId: String(category.id),
        subcategoryId: String(subcategory.id),
      },
    });
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: category.name,
          headerBackVisible: true,
        }}
      />
      <SubCategoryGrid
        category={category}
        onBack={handleBack}
        onSubCategoryPress={handleSubCategoryPress}
      />
    </>
  );
}
