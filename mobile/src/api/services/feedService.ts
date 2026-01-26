import { client } from '../client';
import { ApiResponse, Article, FeedResponse, EmotionalAnalysisResponse, BalancedFeedResponse, PerspectivesResult } from '../../types';
import { getMockFeed, getMockBalancedFeed, getMockArticle, getMockAnalysis, getMockPerspectives } from '../mock/mockData';

export const feedService = {
    getFeed: async (country: string, page = 1): Promise<FeedResponse> => {
        const params = new URLSearchParams();
        params.append('page', page.toString());

        try {
            // Backend: GET /feed/:country
            const response = await client.get<ApiResponse<FeedResponse>>(`/feed/${country}`, { params });

            if (!response.data.success) {
                throw new Error(response.data.error || 'Failed to fetch feed');
            }

            return response.data.data;
        } catch (error) {
            console.warn('API connection failed, falling back to Mock Data for Feed.', error);
            // Simulate network delay
            await new Promise(resolve => setTimeout(resolve, 800));
            return getMockFeed(country, page);
        }
    },

    getBalancedFeed: async (country: string, page = 1): Promise<BalancedFeedResponse> => {
        const params = new URLSearchParams();
        params.append('page', page.toString());
        params.append('balanced', 'true');

        try {
            const response = await client.get<ApiResponse<BalancedFeedResponse>>(`/feed/${country}`, { params });

            if (!response.data.success) {
                throw new Error(response.data.error || 'Failed to fetch balanced feed');
            }

            return response.data.data;
        } catch (error) {
            console.warn('API connection failed, falling back to Mock Data for Balanced Feed.', error);
            await new Promise(resolve => setTimeout(resolve, 800));
            return getMockBalancedFeed(country);
        }
    },

    getArticle: async (country: string, id: string): Promise<Article> => {
        try {
            // Backend: GET /feed/:country/:articleId
            const response = await client.get<ApiResponse<Article>>(`/feed/${country}/${id}`);

            if (!response.data.success) {
                throw new Error(response.data.error || 'Failed to fetch article');
            }

            return response.data.data;
        } catch (error) {
            console.warn('API connection failed, falling back to Mock Data for Article.', error);
            await new Promise(resolve => setTimeout(resolve, 500));
            return getMockArticle(id, country);
        }
    },

    getAnalysis: async (country: string, articleId: string): Promise<EmotionalAnalysisResponse> => {
        try {
            // Backend: GET /feed/:country/:articleId/analysis
            const response = await client.get<ApiResponse<EmotionalAnalysisResponse>>(
                `/feed/${country}/${articleId}/analysis`
            );

            if (!response.data.success) {
                throw new Error(response.data.error || 'Failed to fetch analysis');
            }

            return response.data.data;
        } catch (_error) {
            // console.warn('API connection failed, falling back to Mock Data for Analysis.', _error);
            // Fail silently or mock
            return getMockAnalysis(articleId);
        }
    },

    getPerspectives: async (country: string, articleId: string): Promise<PerspectivesResult> => {
        try {
            // Backend: GET /feed/:country/:articleId/perspectives
            const response = await client.get<ApiResponse<PerspectivesResult>>(
                `/feed/${country}/${articleId}/perspectives`
            );

            if (!response.data.success) {
                throw new Error(response.data.error || 'Failed to fetch perspectives');
            }

            return response.data.data;
        } catch (_error) {
            // console.warn('API connection failed, falling back to Mock Data for Perspectives.', _error);
            return getMockPerspectives(articleId);
        }
    }
};
