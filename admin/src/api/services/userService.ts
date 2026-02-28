import apiClient from '../client';
import type { ApiResponse, User, UpdateUserForm, PaginatedResponse } from '../../types';

interface UserDevice {
  id: string;
  deviceType: 'ios' | 'android';
  isActive: boolean;
  lastActive: string;
}

interface BanStatus {
  id: string;
  reason: string;
  bannedAt: string;
  expiresAt: string | null;
}

interface UserDetails {
  user: User;
  devices: UserDevice[];
  banStatus: BanStatus | null;
}

export const userService = {
  getAll: async (page = 1, limit = 20): Promise<{ users: User[]; pagination: { page: number; limit: number; hasMore: boolean } }> => {
    const response = await apiClient.get<PaginatedResponse<User>>(`/admin/users?page=${page}&limit=${limit}`);
    if (!response.data.success || !response.data.data) {
      throw new Error('Failed to fetch users');
    }
    return response.data.data;
  },

  getById: async (id: string): Promise<User> => {
    const response = await apiClient.get<ApiResponse<User>>(`/admin/users/${id}`);
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'Failed to fetch user');
    }
    return response.data.data;
  },

  update: async (id: string, data: UpdateUserForm): Promise<User> => {
    const response = await apiClient.patch<ApiResponse<User>>(`/admin/users/${id}`, data);
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'Failed to update user');
    }
    return response.data.data;
  },

  getDetails: async (id: string): Promise<UserDetails> => {
    const response = await apiClient.get<ApiResponse<UserDetails>>(`/admin/users/${id}`);
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'Failed to fetch user details');
    }
    return response.data.data;
  },

  ban: async (id: string, reason: string, durationDays?: number): Promise<void> => {
    const response = await apiClient.post<ApiResponse<{ banId: string; expiresAt: string | null }>>(`/admin/users/${id}/ban`, { reason, durationDays });
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to ban user');
    }
  },

  unban: async (id: string): Promise<void> => {
    const response = await apiClient.post<ApiResponse<{ message: string }>>(`/admin/users/${id}/unban`);
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to unban user');
    }
  },
};
