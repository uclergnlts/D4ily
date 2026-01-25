// Government alignment label utilities for editorial transparency

export type AlignmentLabel =
    | 'Muhalefete Yakın'      // Opposition-Leaning (-5 to -3)
    | 'Muhalefete Eğilimli'   // Slightly Opposition (-2 to -1)
    | 'Karışık / Merkez'      // Mixed / Center (0)
    | 'İktidara Eğilimli'     // Slightly Pro-Government (+1 to +2)
    | 'İktidara Yakın'        // Pro-Government (+3 to +5)
    | 'Belirsiz';             // Uncertain (low confidence)

export type AlignmentLabelEn =
    | 'Opposition-Leaning'
    | 'Slightly Opposition'
    | 'Mixed / Center'
    | 'Slightly Pro-Government'
    | 'Pro-Government'
    | 'Uncertain';

/**
 * Get the Turkish alignment label based on score and confidence
 * @param score Government alignment score (-5 to +5)
 * @param confidence Confidence level (0 to 1)
 * @returns Turkish alignment label
 */
export function getAlignmentLabel(score: number, confidence: number): AlignmentLabel {
    // Low confidence rule: show "Belirsiz" if confidence < 0.6
    if (confidence < 0.6) {
        return 'Belirsiz';
    }

    if (score <= -3) return 'Muhalefete Yakın';
    if (score <= -1) return 'Muhalefete Eğilimli';
    if (score === 0) return 'Karışık / Merkez';
    if (score <= 2) return 'İktidara Eğilimli';
    return 'İktidara Yakın';
}

/**
 * Get the English alignment label based on score and confidence
 * @param score Government alignment score (-5 to +5)
 * @param confidence Confidence level (0 to 1)
 * @returns English alignment label
 */
export function getAlignmentLabelEn(score: number, confidence: number): AlignmentLabelEn {
    if (confidence < 0.6) {
        return 'Uncertain';
    }

    if (score <= -3) return 'Opposition-Leaning';
    if (score <= -1) return 'Slightly Opposition';
    if (score === 0) return 'Mixed / Center';
    if (score <= 2) return 'Slightly Pro-Government';
    return 'Pro-Government';
}

/**
 * Get both Turkish and English labels
 */
export function getAlignmentLabels(score: number, confidence: number): {
    tr: AlignmentLabel;
    en: AlignmentLabelEn;
} {
    return {
        tr: getAlignmentLabel(score, confidence),
        en: getAlignmentLabelEn(score, confidence),
    };
}

/**
 * Validate alignment score is within valid range
 * @param score Score to validate
 * @returns true if valid (-5 to +5)
 */
export function isValidAlignmentScore(score: number): boolean {
    return Number.isInteger(score) && score >= -5 && score <= 5;
}

/**
 * Validate confidence is within valid range
 * @param confidence Confidence to validate
 * @returns true if valid (0 to 1)
 */
export function isValidConfidence(confidence: number): boolean {
    return confidence >= 0 && confidence <= 1;
}
