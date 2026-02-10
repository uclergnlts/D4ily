import { logger } from '../config/logger.js';

/**
 * Safely parse a JSON string with a fallback value.
 * If the value is already the expected type (not a string), returns it as-is.
 */
export function safeJsonParse<T>(value: string | T, fallback: T): T {
    if (typeof value !== 'string') return value;
    try {
        return JSON.parse(value) as T;
    } catch {
        logger.warn({ value: typeof value === 'string' ? value.substring(0, 100) : value }, 'Failed to parse JSON, using fallback');
        return fallback;
    }
}
