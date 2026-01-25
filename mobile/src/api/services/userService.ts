import { client } from '../client';
import { ApiResponse, UserProfile, UserReputation } from '../../types';

export const userService = {
    getProfile: async () => {
        const response = await client.get<ApiResponse<UserProfile>>('/user/profile');
        if (!response.data.success) {
            throw new Error(response.data.error || 'Failed to fetch profile');
        }
        return response.data.data;
    },

    getReputation: async () => {
        const response = await client.get<ApiResponse<UserReputation>>('/user/alignment-reputation');
        if (!response.data.success) {
            throw new Error(response.data.error || 'Failed to fetch reputation');
        }
        return response.data.data;
    }
};
