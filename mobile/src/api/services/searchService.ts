import { client } from '../client';
import { ApiResponse } from '../../types';

export interface SearchResults {
    query: string;
    type: string;
    country: string;
    results: {
        articles: SearchArticle[];
        sources: SearchSource[];
        topics: SearchTopic[];
    };
    pagination: {
        page: number;
        limit: number;
        hasMore: boolean;
    };
    totalResults: {
        articles: number;
        sources: number;
        topics: number;
    };
}

export interface SearchArticle {
    id: number;
    translatedTitle: string;
    summary: string;
    categoryId: number | null;
    publishedAt: string;
    viewCount: number;
    likeCount: number;
    type: 'article';
    country: string;
}

export interface SearchSource {
    id: number;
    sourceName: string;
    sourceLogoUrl: string | null;
    countryCode: string;
    type: 'source';
}

export interface SearchTopic {
    id: number;
    name: string;
    hashtag: string | null;
    articleCount: number;
    trendingScore: number;
    type: 'topic';
}

export interface TrendingItem {
    term: string;
    hashtag: string | null;
    articleCount: number;
}

export const searchService = {
    search: async (q: string, country: string, type: string = 'all'): Promise<SearchResults> => {
        const response = await client.get<ApiResponse<SearchResults>>('/search', {
            params: { q, country, type },
        });
        if (!response.data.success) {
            throw new Error(response.data.error || 'Search failed');
        }
        return response.data.data;
    },

    getSuggestions: async (q: string, country: string): Promise<string[]> => {
        const response = await client.get<ApiResponse<string[]>>('/search/suggestions', {
            params: { q, country },
        });
        if (!response.data.success) {
            throw new Error(response.data.error || 'Suggestions failed');
        }
        return response.data.data;
    },

    getTrending: async (country: string): Promise<TrendingItem[]> => {
        const response = await client.get<ApiResponse<TrendingItem[]>>('/search/trending', {
            params: { country },
        });
        if (!response.data.success) {
            throw new Error(response.data.error || 'Trending failed');
        }
        return response.data.data;
    },
};
