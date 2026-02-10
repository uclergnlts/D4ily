import { client } from '../client';
import { ApiResponse, Source } from '../../types';

export const sourceService = {
    getSources: async (country?: string): Promise<Source[]> => {
        const params: any = {};
        if (country) params.country = country;
        try {
            const response = await client.get<ApiResponse<Source[]>>('/sources', { params });
            if (!response.data.success) throw new Error(response.data.error || 'Failed to fetch sources');
            return response.data.data;
        } catch (error) {
            console.warn('API connection failed for sources', error);
            return [];
        }
    },

    voteSource: async (sourceId: number, score: number) => {
        const response = await client.post<ApiResponse<any>>(`/sources/${sourceId}/vote`, { score });

        if (!response.data.success) {
            throw new Error(response.data.error || 'Vote failed');
        }

        return response.data.data;
    },

    getSource: async (sourceId: number) => {
        // Logic for fetching source details if needed
    }
};
