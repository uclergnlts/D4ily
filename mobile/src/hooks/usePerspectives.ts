import { useQuery } from '@tanstack/react-query';
import { feedService } from '../api/services/feedService';

export function usePerspectives(country: string, articleId: string, enabled: boolean = false) {
    return useQuery({
        queryKey: ['perspectives', country, articleId],
        queryFn: () => feedService.getPerspectives(country, articleId),
        enabled,
        staleTime: 1000 * 60 * 30, // 30 minutes
    });
}
