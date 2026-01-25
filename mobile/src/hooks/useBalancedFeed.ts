import { useQuery } from '@tanstack/react-query';
import { feedService } from '../api/services/feedService';

export function useBalancedFeed(country: string = 'tr') {
    return useQuery({
        queryKey: ['feed', country, 'balanced'],
        queryFn: () => feedService.getBalancedFeed(country),
    });
}
