import { describe, it, expect } from 'vitest';
import {
    getAlignmentLabel,
    getAlignmentLabelEn,
    getAlignmentLabels,
    isValidAlignmentScore,
    isValidConfidence,
} from '../../src/utils/alignment';

describe('Alignment Utils', () => {
    describe('getAlignmentLabel', () => {
        it('should return "Belirsiz" when confidence is below 0.6', () => {
            expect(getAlignmentLabel(5, 0.5)).toBe('Belirsiz');
            expect(getAlignmentLabel(-5, 0.3)).toBe('Belirsiz');
            expect(getAlignmentLabel(0, 0.59)).toBe('Belirsiz');
        });

        it('should return "Muhalefete Yakın" for scores -5 to -3', () => {
            expect(getAlignmentLabel(-5, 0.8)).toBe('Muhalefete Yakın');
            expect(getAlignmentLabel(-4, 0.8)).toBe('Muhalefete Yakın');
            expect(getAlignmentLabel(-3, 0.8)).toBe('Muhalefete Yakın');
        });

        it('should return "Muhalefete Eğilimli" for scores -2 to -1', () => {
            expect(getAlignmentLabel(-2, 0.8)).toBe('Muhalefete Eğilimli');
            expect(getAlignmentLabel(-1, 0.8)).toBe('Muhalefete Eğilimli');
        });

        it('should return "Karışık / Merkez" for score 0', () => {
            expect(getAlignmentLabel(0, 0.8)).toBe('Karışık / Merkez');
        });

        it('should return "İktidara Eğilimli" for scores +1 to +2', () => {
            expect(getAlignmentLabel(1, 0.8)).toBe('İktidara Eğilimli');
            expect(getAlignmentLabel(2, 0.8)).toBe('İktidara Eğilimli');
        });

        it('should return "İktidara Yakın" for scores +3 to +5', () => {
            expect(getAlignmentLabel(3, 0.8)).toBe('İktidara Yakın');
            expect(getAlignmentLabel(4, 0.8)).toBe('İktidara Yakın');
            expect(getAlignmentLabel(5, 0.8)).toBe('İktidara Yakın');
        });

        it('should handle edge case at confidence = 0.6', () => {
            expect(getAlignmentLabel(3, 0.6)).toBe('İktidara Yakın');
        });
    });

    describe('getAlignmentLabelEn', () => {
        it('should return "Uncertain" when confidence is below 0.6', () => {
            expect(getAlignmentLabelEn(5, 0.5)).toBe('Uncertain');
        });

        it('should return "Opposition-Leaning" for scores -5 to -3', () => {
            expect(getAlignmentLabelEn(-4, 0.8)).toBe('Opposition-Leaning');
        });

        it('should return "Slightly Opposition" for scores -2 to -1', () => {
            expect(getAlignmentLabelEn(-1, 0.8)).toBe('Slightly Opposition');
        });

        it('should return "Mixed / Center" for score 0', () => {
            expect(getAlignmentLabelEn(0, 0.8)).toBe('Mixed / Center');
        });

        it('should return "Slightly Pro-Government" for scores +1 to +2', () => {
            expect(getAlignmentLabelEn(2, 0.8)).toBe('Slightly Pro-Government');
        });

        it('should return "Pro-Government" for scores +3 to +5', () => {
            expect(getAlignmentLabelEn(4, 0.8)).toBe('Pro-Government');
        });
    });

    describe('getAlignmentLabels', () => {
        it('should return both TR and EN labels', () => {
            const labels = getAlignmentLabels(-4, 0.8);
            expect(labels.tr).toBe('Muhalefete Yakın');
            expect(labels.en).toBe('Opposition-Leaning');
        });

        it('should return Belirsiz/Uncertain for low confidence', () => {
            const labels = getAlignmentLabels(3, 0.4);
            expect(labels.tr).toBe('Belirsiz');
            expect(labels.en).toBe('Uncertain');
        });
    });

    describe('isValidAlignmentScore', () => {
        it('should return true for valid integer scores between -5 and +5', () => {
            expect(isValidAlignmentScore(-5)).toBe(true);
            expect(isValidAlignmentScore(0)).toBe(true);
            expect(isValidAlignmentScore(5)).toBe(true);
            expect(isValidAlignmentScore(-3)).toBe(true);
            expect(isValidAlignmentScore(3)).toBe(true);
        });

        it('should return false for scores outside range', () => {
            expect(isValidAlignmentScore(-6)).toBe(false);
            expect(isValidAlignmentScore(6)).toBe(false);
            expect(isValidAlignmentScore(-10)).toBe(false);
            expect(isValidAlignmentScore(10)).toBe(false);
        });

        it('should return false for non-integer scores', () => {
            expect(isValidAlignmentScore(2.5)).toBe(false);
            expect(isValidAlignmentScore(-1.5)).toBe(false);
        });
    });

    describe('isValidConfidence', () => {
        it('should return true for valid confidence between 0 and 1', () => {
            expect(isValidConfidence(0)).toBe(true);
            expect(isValidConfidence(1)).toBe(true);
            expect(isValidConfidence(0.5)).toBe(true);
            expect(isValidConfidence(0.72)).toBe(true);
        });

        it('should return false for confidence outside range', () => {
            expect(isValidConfidence(-0.1)).toBe(false);
            expect(isValidConfidence(1.1)).toBe(false);
            expect(isValidConfidence(2)).toBe(false);
        });
    });
});
