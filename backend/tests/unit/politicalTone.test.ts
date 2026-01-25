import { describe, it, expect } from 'vitest';
import {
    calculateCombinedScore,
    formatToneForUI,
    shouldIncludeInPoliticalSort,
    getSortingWeight,
} from '@/utils/politicalTone.js';

describe('Political Tone Utilities', () => {
    describe('calculateCombinedScore', () => {
        it('should combine source and article scores with normal weights', () => {
            const result = calculateCombinedScore({
                govAlignmentScore: 3,
                politicalTone: -2,
                politicalConfidence: 0.8,
                governmentMentioned: true,
            });

            // 0.65 * 3 + 0.35 * -2 = 1.95 - 0.7 = 1.25
            // * 0.8 = 1.0
            expect(result.combinedScore).toBeCloseTo(1.0, 1);
            expect(result.isUncertain).toBe(false);
        });

        it('should reduce article weight when governmentMentioned=false', () => {
            const result = calculateCombinedScore({
                govAlignmentScore: 4,
                politicalTone: -5,
                politicalConfidence: 0.9,
                governmentMentioned: false,
            });

            // 0.9 * 4 + 0.1 * -5 = 3.6 - 0.5 = 3.1
            // * 0.9 = 2.79
            expect(result.combinedScore).toBeGreaterThan(2.5);
        });

        it('should mark as uncertain when confidence < 0.6', () => {
            const result = calculateCombinedScore({
                govAlignmentScore: 3,
                politicalTone: 2,
                politicalConfidence: 0.4,
                governmentMentioned: true,
            });

            expect(result.isUncertain).toBe(true);
            expect(result.label).toBe('Belirsiz');
            expect(result.labelEn).toBe('Uncertain');
        });

        it('should return correct Turkish labels', () => {
            const critical = calculateCombinedScore({
                govAlignmentScore: -4,
                politicalTone: -3,
                politicalConfidence: 0.9,
                governmentMentioned: true,
            });
            expect(critical.label).toBe('Hükümete Eleştirel');

            const favorable = calculateCombinedScore({
                govAlignmentScore: 4,
                politicalTone: 3,
                politicalConfidence: 0.9,
                governmentMentioned: true,
            });
            expect(favorable.label).toBe('Hükümete Olumlu');
        });

        it('should determine signal strength correctly', () => {
            const strongSignal = calculateCombinedScore({
                govAlignmentScore: 2,
                politicalTone: 1,
                politicalConfidence: 0.85,
                governmentMentioned: true,
            });
            expect(strongSignal.signalStrength).toBe('strong');

            const noSignal = calculateCombinedScore({
                govAlignmentScore: 2,
                politicalTone: 1,
                politicalConfidence: 0.9,
                governmentMentioned: false,
            });
            expect(noSignal.signalStrength).toBe('none');
        });
    });

    describe('formatToneForUI', () => {
        it('should return badge and tooltip for strong signal', () => {
            const result = formatToneForUI({
                govAlignmentScore: 3,
                politicalTone: 2,
                politicalConfidence: 0.75,
                governmentMentioned: true,
            });

            expect(result.showBadge).toBe(true);
            expect(result.badge).toContain('%75');
            expect(result.tooltip).toContain('olasılık tahmini');
        });

        it('should not show badge when uncertain', () => {
            const result = formatToneForUI({
                govAlignmentScore: 3,
                politicalTone: 2,
                politicalConfidence: 0.4,
                governmentMentioned: true,
            });

            expect(result.showBadge).toBe(false);
        });

        it('should not show badge when no government mentioned', () => {
            const result = formatToneForUI({
                govAlignmentScore: 3,
                politicalTone: 2,
                politicalConfidence: 0.9,
                governmentMentioned: false,
            });

            expect(result.showBadge).toBe(false);
        });
    });

    describe('shouldIncludeInPoliticalSort', () => {
        it('should include when confidence >= 0.6 and gov mentioned', () => {
            expect(shouldIncludeInPoliticalSort({
                govAlignmentScore: 0,
                politicalTone: 0,
                politicalConfidence: 0.7,
                governmentMentioned: true,
            })).toBe(true);
        });

        it('should exclude when confidence < 0.6', () => {
            expect(shouldIncludeInPoliticalSort({
                govAlignmentScore: 0,
                politicalTone: 0,
                politicalConfidence: 0.5,
                governmentMentioned: true,
            })).toBe(false);
        });

        it('should exclude when gov not mentioned', () => {
            expect(shouldIncludeInPoliticalSort({
                govAlignmentScore: 0,
                politicalTone: 0,
                politicalConfidence: 0.9,
                governmentMentioned: false,
            })).toBe(false);
        });
    });

    describe('getSortingWeight', () => {
        it('should return low weight when gov not mentioned', () => {
            expect(getSortingWeight({
                govAlignmentScore: 0,
                politicalTone: 0,
                politicalConfidence: 0.9,
                governmentMentioned: false,
            })).toBe(0.1);
        });

        it('should return clamped confidence as weight', () => {
            expect(getSortingWeight({
                govAlignmentScore: 0,
                politicalTone: 0,
                politicalConfidence: 0.8,
                governmentMentioned: true,
            })).toBe(0.8);
        });
    });
});
