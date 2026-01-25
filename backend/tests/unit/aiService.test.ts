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
    },
}));

import { processArticleWithAI } from '@/services/ai/aiService.js';
import { openai } from '@/config/openai.js';

describe('AI Service', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('processArticleWithAI', () => {
        it('should process article successfully', async () => {
            vi.mocked(openai.chat.completions.create).mockResolvedValue({
                choices: [{
                    message: {
                        content: JSON.stringify({
                            translated_title: 'Translated Title',
                            summary: 'Test summary',
                            is_clickbait: false,
                            is_ad: false,
                            category: 'Teknoloji',
                            topics: ['#Tech'],
                            sentiment: 'positive',
                            political_tone: -2,
                            political_confidence: 0.75,
                            government_mentioned: true,
                        }),
                    },
                }],
            } as any);

            const result = await processArticleWithAI('Test Title', 'Test Content', 'en');

            expect(result.translatedTitle).toBe('Translated Title');
            expect(result.summary).toBe('Test summary');
            expect(result.isClickbait).toBe(false);
            expect(result.category).toBe('Teknoloji');
            expect(result.sentiment).toBe('positive');
            expect(result.politicalTone).toBe(-2);
            expect(result.politicalConfidence).toBe(0.75);
            expect(result.governmentMentioned).toBe(true);
        });

        it('should return fallback on OpenAI error', async () => {
            vi.mocked(openai.chat.completions.create).mockRejectedValue(
                new Error('API Error')
            );

            const result = await processArticleWithAI('Original Title', 'Original Content', 'en');

            // Should return fallback data
            expect(result.translatedTitle).toBe('Original Title');
            expect(result.summary).toBe('Original Content'.substring(0, 200));
            expect(result.isClickbait).toBe(false);
            expect(result.isAd).toBe(false);
            expect(result.category).toBe('Dünya');
            expect(result.sentiment).toBe('neutral');
        });

        it('should handle empty OpenAI response', async () => {
            vi.mocked(openai.chat.completions.create).mockResolvedValue({
                choices: [{
                    message: { content: '{}' },
                }],
            } as any);

            const result = await processArticleWithAI('Test', 'Content', 'en');

            expect(result.translatedTitle).toBe('Test'); // Uses original
            expect(result.summary).toBe('');
            expect(result.category).toBe('Dünya');
        });

        it('should handle null content', async () => {
            vi.mocked(openai.chat.completions.create).mockResolvedValue({
                choices: [{
                    message: { content: null },
                }],
            } as any);

            const result = await processArticleWithAI('Test', 'Content', 'en');
            expect(result.translatedTitle).toBe('Test');
        });
    });
});
