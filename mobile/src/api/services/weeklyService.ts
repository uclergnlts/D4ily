import { client } from '../client';
import { ApiResponse, WeeklyComparison } from '../../types';

export const weeklyService = {
    getLatest: async (): Promise<WeeklyComparison | null> => {
        try {
            const response = await client.get<ApiResponse<WeeklyComparison>>('/weekly/latest');
            if (!response.data.success) {
                return null;
            }
            return response.data.data;
        } catch (error: any) {
            if (error?.status === 404 || error?.status === 500) {
                return null;
            }
            throw error;
        }
    },

    getList: async (): Promise<WeeklyComparison[]> => {
        try {
            const response = await client.get<ApiResponse<WeeklyComparison[]>>('/weekly');
            if (!response.data.success) {
                return [];
            }
            return response.data.data;
        } catch (error: any) {
            if (error?.status === 404 || error?.status === 500) {
                return [];
            }
            throw error;
        }
    },

    getById: async (id: string): Promise<WeeklyComparison> => {
        const response = await client.get<ApiResponse<WeeklyComparison>>(`/weekly/${id}`);
        if (!response.data.success) {
            throw new Error(response.data.error || 'Failed to fetch weekly comparison');
        }
        return response.data.data;
    },
};
