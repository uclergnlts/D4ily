import { client } from '../client';
import { ApiResponse, Category, Article } from '../../types';

export const exploreService = {
    getCategories: async () => {
        const response = await client.get<ApiResponse<Category[]>>('/categories');

        if (!response.data.success) {
            throw new Error(response.data.error || 'Failed to fetch categories');
        }

        return response.data.data;
    },

    searchArticles: async (query: string, categoryId: number | null = null) => {
        const params: any = {};
        if (query) params.q = query;
        if (categoryId) params.category = categoryId; // Backend probably expects 'category' or 'categoryId'

        // If no query and no category, return empty or trending?
        // Let's assume search endpoint handles empty query if category is present

        const response = await client.get<ApiResponse<Article[]>>('/search', { params });

        if (!response.data.success) {
            throw new Error(response.data.error || 'Search failed');
        }

        return response.data.data;
    },
};
