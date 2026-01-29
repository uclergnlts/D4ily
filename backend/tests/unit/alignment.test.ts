import { describe, it, expect } from 'vitest';
import { 
    getAlignmentLabel, 
    getAlignmentLabelEn, 
    isValidAlignmentScore, 
    isValidConfidence 
} from '../../src/utils/alignment.js';

describe('Alignment Utils', () => {
    describe('getAlignmentLabel', () => {
        it('should return Belirsiz for low confidence', () => {
            expect(getAlignmentLabel(0, 0.5)).toBe('Belirsiz');
            expect(getAlignmentLabel(5, 0.3)).toBe('Belirsiz');
        });

        it('should return correct labels for opposition scores', () => {
            expect(getAlignmentLabel(-5, 0.8)).toBe('Muhalefete Yakın');
            expect(getAlignmentLabel(-3, 0.8)).toBe('Muhalefete Yakın');
            expect(getAlignmentLabel(-2, 0.8)).toBe('Muhalefete Eğilimli');
            expect(getAlignmentLabel(-1, 0.8)).toBe('Muhalefete Eğilimli');
        });

        it('should return correct labels for neutral scores', () => {
            expect(getAlignmentLabel(0, 0.8)).toBe('Karışık / Merkez');
        });

        it('should return correct labels for pro-government scores', () => {
            expect(getAlignmentLabel(1, 0.8)).toBe('İktidara Eğilimli');
            expect(getAlignmentLabel(2, 0.8)).toBe('İktidara Eğilimli');
            expect(getAlignmentLabel(3, 0.8)).toBe('İktidara Yakın');
            expect(getAlignmentLabel(5, 0.8)).toBe('İktidara Yakın');
        });
    });

    describe('getAlignmentLabelEn', () => {
        it('should return Uncertain for low confidence', () => {
            expect(getAlignmentLabelEn(0, 0.5)).toBe('Uncertain');
        });

        it('should return correct English labels', () => {
            expect(getAlignmentLabelEn(-5, 0.8)).toBe('Opposition-Leaning');
            expect(getAlignmentLabelEn(0, 0.8)).toBe('Mixed / Center');
            expect(getAlignmentLabelEn(5, 0.8)).toBe('Pro-Government');
        });
    });

    describe('isValidAlignmentScore', () => {
        it('should validate correct scores', () => {
            expect(isValidAlignmentScore(-5)).toBe(true);
            expect(isValidAlignmentScore(0)).toBe(true);
            expect(isValidAlignmentScore(5)).toBe(true);
        });

        it('should reject invalid scores', () => {
            expect(isValidAlignmentScore(-6)).toBe(false);
            expect(isValidAlignmentScore(6)).toBe(false);
            expect(isValidAlignmentScore(1.5)).toBe(false);
        });
    });

    describe('isValidConfidence', () => {
        it('should validate correct confidence values', () => {
            expect(isValidConfidence(0)).toBe(true);
            expect(isValidConfidence(0.5)).toBe(true);
            expect(isValidConfidence(1)).toBe(true);
        });

        it('should reject invalid confidence values', () => {
            expect(isValidConfidence(-0.1)).toBe(false);
            expect(isValidConfidence(1.1)).toBe(false);
        });
    });
});
