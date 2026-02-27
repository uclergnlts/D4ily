import axios from 'axios';
import { auth } from '../config/firebase';

const rawApiUrl = (import.meta.env.VITE_API_URL || '').trim();
const API_BASE_URL = rawApiUrl
  ? (/^https?:\/\//i.test(rawApiUrl) ? rawApiUrl : `https://${rawApiUrl}`)
  : 'http://localhost:3333';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 120000, // Increased to 120s for long-running operations like digest generation
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
apiClient.interceptors.request.use(async (config) => {
  const user = auth.currentUser;
  if (user) {
    const token = await user.getIdToken();
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle response errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      void auth.signOut();
      if (window.location.pathname !== '/login') {
        window.location.replace('/login');
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;
