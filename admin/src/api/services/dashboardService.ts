import apiClient from '../client';
import type { ApiResponse, DashboardStats } from '../../types';

export const dashboardService = {
  getStats: async (): Promise<DashboardStats> => {
    const response = await apiClient.get<ApiResponse<DashboardStats>>('/admin/stats');
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'Failed to fetch stats');
    }
    return response.data.data;
  },
};
