import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID;
const configuredAuthDomain = (import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '').trim();
const defaultAuthDomain = projectId ? `${projectId}.firebaseapp.com` : '';
const isFirebaseHostedDomain =
  configuredAuthDomain.endsWith('.firebaseapp.com') || configuredAuthDomain.endsWith('.web.app');
const authDomain = isFirebaseHostedDomain ? configuredAuthDomain : defaultAuthDomain;

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain,
  projectId,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
