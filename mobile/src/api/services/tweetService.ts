import { client } from '../client';
import { ApiResponse, TweetFeedResponse } from '../../types';

const isDevelopment = __DEV__;

export const tweetService = {
    getTweets: async (country: string, page = 1): Promise<TweetFeedResponse> => {
        const params = new URLSearchParams();
        params.append('page', page.toString());

        try {
            const response = await client.get<ApiResponse<TweetFeedResponse>>(
                `/tweets/${country}`,
                { params },
            );

            if (!response.data.success) {
                throw new Error(response.data.error || 'Tweetler yüklenemedi');
            }

            return response.data.data;
        } catch (error: any) {
            if (isDevelopment) {
                console.warn('[DEV] API connection failed for tweets.');
                console.error('[Tweet Error Details]', error.message, error.response?.status);
                return { tweets: [], pagination: { page, limit: 20, hasMore: false } };
            }
            throw new Error('Tweetler yüklenemedi. Lütfen internet bağlantınızı kontrol edin.');
        }
    },
};
