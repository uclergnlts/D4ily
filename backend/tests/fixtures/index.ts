export const mockArticle = {
    id: 'test-article-1',
    originalTitle: 'Test News Article',
    originalContent: 'This is test content',
    originalLanguage: 'en',
    translatedTitle: 'Test Haber Makalesi',
    summary: 'Bu bir test özeti',
    isClickbait: false,
    isAd: false,
    isFiltered: false,
    sourceCount: 1,
    sentiment: 'neutral' as const,
    categoryId: 1,
    publishedAt: new Date('2026-01-22T00:00:00Z'),
    scrapedAt: new Date('2026-01-22T01:00:00Z'),
    viewCount: 0,
    likeCount: 0,
    dislikeCount: 0,
    commentCount: 0,
};

export const mockComment = {
    id: 'test-comment-1',
    userId: 'test-user-123',
    targetType: 'article' as const,
    targetId: 'test-article-1',
    countryCode: 'tr',
    content: 'This is a test comment',
    parentCommentId: null,
    likeCount: 0,
    createdAt: new Date('2026-01-22T02:00:00Z'),
    updatedAt: null,
};

export const mockRssSource = {
    id: 99,
    countryCode: 'tr',
    sourceName: 'Test Source',
    sourceLogoUrl: 'https://example.com/logo.png',
    rssUrl: 'https://example.com/rss',
    apiEndpoint: null,
    apiKey: null,
    isActive: true,
    scrapeIntervalMinutes: 30,
    biasScoreSystem: 5.0,
    biasScoreUser: null,
    biasVoteCount: 0,
};

export const mockCategory = {
    id: 99,
    name: 'Test Category',
    slug: 'test-category',
    icon: '🧪',
    color: '#000000',
};
