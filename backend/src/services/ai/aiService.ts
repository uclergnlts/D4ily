import { openai } from '../../config/openai.js';
import { logger } from '../../config/logger.js';
import crypto from 'crypto';

// Simple in-memory cache for AI results (reduces API costs for duplicate content)
const aiCache = new Map<string, { result: ProcessedArticle; timestamp: number }>();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

// Cleanup expired cache entries every hour
setInterval(() => {
    const now = Date.now();
    let cleaned = 0;
    for (const [key, entry] of aiCache.entries()) {
        if (now - entry.timestamp > CACHE_TTL_MS) {
            aiCache.delete(key);
            cleaned++;
        }
    }
    if (cleaned > 0) {
        logger.debug({ cleaned, remaining: aiCache.size }, 'AI cache cleanup completed');
    }
}, 60 * 60 * 1000);

function generateCacheKey(title: string, content: string): string {
    const hash = crypto.createHash('md5').update(title + content.substring(0, 500)).digest('hex');
    return hash;
}

export interface EmotionalTone {
    anger: number;
    fear: number;
    joy: number;
    sadness: number;
    surprise: number;
}

export interface ProcessedArticle {
    translatedTitle: string;
    summary: string;
    isClickbait: boolean;
    isAd: boolean;
    category: string;
    topics: string[];
    sentiment: 'positive' | 'neutral' | 'negative';
    // Political tone analysis
    politicalTone: number;  // -5 (muhalif) to +5 (iktidar yanlısı)
    politicalConfidence: number;  // 0 to 1
    governmentMentioned: boolean;  // Does the article mention government/politics?
    // Emotional analysis
    emotionalTone: EmotionalTone | null;
    emotionalIntensity: number | null;
    loadedLanguageScore: number | null;
    sensationalismScore: number | null;
}

