// API Response Types
export type ApiResponse<T> = {
    success: true;
    data: T;
} | {
    success: false;
    error: string;
    details?: string;
};

export interface AuthUser {
    uid: string;
    email: string;
    name: string;
    role: 'user' | 'admin';
}

export interface UserProfile {
    id: string;
    email: string;
    name: string;
    avatarUrl: string | null;
    userRole: 'user' | 'admin';
    createdAt: string;
}

export interface UserReputation {
    totalVotes: number;
    accurateVotes: number;
    reputationScore: number;
    accuracyPercentage: number;
    level: string;
    lastVoteAt: string | null;
}

export interface Category {
    id: number;
    name: string;
    slug: string;
    icon: string | null;
    color: string | null;
}

export interface DailyDigest {
    id: string;
    date: string; // YYYY-MM-DD
    countryCode: string;
    period: 'morning' | 'evening';
    title: string;
    summary: string;
    topTopics: {
        title: string;
        description: string;
        articleId?: string;
    }[];
    articleCount: number;
    createdAt: string;
}

export interface Comment {
    id: string;
    targetType: 'article' | 'daily_digest';
    targetId: string;
    userId: string;
    content: string;
    parentCommentId: string | null;
    likeCount: number;
    createdAt: string;
    updatedAt: string | null;
    // Joined user data (might need backend adjustment if not returned)
    // Looking at backend code, it returns comment object directly.
    // Ideally it should join user. If not, we show "User".
    // MVP: Assume backend returns raw comment, we might need a separate call or backend update?
    // Backend route currently does NOT join user table. It returns raw comments.
    // MVP fix: We'll layout comments without user name for now or fetch user?
    // Wait, let's assume raw comment for now.
    replies?: Comment[];
    replyCount?: number;
}

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
    publishedAt: string; // ISO String
    scrapedAt: string; // ISO String
    viewCount: number;
    likeCount: number;
    dislikeCount: number;
    commentCount: number;
    imageUrl?: string | null;

    // AI Fields - Optional (may not be populated)
    politicalTone?: number; // -5 to +5
    politicalConfidence?: number;
    governmentMentioned?: boolean;

    // Emotional analysis fields - Optional
    emotionalTone?: EmotionalTone | null;
    emotionalIntensity?: number | null;
    loadedLanguageScore?: number | null;
    sensationalismScore?: number | null;

    // Linked Sources (Joined via API)
    sources?: ArticleSource[];

    // For Balanced Feed
    govAlignmentScore?: number;
    govAlignmentLabel?: string;
    source?: string;
    sourceLogoUrl?: string; // Sometimes populated directly
};

export type ArticleSource = {
    id: number;
    articleId: string;
    sourceName: string;
    sourceLogoUrl: string;
    sourceUrl: string;
    isPrimary: boolean;
    addedAt: string;

    // Stance info from RSSSource joined
    govAlignmentScore?: number;
    govAlignmentLabel?: string;
    govAlignmentConfidence?: number;
};

export type FeedResponse = {
    articles: Article[];
    pagination?: {
        page: number;
        limit: number;
        hasMore: boolean;
    };
};

export type BalancedFeedResponse = {
    proGov: Article[];
    mixed: Article[];
    antiGov: Article[];
};

export interface PerspectiveMatch {
    articleId: string;
    title: string;
    summary: string;
    sourceName: string;
    sourceLogoUrl: string;
    sourceUrl: string;
    govAlignmentScore: number;
    govAlignmentLabel: string;
    publishedAt: string; // ISO
    similarityScore: number;
    matchedEntities: string[];
}

export interface PerspectivesResult {
    mainArticle: {
        id: string;
        title: string;
        summary: string;
        sourceName: string;
        govAlignmentScore: number;
        govAlignmentLabel: string;
    };
    relatedPerspectives: PerspectiveMatch[];
}
