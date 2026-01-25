import { client } from '../client';
import { ApiResponse, DailyDigest } from '../../types';

export const digestService = {
    getLatestDigest: async (country: string) => {
        // Backend: GET /digest/:country/latest
        const response = await client.get<ApiResponse<DailyDigest>>(`/digest/${country}/latest`);

        if (!response.data.success) {
            throw new Error(response.data.error || 'Failed to fetch digest');
        }

        return response.data.data;
    },

    getDigestById: async (country: string, digestId: string) => {
        const response = await client.get<ApiResponse<DailyDigest>>(`/digest/${country}/${digestId}`);

        if (!response.data.success) {
            throw new Error(response.data.error || 'Failed to fetch digest details');
        }

        return response.data.data;
    }
};
