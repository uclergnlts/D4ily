import { client } from '../client';
import { ApiResponse } from '../../types';

export interface ReadingHistoryItem {
    id: string;
    userId: string;
    articleId: string;
    countryCode: string;
    viewedAt: string;
    timeSpentSeconds: number;
}

export const historyService = {
    getHistory: async (page: number = 1, limit: number = 20): Promise<{
        items: ReadingHistoryItem[];
        hasMore: boolean;
    }> => {
        const response = await client.get<ApiResponse<ReadingHistoryItem[]>>('/history', {
            params: { page, limit },
        });
        if (!response.data.success) {
            throw new Error(response.data.error || 'Failed to fetch history');
        }
        return {
            items: response.data.data,
            hasMore: response.data.pagination?.hasMore ?? false,
        };
    },

    addToHistory: async (articleId: string, countryCode: string): Promise<void> => {
        await client.post('/history', { articleId, countryCode });
    },

    removeFromHistory: async (articleId: string): Promise<void> => {
        await client.delete(`/history/${articleId}`);
    },

    clearHistory: async (): Promise<void> => {
        await client.delete('/history');
    },
};
