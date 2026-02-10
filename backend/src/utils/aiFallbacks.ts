import { logger } from '../config/logger.js';

/**
 * Fallback strategies when AI services fail
 */

export interface EmotionalToneFallback {
    anger: number;
    fear: number;
    joy: number;
    sadness: number;
    surprise: number;
}

export interface EmotionalAnalysisFallback {
    emotionalTone: EmotionalToneFallback;
    emotionalIntensity: number;
    loadedLanguageScore: number;
    sensationalismScore: number;
    dominantEmotion: string;
    analysisNotes: string;
}

export interface ProcessedArticleFallback {
    translatedTitle: string;
    summary: string;
    detailContent: string;
    isClickbait: boolean;
    isAd: boolean;
    category: string;
    topics: string[];
    sentiment: 'positive' | 'neutral' | 'negative';
    politicalTone: number;
    politicalConfidence: number;
    governmentMentioned: boolean;
    emotionalTone: EmotionalToneFallback | null;
    emotionalIntensity: number | null;
    loadedLanguageScore: number | null;
    sensationalismScore: number | null;
}

export interface EntityFallback {
    persons: string[];
    organizations: string[];
    locations: string[];
    events: string[];
}

export interface DigestFallback {
    summaryText: string;
    topTopics: { title: string; description: string }[];
    articleCount: number;
}

export interface WeeklyComparisonFallback {
    countriesData: Record<string, any>;
    comparisonText: string;
}

/**
 * Minimum content length to process with AI
 * Skip AI for very short content
 */
export const MIN_CONTENT_LENGTH = 50;

/**
 * Check if content is too short for AI processing
 */
export function shouldSkipAI(content: string): boolean {
    return !content || content.length < MIN_CONTENT_LENGTH;
}

/**
 * Fallback for emotional analysis when AI fails
 */
export function getEmotionalAnalysisFallback(isTurkish: boolean = true): EmotionalAnalysisFallback {
    logger.debug('Using emotional analysis fallback');
    return {
        emotionalTone: {
            anger: 0,
            fear: 0,
            joy: 0,
            sadness: 0,
            surprise: 0,
        },
        emotionalIntensity: 0,
        loadedLanguageScore: 0,
        sensationalismScore: 0,
        dominantEmotion: 'neutral',
        analysisNotes: isTurkish ? 'Analiz yapılamadı' : 'Analysis unavailable',
    };
}

/**
 * Fallback for article processing when AI fails
 */
export function getArticleProcessingFallback(
    title: string,
    content: string
): ProcessedArticleFallback {
    logger.debug({ title: title.substring(0, 50) }, 'Using article processing fallback');

    // Extract a basic summary from content
    const summary = content.length > 200
        ? content.substring(0, 200) + '...'
        : content || title;

    const detailContent = content.length > 800
        ? content.substring(0, 800) + '...'
        : content || title;

    return {
        translatedTitle: title,
        summary,
        detailContent,
        isClickbait: false,
        isAd: false,
        category: 'Dunya',
        topics: [],
        sentiment: 'neutral',
        politicalTone: 0,
        politicalConfidence: 0,
        governmentMentioned: false,
        emotionalTone: null,
        emotionalIntensity: null,
        loadedLanguageScore: null,
        sensationalismScore: null,
    };
}

/**
 * Fallback for entity extraction when AI fails
 */
export function getEntityExtractionFallback(): EntityFallback {
    logger.debug('Using entity extraction fallback');
    return {
        persons: [],
        organizations: [],
        locations: [],
        events: [],
    };
}

/**
 * Fallback for digest generation when AI fails
 */
export function getDigestFallback(
    articleCount: number,
    isTurkish: boolean = true
): DigestFallback {
    logger.debug({ articleCount }, 'Using digest fallback');
    return {
        summaryText: isTurkish
            ? `Bugün ${articleCount} haber işlendi. Önemli gelişmeler için haberleri inceleyiniz.`
            : `${articleCount} articles were processed today. Please check the news for important developments.`,
        topTopics: [],
        articleCount,
    };
}

/**
 * Fallback for weekly comparison when AI fails
 */
export function getWeeklyComparisonFallback(isTurkish: boolean = true): WeeklyComparisonFallback {
    logger.debug('Using weekly comparison fallback');
    return {
        countriesData: {},
        comparisonText: isTurkish
            ? 'Bu haftanın karşılaştırması oluşturulamadı.'
            : 'Weekly comparison could not be generated.',
    };
}

/**
 * Simple keyword-based category detection (fallback)
 */
export function detectCategoryFallback(title: string, content: string): string {
    const text = (title + ' ' + content).toLowerCase();

    const categoryKeywords: Record<string, string[]> = {
        'Politika': ['siyaset', 'parti', 'seçim', 'hükümet', 'meclis', 'bakan', 'cumhurbaşkan', 'politik'],
        'Ekonomi': ['ekonomi', 'borsa', 'dolar', 'euro', 'faiz', 'enflasyon', 'bütçe', 'finans'],
        'Spor': ['futbol', 'basketbol', 'maç', 'şampiyon', 'lig', 'takım', 'sporcu', 'gol'],
        'Teknoloji': ['teknoloji', 'yazılım', 'uygulama', 'apple', 'google', 'yapay zeka', 'ai', 'internet'],
        'Saglik': ['sağlık', 'hastane', 'doktor', 'tedavi', 'ilaç', 'covid', 'aşı', 'hastalık'],
        'Bilim': ['bilim', 'araştırma', 'uzay', 'nasa', 'keşif', 'bilimsel', 'laboratuvar'],
        'Kultur': ['kültür', 'sanat', 'sinema', 'film', 'müze', 'tiyatro', 'konser', 'müzik'],
    };

    for (const [category, keywords] of Object.entries(categoryKeywords)) {
        for (const keyword of keywords) {
            if (text.includes(keyword)) {
                return category;
            }
        }
    }

    return 'Dunya';
}

/**
 * Simple sentiment detection (fallback)
 */
export function detectSentimentFallback(content: string): 'positive' | 'neutral' | 'negative' {
    const text = content.toLowerCase();

    const positiveWords = ['başarı', 'artış', 'mutlu', 'kazanç', 'olumlu', 'iyi', 'güzel', 'harika'];
    const negativeWords = ['kriz', 'düşüş', 'ölüm', 'felaket', 'olumsuz', 'kötü', 'tehlike', 'sorun'];

    let positiveScore = 0;
    let negativeScore = 0;

    for (const word of positiveWords) {
        if (text.includes(word)) positiveScore++;
    }

    for (const word of negativeWords) {
        if (text.includes(word)) negativeScore++;
    }

    if (positiveScore > negativeScore + 1) return 'positive';
    if (negativeScore > positiveScore + 1) return 'negative';
    return 'neutral';
}
