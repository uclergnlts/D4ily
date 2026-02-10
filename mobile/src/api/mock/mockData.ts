import { Article, FeedResponse, BalancedFeedResponse, ArticleSummaryResponse } from '../../types';

const generateId = () => Math.random().toString(36).substr(2, 9);
const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

const TITLES = {
    tr: [
        "Yeni Ekonomi Paketi Açıklandı: Vergi Reformu Geliyor",
        "İstanbul'da Metro Hattı Çalışmaları Hızlandı",
        "Milli Takım Avrupa Şampiyonası Yolunda",
        "Teknoloji Devinden Türkiye'ye Dev Yatırım",
        "Eğitim Sisteminde Köklü Değişiklik Sinyali"
    ],
    us: [
        "White House Announces New Climate Initiative",
        "Tech Giants Face New Regulations in Congress",
        "Wall Street Rallies on Jobs Report",
        "SpaceX Launches New Starlink Mission",
        "Healthcare Reform Bill Passes Senate"
    ],
    de: [
        "Bundestag Verabschiedet Neues Energiegesetz",
        "Bahnstreik: Millionen Pendler Betroffen",
        "Deutsche Autoindustrie Setzt auf E-Mobilität",
        "Digitalisierung der Schulen Kommt Voran",
        "Berlin Plant Neue Wohnungsbau-Offensive"
    ],
    uk: [
        "Parliament Debates New Trade Deal",
        "NHS Funding Boost Announced by PM",
        "London Stock Exchange Sees Record Highs",
        "Royal Family Attends Charity Gala",
        "Weather Warning Issued for Northern England"
    ],
    fr: [
        "Réforme des Retraites : Nouvelles Manifestations",
        "Le Président Annonce un Plan pour la Culture",
        "Paris Prépare les Jeux Olympiques",
        "Hausse du Smic au 1er Janvier",
        "Innovation : Une Start-up Française à la Conquête de l'Espace"
    ]
};

const TRANSLATED_TITLES = {
    tr: TITLES.tr,
    us: [
        "Beyaz Saray Yeni İklim Girişimini Duyurdu",
        "Teknoloji Devleri Kongre'de Yeni Düzenlemelerle Karşı Karşıya",
        "Wall Street İstihdam Raporuyla Yükselişe Geçti",
        "SpaceX Yeni Starlink Görevini Başlattı",
        "Sağlık Reformu Tasarısı Senato'dan Geçti"
    ],
    de: [
        "Federal Meclis Yeni Enerji Yasasını Onayladı",
        "Demiryolu Grevi: Milyonlarca Yolcu Etkilendi",
        "Alman Otomotiv Endüstrisi E-Mobiliteye Odaklanıyor",
        "Okulların Dijitalleşmesi İlerliyor",
        "Berlin Yeni Konut İnşaat Hamlesi Planlıyor"
    ],
    uk: [
        "Parlamento Yeni Ticaret Anlaşmasını Tartışıyor",
        "Başbakan NHS İçin Fon Artışı Duyurdu",
        "Londra Borsası Rekor Seviyeleri Gördü",
        "Kraliyet Ailesi Yardım Galasına Katıldı",
        "Kuzey İngiltere İçin Hava Uyarısı Yapıldı"
    ],
    fr: [
        "Emeklilik Reformu: Yeni Gösteriler Düzenlendi",
        "Cumhurbaşkanı Kültür İçin Yeni Plan Açıkladı",
        "Paris Olimpiyat Oyunlarına Hazırlanıyor",
        "1 Ocak'ta Asgari Ücrete Zam",
        "İnovasyon: Bir Fransız Girişimi Uzayı Fethediyor"
    ]
};

const SOURCES = {
    tr: ['Habertürk', 'NTV', 'Sözcü', 'Sabah', 'Cumhuriyet'],
    us: ['CNN', 'Fox News', 'NY Times', 'Washington Post', 'Reuters'],
    de: ['Der Spiegel', 'Bild', 'Die Zeit', 'FAZ', 'Tagesschau'],
    uk: ['BBC', 'The Guardian', 'Sky News', 'Daily Mail', 'Telegraph'],
    fr: ['Le Monde', 'Le Figaro', 'France 24', 'Libération', 'Les Echos']
};

