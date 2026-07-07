import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useApiClient } from '../api/apiClientContext';
import type { CategorySubcategory } from '../types/api';

const SUBCATEGORIES_STALE_TIME = 1000 * 60 * 60; // 1 hour

export function useCategorySubcategories(categoryId: number, enabled = true) {
  const client = useApiClient();

  return useQuery<CategorySubcategory[], Error>({
    queryKey: ['subcategories', categoryId],
    queryFn: () => client.getCategorySubcategories(categoryId),
    staleTime: SUBCATEGORIES_STALE_TIME,
    placeholderData: keepPreviousData,
    enabled: enabled && categoryId > 0,
  });
}
