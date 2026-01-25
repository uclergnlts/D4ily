import { client } from '../client';
import { ApiResponse } from '../../types';

export const sourceService = {
    voteSource: async (sourceId: number, score: number) => {
        // Backend API: POST /sources/:id/vote
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
