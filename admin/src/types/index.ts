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
  countryCode: CountryCode;
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
  articles: Record<CountryCode | 'total', number>;
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

export interface DigestQualityMetrics {
  country: CountryCode;
  days: number;
  digests: number;
  topics: number;
  avgImportanceScore: number;
  counterNarrativeCoverage: number;
  timelineCoverage: number;
  uncertaintyDistribution: {
    Kesin: number;
    Muhtemel: number;
    Gelisiyor: number;
  };
}

export interface DigestTopic {
  title: string;
  description: string;
  articleId?: string;
  whyImportant?: string;
  uncertaintyLevel?: 'Kesin' | 'Muhtemel' | 'Gelisiyor';
  counterNarrative?: string;
  timeline?: {
    before: string;
    now: string;
    next: string;
  };
  importanceScore?: number;
  importanceTier?: 'yuksek' | 'orta' | 'dusuk';
}

export interface SectionTweet {
  author: string;
  handle: string;
  text: string;
  profileImageUrl?: string | null;
}

export interface DigestSection {
  category: string;
  icon?: string;
  summary: string;
  highlights?: string[];
  counterNarrative?: string;
  uncertaintyLevel?: 'Kesin' | 'Muhtemel' | 'Gelisiyor';
  timeline?: {
    before: string;
    now: string;
    next: string;
  };
  importanceScore?: number;
  tweetContext?: string;
  tweets?: SectionTweet[];
}

export interface DailyDigestAdmin {
  id: string;
  countryCode: CountryCode;
  period: 'daily';
  date: string;
  title: string;
  summary: string;
  topTopics: DigestTopic[];
  sections?: DigestSection[];
  socialHighlights?: SectionTweet[];
  articleCount: number;
  tweetCount?: number;
  createdAt: string;
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
  countryCode: CountryCode;
  isActive: boolean;
  scrapeIntervalMinutes: number;
}

export interface UpdateSourceForm {
  sourceName?: string;
  sourceLogoUrl?: string;
  rssUrl?: string;
  countryCode?: CountryCode;
  isActive?: boolean;
  scrapeIntervalMinutes?: number;
}

export interface UpdateUserForm {
  userRole?: 'user' | 'admin';
  subscriptionStatus?: 'free' | 'premium';
}

// Twitter Account types
export interface TwitterAccount {
  id: number;
  countryCode: CountryCode;
  userName: string;
  displayName: string;
  profileImageUrl: string | null;
  accountType: 'government' | 'news_agency' | 'journalist' | 'institution' | 'political_party';
  isActive: boolean;
  description: string | null;
  govAlignmentScore: number;
  lastFetchedAt: string | null;
}

export interface CreateTwitterAccountForm {
  countryCode: CountryCode;
  userName: string;
  displayName: string;
  profileImageUrl?: string | null;
  accountType: TwitterAccount['accountType'];
  isActive: boolean;
  description?: string | null;
  govAlignmentScore: number;
}

// Cron Log types
export interface CronLogEntry {
  id: string;
  jobName: string;
  status: 'success' | 'error';
  message: string;
  duration?: number;
  timestamp: string;
}

// Notification types
export interface NotificationEntry {
  id: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  data: Record<string, unknown>;
  isRead: boolean;
  sentAt: string;
}

export interface DeviceStats {
  total: number;
  ios: number;
  android: number;
}

// System Health types
export interface SystemHealth {
  uptime: number;
  memory: {
    rss: number;
    heapUsed: number;
    heapTotal: number;
  };
  database: Record<string, { articles: number; digests: number; tweets: number }>;
  users: number;
  activeSources: number;
  registeredDevices: number;
  aiUsage: AIUsageMetric[];
}

export interface AIUsageMetric {
  id: number;
  date: string;
  totalCalls: number;
  successfulCalls: number;
  failedCalls: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  estimatedCostUsd: number;
}

// Update Article Form
export interface UpdateArticleForm {
  translatedTitle?: string;
  summary?: string;
  categoryId?: number | null;
  isFiltered?: boolean;
  sentiment?: 'positive' | 'neutral' | 'negative';
}

// Country type
export type CountryCode = 'tr' | 'de' | 'us' | 'uk' | 'fr' | 'es' | 'it' | 'ru';

export const COUNTRIES: { code: CountryCode; name: string; flag: string }[] = [
  { code: 'tr', name: 'Turkey', flag: 'TR' },
  { code: 'de', name: 'Germany', flag: 'DE' },
  { code: 'us', name: 'United States', flag: 'US' },
  { code: 'uk', name: 'United Kingdom', flag: 'UK' },
  { code: 'fr', name: 'France', flag: 'FR' },
  { code: 'es', name: 'Spain', flag: 'ES' },
  { code: 'it', name: 'Italy', flag: 'IT' },
  { code: 'ru', name: 'Russia', flag: 'RU' },
];

