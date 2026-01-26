import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';

interface User {
    uid: string;
    email: string;
    name: string;
    role: 'user' | 'admin';
}

interface AuthState {
    user: User | null;
    token: string | null;
    isLoading: boolean;
    login: (user: User, token: string) => Promise<void>;
    logout: () => Promise<void>;
    checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
    user: null,
    token: null,
    isLoading: true,

    login: async (user, token) => {
        await SecureStore.setItemAsync('auth_token', token);
        await SecureStore.setItemAsync('user_info', JSON.stringify(user));
        set({ user, token });
    },

    logout: async () => {
        await SecureStore.deleteItemAsync('auth_token');
        await SecureStore.deleteItemAsync('user_info');
        set({ user: null, token: null });
    },

    checkAuth: async () => {
        try {
            const token = await SecureStore.getItemAsync('auth_token');
            const userInfo = await SecureStore.getItemAsync('user_info');

            if (token && userInfo) {
                set({ token, user: JSON.parse(userInfo), isLoading: false });
                // Optionally verify token with backend here
            } else {
                set({ isLoading: false });
            }
        } catch (_error) {
            set({ isLoading: false });
        }
    },
}));
