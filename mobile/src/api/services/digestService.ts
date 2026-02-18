import { client } from '../client';
import { ApiResponse, DailyDigest } from '../../types';

export const digestService = {
    getLatestDigest: async (country: string): Promise<DailyDigest | null> => {
        // Backend: GET /digest/:country/latest
        try {
            const response = await client.get<ApiResponse<DailyDigest>>(`/digest/${country}/latest`);

            if (!response.data.success) {
                return null;
            }

            return response.data.data;
        } catch (error: any) {
            if (error?.status === 404) {
                return null;
            }
            throw error;
        }
    },

    getDigests: async (country: string): Promise<DailyDigest[]> => {
        // Backend: GET /digest/:country (returns list of recent digests)
        try {
            const response = await client.get<ApiResponse<DailyDigest[]>>(`/digest/${country}`);

            if (!response.data.success) {
                return [];
            }

            return response.data.data;
        } catch (error: any) {
            if (error?.status === 404) {
                return [];
            }
            console.warn('Failed to fetch digests:', error?.message);
            return [];
        }
    },

    getDigestById: async (country: string, digestId: string) => {
        const response = await client.get<ApiResponse<DailyDigest>>(`/digest/${country}/${digestId}`);

        if (!response.data.success) {
            throw new Error(response.data.error || 'Failed to fetch digest details');
        }

        return response.data.data;
    },

    getNewsLocations: async (days: number = 7): Promise<Record<string, NewsLocationData>> => {
        try {
            const response = await client.get<ApiResponse<Record<string, NewsLocationData>>>(`/digest/locations?days=${days}`);
            if (!response.data.success) throw new Error(response.data.error || 'Failed to fetch locations');
            return response.data.data;
        } catch (error) {
            console.warn('Failed to fetch news locations', error);
            return {};
        }
    },
};

export interface NewsLocationData {
    countryCode: string;
    digestCount: number;
    topTopics: {
        title: string;
        description: string;
        date: string;
        period: string;
    }[];
}
