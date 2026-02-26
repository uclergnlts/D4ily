import { create } from 'zustand';
import axios from 'axios';
import {
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';
import { auth, googleProvider } from '../config/firebase';
import apiClient from '../api/client';

interface AuthState {
  user: FirebaseUser | null;
  isAdmin: boolean;
  isLoading: boolean;
  error: string | null;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  checkAdminStatus: () => Promise<boolean>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAdmin: false,
  isLoading: true,
  error: null,

  signInWithGoogle: async () => {
    try {
      set({ isLoading: true, error: null });
      const result = await signInWithPopup(auth, googleProvider);
      set({ user: result.user });

      // Sync user to database (creates user if doesn't exist)
      try {
        await apiClient.post('/auth/sync');
      } catch {
        // User sync failed, but continue to check admin status
      }

      // Check admin status
      const isAdmin = await get().checkAdminStatus();
      if (!isAdmin) {
        await firebaseSignOut(auth);
        const currentError = get().error;
        set({
          user: null,
          isAdmin: false,
          error: currentError || 'Access denied. Admin privileges required.',
        });
      }
    } catch (error) {
      set({ error: (error as Error).message });
    } finally {
      set({ isLoading: false });
    }
  },

  signOut: async () => {
    try {
      await firebaseSignOut(auth);
      set({ user: null, isAdmin: false });
    } catch (error) {
      set({ error: (error as Error).message });
    }
  },

  checkAdminStatus: async () => {
    try {
      const response = await apiClient.get('/admin/access');
      if (response.data.success) {
        set({ isAdmin: true, error: null });
        return true;
      }
      set({ isAdmin: false });
      return false;
    } catch (error) {
      const status = axios.isAxiosError(error) ? error.response?.status : undefined;

      // Backward compatibility for environments where /admin/access is not deployed yet.
      if (status === 404) {
        try {
          const fallbackResponse = await apiClient.get('/admin/stats');
          if (fallbackResponse.data.success) {
            set({ isAdmin: true, error: null });
            return true;
          }
        } catch (fallbackError) {
          const fallbackStatus = axios.isAxiosError(fallbackError)
            ? fallbackError.response?.status
            : undefined;

          if (fallbackStatus === 403 || fallbackStatus === 404) {
            set({ isAdmin: false });
            return false;
          }
        }
      }

      if (status === 403) {
        set({ isAdmin: false });
        return false;
      }

      set({ isAdmin: false, error: 'Admin API baglantisi basarisiz. VITE_API_URL degerini kontrol edin.' });
      return false;
    }
  },
}));

// Listen for auth state changes
const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
  if (user) {
    useAuthStore.setState({ user, isLoading: true });
    try {
      const isAdmin = await useAuthStore.getState().checkAdminStatus();
      useAuthStore.setState({ isLoading: false, isAdmin });
    } catch {
      useAuthStore.setState({ isLoading: false, isAdmin: false, error: 'Failed to verify admin status' });
    }
  } else {
    useAuthStore.setState({ user: null, isAdmin: false, isLoading: false });
  }
});

// Export cleanup function for testing or hot reloading
export { unsubscribeAuth };
