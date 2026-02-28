import apiClient from '../client';
import type { ApiResponse } from '../../types';

export interface Campaign {
  id: string;
  name: string;
  title: string;
  body: string;
  targetAudience: 'all' | 'free' | 'premium' | 'inactive';
  status: 'draft' | 'scheduled' | 'sent';
  scheduledAt: string | null;
  sentAt: string | null;
  sentCount: number;
  deliveredCount: number;
  openedCount: number;
  createdAt: string;
}

interface PaginatedCampaignResponse {
  success: boolean;
  data: {
    campaigns: Campaign[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
  };
}

export interface CreateCampaignForm {
  name: string;
  title: string;
  body: string;
  targetAudience: 'all' | 'free' | 'premium' | 'inactive';
  scheduledAt?: string;
}

export const campaignService = {
  getAll: async (page = 1, limit = 20) => {
    const response = await apiClient.get<PaginatedCampaignResponse>(`/admin/campaigns?page=${page}&limit=${limit}`);
    if (!response.data.success) throw new Error('Failed to fetch campaigns');
    return response.data.data;
  },

  create: async (data: CreateCampaignForm) => {
    const response = await apiClient.post<ApiResponse<{ campaignId: string }>>('/admin/campaigns', data);
    if (!response.data.success) throw new Error(response.data.error || 'Failed to create campaign');
    return response.data.data;
  },

  send: async (campaignId: string) => {
    const response = await apiClient.post<ApiResponse<{ sentCount: number; failedCount: number; totalTargets: number }>>(`/admin/campaigns/${campaignId}/send`);
    if (!response.data.success) throw new Error(response.data.error || 'Failed to send campaign');
    return response.data.data;
  },
};
