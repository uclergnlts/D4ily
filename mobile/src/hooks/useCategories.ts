import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { categoryService } from '../api/services/categoryService';
import { useAuthStore } from '../store/useAuthStore';

export function useAllCategories() {
    return useQuery({
        queryKey: ['categories'],
        queryFn: () => categoryService.getAllCategories(),
        staleTime: 1000 * 60 * 60, // 1 hour
    });
}

export function useUserCategories() {
    const token = useAuthStore(s => s.token);

    return useQuery({
        queryKey: ['user', 'categories'],
        queryFn: () => categoryService.getUserCategories(),
        enabled: !!token,
        staleTime: 1000 * 60 * 10,
    });
}

export function useSetUserCategories() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (categoryIds: number[]) => categoryService.setUserCategories(categoryIds),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['user', 'categories'] });
        },
    });
}
