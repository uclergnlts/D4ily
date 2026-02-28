import apiClient from '../client';
import type { ApiResponse, SystemHealth, CronLogEntry } from '../../types';

export const systemService = {
  getHealth: async (): Promise<SystemHealth> => {
    const response = await apiClient.get<ApiResponse<SystemHealth>>('/admin/system/health');
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'Failed to fetch system health');
    }
    return response.data.data;
  },

  getCronLogs: async (limit = 50, job?: string): Promise<CronLogEntry[]> => {
    const params = new URLSearchParams({ limit: String(limit) });
    if (job) params.set('job', job);
    const response = await apiClient.get<ApiResponse<CronLogEntry[]>>(`/admin/cron/logs?${params}`);
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'Failed to fetch cron logs');
    }
    return response.data.data;
  },
};
