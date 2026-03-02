import {
  initializeAuth,
  getAuth,
  signInWithCredential,
  GoogleAuthProvider,
  OAuthProvider,
  User,
  type Auth,
} from 'firebase/auth';
import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { Platform } from 'react-native';

// Firebase configuration from environment variables
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || '',
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || '',
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || '',
};

const REQUIRED_CONFIG_KEYS: (keyof typeof firebaseConfig)[] = [
  'apiKey',
  'authDomain',
  'projectId',
  'storageBucket',
  'messagingSenderId',
  'appId',
];

const isPlaceholderValue = (value: string): boolean => {
  const normalized = value.trim().toLowerCase();
  return normalized === '' || normalized.includes('your_') || normalized.includes('example');
};

const missingConfigKeys = REQUIRED_CONFIG_KEYS.filter((key) => isPlaceholderValue(firebaseConfig[key]));
export const isFirebaseConfigured = missingConfigKeys.length === 0;

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let missingConfigWarned = false;

const getFirebaseConfigErrorMessage = () =>
  `Firebase ayari eksik/gecersiz: ${missingConfigKeys.join(', ')}. mobile/.env dosyasina EXPO_PUBLIC_FIREBASE_* degerlerini ekleyin.`;

const ensureAuth = (): Auth => {
  if (!isFirebaseConfigured) {
    if (!missingConfigWarned) {
      console.warn(getFirebaseConfigErrorMessage());
      missingConfigWarned = true;
    }
    throw new Error(getFirebaseConfigErrorMessage());
  }

  if (!app) {
    app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  }

  if (!auth) {
    try {
      auth = getAuth(app);
    } catch {
      auth = initializeAuth(app);
    }
  }

  return auth;
};

/**
 * Sign in with Google
 * Uses expo-auth-session on native, falls back to credential-based auth
 */
export const signInWithGoogle = async (): Promise<User> => {
  if (Platform.OS !== 'web') {
    throw new Error('Google ile giris su an desteklenmiyor. E-posta ile giris yapabilirsiniz.');
  }

  try {
    const authInstance = ensureAuth();
    // Web-only: dynamic import to avoid crash on native
    const { signInWithPopup } = await import('firebase/auth');
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(authInstance, provider);
    return result.user;
  } catch (error: any) {
    console.error('Google sign-in error:', error);
    throw new Error(error.message || 'Google ile giris basarisiz');
  }
};

/**
 * Sign in with Apple
 * Uses expo-auth-session on native, falls back to credential-based auth
 */
export const signInWithApple = async (): Promise<User> => {
  if (Platform.OS !== 'web') {
    throw new Error('Apple ile giris su an desteklenmiyor. E-posta ile giris yapabilirsiniz.');
  }

  try {
    const authInstance = ensureAuth();
    const { signInWithPopup } = await import('firebase/auth');
    const provider = new OAuthProvider('apple.com');
    provider.addScope('email');
    provider.addScope('name');
    const result = await signInWithPopup(authInstance, provider);
    return result.user;
  } catch (error: any) {
    console.error('Apple sign-in error:', error);
    throw new Error(error.message || 'Apple ile giris basarisiz');
  }
};

/**
 * Get the current ID token from Firebase Auth
 */
export const getIdToken = async (): Promise<string | null> => {
  try {
    const authInstance = ensureAuth();
    const user = authInstance.currentUser;
    if (!user) return null;
    return await user.getIdToken();
  } catch (error: any) {
    console.error('Get ID token error:', error);
    throw new Error(error.message || 'Token alinamadi');
  }
};

/**
 * Get the current authenticated user
 */
export const getCurrentUser = (): User | null => {
  try {
    const authInstance = ensureAuth();
    return authInstance.currentUser;
  } catch {
    return null;
  }
};

/**
 * Sign out the current user
 */
export const signOut = async (): Promise<void> => {
  try {
    const authInstance = ensureAuth();
    await authInstance.signOut();
  } catch (error: any) {
    console.error('Sign out error:', error);
    throw new Error(error.message || 'Cikis basarisiz');
  }
};

/**
 * Convert Firebase User to app user format
 */
export const firebaseUserToAppUser = (firebaseUser: User) => {
  return {
    uid: firebaseUser.uid,
    email: firebaseUser.email || '',
    name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Kullanici',
    role: 'user' as const,
  };
};
