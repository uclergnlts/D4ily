import { client } from '../client';
import { ApiResponse, Article, FeedResponse, EmotionalAnalysisResponse, BalancedFeedResponse, PerspectivesResult } from '../../types';
import { getMockFeed, getMockBalancedFeed, getMockArticle, getMockAnalysis, getMockPerspectives } from '../mock/mockData';

// Check if we're in development mode
const isDevelopment = __DEV__;

export const feedService = {
    getFeed: async (country: string, page = 1): Promise<FeedResponse> => {
        const params = new URLSearchParams();
        params.append('page', page.toString());

        try {
            // Backend: GET /feed/:country
            const response = await client.get<ApiResponse<FeedResponse>>(`/feed/${country}`, { params });

            if (!response.data.success) {
                throw new Error(response.data.error || 'Haberler yüklenemedi');
            }

            return response.data.data;
        } catch (error) {
            // Only use mock data in development
            if (isDevelopment) {
                console.warn('[DEV] API connection failed, using mock data for Feed.');
                await new Promise(resolve => setTimeout(resolve, 300));
                return getMockFeed(country, page);
            }
            // In production, throw the error
            throw new Error('Haberler yüklenemedi. Lütfen internet bağlantınızı kontrol edin.');
        }
    },

    getBalancedFeed: async (country: string, page = 1): Promise<BalancedFeedResponse> => {
        const params = new URLSearchParams();
        params.append('page', page.toString());
        params.append('balanced', 'true');

        try {
            const response = await client.get<ApiResponse<BalancedFeedResponse>>(`/feed/${country}`, { params });

            if (!response.data.success) {
                throw new Error(response.data.error || 'Dengeli akış yüklenemedi');
            }

            return response.data.data;
        } catch (error) {
            if (isDevelopment) {
                console.warn('[DEV] API connection failed, using mock data for Balanced Feed.');
                await new Promise(resolve => setTimeout(resolve, 300));
                return getMockBalancedFeed(country);
            }
            throw new Error('Dengeli akış yüklenemedi. Lütfen internet bağlantınızı kontrol edin.');
        }
    },

    getArticle: async (country: string, id: string): Promise<Article> => {
        try {
            // Backend: GET /feed/:country/:articleId
            const response = await client.get<ApiResponse<Article>>(`/feed/${country}/${id}`);

            if (!response.data.success) {
                throw new Error(response.data.error || 'Haber bulunamadı');
            }

            return response.data.data;
        } catch (error) {
            if (isDevelopment) {
                console.warn('[DEV] API connection failed, using mock data for Article.');
                await new Promise(resolve => setTimeout(resolve, 200));
                return getMockArticle(id, country);
            }
            throw new Error('Haber yüklenemedi. Lütfen tekrar deneyin.');
        }
    },

    getAnalysis: async (country: string, articleId: string): Promise<EmotionalAnalysisResponse> => {
        try {
            // Backend: GET /feed/:country/:articleId/analysis
            const response = await client.get<ApiResponse<EmotionalAnalysisResponse>>(
                `/feed/${country}/${articleId}/analysis`
            );

            if (!response.data.success) {
                throw new Error(response.data.error || 'Analiz yüklenemedi');
            }

            return response.data.data;
        } catch {
            // Analysis is optional, return mock in all cases
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
                throw new Error(response.data.error || 'Perspektifler yüklenemedi');
            }

            return response.data.data;
        } catch {
            // Perspectives are optional, return mock in all cases
            return getMockPerspectives(articleId);
        }
    }
};
