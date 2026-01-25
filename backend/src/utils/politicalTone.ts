/**
 * Political Tone Utilities
 * 
 * Combined scoring formula that merges source stance + article tone
 * with confidence thresholds and governmentMentioned weighting.
 */

export interface CombinedScoreInput {
    govAlignmentScore: number;    // Source's general alignment (-5 to +5)
    politicalTone: number;        // Article's specific tone (-5 to +5)
    politicalConfidence: number;  // AI confidence (0 to 1)
    governmentMentioned: boolean; // Does article mention government?
}

export interface CombinedScoreResult {
    combinedScore: number;           // Final combined score (-5 to +5)
    label: string;                   // Turkish label
    labelEn: string;                 // English label
    isUncertain: boolean;            // True if confidence too low
    confidence: number;              // Adjusted confidence
    signalStrength: 'strong' | 'moderate' | 'weak' | 'none';
}

const CONFIDENCE_THRESHOLD = 0.6;
const SOURCE_WEIGHT = 0.65;
const ARTICLE_WEIGHT_NORMAL = 0.35;
const ARTICLE_WEIGHT_NO_GOV = 0.1;  // When governmentMentioned=false

/**
 * Clamp a value between min and max
 */
function clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
}

/**
 * Calculate combined political score
 * 
 * Formula:
 * 1. combined = 0.65 * govAlignmentScore + 0.35 * politicalTone
 * 2. If governmentMentioned=false, reduce politicalTone weight to 0.1
 * 3. Multiply by clamped confidence (0.5 to 1.0)
 */
export function calculateCombinedScore(input: CombinedScoreInput): CombinedScoreResult {
    const { govAlignmentScore, politicalTone, politicalConfidence, governmentMentioned } = input;

    // Determine article weight based on governmentMentioned
    const articleWeight = governmentMentioned ? ARTICLE_WEIGHT_NORMAL : ARTICLE_WEIGHT_NO_GOV;
    const sourceWeight = 1 - articleWeight;

    // Calculate raw combined score
    let combined = (sourceWeight * govAlignmentScore) + (articleWeight * politicalTone);

    // Apply confidence multiplier (clamp between 0.5 and 1.0)
    const confidenceMultiplier = clamp(politicalConfidence, 0.5, 1.0);
    combined = combined * confidenceMultiplier;

    // Clamp final score to -5 to +5
    combined = clamp(combined, -5, 5);

    // Determine if uncertain
    const isUncertain = politicalConfidence < CONFIDENCE_THRESHOLD;

    // Get labels
    const label = isUncertain ? 'Belirsiz' : getCombinedLabel(combined);
    const labelEn = isUncertain ? 'Uncertain' : getCombinedLabelEn(combined);

    // Determine signal strength
    const signalStrength = getSignalStrength(politicalConfidence, governmentMentioned);

    return {
        combinedScore: Math.round(combined * 100) / 100, // 2 decimal places
        label,
        labelEn,
        isUncertain,
        confidence: politicalConfidence,
        signalStrength,
    };
}

/**
 * Get Turkish label for combined score
 */
function getCombinedLabel(score: number): string {
    if (score <= -3) return 'Hükümete Eleştirel';
    if (score <= -1) return 'Hafif Eleştirel';
    if (score >= -0.5 && score <= 0.5) return 'Nötr';
    if (score <= 2) return 'Hafif Olumlu';
    return 'Hükümete Olumlu';
}

/**
 * Get English label for combined score
 */
function getCombinedLabelEn(score: number): string {
    if (score <= -3) return 'Critical of Government';
    if (score <= -1) return 'Mildly Critical';
    if (score >= -0.5 && score <= 0.5) return 'Neutral';
    if (score <= 2) return 'Mildly Favorable';
    return 'Favorable to Government';
}

/**
 * Determine the strength of the AI signal
 */
function getSignalStrength(
    confidence: number,
    governmentMentioned: boolean
): 'strong' | 'moderate' | 'weak' | 'none' {
    if (!governmentMentioned) return 'none';
    if (confidence < 0.4) return 'none';
    if (confidence < 0.6) return 'weak';
    if (confidence < 0.8) return 'moderate';
    return 'strong';
}

/**
 * Format for UI display
 * Returns user-friendly string with proper disclaimers
 */
export function formatToneForUI(input: CombinedScoreInput): {
    badge: string;
    tooltip: string;
    showBadge: boolean;
} {
    const result = calculateCombinedScore(input);

    // Don't show badge if no signal
    if (result.signalStrength === 'none' || result.isUncertain) {
        return {
            badge: '',
            tooltip: '',
            showBadge: false,
        };
    }

    const confidencePercent = Math.round(result.confidence * 100);

    return {
        badge: `${result.label} (%${confidencePercent})`,
        tooltip: `AI sinyali: Bu içerikte ${result.label.toLowerCase()} dil tespit edildi. ` +
            `Güven: %${confidencePercent}. Bu bir olasılık tahminidir, kesin hüküm değildir.`,
        showBadge: true,
    };
}

/**
 * Should this article be included in political sorting?
 */
export function shouldIncludeInPoliticalSort(input: CombinedScoreInput): boolean {
    return input.governmentMentioned && input.politicalConfidence >= CONFIDENCE_THRESHOLD;
}

/**
 * Get sorting weight for feed
 * Higher weight = more reliable signal
 */
export function getSortingWeight(input: CombinedScoreInput): number {
    if (!input.governmentMentioned) return 0.1;
    return clamp(input.politicalConfidence, 0.3, 1.0);
}
