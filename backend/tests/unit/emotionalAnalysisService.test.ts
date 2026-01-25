import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock OpenAI
vi.mock('@/config/openai.js', () => ({
    openai: {
        chat: {
            completions: {
                create: vi.fn(),
            },
        },
    },
}));

// Mock Logger
vi.mock('@/config/logger.js', () => ({
    logger: {
        info: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
        debug: vi.fn(),
    },
}));

import {
    analyzeArticleEmotions,
    getEmotionLabelTr,
    getIntensityLabelTr,
    getSensationalismLabelTr,
} from '@/services/ai/emotionalAnalysisService.js';
import { openai } from '@/config/openai.js';

describe('Emotional Analysis Service', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('analyzeArticleEmotions', () => {
        it('should analyze article emotions successfully', async () => {
            vi.mocked(openai.chat.completions.create).mockResolvedValue({
                choices: [{
                    message: {
                        content: JSON.stringify({
                            emotional_tone: {
                                anger: 0.3,
                                fear: 0.2,
                                joy: 0.1,
                                sadness: 0.5,
                                surprise: 0.1,
                            },
                            emotional_intensity: 0.6,
                            loaded_language_score: 0.4,
                            sensationalism_score: 0.3,
                            dominant_emotion: 'sadness',
                            analysis_notes: 'Bu haber huzunlu bir ton tasiyor',
                        }),
                    },
                }],
            } as any);

            const result = await analyzeArticleEmotions(
                'Ekonomi haberi',
                'Test icerik metni',
                'tr'
            );

            expect(result.emotionalTone.anger).toBe(0.3);
            expect(result.emotionalTone.fear).toBe(0.2);
            expect(result.emotionalTone.joy).toBe(0.1);
            expect(result.emotionalTone.sadness).toBe(0.5);
            expect(result.emotionalTone.surprise).toBe(0.1);
            expect(result.emotionalIntensity).toBe(0.6);
            expect(result.loadedLanguageScore).toBe(0.4);
            expect(result.sensationalismScore).toBe(0.3);
            expect(result.dominantEmotion).toBe('sadness');
            expect(result.analysisNotes).toBe('Bu haber huzunlu bir ton tasiyor');
        });

        it('should clamp scores to 0-1 range', async () => {
            vi.mocked(openai.chat.completions.create).mockResolvedValue({
                choices: [{
                    message: {
                        content: JSON.stringify({
                            emotional_tone: {
                                anger: 1.5,  // Over 1
                                fear: -0.3,  // Under 0
                                joy: 0.5,
                                sadness: 0.2,
                                surprise: 2.0,  // Over 1
                            },
                            emotional_intensity: 1.2,  // Over 1
                            loaded_language_score: -0.1,  // Under 0
                            sensationalism_score: 0.5,
                            dominant_emotion: 'anger',
                            analysis_notes: 'Test',
                        }),
                    },
                }],
            } as any);

            const result = await analyzeArticleEmotions('Title', 'Content', 'en');

            expect(result.emotionalTone.anger).toBe(1);  // Clamped to 1
            expect(result.emotionalTone.fear).toBe(0);   // Clamped to 0
            expect(result.emotionalTone.surprise).toBe(1);  // Clamped to 1
            expect(result.emotionalIntensity).toBe(1);  // Clamped to 1
            expect(result.loadedLanguageScore).toBe(0);  // Clamped to 0
        });

        it('should return fallback values on OpenAI error', async () => {
            vi.mocked(openai.chat.completions.create).mockRejectedValue(
                new Error('API Error')
            );

            const result = await analyzeArticleEmotions(
                'Test Title',
                'Test Content',
                'en'
            );

            expect(result.emotionalTone.anger).toBe(0);
            expect(result.emotionalTone.fear).toBe(0);
            expect(result.emotionalTone.joy).toBe(0);
            expect(result.emotionalTone.sadness).toBe(0);
            expect(result.emotionalTone.surprise).toBe(0);
            expect(result.emotionalIntensity).toBe(0);
            expect(result.loadedLanguageScore).toBe(0);
            expect(result.sensationalismScore).toBe(0);
            expect(result.dominantEmotion).toBe('neutral');
            expect(result.analysisNotes).toBe('Analiz yapılamadı');
        });

        it('should handle empty OpenAI response', async () => {
            vi.mocked(openai.chat.completions.create).mockResolvedValue({
                choices: [{
                    message: { content: '{}' },
                }],
            } as any);

            const result = await analyzeArticleEmotions('Title', 'Content', 'en');

            expect(result.emotionalTone.anger).toBe(0);
            expect(result.emotionalTone.fear).toBe(0);
            expect(result.emotionalIntensity).toBe(0);
            expect(result.dominantEmotion).toBe('neutral');
        });

        it('should handle null content response', async () => {
            vi.mocked(openai.chat.completions.create).mockResolvedValue({
                choices: [{
                    message: { content: null },
                }],
            } as any);

            const result = await analyzeArticleEmotions('Title', 'Content', 'en');

            expect(result.dominantEmotion).toBe('neutral');
            expect(result.emotionalIntensity).toBe(0);
        });

        it('should determine dominant emotion from tone scores when not provided', async () => {
            vi.mocked(openai.chat.completions.create).mockResolvedValue({
                choices: [{
                    message: {
                        content: JSON.stringify({
                            emotional_tone: {
                                anger: 0.8,
                                fear: 0.2,
                                joy: 0.1,
                                sadness: 0.3,
                                surprise: 0.1,
                            },
                            emotional_intensity: 0.7,
                            loaded_language_score: 0.5,
                            sensationalism_score: 0.4,
                            // dominant_emotion not provided
                        }),
                    },
                }],
            } as any);

            const result = await analyzeArticleEmotions('Title', 'Content', 'en');

            expect(result.dominantEmotion).toBe('anger');  // Should be calculated
        });

        it('should return neutral when all emotions are very low', async () => {
            vi.mocked(openai.chat.completions.create).mockResolvedValue({
                choices: [{
                    message: {
                        content: JSON.stringify({
                            emotional_tone: {
                                anger: 0.1,
                                fear: 0.1,
                                joy: 0.05,
                                sadness: 0.15,
                                surprise: 0.08,
                            },
                            emotional_intensity: 0.2,
                            loaded_language_score: 0.1,
                            sensationalism_score: 0.1,
                            // dominant_emotion not provided
                        }),
                    },
                }],
            } as any);

            const result = await analyzeArticleEmotions('Title', 'Content', 'en');

            // All emotions below 0.2 threshold, should be neutral
            expect(result.dominantEmotion).toBe('neutral');
        });

        it('should handle missing emotional_tone object', async () => {
            vi.mocked(openai.chat.completions.create).mockResolvedValue({
                choices: [{
                    message: {
                        content: JSON.stringify({
                            emotional_intensity: 0.5,
                            loaded_language_score: 0.3,
                            sensationalism_score: 0.2,
                        }),
                    },
                }],
            } as any);

            const result = await analyzeArticleEmotions('Title', 'Content', 'en');

            expect(result.emotionalTone.anger).toBe(0);
            expect(result.emotionalTone.fear).toBe(0);
            expect(result.emotionalTone.joy).toBe(0);
            expect(result.emotionalTone.sadness).toBe(0);
            expect(result.emotionalTone.surprise).toBe(0);
        });
    });

    describe('getEmotionLabelTr', () => {
        it('should return correct Turkish labels for emotions', () => {
            expect(getEmotionLabelTr('anger')).toBe('Öfke');
            expect(getEmotionLabelTr('fear')).toBe('Korku');
            expect(getEmotionLabelTr('joy')).toBe('Sevinç');
            expect(getEmotionLabelTr('sadness')).toBe('Üzüntü');
            expect(getEmotionLabelTr('surprise')).toBe('Şaşkınlık');
            expect(getEmotionLabelTr('neutral')).toBe('Nötr');
        });

        it('should return Belirsiz for unknown emotions', () => {
            expect(getEmotionLabelTr('unknown')).toBe('Belirsiz');
            expect(getEmotionLabelTr('')).toBe('Belirsiz');
        });
    });

    describe('getIntensityLabelTr', () => {
        it('should return correct intensity labels', () => {
            expect(getIntensityLabelTr(0)).toBe('Çok Düşük');
            expect(getIntensityLabelTr(0.1)).toBe('Çok Düşük');
            expect(getIntensityLabelTr(0.2)).toBe('Düşük');
            expect(getIntensityLabelTr(0.35)).toBe('Düşük');
            expect(getIntensityLabelTr(0.4)).toBe('Orta');
            expect(getIntensityLabelTr(0.55)).toBe('Orta');
            expect(getIntensityLabelTr(0.6)).toBe('Yüksek');
            expect(getIntensityLabelTr(0.75)).toBe('Yüksek');
            expect(getIntensityLabelTr(0.8)).toBe('Çok Yüksek');
            expect(getIntensityLabelTr(1)).toBe('Çok Yüksek');
        });
    });

    describe('getSensationalismLabelTr', () => {
        it('should return correct sensationalism labels', () => {
            expect(getSensationalismLabelTr(0)).toBe('Düşük');
            expect(getSensationalismLabelTr(0.15)).toBe('Düşük');
            expect(getSensationalismLabelTr(0.2)).toBe('Normal');
            expect(getSensationalismLabelTr(0.35)).toBe('Normal');
            expect(getSensationalismLabelTr(0.4)).toBe('Orta');
            expect(getSensationalismLabelTr(0.55)).toBe('Orta');
            expect(getSensationalismLabelTr(0.6)).toBe('Yüksek');
            expect(getSensationalismLabelTr(0.75)).toBe('Yüksek');
            expect(getSensationalismLabelTr(0.8)).toBe('Çok Yüksek');
            expect(getSensationalismLabelTr(1)).toBe('Çok Yüksek');
        });
    });
});
