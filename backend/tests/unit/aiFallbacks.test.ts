import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/config/logger.js', () => ({
    logger: {
        info: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
        debug: vi.fn(),
    },
}));

import {
    shouldSkipAI,
    MIN_CONTENT_LENGTH,
    getEmotionalAnalysisFallback,
    getArticleProcessingFallback,
    getEntityExtractionFallback,
    getDigestFallback,
    getWeeklyComparisonFallback,
    detectCategoryFallback,
    detectSentimentFallback,
} from '@/utils/aiFallbacks.js';

describe('AI Fallbacks', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('shouldSkipAI', () => {
        it('should return true for empty content', () => {
            expect(shouldSkipAI('')).toBe(true);
        });

        it('should return true for null/undefined content', () => {
            expect(shouldSkipAI(null as any)).toBe(true);
            expect(shouldSkipAI(undefined as any)).toBe(true);
        });

        it('should return true for short content', () => {
            expect(shouldSkipAI('Short text')).toBe(true);
            expect(shouldSkipAI('A'.repeat(MIN_CONTENT_LENGTH - 1))).toBe(true);
        });

        it('should return false for content at minimum length', () => {
            expect(shouldSkipAI('A'.repeat(MIN_CONTENT_LENGTH))).toBe(false);
        });

        it('should return false for long content', () => {
            expect(shouldSkipAI('A'.repeat(200))).toBe(false);
        });
    });

    describe('getEmotionalAnalysisFallback', () => {
        it('should return Turkish fallback by default', () => {
            const result = getEmotionalAnalysisFallback();
            expect(result.analysisNotes).toBe('Analiz yapılamadı');
            expect(result.dominantEmotion).toBe('neutral');
            expect(result.emotionalIntensity).toBe(0);
            expect(result.loadedLanguageScore).toBe(0);
            expect(result.sensationalismScore).toBe(0);
        });

        it('should return Turkish fallback when isTurkish=true', () => {
            const result = getEmotionalAnalysisFallback(true);
            expect(result.analysisNotes).toBe('Analiz yapılamadı');
        });

        it('should return English fallback when isTurkish=false', () => {
            const result = getEmotionalAnalysisFallback(false);
            expect(result.analysisNotes).toBe('Analysis unavailable');
        });

        it('should return all zero emotion scores', () => {
            const result = getEmotionalAnalysisFallback();
            expect(result.emotionalTone.anger).toBe(0);
            expect(result.emotionalTone.fear).toBe(0);
            expect(result.emotionalTone.joy).toBe(0);
            expect(result.emotionalTone.sadness).toBe(0);
            expect(result.emotionalTone.surprise).toBe(0);
        });
    });

    describe('getArticleProcessingFallback', () => {
        it('should use title as translatedTitle', () => {
            const result = getArticleProcessingFallback('My Title', 'Some content');
            expect(result.translatedTitle).toBe('My Title');
        });

        it('should truncate long content for summary', () => {
            const longContent = 'A'.repeat(300);
            const result = getArticleProcessingFallback('Title', longContent);
            expect(result.summary).toBe(longContent.substring(0, 200) + '...');
        });

        it('should truncate long content for detailContent', () => {
            const longContent = 'A'.repeat(1000);
            const result = getArticleProcessingFallback('Title', longContent);
            expect(result.detailContent).toBe(longContent.substring(0, 800) + '...');
        });

        it('should use title as fallback when content is empty', () => {
            const result = getArticleProcessingFallback('My Title', '');
            expect(result.summary).toBe('My Title');
            expect(result.detailContent).toBe('My Title');
        });

        it('should return neutral defaults', () => {
            const result = getArticleProcessingFallback('Title', 'Content');
            expect(result.isClickbait).toBe(false);
            expect(result.isAd).toBe(false);
            expect(result.category).toBe('Dunya');
            expect(result.topics).toEqual([]);
            expect(result.sentiment).toBe('neutral');
            expect(result.politicalTone).toBe(0);
            expect(result.politicalConfidence).toBe(0);
            expect(result.governmentMentioned).toBe(false);
            expect(result.emotionalTone).toBeNull();
        });
    });

    describe('getEntityExtractionFallback', () => {
        it('should return empty arrays', () => {
            const result = getEntityExtractionFallback();
            expect(result.persons).toEqual([]);
            expect(result.organizations).toEqual([]);
            expect(result.locations).toEqual([]);
            expect(result.events).toEqual([]);
        });
    });

    describe('getDigestFallback', () => {
        it('should return Turkish digest with article count', () => {
            const result = getDigestFallback(10);
            expect(result.articleCount).toBe(10);
            expect(result.summaryText).toContain('10');
            expect(result.summaryText).toContain('haber');
            expect(result.topTopics).toEqual([]);
        });

        it('should return English digest when isTurkish=false', () => {
            const result = getDigestFallback(5, false);
            expect(result.articleCount).toBe(5);
            expect(result.summaryText).toContain('5 articles');
        });

        it('should handle zero articles', () => {
            const result = getDigestFallback(0);
            expect(result.articleCount).toBe(0);
        });
    });

    describe('getWeeklyComparisonFallback', () => {
        it('should return Turkish fallback', () => {
            const result = getWeeklyComparisonFallback(true);
            expect(result.comparisonText).toContain('oluşturulamadı');
            expect(result.countriesData).toEqual({});
        });

        it('should return English fallback', () => {
            const result = getWeeklyComparisonFallback(false);
            expect(result.comparisonText).toContain('could not be generated');
            expect(result.countriesData).toEqual({});
        });
    });

    describe('detectCategoryFallback', () => {
        it('should detect Politika', () => {
            expect(detectCategoryFallback('Seçim haberleri', 'Parti ve hükümet')).toBe('Politika');
        });

        it('should detect Ekonomi', () => {
            expect(detectCategoryFallback('Dolar kuru', 'Borsa ve enflasyon')).toBe('Ekonomi');
        });

        it('should detect Spor', () => {
            expect(detectCategoryFallback('Futbol maçı', 'Lig ve şampiyon')).toBe('Spor');
        });

        it('should detect Teknoloji', () => {
            expect(detectCategoryFallback('Yapay zeka', 'Google ve yazılım')).toBe('Teknoloji');
        });

        it('should detect Saglik', () => {
            expect(detectCategoryFallback('Hastane', 'Doktor ve tedavi')).toBe('Saglik');
        });

        it('should detect Bilim', () => {
            expect(detectCategoryFallback('NASA keşfi', 'Uzay araştırma')).toBe('Bilim');
        });

        it('should detect Kultur', () => {
            expect(detectCategoryFallback('Sinema', 'Film ve konser')).toBe('Kultur');
        });

        it('should default to Dunya for unknown content', () => {
            expect(detectCategoryFallback('Random title', 'Random content')).toBe('Dunya');
        });

        it('should be case insensitive', () => {
            expect(detectCategoryFallback('FUTBOL', 'MAÇ')).toBe('Spor');
        });
    });

    describe('detectSentimentFallback', () => {
        it('should detect positive sentiment', () => {
            expect(detectSentimentFallback('Büyük başarı ve artış harika güzel olumlu')).toBe('positive');
        });

        it('should detect negative sentiment', () => {
            expect(detectSentimentFallback('Kriz ve düşüş felaket olumsuz tehlike kötü')).toBe('negative');
        });

        it('should default to neutral', () => {
            expect(detectSentimentFallback('Normal bir haber metni')).toBe('neutral');
        });

        it('should return neutral when scores are close', () => {
            expect(detectSentimentFallback('başarı ve kriz')).toBe('neutral');
        });
    });
});
