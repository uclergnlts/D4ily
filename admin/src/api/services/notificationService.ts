import apiClient from '../client';
import type { ApiResponse, NotificationEntry, DeviceStats } from '../../types';

export const notificationService = {
  send: async (data: { title: string; body: string; type?: string; userIds?: string[] }): Promise<{ targetUsers: number; success: number; failed: number }> => {
    const response = await apiClient.post<ApiResponse<{ targetUsers: number; success: number; failed: number }>>('/admin/notifications/send', data);
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'Failed to send notification');
    }
    return response.data.data;
  },

  getHistory: async (limit = 50): Promise<NotificationEntry[]> => {
    const response = await apiClient.get<ApiResponse<NotificationEntry[]>>(`/admin/notifications/history?limit=${limit}`);
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'Failed to fetch notification history');
    }
    return response.data.data;
  },

  getDeviceStats: async (): Promise<DeviceStats> => {
    const response = await apiClient.get<ApiResponse<DeviceStats>>('/admin/notifications/devices');
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'Failed to fetch device stats');
    }
    return response.data.data;
  },
};
