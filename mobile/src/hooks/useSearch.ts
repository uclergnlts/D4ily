import { useQuery } from '@tanstack/react-query';
import { searchService } from '../api/services/searchService';

export function useSearch(query: string, country: string, type: string = 'all') {
    return useQuery({
        queryKey: ['search', query, country, type],
        queryFn: () => searchService.search(query, country, type),
        enabled: query.length >= 2,
        staleTime: 1000 * 60 * 5,
    });
}

export function useSearchSuggestions(query: string, country: string) {
    return useQuery({
        queryKey: ['search', 'suggestions', query, country],
        queryFn: () => searchService.getSuggestions(query, country),
        enabled: query.length >= 2,
        staleTime: 1000 * 60 * 2,
    });
}

export function useTrending(country: string) {
    return useQuery({
        queryKey: ['search', 'trending', country],
        queryFn: () => searchService.getTrending(country),
        staleTime: 1000 * 60 * 15,
    });
}
