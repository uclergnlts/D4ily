import { useInfiniteQuery } from '@tanstack/react-query';
import { feedService } from '../api/services/feedService';

export function useFeed(country: string = 'tr') {
    return useInfiniteQuery({
        queryKey: ['feed', country],
        queryFn: ({ pageParam = 1 }) => feedService.getFeed(country, pageParam),
        initialPageParam: 1,
        getNextPageParam: (lastPage, allPages) => {
            if (lastPage.pagination?.hasMore) {
                return allPages.length + 1;
            }
            return undefined;
        },
    });
}
