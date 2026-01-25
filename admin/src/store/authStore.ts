import { create } from 'zustand';
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
        set({ user: null, isAdmin: false, error: 'Access denied. Admin privileges required.' });
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
      const response = await apiClient.get('/admin/stats');
      if (response.data.success) {
        set({ isAdmin: true });
        return true;
      }
      return false;
    } catch {
      set({ isAdmin: false });
      return false;
    }
  },
}));

// Listen for auth state changes
onAuthStateChanged(auth, async (user) => {
  if (user) {
    useAuthStore.setState({ user, isLoading: true });
    const isAdmin = await useAuthStore.getState().checkAdminStatus();
    useAuthStore.setState({ isLoading: false, isAdmin });
  } else {
    useAuthStore.setState({ user: null, isAdmin: false, isLoading: false });
  }
});
