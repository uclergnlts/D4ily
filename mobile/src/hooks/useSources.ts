import { useQuery } from '@tanstack/react-query';
import { sourceService } from '../api/services/sourceService';

export function useSources(country?: string) {
    return useQuery({
        queryKey: ['sources', country ?? 'all'],
        queryFn: () => sourceService.getSources(country),
        staleTime: 1000 * 60 * 30, // 30 minutes
    });
}
