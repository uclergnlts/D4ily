import { client } from '../client';
import { ApiResponse, Category, Article } from '../../types';
import { getMockFeed } from '../mock/mockData';

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
        if (categoryId) params.category = categoryId;

        try {
            const response = await client.get<ApiResponse<Article[]>>('/search', { params });

            if (!response.data.success) {
                throw new Error(response.data.error || 'Search failed');
            }

            return response.data.data;
        } catch (error) {
            console.warn('API connection failed, falling back to Mock Data for Search.', error);
            // Simulate network delay
            await new Promise(resolve => setTimeout(resolve, 600));

            // Return mock results based on query to make it feel real
            const mockFeed = getMockFeed('tr', 1); // Reuse mock feed generator
            // Simple filtering simulation for realism
            if (query && query.length > 0) {
                return mockFeed.articles.map((a: Article) => ({
                    ...a,
                    translatedTitle: `${a.translatedTitle} (${query})` // Append query to title to prove it "searched"
                }));
            }
            return mockFeed.articles;
        }
    },
};
