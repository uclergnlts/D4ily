import apiClient from '../client';
import type { ApiResponse, CronStatus } from '../../types';

export const cronService = {
  getStatus: async (): Promise<CronStatus> => {
    const response = await apiClient.get<ApiResponse<CronStatus>>('/admin/cron/status');
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'Failed to fetch cron status');
    }
    return response.data.data;
  },

  runDigest: async (period: 'morning' | 'evening'): Promise<{ digestsCreated: number }> => {
    const response = await apiClient.post<ApiResponse<{ digestsCreated: number }>>('/admin/cron/digest/run', { period });
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'Failed to run digest');
    }
    return response.data.data;
  },

  runWeekly: async (): Promise<{ created: boolean }> => {
    const response = await apiClient.post<ApiResponse<{ created: boolean }>>('/admin/cron/weekly/run');
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'Failed to run weekly comparison');
    }
    return response.data.data;
  },
};
