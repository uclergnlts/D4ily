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
        // Clean and prepare content - remove HTML tags and extra whitespace
        const cleanContent = content
            .replace(/<[^>]*>/g, '') // Remove HTML tags
            .replace(/\s+/g, ' ')    // Normalize whitespace
            .trim();
        
        // Use more content for better analysis (up to 3500 chars)
        const analysisContent = cleanContent.substring(0, 3500);
        
        // Determine prompt language based on content language
        const isTurkish = language === 'tr' || language === 'turkish';
        
        const systemPrompt = isTurkish 
            ? `Sen bir medya analisti ve haber içerik uzmanısın. Verilen haber metninin SADECE HABERİN KENDİSİNDEKİ duygusal tonunu analiz et. 
               
               ÖNEMLİ KURALLAR:
               - Haberin KONUSU hakkında değil, HABERİN YAZILIŞ ŞEKLİ hakkında analiz yap
               - Gazetecinin kullandığı dil ve üsluba odaklan
               - Haberin nasıl çerçevelendiğine (framing) bak
               - Manipülatif veya yönlendirici dil kullanımını tespit et
               - Sadece geçerli JSON döndür, başka metin ekleme`
            : `You are a media analyst and news content expert. Analyze ONLY the emotional tone of HOW the news is written, not the topic itself.
               
               IMPORTANT RULES:
               - Analyze the WRITING STYLE, not the news topic
               - Focus on the language and tone used by the journalist
               - Look at how the news is framed
               - Detect manipulative or biased language usage
               - Return only valid JSON, no additional text`;

        const prompt = isTurkish 
            ? `Bu haber metninin YAZILIŞ ŞEKLİNİ ve DUYGUSAL TONUNU analiz et.

BAŞLIK: ${title}

İÇERİK: ${analysisContent}

SADECE HABERİN YAZILIŞ ŞEKLİNİ analiz et. Haberin konusu (örn: kaza, ölüm, kutlama) değil, gazetecinin bu haberi NASIL yazdığı önemli.

JSON formatında yanıt ver:
{
  "emotional_tone": {
    "anger": 0-1 arası (gazetecinin öfkeli/kışkırtıcı dil kullanımı),
    "fear": 0-1 arası (korku/endişe yaratan dil kullanımı),
    "joy": 0-1 arası (olumlu/neşeli dil kullanımı),
    "sadness": 0-1 arası (üzüntü vurgulayan dil kullanımı),
    "surprise": 0-1 arası (şok edici/sansasyonel dil kullanımı)
  },
  "emotional_intensity": 0-1 arası (genel duygusal yoğunluk - 0: tamamen nötr, tarafsız haber dili, 0.5: normal haber dili, 1: çok yoğun duygusal dil),
  "loaded_language_score": 0-1 arası (yüklü/yönlendirici kelime kullanımı - 0: nötr, 1: çok yüklü),
  "sensationalism_score": 0-1 arası (sansasyonellik - 0: düz haber, 1: clickbait tarzı),
  "dominant_emotion": "anger/fear/joy/sadness/surprise/neutral" (en baskın duygu),
  "analysis_notes": "Haberin yazılış şekli hakkında 1-2 cümlelik Türkçe açıklama"
}`
            : `Analyze the WRITING STYLE and EMOTIONAL TONE of this news article.

TITLE: ${title}

CONTENT: ${analysisContent}

Analyze ONLY HOW the news is written. The topic (e.g., accident, death, celebration) is not important - focus on HOW the journalist wrote this news.

Respond in JSON format:
{
  "emotional_tone": {
    "anger": 0-1 (journalist's use of angry/provocative language),
    "fear": 0-1 (fear/anxiety inducing language),
    "joy": 0-1 (positive/cheerful language),
    "sadness": 0-1 (sadness-emphasizing language),
    "surprise": 0-1 (shocking/sensational language)
  },
  "emotional_intensity": 0-1 (overall emotional intensity - 0: completely neutral, factual, 0.5: normal news language, 1: highly emotional language),
  "loaded_language_score": 0-1 (loaded/biased word usage - 0: neutral, 1: heavily loaded),
  "sensationalism_score": 0-1 (sensationalism - 0: straight news, 1: clickbait style),
  "dominant_emotion": "anger/fear/joy/sadness/surprise/neutral" (most dominant emotion),
  "analysis_notes": "1-2 sentence explanation about the writing style in ${isTurkish ? 'Turkish' : 'English'}"
}`;

        const response = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                {
                    role: 'system',
                    content: systemPrompt,
                },
                {
                    role: 'user',
                    content: prompt,
                },
            ],
            response_format: { type: 'json_object' },
            temperature: 0.1, // Lower temperature for more consistent results
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
            language,
            contentLength: cleanContent.length,
            dominantEmotion: analysis.dominantEmotion,
            intensity: analysis.emotionalIntensity,
            sensationalism: analysis.sensationalismScore,
            loadedLanguage: analysis.loadedLanguageScore,
            notes: analysis.analysisNotes.substring(0, 100),
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
