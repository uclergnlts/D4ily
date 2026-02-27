import apiClient from '../client';
import type { ApiResponse, CountryCode, DailyDigestAdmin, DigestQualityMetrics, DigestTopic, DigestSection } from '../../types';

export const digestService = {
  getQuality: async (country: CountryCode, days = 7): Promise<DigestQualityMetrics> => {
    const response = await apiClient.get<ApiResponse<DigestQualityMetrics>>(
      `/admin/digest-quality?country=${country}&days=${days}`
    );

    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'Failed to fetch digest quality metrics');
    }

    return response.data.data;
  },

  getDigests: async (country: CountryCode): Promise<DailyDigestAdmin[]> => {
    const response = await apiClient.get<ApiResponse<DailyDigestAdmin[]>>(`/digest/${country}`);

    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'Failed to fetch digests');
    }

    return response.data.data;
  },

  getDigestById: async (country: CountryCode, digestId: string): Promise<DailyDigestAdmin> => {
    const response = await apiClient.get<ApiResponse<DailyDigestAdmin>>(`/digest/${country}/${digestId}`);

    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'Failed to fetch digest');
    }

    return response.data.data;
  },

  updateDigest: async (country: CountryCode, digestId: string, data: { summaryText?: string; topTopics?: DigestTopic[]; sections?: DigestSection[] }): Promise<DailyDigestAdmin> => {
    const response = await apiClient.patch<ApiResponse<DailyDigestAdmin>>(`/admin/digests/${country}/${digestId}`, data);
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'Failed to update digest');
    }
    return response.data.data;
  },

  deleteDigest: async (country: CountryCode, digestId: string): Promise<void> => {
    const response = await apiClient.delete<ApiResponse<void>>(`/admin/digests/${country}/${digestId}`);
    if (!response.data.success) throw new Error(response.data.error || 'Failed to delete digest');
  },
};