export const getMockFeed = (country: string = 'tr', page: number = 1): FeedResponse => {
    const titles = TITLES[country as keyof typeof TITLES] || TITLES.tr;
    const translatedTitles = TRANSLATED_TITLES[country as keyof typeof TRANSLATED_TITLES] || TRANSLATED_TITLES.tr;
    const sources = SOURCES[country as keyof typeof SOURCES] || SOURCES.tr;

    // Create deterministic or somewhat random articles
    const articles: Article[] = Array.from({ length: 5 }).map((_, i) => {
        const titleIndex = i % titles.length;
        return {
            id: generateId(),
            originalTitle: titles[titleIndex],
            originalContent: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat...",
            originalLanguage: country,
            translatedTitle: translatedTitles[titleIndex],
            summary: "Yapay zeka tarafından oluşturulan haber özeti. Ana gelişmeler ve kritik noktalar hakkında bilgi.",
            detailContent: "Bu haberin detaylı içeriği yapay zeka tarafından oluşturulmuştur. Detaylar ve analizler için okumaya devam edin. Haberin içeriğindeki önemli noktalar şunlardır: Ekonomik gelişmeler, toplumsal etkiler ve gelecek öngörüleri. Uzmanlar konuya ilişkin değerlendirmelerini paylaşırken, piyasalar da gelişmeleri yakından takip ediyor. Konunun tarafları farklı perspektiflerden olayı değerlendiriyor.",
            isClickbait: Math.random() > 0.8,
            isAd: false,
            isFiltered: false,
            sourceCount: randomInt(1, 5),
            sentiment: Math.random() > 0.5 ? 'positive' : 'negative',
            categoryId: randomInt(1, 5),
            publishedAt: new Date().toISOString(),
            scrapedAt: new Date().toISOString(),
            viewCount: randomInt(100, 5000),
            likeCount: randomInt(10, 500),
            dislikeCount: randomInt(0, 50),
            commentCount: randomInt(0, 100),
            source: sources[randomInt(0, sources.length - 1)],
            sourceLogoUrl: `https://ui-avatars.com/api/?name=${sources[randomInt(0, sources.length - 1)].substr(0, 2)}&background=random`,
            govAlignmentScore: randomInt(-5, 5),
            govAlignmentLabel: 'Center',
            // Analysis fields mock
            politicalTone: randomInt(-5, 5),
            politicalConfidence: 0.85,
            governmentMentioned: Math.random() > 0.5,
            emotionalTone: {
                anger: Math.random(),
                fear: Math.random(),
                joy: Math.random(),
                sadness: Math.random(),
                surprise: Math.random()
            },
            emotionalIntensity: Math.random(),
            sources: [
                {
                    id: randomInt(1, 1000),
                    articleId: generateId(),
                    addedAt: new Date().toISOString(),
                    sourceName: sources[randomInt(0, sources.length - 1)],
                    sourceUrl: 'https://example.com',
                    sourceLogoUrl: `https://ui-avatars.com/api/?name=TV&background=random`,
                    isPrimary: true,
                    govAlignmentScore: randomInt(-5, 5)
                }
            ]
        };
    });

    return {
        articles,
        pagination: {
            page,
            limit: 5,
            hasMore: true
        }
    };
};

export const getMockBalancedFeed = (country: string = 'tr'): BalancedFeedResponse => {
    const raw = getMockFeed(country);
    return {
        proGov: raw.articles.slice(0, 1).map(a => ({ ...a, govAlignmentLabel: 'Pro-Gov', govAlignmentScore: 4 })),
        mixed: raw.articles.slice(1, 4).map(a => ({ ...a, govAlignmentLabel: 'Mixed', govAlignmentScore: 0 })),
        antiGov: raw.articles.slice(4, 5).map(a => ({ ...a, govAlignmentLabel: 'Anti-Gov', govAlignmentScore: -4 })),
    };
};

