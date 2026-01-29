import { describe, it, expect } from 'vitest';
import { calculateSimilarity, isDuplicate } from '../../src/utils/similarity.js';

describe('Similarity Utils', () => {
    describe('calculateSimilarity', () => {
        it('should return 1 for identical strings', () => {
            expect(calculateSimilarity('hello', 'hello')).toBe(1);
            expect(calculateSimilarity('Hello World', 'Hello World')).toBe(1);
        });

        it('should return 0 for completely different strings', () => {
            expect(calculateSimilarity('abc', 'xyz')).toBeLessThan(0.5);
        });

        it('should handle empty strings', () => {
            expect(calculateSimilarity('', '')).toBe(1);
            expect(calculateSimilarity('hello', '')).toBe(0);
            expect(calculateSimilarity('', 'hello')).toBe(0);
        });

        it('should be case insensitive', () => {
            expect(calculateSimilarity('HELLO', 'hello')).toBe(1);
            expect(calculateSimilarity('Hello World', 'hello world')).toBe(1);
        });

        it('should calculate similarity for similar strings', () => {
            const similarity = calculateSimilarity('hello world', 'hello there');
            expect(similarity).toBeGreaterThan(0.5);
            expect(similarity).toBeLessThan(1);
        });
    });

    describe('isDuplicate', () => {
        it('should return true for identical titles', () => {
            expect(isDuplicate('Breaking News', 'Breaking News')).toBe(true);
        });

        it('should return true for similar titles above threshold', () => {
            expect(isDuplicate('Breaking News Today', 'Breaking News Today!', 0.7)).toBe(true);
        });

        it('should return false for different titles', () => {
            expect(isDuplicate('Sports Update', 'Weather Forecast')).toBe(false);
        });

        it('should respect custom threshold', () => {
            const title1 = 'Government Announces New Policy';
            const title2 = 'Government Announces Policy Change';
            expect(isDuplicate(title1, title2, 0.9)).toBe(false);
            expect(isDuplicate(title1, title2, 0.5)).toBe(true);
        });
    });
});
