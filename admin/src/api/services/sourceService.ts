import apiClient from '../client';
import type { ApiResponse, RssSource, CreateSourceForm, UpdateSourceForm } from '../../types';

export const sourceService = {
  getAll: async (): Promise<RssSource[]> => {
    const response = await apiClient.get<ApiResponse<RssSource[]>>('/admin/sources');
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'Failed to fetch sources');
    }
    return response.data.data;
  },

  create: async (data: CreateSourceForm): Promise<RssSource> => {
    const response = await apiClient.post<ApiResponse<RssSource>>('/admin/sources', data);
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'Failed to create source');
    }
    return response.data.data;
  },

  update: async (id: number, data: UpdateSourceForm): Promise<RssSource> => {
    const response = await apiClient.patch<ApiResponse<RssSource>>(`/admin/sources/${id}`, data);
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'Failed to update source');
    }
    return response.data.data;
  },

  delete: async (id: number): Promise<void> => {
    const response = await apiClient.delete<ApiResponse<void>>(`/admin/sources/${id}`);
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to delete source');
    }
  },

  scrape: async (id: number): Promise<{ source: string; processed: number; duplicates: number; filtered: number }> => {
    const response = await apiClient.post<ApiResponse<{ source: string; processed: number; duplicates: number; filtered: number }>>(`/admin/scrape/${id}`);
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'Failed to scrape source');
    }
    return response.data.data;
  },

  scrapeAll: async (): Promise<{ totalProcessed: number; totalDuplicates: number; totalFiltered: number }> => {
    const response = await apiClient.post<ApiResponse<{ totalProcessed: number; totalDuplicates: number; totalFiltered: number }>>('/admin/scrape-all');
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'Failed to scrape all sources');
    }
    return response.data.data;
  },
};