export const getMockArticle = (id: string, country: string = 'tr'): Article => {
    // Generate a consistent mock article based on ID/Country
    const feed = getMockFeed(country);
    // Return a random article from the feed generator but override ID
    const article = feed.articles[0];
    return { ...article, id };
};

export const getMockAnalysis = (id: string): any => {
    return {
        articleId: id,
        emotionalTone: {
            anger: Math.random(),
            fear: Math.random(),
            joy: Math.random(),
            sadness: Math.random(),
            surprise: Math.random()
        },
        emotionalIntensity: 0.8,
        loadedLanguageScore: 0.7,
        sensationalismScore: 0.4,
        dominantEmotion: 'joy',
        dominantEmotionLabel: 'Neşe',
        intensityLabel: 'Yüksek',
        sensationalismLabel: 'Orta',
        politicalTone: -2,
        politicalConfidence: 0.9
    };
};

export const getMockPerspectives = (id: string): any => {
    return {
        mainArticle: {
            id,
            title: "Ana Haber Başlığı (TR)",
            summary: "Ana haberin özeti...",
            sourceName: "Ana Kaynak",
            govAlignmentScore: 2,
            govAlignmentLabel: "Pro-Gov"
        },
        relatedPerspectives: [
            {
                articleId: "p1",
                title: "Alternatif Bakış Açısı 1 (TR)",
                summary: "Farklı bir kaynaktan olayların yorumlanması...",
                sourceName: "Muhalif Ses",
                sourceLogoUrl: "https://ui-avatars.com/api/?name=MS&background=random",
                sourceUrl: "https://example.com",
                govAlignmentScore: -3,
                govAlignmentLabel: "Anti-Gov",
                publishedAt: new Date().toISOString(),
                similarityScore: 0.8,
                matchedEntities: []
            },
            {
                articleId: "p2",
                title: "Tarafsız Analiz (TR)",
                summary: "Rakamlarla ve verilerle desteklenen analiz...",
                sourceName: "Tarafsız Haber",
                sourceLogoUrl: "https://ui-avatars.com/api/?name=TH&background=random",
                sourceUrl: "https://example.com",
                govAlignmentScore: 0,
                govAlignmentLabel: "Neutral",
                publishedAt: new Date().toISOString(),
                similarityScore: 0.9,
                matchedEntities: []
            }
        ]
    };
};

export const getMockSummary = (id: string): ArticleSummaryResponse => {
    return {
        articleId: id,
        title: "Mock Haber Başlığı",
        summary: "Bu mock bir AI özetidir. Gerçek API bağlantısı olmadığında kullanılır. Haberin ana noktaları şunlardır: Birinci önemli gelişme ekonomiyle ilgili. İkinci önemli konu sosyal etkiler. Üçüncü nokta ise gelecek beklentileri hakkında. Uzmanlar konunun farklı yönlerini değerlendiriyor ve çeşitli perspektifler sunuyor.",
        keyPoints: [
            "Ekonomik göstergeler iyileşme sinyalleri veriyor",
            "Yeni düzenlemeler önümüzdeki ay yürürlüğe girecek",
            "Sektör temsilcileri değişiklikleri olumlu karşılıyor",
            "Uzmanlar uzun vadeli etkileri değerlendiriyor"
        ],
        context: "Bu gelişme, son dönemdeki politika değişikliklerinin bir devamı niteliğinde. Konuyla ilgili tartışmalar aylardır gündemde yer alıyor ve farklı kesimlerden çeşitli görüşler paylaşılıyor.",
        analysis: {
            politicalTone: -1.5,
            politicalConfidence: 0.75,
            governmentMentioned: true,
            emotionalTone: {
                anger: 0.15,
                fear: 0.1,
                joy: 0.3,
                sadness: 0.1,
                surprise: 0.2
            },
            emotionalIntensity: 0.45,
            dominantEmotion: 'joy',
            dominantEmotionLabel: 'Neşe',
            intensityLabel: 'Orta',
            loadedLanguageScore: 0.35,
            sensationalismScore: 0.25,
            sensationalismLabel: 'Düşük'
        }
    };
};
