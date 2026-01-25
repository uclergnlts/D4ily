import { openai } from '../../config/openai.js';
import { logger } from '../../config/logger.js';

export interface EmotionalTone {
    anger: number;    // 0-1
    fear: number;     // 0-1
    joy: number;      // 0-1
    sadness: number;  // 0-1
    surprise: number; // 0-1
}

export interface EmotionalAnalysis {
    emotionalTone: EmotionalTone;
    emotionalIntensity: number;      // 0-1 (overall intensity)
    loadedLanguageScore: number;     // 0-1 (biased/loaded language usage)
    sensationalismScore: number;     // 0-1 (sensationalist content)
    dominantEmotion: string;         // The most prominent emotion
    analysisNotes: string;           // Brief explanation
}

/**
 * Analyze the emotional tone of an article using AI
 */
export async function analyzeArticleEmotions(
    title: string,
    content: string,
    language: string
): Promise<EmotionalAnalysis> {
    try {
        const prompt = `Analyze the emotional tone and linguistic characteristics of this news article.

Title: ${title}
Content: ${content.substring(0, 2000)}
Language: ${language}

Provide a JSON response with:
1. emotional_tone: Object with emotion scores (0-1 each):
   - anger: Level of angry/outraged tone
   - fear: Level of fear/worry inducing content
   - joy: Level of positive/happy content
   - sadness: Level of sad/melancholic content
   - surprise: Level of shocking/unexpected content

2. emotional_intensity: Overall emotional intensity (0-1)
   - 0: Completely neutral, factual reporting
   - 0.3-0.5: Normal news with some emotional content
   - 0.6-0.8: Strong emotional appeal
   - 0.9-1: Highly emotionally charged

3. loaded_language_score: Use of biased/loaded language (0-1)
   - 0: Completely neutral language
   - 0.5: Some loaded terms
   - 1: Heavy use of emotionally manipulative language

4. sensationalism_score: Level of sensationalism (0-1)
   - 0: Factual, balanced reporting
   - 0.5: Some exaggeration or dramatic framing
   - 1: Highly sensationalist, clickbait-style

5. dominant_emotion: The most prominent emotion (anger/fear/joy/sadness/surprise/neutral)

6. analysis_notes: Brief Turkish explanation (1-2 sentences) of the emotional framing

Return ONLY valid JSON, no additional text.`;

        const response = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                {
                    role: 'system',
                    content: 'You are an expert media analyst specializing in emotional content analysis and detecting manipulative framing in news articles. Analyze objectively and return valid JSON only.',
                },
                {
                    role: 'user',
                    content: prompt,
                },
            ],
            response_format: { type: 'json_object' },
            temperature: 0.2,
        });

        const result = JSON.parse(response.choices[0].message.content || '{}');

        // Validate and normalize emotional tone values
        const emotionalTone: EmotionalTone = {
            anger: clampScore(result.emotional_tone?.anger),
            fear: clampScore(result.emotional_tone?.fear),
            joy: clampScore(result.emotional_tone?.joy),
            sadness: clampScore(result.emotional_tone?.sadness),
            surprise: clampScore(result.emotional_tone?.surprise),
        };

        const analysis: EmotionalAnalysis = {
            emotionalTone,
            emotionalIntensity: clampScore(result.emotional_intensity),
            loadedLanguageScore: clampScore(result.loaded_language_score),
            sensationalismScore: clampScore(result.sensationalism_score),
            dominantEmotion: result.dominant_emotion || getDominantEmotion(emotionalTone),
            analysisNotes: result.analysis_notes || '',
        };

        logger.info({
            title: title.substring(0, 50),
            dominantEmotion: analysis.dominantEmotion,
            intensity: analysis.emotionalIntensity,
        }, 'Emotional analysis completed');

        return analysis;
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        logger.error({
            error: errorMessage,
            title: title.substring(0, 50)
        }, 'Emotional analysis failed');

        // Return neutral fallback
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
            analysisNotes: 'Analiz yapılamadı',
        };
    }
}

/**
 * Clamp a score to 0-1 range
 */
function clampScore(value: number | undefined): number {
    if (value === undefined || isNaN(value)) return 0;
    return Math.max(0, Math.min(1, value));
}

/**
 * Determine the dominant emotion from tone scores
 */
function getDominantEmotion(tone: EmotionalTone): string {
    const emotions = [
        { name: 'anger', value: tone.anger },
        { name: 'fear', value: tone.fear },
        { name: 'joy', value: tone.joy },
        { name: 'sadness', value: tone.sadness },
        { name: 'surprise', value: tone.surprise },
    ];

    const maxEmotion = emotions.reduce((max, curr) =>
        curr.value > max.value ? curr : max
    );

    // If all scores are very low, consider it neutral
    if (maxEmotion.value < 0.2) {
        return 'neutral';
    }

    return maxEmotion.name;
}

/**
 * Get Turkish label for an emotion
 */
export function getEmotionLabelTr(emotion: string): string {
    const labels: Record<string, string> = {
        anger: 'Öfke',
        fear: 'Korku',
        joy: 'Sevinç',
        sadness: 'Üzüntü',
        surprise: 'Şaşkınlık',
        neutral: 'Nötr',
    };
    return labels[emotion] || 'Belirsiz';
}

/**
 * Get emotional intensity label in Turkish
 */
export function getIntensityLabelTr(intensity: number): string {
    if (intensity < 0.2) return 'Çok Düşük';
    if (intensity < 0.4) return 'Düşük';
    if (intensity < 0.6) return 'Orta';
    if (intensity < 0.8) return 'Yüksek';
    return 'Çok Yüksek';
}

/**
 * Get sensationalism label in Turkish
 */
export function getSensationalismLabelTr(score: number): string {
    if (score < 0.2) return 'Düşük';
    if (score < 0.4) return 'Normal';
    if (score < 0.6) return 'Orta';
    if (score < 0.8) return 'Yüksek';
    return 'Çok Yüksek';
}
