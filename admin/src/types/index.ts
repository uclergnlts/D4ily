// User types
export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  userRole: 'user' | 'admin';
  subscriptionStatus: 'free' | 'premium';
  createdAt: string;
  updatedAt: string;
}

// Source types
export interface RssSource {
  id: number;
  countryCode: 'tr' | 'de' | 'us';
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
  govAlignmentScore: number;
  govAlignmentLabel: string | null;
  govAlignmentConfidence: number;
  govAlignmentNotes: string | null;
  govAlignmentLastUpdated: string | null;
}

// Article types
export interface Article {
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
  politicalTone: number;
  politicalConfidence: number;
  governmentMentioned: boolean;
  emotionalTone: EmotionalTone | null;
  emotionalIntensity: number | null;
  loadedLanguageScore: number | null;
  sensationalismScore: number | null;
  categoryId: number | null;
  publishedAt: string;
  scrapedAt: string;
  viewCount: number;
  likeCount: number;
  dislikeCount: number;
  commentCount: number;
  sources?: ArticleSource[];
}

export interface EmotionalTone {
  anger: number;
  fear: number;
  joy: number;
  sadness: number;
  surprise: number;
}

export interface ArticleSource {
  id: string;
  articleId: string;
  sourceName: string;
  sourceLogoUrl: string;
  sourceUrl: string;
  isPrimary: boolean;
}

// Category types
export interface Category {
  id: number;
  name: string;
  slug: string;
  icon: string | null;
  color: string | null;
}

// Stats types
export interface DashboardStats {
  users: {
    total: number;
  };
  sources: {
    total: number;
    active: number;
  };
  categories: {
    total: number;
  };
  articles: {
    tr: number;
    de: number;
    us: number;
    total: number;
  };
  serverUptime: number;
}

// Cron status types
export interface CronStatus {
  scraper: {
    schedule: string;
    status: 'active' | 'inactive';
  };
  digest: {
    schedule: string;
    status: 'active' | 'inactive';
  };
  weekly: {
    schedule: string;
    status: 'active' | 'inactive';
  };
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: {
    users: T[];
    pagination: {
      page: number;
      limit: number;
      hasMore: boolean;
    };
  };
}

// Form types
export interface CreateSourceForm {
  sourceName: string;
  sourceLogoUrl?: string;
  rssUrl?: string;
  countryCode: 'tr' | 'de' | 'us';
  isActive: boolean;
  scrapeIntervalMinutes: number;
}

export interface UpdateSourceForm {
  sourceName?: string;
  sourceLogoUrl?: string;
  rssUrl?: string;
  countryCode?: 'tr' | 'de' | 'us';
  isActive?: boolean;
  scrapeIntervalMinutes?: number;
}

export interface UpdateUserForm {
  userRole?: 'user' | 'admin';
  subscriptionStatus?: 'free' | 'premium';
}

// Country type
export type CountryCode = 'tr' | 'de' | 'us';

export const COUNTRIES: { code: CountryCode; name: string; flag: string }[] = [
  { code: 'tr', name: 'Turkey', flag: '🇹🇷' },
  { code: 'de', name: 'Germany', flag: '🇩🇪' },
  { code: 'us', name: 'USA', flag: '🇺🇸' },
];
