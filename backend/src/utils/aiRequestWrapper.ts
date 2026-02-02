import { openai, openaiQuick } from '../config/openai.js';
import { logger } from '../config/logger.js';
import { CircuitBreaker } from './circuitBreaker.js';
import OpenAI from 'openai';

// AI-specific circuit breaker with optimized settings
const aiCircuitBreaker = new CircuitBreaker({
    failureThreshold: 5,      // Open after 5 failures
    resetTimeout: 60000,      // Try again after 1 minute
    halfOpenMaxCalls: 3,      // Allow 3 test calls in half-open state
});

export interface AIRequestOptions {
    useQuickClient?: boolean;           // Use faster client with shorter timeout
    circuitName?: string;               // Circuit breaker identifier
    fallback?: () => any;               // Fallback function when AI fails
    skipCircuitBreaker?: boolean;       // Bypass circuit breaker (not recommended)
    maxContentLength?: number;          // Truncate content to this length
}

export interface ChatCompletionParams {
    model?: string;
    messages: OpenAI.ChatCompletionMessageParam[];
    response_format?: { type: 'json_object' } | { type: 'text' };
    temperature?: number;
    max_tokens?: number;
}

/**
 * Unified wrapper for all AI chat completion calls
 * Includes circuit breaker, fallback, and logging
 */
export async function aiChatCompletion<T = any>(
    params: ChatCompletionParams,
    options: AIRequestOptions = {}
): Promise<T> {
    const {
        useQuickClient = false,
        circuitName = 'openai:chat',
        fallback,
        skipCircuitBreaker = false,
        maxContentLength = 3500,
    } = options;

    const client = useQuickClient ? openaiQuick : openai;
    const startTime = Date.now();

    // Truncate message content if needed
    const truncatedMessages = params.messages.map(msg => {
        if (typeof msg.content === 'string' && msg.content.length > maxContentLength) {
            return {
                ...msg,
                content: msg.content.substring(0, maxContentLength),
            };
        }
        return msg;
    });

    const executeRequest = async () => {
        const response = await client.chat.completions.create({
            model: params.model || 'gpt-4o-mini',
            messages: truncatedMessages,
            response_format: params.response_format,
            temperature: params.temperature ?? 0.3,
            max_tokens: params.max_tokens,
        });

        const content = response.choices[0]?.message?.content || '{}';

        // Log successful request
        const duration = Date.now() - startTime;
        logger.debug({
            circuit: circuitName,
            duration,
            model: params.model || 'gpt-4o-mini',
            tokensUsed: response.usage?.total_tokens,
        }, 'AI request completed');

        // Parse JSON if response_format is json_object
        if (params.response_format?.type === 'json_object') {
            try {
                return JSON.parse(content) as T;
            } catch (parseError) {
                logger.warn({ content: content.substring(0, 100) }, 'Failed to parse AI JSON response');
                throw new Error('Invalid JSON response from AI');
            }
        }

        return content as T;
    };

    // Execute with or without circuit breaker
    if (skipCircuitBreaker) {
        try {
            return await executeRequest();
        } catch (error) {
            if (fallback) {
                logger.warn({ circuit: circuitName }, 'AI request failed, using fallback');
                return fallback();
            }
            throw error;
        }
    }

    return aiCircuitBreaker.execute(
        circuitName,
        executeRequest,
        fallback
    );
}

/**
 * Wrapper for embedding requests
 */
export async function aiEmbedding(
    text: string,
    options: AIRequestOptions = {}
): Promise<number[]> {
    const {
        useQuickClient = true,  // Embeddings are usually quick
        circuitName = 'openai:embedding',
        fallback,
        maxContentLength = 2000,
    } = options;

    const client = useQuickClient ? openaiQuick : openai;
    const truncatedText = text.substring(0, maxContentLength);

    const executeRequest = async () => {
        const response = await client.embeddings.create({
            model: 'text-embedding-3-small',
            input: truncatedText,
        });

        return response.data[0].embedding;
    };

    if (options.skipCircuitBreaker) {
        try {
            return await executeRequest();
        } catch (error) {
            if (fallback) {
                return fallback();
            }
            throw error;
        }
    }

    return aiCircuitBreaker.execute(
        circuitName,
        executeRequest,
        fallback
    );
}

/**
 * Get current circuit breaker state for monitoring
 */
export function getAICircuitState(circuitName: string = 'openai:chat') {
    return aiCircuitBreaker.getState(circuitName);
}

/**
 * Get all AI circuit metrics
 */
export function getAICircuitMetrics() {
    return aiCircuitBreaker.getAllMetrics();
}

/**
 * Manually reset a circuit (for admin use)
 */
export function resetAICircuit(circuitName: string) {
    aiCircuitBreaker.reset(circuitName);
    logger.info({ circuit: circuitName }, 'AI circuit manually reset');
}

// Export the circuit breaker for direct use if needed
export { aiCircuitBreaker };
