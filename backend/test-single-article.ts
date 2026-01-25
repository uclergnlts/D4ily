import 'dotenv/config';
import { nanoid } from 'nanoid';
import { db } from './src/config/db.js';
import { tr_articles, tr_article_sources, categories } from './src/db/schema/index.js';
import { processArticleWithAI } from './src/services/ai/aiService.js';
import { eq } from 'drizzle-orm';

async function test() {
    console.log('🧪 Testing single article processing...\n');

    // Test article
    const testTitle = "Türkiye ekonomisi büyümeye devam ediyor";
    const testContent = "Türkiye ekonomisi 2024 yılının son çeyreğinde yüzde 4.5 büyüme kaydetti. Ekonomi Bakanı açıklamasında hedeflerin üzerinde bir performans sergilediklerini belirtti.";

    console.log('1️⃣ OpenAI ile işleniyor...');
    const aiResult = await processArticleWithAI(testTitle, testContent, 'tr');
    console.log('✅ AI Result:', JSON.stringify(aiResult, null, 2));

    console.log('\n2️⃣ Kategori bulunuyor...');
    const categoryResult = await db
        .select()
        .from(categories)
        .where(eq(categories.name, aiResult.category))
        .limit(1);
    const categoryId = categoryResult[0]?.id || 2; // Default to Ekonomi
    console.log('✅ Category ID:', categoryId);

    console.log('\n3️⃣ Veritabanına kaydediliyor...');
    const articleId = nanoid();
    await db.insert(tr_articles).values({
        id: articleId,
        originalTitle: testTitle,
        originalContent: testContent,
        originalLanguage: 'tr',
        translatedTitle: aiResult.translatedTitle,
        summary: aiResult.summary,
        isClickbait: aiResult.isClickbait,
        isAd: aiResult.isAd,
        isFiltered: false,
        sourceCount: 1,
        sentiment: aiResult.sentiment,
        politicalTone: aiResult.politicalTone,
        politicalConfidence: aiResult.politicalConfidence,
        governmentMentioned: aiResult.governmentMentioned,
        emotionalTone: aiResult.emotionalTone,
        emotionalIntensity: aiResult.emotionalIntensity,
        loadedLanguageScore: aiResult.loadedLanguageScore,
        sensationalismScore: aiResult.sensationalismScore,
        categoryId,
        publishedAt: new Date(),
        scrapedAt: new Date(),
        viewCount: 0,
        likeCount: 0,
        dislikeCount: 0,
        commentCount: 0,
    });
    console.log('✅ Article saved with ID:', articleId);

    // Add source
    await db.insert(tr_article_sources).values({
        id: nanoid(),
        articleId: articleId,
        sourceName: 'Test Source',
        sourceLogoUrl: 'https://example.com/logo.png',
        sourceUrl: 'https://example.com/article',
        isPrimary: true,
        addedAt: new Date(),
    });
    console.log('✅ Source added');

    console.log('\n4️⃣ Kaydedilen makale kontrol ediliyor...');
    const saved = await db.select().from(tr_articles).where(eq(tr_articles.id, articleId)).limit(1);
    if (saved[0]) {
        console.log('✅ Saved article:');
        console.log('   Title:', saved[0].originalTitle);
        console.log('   Summary:', saved[0].summary);
        console.log('   EmotionalTone:', JSON.stringify(saved[0].emotionalTone));
        console.log('   EmotionalIntensity:', saved[0].emotionalIntensity);
        console.log('   Sensationalism:', saved[0].sensationalismScore);
        console.log('   Political:', saved[0].politicalTone, '(confidence:', saved[0].politicalConfidence + ')');
    }

    console.log('\n🎉 Test completed!');
    process.exit(0);
}

test().catch(err => {
    console.error('❌ Error:', err);
    process.exit(1);
});
