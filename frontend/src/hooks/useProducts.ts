import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { apiClient, getErrorMessage } from '../lib/api-client';
import { mapBackendProductToFrontend } from '../lib/mappers';
import { Product } from '../types/index';
import { useToast } from '../providers/ToastProvider';

export interface ProductFilters {
  categorySlug?: string;
  search?: string;
  minPrice?: number;
  maxPrice?: number;
  sizes?: string[];
  colors?: string[];
  tech?: string[];
  sort?: string;
  includeDeleted?: boolean;
}

export function useProductsQuery(filters: ProductFilters = {}, options: any = {}) {
  // Normalize filters: strip empty arrays and falsy values to produce a stable, canonical query key.
  // Without this, `sizes: []` vs `sizes: undefined` would produce different query keys.
  const normalizedFilters: ProductFilters = {
    ...(filters.categorySlug ? { categorySlug: filters.categorySlug } : {}),
    ...(filters.search ? { search: filters.search } : {}),
    ...(filters.minPrice ? { minPrice: filters.minPrice } : {}),
    ...(filters.maxPrice ? { maxPrice: filters.maxPrice } : {}),
    ...(filters.sizes && filters.sizes.length > 0 ? { sizes: filters.sizes } : {}),
    ...(filters.colors && filters.colors.length > 0 ? { colors: filters.colors } : {}),
    ...(filters.tech && filters.tech.length > 0 ? { tech: filters.tech } : {}),
    ...(filters.sort ? { sort: filters.sort } : {}),
    ...(filters.includeDeleted !== undefined ? { includeDeleted: filters.includeDeleted } : {}),
  };

  return useQuery<Product[]>({
    queryKey: ['products', normalizedFilters],
    queryFn: async () => {
      const response = await apiClient.get('/products', {
        params: {
          categorySlug: normalizedFilters.categorySlug,
          search: normalizedFilters.search,
          minPrice: normalizedFilters.minPrice,
          maxPrice: normalizedFilters.maxPrice,
          sizes: normalizedFilters.sizes,
          colors: normalizedFilters.colors,
          tech: normalizedFilters.tech,
          sort: normalizedFilters.sort,
          includeDeleted: normalizedFilters.includeDeleted,
        },
      });
      return (response.data || []).map(mapBackendProductToFrontend);
    },
    placeholderData: keepPreviousData,
    staleTime: 1000 * 60 * 5, // 5 minutes stale time
    ...options,
  });
}

export function useProductQuery(id: string) {
  return useQuery<Product>({
    queryKey: ['product', id],
    queryFn: async () => {
      const response = await apiClient.get(`/products/${id}`);
      return mapBackendProductToFrontend(response.data);
    },
    enabled: !!id,
    staleTime: 1000 * 60 * 5, // 5 minutes stale time
  });
}

export function useCategoriesQuery() {
  return useQuery<Array<{ id: string; name: string; slug: string; description: string }>>({
    queryKey: ['categories'],
    queryFn: async () => {
      const response = await apiClient.get('/categories');
      return response.data || [];
    },
    staleTime: 1000 * 60 * 30, // 30 minutes stale time for static categories
  });
}

export function useCreateProductMutation() {
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (productData: any) => {
      const response = await apiClient.post('/products', productData);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      showToast('PRODUCT CREATED SUCCESSFULLY', 'success');
    },
    onError: (error) => {
      showToast(getErrorMessage(error), 'error');
    },
  });
}

export function useDeleteProductMutation() {
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await apiClient.delete(`/products/${id}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      showToast('PRODUCT REMOVED FROM CATALOG', 'info');
    },
    onError: (error) => {
      showToast(getErrorMessage(error), 'error');
    },
  });
}
