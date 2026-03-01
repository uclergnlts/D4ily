import apiClient from '../client';
import type { ApiResponse, TwitterAccount, CreateTwitterAccountForm, CountryCode } from '../../types';

export const twitterService = {
  getAll: async (country?: CountryCode): Promise<TwitterAccount[]> => {
    const params = country ? `?country=${country}` : '';
    const response = await apiClient.get<ApiResponse<TwitterAccount[]>>(`/admin/twitter-accounts${params}`);
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'Failed to fetch twitter accounts');
    }
    return response.data.data;
  },

  create: async (data: CreateTwitterAccountForm): Promise<TwitterAccount> => {
    const response = await apiClient.post<ApiResponse<TwitterAccount>>('/admin/twitter-accounts', data);
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'Failed to create twitter account');
    }
    return response.data.data;
  },

  update: async (id: number, data: Partial<CreateTwitterAccountForm>): Promise<TwitterAccount> => {
    const response = await apiClient.patch<ApiResponse<TwitterAccount>>(`/admin/twitter-accounts/${id}`, data);
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'Failed to update twitter account');
    }
    return response.data.data;
  },

  delete: async (id: number): Promise<void> => {
    const response = await apiClient.delete<ApiResponse<void>>(`/admin/twitter-accounts/${id}`);
    if (!response.data.success) throw new Error(response.data.error || 'Failed to delete twitter account');
  },

  bulkImport: async (accounts: CreateTwitterAccountForm[]): Promise<{ inserted: number; skipped: number }> => {
    const response = await apiClient.post<ApiResponse<{ inserted: number; skipped: number }>>('/admin/twitter-accounts/bulk', { accounts });
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'Failed to bulk import twitter accounts');
    }
    return response.data.data;
  },
};
