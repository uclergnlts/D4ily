import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockOpenaiCreate, mockOpenaiQuickCreate } = vi.hoisted(() => ({
    mockOpenaiCreate: vi.fn(),
    mockOpenaiQuickCreate: vi.fn(),
}));

vi.mock('@/config/openai.js', () => ({
    openai: {
        chat: { completions: { create: mockOpenaiCreate } },
        embeddings: { create: vi.fn() },
    },
    openaiQuick: {
        chat: { completions: { create: mockOpenaiQuickCreate } },
        embeddings: { create: vi.fn() },
    },
}));

vi.mock('@/config/logger.js', () => ({
    logger: {
        info: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
        debug: vi.fn(),
    },
}));

// Mock circuit breaker to pass through
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

import { aiChatCompletion, getAICircuitState, getAICircuitMetrics } from '@/utils/aiRequestWrapper.js';

describe('AI Request Wrapper', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('aiChatCompletion', () => {
        it('should use default openai client', async () => {
            mockOpenaiCreate.mockResolvedValue({
                choices: [{ message: { content: '{"result": "ok"}' } }],
                usage: { total_tokens: 100 },
            });

            const result = await aiChatCompletion({
                messages: [{ role: 'user', content: 'Hello' }],
                response_format: { type: 'json_object' },
            });

            expect(result).toEqual({ result: 'ok' });
            expect(mockOpenaiCreate).toHaveBeenCalled();
            expect(mockOpenaiQuickCreate).not.toHaveBeenCalled();
        });

        it('should use quick client when useQuickClient=true', async () => {
            mockOpenaiQuickCreate.mockResolvedValue({
                choices: [{ message: { content: '{"fast": true}' } }],
                usage: { total_tokens: 50 },
            });

            const result = await aiChatCompletion(
                {
                    messages: [{ role: 'user', content: 'Quick request' }],
                    response_format: { type: 'json_object' },
                },
                { useQuickClient: true }
            );

            expect(result).toEqual({ fast: true });
            expect(mockOpenaiQuickCreate).toHaveBeenCalled();
            expect(mockOpenaiCreate).not.toHaveBeenCalled();
        });

        it('should return raw content when response_format is text', async () => {
            mockOpenaiCreate.mockResolvedValue({
                choices: [{ message: { content: 'Plain text response' } }],
                usage: { total_tokens: 10 },
            });

            const result = await aiChatCompletion({
                messages: [{ role: 'user', content: 'Hello' }],
                response_format: { type: 'text' },
            });

            expect(result).toBe('Plain text response');
        });

        it('should truncate long message content', async () => {
            mockOpenaiCreate.mockResolvedValue({
                choices: [{ message: { content: '{"ok": true}' } }],
                usage: { total_tokens: 50 },
            });

            const longContent = 'A'.repeat(5000);
            await aiChatCompletion({
                messages: [{ role: 'user', content: longContent }],
                response_format: { type: 'json_object' },
            }, { maxContentLength: 100 });

            const calledWith = mockOpenaiCreate.mock.calls[0][0];
            expect(calledWith.messages[0].content.length).toBe(100);
        });

        it('should use fallback when AI fails', async () => {
            mockOpenaiCreate.mockRejectedValue(new Error('API error'));

            const fallbackData = { fallback: true };
            const result = await aiChatCompletion(
                {
                    messages: [{ role: 'user', content: 'Hello' }],
                },
                { fallback: () => fallbackData }
            );

            expect(result).toEqual(fallbackData);
        });

        it('should throw when AI fails and no fallback', async () => {
            mockOpenaiCreate.mockRejectedValue(new Error('API error'));

            await expect(
                aiChatCompletion({
                    messages: [{ role: 'user', content: 'Hello' }],
                })
            ).rejects.toThrow('API error');
        });

        it('should use fallback on invalid JSON response', async () => {
            mockOpenaiCreate.mockResolvedValue({
                choices: [{ message: { content: 'not json' } }],
                usage: { total_tokens: 10 },
            });

            const result = await aiChatCompletion(
                {
                    messages: [{ role: 'user', content: 'Hello' }],
                    response_format: { type: 'json_object' },
                },
                { fallback: () => ({ default: true }) }
            );

            expect(result).toEqual({ default: true });
        });

        it('should skip circuit breaker when skipCircuitBreaker=true', async () => {
            mockOpenaiCreate.mockResolvedValue({
                choices: [{ message: { content: '{"skipped": true}' } }],
                usage: { total_tokens: 10 },
            });

            const result = await aiChatCompletion(
                {
                    messages: [{ role: 'user', content: 'Hello' }],
                    response_format: { type: 'json_object' },
                },
                { skipCircuitBreaker: true }
            );

            expect(result).toEqual({ skipped: true });
        });

        it('should use fallback when skipCircuitBreaker=true and request fails', async () => {
            mockOpenaiCreate.mockRejectedValue(new Error('Failed'));

            const result = await aiChatCompletion(
                {
                    messages: [{ role: 'user', content: 'Hello' }],
                },
                { skipCircuitBreaker: true, fallback: () => 'fallback' }
            );

            expect(result).toBe('fallback');
        });

        it('should use default model gpt-4o-mini', async () => {
            mockOpenaiCreate.mockResolvedValue({
                choices: [{ message: { content: '{}' } }],
                usage: { total_tokens: 10 },
            });

            await aiChatCompletion({
                messages: [{ role: 'user', content: 'Hello' }],
                response_format: { type: 'json_object' },
            });

            expect(mockOpenaiCreate).toHaveBeenCalledWith(
                expect.objectContaining({ model: 'gpt-4o-mini' })
            );
        });

        it('should use custom model when specified', async () => {
            mockOpenaiCreate.mockResolvedValue({
                choices: [{ message: { content: '{}' } }],
                usage: { total_tokens: 10 },
            });

            await aiChatCompletion({
                model: 'gpt-4',
                messages: [{ role: 'user', content: 'Hello' }],
                response_format: { type: 'json_object' },
            });

            expect(mockOpenaiCreate).toHaveBeenCalledWith(
                expect.objectContaining({ model: 'gpt-4' })
            );
        });
    });

    describe('getAICircuitState', () => {
        it('should return circuit state', () => {
            const state = getAICircuitState();
            expect(state).toBe('CLOSED');
        });
    });

    describe('getAICircuitMetrics', () => {
        it('should return metrics', () => {
            const metrics = getAICircuitMetrics();
            expect(metrics).toBeDefined();
        });
    });
});
