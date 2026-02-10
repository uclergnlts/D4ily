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

// Mock CircuitBreaker so openAICircuitBreaker.execute() passes through to the fn
vi.mock('@/utils/circuitBreaker.js', () => {
    class MockCircuitBreaker {
        async execute<T>(_name: string, fn: () => Promise<T>, fallback?: () => T): Promise<T> {
            try {
                return await fn();
            } catch (error) {
                if (fallback) return fallback();
                throw error;
            }
        }
        getState() { return 'CLOSED'; }
        reset() {}
        getAllMetrics() { return {}; }
    }

    return {
        CircuitBreaker: MockCircuitBreaker,
        circuitBreaker: new MockCircuitBreaker(),
        redisCircuitBreaker: new MockCircuitBreaker(),
        openAICircuitBreaker: new MockCircuitBreaker(),
    };
});

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
                            detail_content: 'This is a much longer detail content that provides comprehensive coverage of the story with additional context and analysis.',
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

            const result = await processArticleWithAI('Test Title', 'Test Content that is long enough to pass the 50 character minimum threshold for AI processing', 'en');

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

            const content = 'Original Content that is long enough to pass the 50 character minimum threshold for processing';
            const result = await processArticleWithAI('Original Title', content, 'en');

            // Should return fallback data
            expect(result.translatedTitle).toBe('Original Title');
            expect(result.summary).toBe(content.substring(0, 200));
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

            const result = await processArticleWithAI('Test', 'Content that is long enough to pass the 50 character minimum threshold', 'en');

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

            const result = await processArticleWithAI('Test', 'Content that is long enough to pass the 50 character minimum threshold', 'en');
            expect(result.translatedTitle).toBe('Test');
        });

        it('should return short content fallback without calling AI', async () => {
            const result = await processArticleWithAI('Test', 'Short', 'en');

            expect(result.translatedTitle).toBe('Test');
            expect(result.category).toBe('Dünya');
            // OpenAI should not be called for short content
            expect(openai.chat.completions.create).not.toHaveBeenCalled();
        });
    });
});
