import { describe, it, expect } from 'vitest';
import { calculateSimilarity, isDuplicate } from '@/utils/similarity.js';

describe('Similarity Utils', () => {
    describe('calculateSimilarity', () => {
        it('should return 1 for identical strings', () => {
            expect(calculateSimilarity('hello', 'hello')).toBe(1);
        });

        it('should return 1 for identical strings with different case', () => {
            expect(calculateSimilarity('Hello', 'HELLO')).toBe(1);
        });

        it('should return 0 for empty string comparison', () => {
            expect(calculateSimilarity('hello', '')).toBe(0);
            expect(calculateSimilarity('', 'world')).toBe(0);
        });

        it('should return value between 0 and 1 for similar strings', () => {
            const similarity = calculateSimilarity('hello', 'hallo');
            expect(similarity).toBeGreaterThan(0);
            expect(similarity).toBeLessThan(1);
        });

        it('should return low similarity for completely different strings', () => {
            const similarity = calculateSimilarity('abc', 'xyz');
            expect(similarity).toBeLessThan(0.5);
        });

        it('should handle whitespace', () => {
            expect(calculateSimilarity('  hello  ', 'hello')).toBe(1);
        });
    });

    describe('isDuplicate', () => {
        it('should return true for identical titles', () => {
            expect(isDuplicate('Breaking News: Economy Report', 'Breaking News: Economy Report')).toBe(true);
        });

        it('should return true for similar titles above threshold', () => {
            expect(isDuplicate('Economy Report 2026', 'Economy Report 2025', 0.8)).toBe(true);
        });

        it('should return false for different titles', () => {
            expect(isDuplicate('Sports News', 'Technology Update')).toBe(false);
        });

        it('should respect custom threshold', () => {
            expect(isDuplicate('abc', 'abd', 0.5)).toBe(true);
            expect(isDuplicate('abc', 'xyz', 0.9)).toBe(false);
        });
    });
});
