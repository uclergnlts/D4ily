import { client } from '../client';
import { ApiResponse, Source } from '../../types';
import { getMockSources } from '../mock/mockData';

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
            // Fallback to mock data
            // We need to import getMockSources dynamically or assume it's available if we import it at top
            // To avoid circular deps if any, usually okay for mock.
            // Let's return mock data directly here or import it.
            // For now, let's assume valid import.
            return getMockSources(country || 'tr');
        }
    },

    voteSource: async (sourceId: number, score: number) => {
        const response = await client.post<ApiResponse<any>>(`/sources/${sourceId}/vote`, { score });

        if (!response.data.success) {
            throw new Error(response.data.error || 'Vote failed');
        }

        return response.data.data;
    },

    voteReliability: async (sourceId: number, score: number) => {
        const response = await client.post<ApiResponse<any>>(`/sources/${sourceId}/reliability-vote`, { score });
        if (!response.data.success) {
            throw new Error(response.data.error || 'Reliability vote failed');
        }
        return response.data.data;
    },

    getMyVotes: async (sourceId: number): Promise<{ alignmentVote: number | null; reliabilityVote: number | null }> => {
        try {
            const response = await client.get<ApiResponse<{ alignmentVote: number | null; reliabilityVote: number | null }>>(`/sources/${sourceId}/my-votes`);
            if (!response.data.success) return { alignmentVote: null, reliabilityVote: null };
            return response.data.data;
        } catch {
            return { alignmentVote: null, reliabilityVote: null };
        }
    },
};
