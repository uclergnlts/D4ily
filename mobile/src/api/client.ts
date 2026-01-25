import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { CONFIG } from './config';
import { useAuthStore } from '../store/useAuthStore';

// Create axios instance
export const client = axios.create({
    baseURL: CONFIG.API_URL,
    timeout: CONFIG.TIMEOUT,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request interceptor for auth token
client.interceptors.request.use(
    async (config) => {
        try {
            const token = await SecureStore.getItemAsync('auth_token');
            if (token) {
                config.headers.Authorization = `Bearer ${token}`;
            }
        } catch (error) {
            console.error('Error reading token:', error);
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor for error handling
client.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        // Handle 401 Unauthorized - token expired or invalid
        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;

            // Clear auth state via Zustand store (works outside React components)
            await useAuthStore.getState().logout();

            // Optionally: could implement token refresh logic here
            // For now, just reject and let the app redirect to login
        }

        return Promise.reject(error);
    }
);
