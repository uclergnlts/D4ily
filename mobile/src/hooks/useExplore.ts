import { useQuery } from '@tanstack/react-query';
import { exploreService } from '../api/services/exploreService';

export function useCategories() {
    return useQuery({
        queryKey: ['categories'],
        queryFn: exploreService.getCategories,
        staleTime: 1000 * 60 * 60, // 1 hour
    });
}

export function useSearchArticles(query: string, categoryId: number | null) {
    return useQuery({
        queryKey: ['search', query, categoryId],
        queryFn: () => exploreService.searchArticles(query, categoryId),
        enabled: query.length > 2 || categoryId !== null,
        staleTime: 1000 * 60 * 5, // 5 mins
    });
}
