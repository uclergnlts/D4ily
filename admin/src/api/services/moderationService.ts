import apiClient from '../client';
import type { ApiResponse } from '../../types';

export interface BlacklistedWord {
  id: string;
  word: string;
  category: 'spam' | 'offensive' | 'political' | 'other';
  createdAt: string;
}

export interface ModerationItem {
  id: string;
  contentType: string;
  contentId: string;
  flaggedBy: string;
  status: string;
  createdAt: string;
  reviewedAt: string | null;
}

interface PaginatedBlacklistResponse {
  success: boolean;
  data: {
    words: BlacklistedWord[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
  };
}

interface PaginatedQueueResponse {
  success: boolean;
  data: {
    items: ModerationItem[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
  };
}

export const moderationService = {
  getBlacklist: async (page = 1, limit = 50, category?: string) => {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (category) params.set('category', category);
    const response = await apiClient.get<PaginatedBlacklistResponse>(`/admin/moderation/blacklist?${params}`);
    if (!response.data.success) throw new Error('Failed to fetch blacklist');
    return response.data.data;
  },

  addBlacklistWord: async (word: string, category: string) => {
    const response = await apiClient.post<ApiResponse<{ wordId: string }>>('/admin/moderation/blacklist', { word, category });
    if (!response.data.success) throw new Error(response.data.error || 'Failed to add word');
    return response.data.data;
  },

  removeBlacklistWord: async (wordId: string) => {
    const response = await apiClient.delete<ApiResponse<void>>(`/admin/moderation/blacklist/${wordId}`);
    if (!response.data.success) throw new Error(response.data.error || 'Failed to remove word');
  },

  getQueue: async (page = 1, limit = 20, status = 'pending', contentType?: string) => {
    const params = new URLSearchParams({ page: String(page), limit: String(limit), status });
    if (contentType) params.set('contentType', contentType);
    const response = await apiClient.get<PaginatedQueueResponse>(`/admin/moderation/queue?${params}`);
    if (!response.data.success) throw new Error('Failed to fetch moderation queue');
    return response.data.data;
  },

  makeDecision: async (itemId: string, action: 'approve' | 'reject' | 'escalate', reason?: string) => {
    const response = await apiClient.post<ApiResponse<{ action: string }>>(`/admin/moderation/queue/${itemId}/decision`, { action, reason });
    if (!response.data.success) throw new Error(response.data.error || 'Failed to process decision');
    return response.data.data;
  },
};