export async function processArticleWithAI(
    title: string,
    content: string,
    language: string
): Promise<ProcessedArticle> {
    // Fallback if content is too short
    if (!content || content.length < 50) {
        return {
            translatedTitle: title,
            summary: content || title,
            isClickbait: false,
            isAd: false,
            category: 'Dünya',
            topics: [],
            sentiment: 'neutral',
            politicalTone: 0,
            politicalConfidence: 0,
            governmentMentioned: false,
            emotionalTone: null,
            emotionalIntensity: 0,
            loadedLanguageScore: 0,
            sensationalismScore: 0,
        };
    }

    // Check cache first
    const cacheKey = generateCacheKey(title, content);
    const cached = aiCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
        logger.debug({ cacheKey: cacheKey.substring(0, 8) }, 'AI cache hit');
        return cached.result;
    }

    try {
        const prompt = `Analyze the following news article and return a JSON response:

Title: ${title}
Content: ${content.substring(0, 1500)}

Provide:
1. translated_title: Translate to Turkish
2. summary: 1-2 sentence summary in Turkish
3. is_clickbait: Is this clickbait? (true/false)
4. is_ad: Is this an advertisement? (true/false)
5. category: One of: Politika, Ekonomi, Spor, Teknoloji, Sağlık, Bilim, Kültür, Dünya
6. topics: Array of hashtags (e.g., ["#Ekonomi", "#Enflasyon"])
7. sentiment: positive, neutral, or negative
8. political_tone: Integer from -5 to +5 analyzing the article's political stance:
   - -5 to -3: Strongly critical of government, opposition-aligned framing
   - -2 to -1: Mildly critical of government
   - 0: Neutral/balanced reporting
   - +1 to +2: Mildly favorable to government
   - +3 to +5: Strongly favorable to government, pro-government framing
   If the article is not political, use 0.
9. political_confidence: Float from 0 to 1 indicating how confident you are in the political_tone score.
   Use low values (0-0.4) if article has no clear political content.
10. government_mentioned: Does this article discuss government, political parties, or political figures? (true/false)
11. emotional_tone: Object with emotion scores (0-1 each):
    - anger: Level of angry/outraged tone
    - fear: Level of fear/worry inducing content
    - joy: Level of positive/happy content
    - sadness: Level of sad/melancholic content
    - surprise: Level of shocking/unexpected content
12. emotional_intensity: Overall emotional intensity (0-1). 0=neutral factual, 0.5=normal news, 1=highly charged
13. loaded_language_score: Use of biased/manipulative language (0-1). 0=neutral, 1=heavy manipulation
14. sensationalism_score: Level of sensationalism (0-1). 0=factual, 1=highly sensationalist

Return ONLY valid JSON, no additional text.`;

        const response = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                {
                    role: 'system',
                    content: 'You are a Turkish news analysis AI. Analyze political tone objectively based on framing, word choice, and emphasis. Always respond with valid JSON only.',
                },
                {
                    role: 'user',
                    content: prompt,
                },
            ],
            response_format: { type: 'json_object' },
            temperature: 0.3,
        });

        const result = JSON.parse(response.choices[0].message.content || '{}');

        // Validate and clamp political_tone
        let politicalTone = parseInt(result.political_tone) || 0;
        politicalTone = Math.max(-5, Math.min(5, politicalTone));

        // Validate political_confidence
        let politicalConfidence = parseFloat(result.political_confidence) || 0.5;
        politicalConfidence = Math.max(0, Math.min(1, politicalConfidence));

        // Parse emotional tone
        const emotionalTone: EmotionalTone | null = result.emotional_tone ? {
            anger: clampScoreWithDefault(result.emotional_tone.anger),
            fear: clampScoreWithDefault(result.emotional_tone.fear),
            joy: clampScoreWithDefault(result.emotional_tone.joy),
            sadness: clampScoreWithDefault(result.emotional_tone.sadness),
            surprise: clampScoreWithDefault(result.emotional_tone.surprise),
        } : null;

        logger.info({
            title: title.substring(0, 50),
            politicalTone,
            politicalConfidence,
            emotionalIntensity: result.emotional_intensity,
        }, 'Article processed with OpenAI');

        const processedResult: ProcessedArticle = {
            translatedTitle: result.translated_title || title,
            summary: result.summary || '',
            isClickbait: result.is_clickbait || false,
            isAd: result.is_ad || false,
            category: result.category || 'Dünya',
            topics: result.topics || [],
            sentiment: result.sentiment || 'neutral',
            politicalTone,
            politicalConfidence,
            governmentMentioned: result.government_mentioned || false,
            emotionalTone,
            emotionalIntensity: clampScore(result.emotional_intensity),
            loadedLanguageScore: clampScore(result.loaded_language_score),
            sensationalismScore: clampScore(result.sensationalism_score),
        };

        // Store in cache
        aiCache.set(cacheKey, { result: processedResult, timestamp: Date.now() });
        logger.debug({ cacheKey: cacheKey.substring(0, 8), cacheSize: aiCache.size }, 'AI result cached');

        return processedResult;
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        const errorStack = error instanceof Error ? error.stack : undefined;

        logger.error({
            error: errorMessage,
            stack: errorStack,
            title: title.substring(0, 50),
            hint: 'Check OpenAI API Key, Quota, or Internet Connection'
        }, 'OpenAI processing failed');

        // Fallback: return basic data without AI processing
        return {
            translatedTitle: title,
            summary: content.substring(0, 200),
            isClickbait: false,
            isAd: false,
            category: 'Dünya',
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
}

/**
 * Clamp a score to 0-1 range, returns null if undefined
 */
function clampScore(value: number | undefined): number | null {
    if (value === undefined || value === null || isNaN(value)) return null;
    return Math.max(0, Math.min(1, value));
}

/**
 * Clamp a score to 0-1 range, returns 0 as default
 */
function clampScoreWithDefault(value: number | undefined): number {
    if (value === undefined || value === null || isNaN(value)) return 0;
    return Math.max(0, Math.min(1, value));
}

/**
 * Get political tone label based on score
 */
export function getPoliticalToneLabel(tone: number, confidence: number): string {
    if (confidence < 0.4) return 'Belirsiz';

    if (tone <= -3) return 'Hükümete Eleştirel';
    if (tone <= -1) return 'Hafif Eleştirel';
    if (tone === 0) return 'Nötr';
    if (tone <= 2) return 'Hafif Olumlu';
    return 'Hükümete Olumlu';
}

/**
 * Get political tone label in English
 */
export function getPoliticalToneLabelEn(tone: number, confidence: number): string {
    if (confidence < 0.4) return 'Uncertain';

    if (tone <= -3) return 'Critical of Government';
    if (tone <= -1) return 'Mildly Critical';
    if (tone === 0) return 'Neutral';
    if (tone <= 2) return 'Mildly Favorable';
    return 'Favorable to Government';
}
