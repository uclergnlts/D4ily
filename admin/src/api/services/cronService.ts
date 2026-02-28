import apiClient from '../client';
import type { ApiResponse, CronStatus } from '../../types';

export interface DigestCountryStatus {
  country: string;
  status: 'pending' | 'running' | 'success' | 'error';
  error?: string;
  startedAt?: number;
  finishedAt?: number;
}

export interface DigestJobStatus {
  running: boolean;
  trigger: 'manual' | 'cron' | 'recovery' | null;
  startedAt: number | null;
  currentCountry: string | null;
  countries: DigestCountryStatus[];
  finishedAt: number | null;
  error: string | null;
}

export const cronService = {
  getStatus: async (): Promise<CronStatus> => {
    const response = await apiClient.get<ApiResponse<CronStatus>>('/admin/cron/status');
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'Failed to fetch cron status');
    }
    return response.data.data;
  },

  runDigest: async (): Promise<{ accepted: boolean; message: string }> => {
    const response = await apiClient.post<ApiResponse<{ accepted: boolean; message: string }>>('/admin/cron/digest/run');
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'Failed to run digest');
    }
    return response.data.data;
  },

  runWeekly: async (): Promise<{ created: boolean }> => {
    const response = await apiClient.post<ApiResponse<{ created: boolean }>>('/admin/cron/weekly/run');
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'Failed to run weekly comparison');
    }
    return response.data.data;
  },

  getDigestStatus: async (): Promise<DigestJobStatus> => {
    const response = await apiClient.get<ApiResponse<DigestJobStatus>>('/admin/cron/digest/status');
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'Failed to fetch digest status');
    }
    return response.data.data;
  },

  runScraper: async (): Promise<{ message: string }> => {
    const response = await apiClient.post<ApiResponse<{ message: string }>>('/admin/scrape-trigger');
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to run scraper');
    }
    return { message: response.data.data?.message || 'Scraper started' };
  },
};
