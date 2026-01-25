import 'dotenv/config';
import { db } from './src/config/db.js';
import {
    tr_articles,
    tr_article_sources,
    categories,
    rss_sources
} from './src/db/schema/index.js';
import { nanoid } from 'nanoid';
import { eq } from 'drizzle-orm';

async function main() {
    console.log('🌱 Seeding Mock Articles...');

    // Get Categories
    const cats = await db.select().from(categories);
    if (cats.length === 0) {
        console.error('No categories found! Seed basic data first.');
        process.exit(1);
    }
    const catPol = cats.find(c => c.slug === 'politika') || cats[0];
    const catTech = cats.find(c => c.slug === 'teknoloji') || cats[0];

    // Get a Source
    const sources = await db.select().from(rss_sources).where(eq(rss_sources.countryCode, 'tr')).limit(1);
    // If no sources, mock one? No, check-db said 8 sources exist.
    const source = sources[0];

    const mockArticles = [
        {
            title: "Yapay Zeka Destekli Haber Uygulaması Yayında",
            summary: "D4ily uygulaması, yapay zeka özellikleriyle kullanıcılarına kişiselleştirilmiş haber deneyimi sunuyor.",
            category: catTech,
            tone: "neutral"
        },
        {
            title: "Meclis'te Yeni Düzenleme Hazırlığı",
            summary: "TBMM gündemine gelmesi beklenen yeni yasa tasarısı hakkında detaylar netleşiyor.",
            category: catPol,
            tone: "neutral"
        },
        {
            title: "Ekonomide Yeni Gelişmeler",
            summary: "Borsa İstanbul güne yükselişle başladı, döviz kurlarında son durum.",
            category: catPol, // close enough
            tone: "neutral"
        },
        {
            title: "Milli Takımımızın Başarısı",
            summary: "A Milli Futbol Takımı, son maçında galip gelerek gruptan çıkmayı garantiledi.",
            category: cats.find(c => c.slug === 'spor') || cats[0],
            tone: "joy"
        },
        {
            title: "Teknoloji Dünyasında Son Trendler",
            summary: "Yeni çıkan telefon modelleri ve yazılım güncellemeleri incelendi.",
            category: catTech,
            tone: "joy"
        }
    ];

    for (const art of mockArticles) {
        const articleId = nanoid();
        console.log(`Inserting: ${art.title}`);

        await db.insert(tr_articles).values({
            id: articleId,
            originalTitle: art.title,
            originalContent: art.summary + " Detaylı içerik burada yer alacak...",
            originalLanguage: 'tr',
            translatedTitle: art.title, // Same for TR
            summary: art.summary,
            isClickbait: false,
            isAd: false,
            isFiltered: false,
            sourceCount: 1,
            sentiment: art.tone === 'joy' ? 'positive' : 'neutral',
            // emotionalTone: { anger: 0, fear: 0, joy: art.tone === 'joy' ? 0.8 : 0.1, sadness: 0, surprise: 0.1 },
            // politicalTone: 0,
            // politicalConfidence: 0.9,
            // governmentMentioned: false,
            categoryId: art.category.id,
            publishedAt: new Date(),
            scrapedAt: new Date(),
            viewCount: 10,
            likeCount: 5,
            dislikeCount: 0,
            commentCount: 2
        });

        if (source) {
            await db.insert(tr_article_sources).values({
                id: nanoid(),
                articleId: articleId,
                sourceName: source.sourceName,
                sourceLogoUrl: source.sourceLogoUrl,
                sourceUrl: source.rssUrl || 'https://example.com',
                isPrimary: true,
                addedAt: new Date()
            });
        }
    }

    console.log('✅ Mock articles seeded successfully.');
    process.exit(0);
}

main();
