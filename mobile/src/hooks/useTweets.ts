import { useInfiniteQuery } from '@tanstack/react-query';
import { tweetService } from '../api/services/tweetService';

export function useTweets(country: string = 'tr') {
    return useInfiniteQuery({
        queryKey: ['tweets', country],
        queryFn: ({ pageParam = 1 }) => tweetService.getTweets(country, pageParam),
        initialPageParam: 1,
        getNextPageParam: (lastPage, allPages) => {
            if (lastPage.pagination?.hasMore) {
                return allPages.length + 1;
            }
            return undefined;
        },
    });
}
