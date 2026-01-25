import apiClient from '../client';
import type { ApiResponse, User, UpdateUserForm, PaginatedResponse } from '../../types';

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
};
