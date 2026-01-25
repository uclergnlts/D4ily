import { client } from '../client';
import { ApiResponse } from '../../types';

export const authService = {
    login: async (email: string, password: string) => {
        const response = await client.post<ApiResponse<any>>('/auth/login', { email, password });

        if (!response.data.success) {
            throw new Error(response.data.error || 'Login failed');
        }

        return response.data.data;
    },

    register: async (email: string, password: string, name: string) => {
        const response = await client.post<ApiResponse<any>>('/auth/register', { email, password, name });

        if (!response.data.success) {
            throw new Error(response.data.error || 'Registration failed');
        }

        return response.data.data;
    }
};
