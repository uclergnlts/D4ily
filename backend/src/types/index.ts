// API Response Types
export type ApiResponse<T> = {
    success: true;
    data: T;
} | {
    success: false;
    error: string;
    details?: string;
};

// Database Types
export type Category = {
    id: number;
    name: string;
    slug: string;
    icon: string | null;
    color: string | null;
};

export type RSSSource = {
    id: number;
    countryCode: string;
    sourceName: string;
    sourceLogoUrl: string;
    rssUrl: string | null;
    apiEndpoint: string | null;
    apiKey: string | null;
    isActive: boolean;
    scrapeIntervalMinutes: number;
    biasScoreSystem: number | null;
    biasScoreUser: number | null;
    biasVoteCount: number;
    // Government alignment fields
    govAlignmentScore: number;
    govAlignmentLabel: string | null;
    govAlignmentConfidence: number | null;
    govAlignmentNotes: string | null;
    govAlignmentLastUpdated: Date | null;
};

export type SourceStance = {
    sourceId: number;
    sourceName: string;
    govAlignmentScore: number;
    govAlignmentLabel: string;
    confidence: number;
    notes: string | null;
    lastUpdated: string | null;
};

export type SourceAlignmentHistory = {
    id: string;
    sourceId: number;
    oldScore: number | null;
    newScore: number;
    oldLabel: string | null;
    newLabel: string | null;
    reason: string;
    updatedBy: 'admin' | 'ai' | 'user_vote';
    updatedAt: Date;
};

export type ArticlePerspective = {
    id: string;
    mainArticleId: string;
    relatedArticleId: string;
    similarityScore: number;
    matchedEntities: string[] | null;
    createdAt: Date;
};

export type Article = {
    id: string;
    originalTitle: string;
    originalContent: string | null;
    originalLanguage: string;
    translatedTitle: string;
    summary: string;
    isClickbait: boolean;
    isAd: boolean;
    isFiltered: boolean;
    sourceCount: number;
    sentiment: 'positive' | 'neutral' | 'negative' | null;
    categoryId: number | null;
    publishedAt: Date;
    scrapedAt: Date;
    viewCount: number;
    likeCount: number;
    dislikeCount: number;
    commentCount: number;
    // Emotional analysis fields
    emotionalTone: EmotionalTone | null;
    emotionalIntensity: number | null;
    loadedLanguageScore: number | null;
    sensationalismScore: number | null;
};

// Emotional Analysis Types
export type EmotionalTone = {
    anger: number;
    fear: number;
    joy: number;
    sadness: number;
    surprise: number;
};

export type EmotionalAnalysisResponse = {
    articleId: string;
    emotionalTone: EmotionalTone;
    emotionalIntensity: number;
    loadedLanguageScore: number;
    sensationalismScore: number;
    dominantEmotion: string;
    dominantEmotionLabel: string;
    intensityLabel: string;
    sensationalismLabel: string;
    politicalTone: number;
    politicalConfidence: number;
};

// Alignment Voting Types
export type AlignmentVoteType = 'agree' | 'disagree' | 'unsure';

export type AlignmentVote = {
    id: string;
    userId: string;
    sourceId: number;
    voteType: AlignmentVoteType;
    suggestedScore: number | null;
    comment: string | null;
    createdAt: Date;
    updatedAt: Date;
};

export type AlignmentFeedback = {
    sourceId: number;
    sourceName: string;
    currentScore: number;
    currentLabel: string | null;
    totalVotes: number;
    agreeCount: number;
    disagreeCount: number;
    unsureCount: number;
    agreePercentage: number;
    averageSuggestedScore: number | null;
};

export type UserAlignmentReputation = {
    userId: string;
    totalVotes: number;
    accurateVotes: number;
    reputationScore: number;
    accuracyPercentage: number;
    level: string;
    lastVoteAt: string | null;
};

export type PendingAlignmentNotification = {
    id: string;
    userId: string;
    sourceId: number;
    sourceName: string;
    oldScore: number | null;
    newScore: number;
    oldLabel: string | null;
    newLabel: string | null;
    changeReason: string | null;
    status: 'pending' | 'sent' | 'failed';
    createdAt: Date;
    sentAt: Date | null;
};
