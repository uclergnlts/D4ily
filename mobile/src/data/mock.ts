import { Article, ArticleSource, EmotionalTone, PerspectiveMatch, Comment } from '../types';

export const MOCK_ARTICLE: Article = {
    id: 'demo-article-1',
    originalTitle: 'Government announces new economic policy targeting inflation',
    originalContent: '...',
    originalLanguage: 'tr',
    translatedTitle: 'Hükümet Enflasyonla Mücadele İçin Yeni Ekonomi Paketini Açıkladı',
    summary: 'Maliye Bakanlığı tarafından açıklanan yeni paket, kamu harcamalarında kısıtlama ve vergi düzenlemeleri içeriyor. Uzmanlar paketin etkilerini tartışırken, piyasalar ilk tepki olarak olumlu sinyaller verdi. Muhalefet ise paketin dar gelirliyi zorlayacağı görüşünde.',
    isClickbait: false,
    isAd: false,
    isFiltered: false,
    sourceCount: 3,
    sentiment: 'neutral',
    categoryId: 2,
    publishedAt: new Date().toISOString(),
    scrapedAt: new Date().toISOString(),
    viewCount: 1250,
    likeCount: 342,
    dislikeCount: 45,
    commentCount: 18,

    // AI Fields
    politicalTone: 2, // Slightly Pro-Gov
    politicalConfidence: 0.85,
    governmentMentioned: true,

    emotionalTone: {
        anger: 0.1,
        fear: 0.2,
        joy: 0.4,
        sadness: 0.1,
        surprise: 0.2
    },
    emotionalIntensity: 0.75, // High intensity
    loadedLanguageScore: 0.3,
    sensationalismScore: 0.2,

    sources: [
        {
            id: 1,
            articleId: 'demo-article-1',
            sourceName: 'Sabah',
            sourceLogoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b3/Sabah_Logo.png/1200px-Sabah_Logo.png',
            sourceUrl: 'https://sabah.com.tr',
            isPrimary: true,
            addedAt: new Date().toISOString(),
            govAlignmentScore: 4,
            govAlignmentLabel: 'Hükümete Yakın'
        },
        {
            id: 2,
            articleId: 'demo-article-1',
            sourceName: 'Sözcü',
            sourceLogoUrl: 'https://upload.wikimedia.org/wikipedia/commons/2/23/S%C3%B6zc%C3%BC_logo.jpg',
            sourceUrl: 'https://sozcu.com.tr',
            isPrimary: false,
            addedAt: new Date().toISOString(),
            govAlignmentScore: -4,
            govAlignmentLabel: 'Muhalif'
        }
    ]
};

export const MOCK_PERSPECTIVES: { mainArticle: any; relatedPerspectives: PerspectiveMatch[] } = {
    mainArticle: {
        id: 'demo-article-1',
        title: 'Ekonomi Paketi Açıklandı',
        summary: '...',
        sourceName: 'Sabah',
        govAlignmentScore: 4,
        govAlignmentLabel: 'Hükümete Yakın'
    },
    relatedPerspectives: [
        {
            articleId: 'demo-p-1',
            title: 'Yeni Vergi Paketi Vatandaşı Nasıl Etkileyecek?',
            summary: 'Ekonomistler yeni paketin yükü yine vatandaşa bindirdiğini savunuyor.',
            sourceName: 'Sözcü',
            sourceLogoUrl: 'https://upload.wikimedia.org/wikipedia/commons/2/23/S%C3%B6zc%C3%BC_logo.jpg',
            sourceUrl: '...',
            govAlignmentScore: -4,
            govAlignmentLabel: 'Muhalif',
            publishedAt: new Date(Date.now() - 3600000).toISOString(),
            similarityScore: 0.85,
            matchedEntities: []
        },
        {
            articleId: 'demo-p-2',
            title: 'Piyasalardan Pakete İlk Tepki: Dolar Düştü',
            summary: 'Açıklanan kararlar sonrası döviz kurlarında gerileme gözlemlendi.',
            sourceName: 'Bloomberg HT',
            sourceLogoUrl: 'https://upload.wikimedia.org/wikipedia/commons/e/e9/Bloomberg_HT_logo.png',
            sourceUrl: '...',
            govAlignmentScore: 0,
            govAlignmentLabel: 'Nötr',
            publishedAt: new Date(Date.now() - 7200000).toISOString(),
            similarityScore: 0.92,
            matchedEntities: []
        }
    ]
};

export const MOCK_COMMENTS: Comment[] = [
    {
        id: 'c1',
        targetType: 'article',
        targetId: 'demo-article-1',
        userId: 'u1',
        content: 'Bence yerinde kararlar alınmış, özellikle tasarruf tedbirleri önemli.',
        parentCommentId: null,
        likeCount: 15,
        createdAt: new Date(Date.now() - 1800000).toISOString(), // 30 mins ago
        updatedAt: null,
        replies: [
            {
                id: 'c2',
                targetType: 'article',
                targetId: 'demo-article-1',
                userId: 'u2',
                content: 'Tasarruf sadece vatandaştan bekleniyor ama...',
                parentCommentId: 'c1',
                likeCount: 42,
                createdAt: new Date(Date.now() - 900000).toISOString(), // 15 mins ago
                updatedAt: null,
            }
        ]
    },
    {
        id: 'c3',
        targetType: 'article',
        targetId: 'demo-article-1',
        userId: 'u3',
        content: 'Uygulamada görmek lazım, kağıt üzerinde güzel duruyor.',
        parentCommentId: null,
        likeCount: 8,
        createdAt: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
        updatedAt: null,
    }
];
