import { client } from '../client';
import { ApiResponse } from '../../types';

export interface CIIData {
    score: number;
    level: 'low' | 'medium' | 'high';
    breakdown: {
        negativeSentimentRatio: number;
        avgEmotionalIntensity: number;
        newsVelocityScore: number;
        avgLoadedLanguage: number;
        avgSensationalism: number;
    };
    articleCount24h: number;
    anomaly: {
        zScore: number;
        level: 'NORMAL' | 'ELEVATED' | 'HIGH' | 'CRITICAL';
        articleCountToday: number;
        avgDailyCount: number;
    };
}

export const ciiService = {
    getAllCII: async (): Promise<Record<string, CIIData>> => {
        const response = await client.get<ApiResponse<Record<string, CIIData>>>('/cii');

        if (!response.data.success) {
            throw new Error(response.data.error || 'Failed to fetch CII');
        }

        return response.data.data;
    },

    getCII: async (country: string): Promise<CIIData> => {
        const response = await client.get<ApiResponse<CIIData>>(`/cii/${country}`);

        if (!response.data.success) {
            throw new Error(response.data.error || 'Failed to fetch CII');
        }

        return response.data.data;
    },
};
