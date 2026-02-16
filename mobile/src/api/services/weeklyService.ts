import { client } from '../client';
import { ApiResponse, WeeklyComparison } from '../../types';

export const weeklyService = {
    getLatest: async (): Promise<WeeklyComparison> => {
        const response = await client.get<ApiResponse<WeeklyComparison>>('/weekly/latest');
        if (!response.data.success) {
            throw new Error(response.data.error || 'Failed to fetch weekly comparison');
        }
        return response.data.data;
    },

    getList: async (): Promise<WeeklyComparison[]> => {
        const response = await client.get<ApiResponse<WeeklyComparison[]>>('/weekly');
        if (!response.data.success) {
            throw new Error(response.data.error || 'Failed to fetch weekly comparisons');
        }
        return response.data.data;
    },

    getById: async (id: string): Promise<WeeklyComparison> => {
        const response = await client.get<ApiResponse<WeeklyComparison>>(`/weekly/${id}`);
        if (!response.data.success) {
            throw new Error(response.data.error || 'Failed to fetch weekly comparison');
        }
        return response.data.data;
    },
};
