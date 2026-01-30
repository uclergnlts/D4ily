import { initializeAuth, getReactNativePersistence, GoogleAuthProvider, OAuthProvider, signInWithPopup, User, UserCredential } from 'firebase/auth';
import { initializeApp, getApps, getApp } from 'firebase/app';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';

// Firebase configuration from environment variables
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || '',
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || '',
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || '',
};

// Initialize Firebase App
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Initialize Firebase Auth with AsyncStorage persistence
const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(ReactNativeAsyncStorage)
});

/**
 * Sign in with Google
 * @returns Firebase User object
 */
export const signInWithGoogle = async (): Promise<User> => {
  try {
    const provider = new GoogleAuthProvider();
    const result: UserCredential = await signInWithPopup(auth, provider);
    return result.user;
  } catch (error: any) {
    console.error('Google sign-in error:', error);
    throw new Error(error.message || 'Google ile giriş başarısız');
  }
};

/**
 * Sign in with Apple
 * @returns Firebase User object
 */
export const signInWithApple = async (): Promise<User> => {
  try {
    const provider = new OAuthProvider('apple.com');
    provider.addScope('email');
    provider.addScope('name');
    const result: UserCredential = await signInWithPopup(auth, provider);
    return result.user;
  } catch (error: any) {
    console.error('Apple sign-in error:', error);
    throw new Error(error.message || 'Apple ile giriş başarısız');
  }
};

/**
 * Get the current ID token from Firebase Auth
 * @returns ID token string or null
 */
export const getIdToken = async (): Promise<string | null> => {
  try {
    const user = auth.currentUser;
    if (!user) return null;
    const token = await user.getIdToken();
    return token;
  } catch (error: any) {
    console.error('Get ID token error:', error);
    throw new Error(error.message || 'Token alınamadı');
  }
};

/**
 * Get the current authenticated user
 * @returns Firebase User object or null
 */
export const getCurrentUser = (): User | null => {
  try {
    return auth.currentUser;
  } catch (error) {
    console.error('Get current user error:', error);
    return null;
  }
};

/**
 * Sign out the current user
 */
export const signOut = async (): Promise<void> => {
  try {
    await auth.signOut();
  } catch (error: any) {
    console.error('Sign out error:', error);
    throw new Error(error.message || 'Çıkış başarısız');
  }
};

/**
 * Convert Firebase User to app user format
 * @param firebaseUser Firebase User object
 * @returns App user object
 */
export const firebaseUserToAppUser = (firebaseUser: User) => {
  return {
    uid: firebaseUser.uid,
    email: firebaseUser.email || '',
    name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Kullanıcı',
    role: 'user' as const,
  };
};
