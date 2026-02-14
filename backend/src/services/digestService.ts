import { db } from '../config/db.js';
import { sql } from 'drizzle-orm';
import { logger } from '../config/logger.js';
import { aiChatCompletion } from '../utils/aiRequestWrapper.js';
import { getDigestFallback } from '../utils/aiFallbacks.js';
import type { DigestSection } from '../utils/aiFallbacks.js';
import {
    tr_articles, tr_daily_digests, tr_tweets,
    de_articles, de_daily_digests, de_tweets,
    us_articles, us_daily_digests, us_tweets,
    uk_articles, uk_daily_digests, uk_tweets,
    fr_articles, fr_daily_digests, fr_tweets,
    es_articles, es_daily_digests, es_tweets,
    it_articles, it_daily_digests, it_tweets,
    ru_articles, ru_daily_digests, ru_tweets,
} from '../db/schema/index.js';
import { gte, lte, eq, desc, and } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

const COUNTRY_TABLES = {
    tr: { articles: tr_articles, digests: tr_daily_digests, tweets: tr_tweets },
    de: { articles: de_articles, digests: de_daily_digests, tweets: de_tweets },
    us: { articles: us_articles, digests: us_daily_digests, tweets: us_tweets },
    uk: { articles: uk_articles, digests: uk_daily_digests, tweets: uk_tweets },
    fr: { articles: fr_articles, digests: fr_daily_digests, tweets: fr_tweets },
    es: { articles: es_articles, digests: es_daily_digests, tweets: es_tweets },
    it: { articles: it_articles, digests: it_daily_digests, tweets: it_tweets },
    ru: { articles: ru_articles, digests: ru_daily_digests, tweets: ru_tweets },
} as const;

// Category ID → Turkish name mapping (matches seed data)
const CATEGORY_NAMES: Record<number, string> = {
    1: 'Politika', 2: 'Ekonomi', 3: 'Spor', 4: 'Teknoloji',
    5: 'Sağlık', 6: 'Bilim', 7: 'Kültür', 8: 'Dünya',
    9: 'Güvenlik', 10: 'Enerji', 11: 'Jeopolitik',
};

type CountryCode = keyof typeof COUNTRY_TABLES;
type Period = 'morning' | 'evening';

interface TopicItem {
    title: string;
    description: string;
}

interface TweetInput {
    text: string;
    userName: string;
    displayName: string;
    likeCount: number;
    retweetCount: number;
}

interface DigestResult {
    summaryText: string;
    topTopics: TopicItem[];
    sections: DigestSection[];
    articleCount: number;
    tweetCount: number;
}

interface ArticleInput {
    translatedTitle: string;
    summary: string;
    categoryId: number | null;
}

/**
 * Generate daily digest for non-TR countries (original format)
 */
async function generateDefaultDigestWithAI(
    articles: ArticleInput[],
    tweets: TweetInput[],
    period: Period,
): Promise<DigestResult> {
    const articleSummaries = articles
        .map((a, i) => `${i + 1}. ${a.translatedTitle}: ${a.summary}`)
        .join('\n');

    const tweetSection = tweets.length > 0
        ? `\n\n--- ÖNEMLİ TWEETLER ---\n${tweets.map((t, i) =>
            `${i + 1}. @${t.userName} (${t.displayName}): "${t.text}" (❤️ ${formatCount(t.likeCount)}, 🔄 ${formatCount(t.retweetCount)})`
        ).join('\n')}`
        : '';

    const sourceDescription = tweets.length > 0
        ? `${articles.length} haberi ve ${tweets.length} önemli tweeti`
        : `${articles.length} haberi`;

    const tweetInstruction = tweets.length > 0
        ? `\n   Hem haber kaynaklarından hem de resmi/kurumsal Twitter hesaplarından gelen bilgileri sentezle. Tweetlerdeki açıklamalar haberlere ek bağlam sağlıyorsa bunu belirt.`
        : '';

    const prompt = `Aşağıdaki ${sourceDescription} analiz et ve ${period === 'morning' ? 'sabah' : 'akşam'} özeti oluştur:

--- HABERLER ---
${articleSummaries}${tweetSection}

Lütfen şunları sağla:
1. summary: Günün önemli gelişmelerini özetleyen 2-3 paragraf (Türkçe, 150-200 kelime)${tweetInstruction}
2. top_topics: En çok konuşulan 3-5 konu, her biri için:
   - title: Konu başlığı (örn: "Ekonomi", "Siyaset", "Spor")
   - description: Kısa açıklama (1-2 cümle)

Örnek format:
{
  "summary": "...",
  "top_topics": [
    { "title": "Ekonomi", "description": "Dolar kuru ve enflasyon gelişmeleri gündemin başında" },
    { "title": "Siyaset", "description": "Yerel seçimler öncesi partiler arası rekabet artıyor" }
  ]
}

Sadece JSON formatında cevap ver.`;

    const result = await aiChatCompletion<any>(
        {
            model: 'gpt-4o-mini',
            messages: [
                {
                    role: 'system',
                    content: 'Sen bir haber analisti AI\'sısın. Günlük haber özetleri oluşturuyorsun. Sadece JSON formatında cevap ver.',
                },
                { role: 'user', content: prompt },
            ],
            response_format: { type: 'json_object' },
            temperature: 0.5,
        },
        {
            circuitName: 'openai:digest',
            useQuickClient: false,
            skipCircuitBreaker: true,
            fallback: () => getDigestFallback(articles.length, true),
            maxContentLength: 30000,
        }
    );

    const topTopics = (result.top_topics || []).map((topic: any) => {
        if (typeof topic === 'string') return { title: topic, description: '' };
        return { title: topic.title || '', description: topic.description || '' };
    });

    let summaryText = result.summary;
    if (typeof summaryText !== 'string') {
        summaryText = summaryText ? JSON.stringify(summaryText) : 'Günün özeti oluşturulamadı.';
    }

    return {
        summaryText: summaryText || 'Günün özeti oluşturulamadı.',
        topTopics,
        sections: [],
        articleCount: articles.length,
        tweetCount: tweets.length,
    };
}

/**
 * Generate detailed sectioned digest for Turkey
 */
async function generateTRDigestWithAI(
    articles: ArticleInput[],
    tweets: TweetInput[],
    period: Period,
): Promise<DigestResult> {
    // Group articles by category for structured prompt
    const grouped: Record<string, ArticleInput[]> = {};
    for (const article of articles) {
        const catName = article.categoryId ? (CATEGORY_NAMES[article.categoryId] || 'Gündem') : 'Gündem';
        if (!grouped[catName]) grouped[catName] = [];
        grouped[catName].push(article);
    }

    // Build category-grouped article text
    const categoryBlocks = Object.entries(grouped)
        .sort((a, b) => b[1].length - a[1].length) // Most articles first
        .map(([cat, arts]) => {
            const items = arts.map((a, i) => `  ${i + 1}. ${a.translatedTitle}: ${a.summary}`).join('\n');
            return `[${cat}] (${arts.length} haber)\n${items}`;
        })
        .join('\n\n');

    const tweetSection = tweets.length > 0
        ? `\n\n--- ÖNEMLİ TWEETLER ---\n${tweets.map((t, i) =>
            `${i + 1}. @${t.userName} (${t.displayName}): "${t.text}" (❤️ ${formatCount(t.likeCount)}, 🔄 ${formatCount(t.retweetCount)})`
        ).join('\n')}`
        : '';

    const tweetInstruction = tweets.length > 0
        ? `Tweetlerdeki resmi açıklamalar haberlere ek bağlam sağlıyorsa, ilgili bölümün "tweetContext" alanında belirt.`
        : '';

    const periodLabel = period === 'morning' ? 'sabah' : 'akşam';

    const prompt = `Aşağıdaki ${articles.length} haber${tweets.length > 0 ? ` ve ${tweets.length} önemli tweet` : ''} analiz ederek Türkiye ${periodLabel} bültenini oluştur.

Haberler kategorilere göre gruplandırılmıştır:

${categoryBlocks}${tweetSection}

Detaylı bir bülten oluştur. JSON formatında şu yapıyı kullan:

{
  "summary": "Günün genel değerlendirmesi, 2-3 cümlelik kısa giriş paragrafı",
  "sections": [
    {
      "category": "Kategori adı",
      "icon": "Uygun emoji",
      "summary": "Bu kategorideki gelişmeleri anlatan detaylı 1-2 paragraf (her paragraf en az 3-4 cümle)",
      "highlights": ["Öne çıkan gelişme 1", "Öne çıkan gelişme 2", "Öne çıkan gelişme 3"],
      "tweetContext": "Varsa ilgili tweet bilgisi, yoksa boş string"
    }
  ],
  "top_topics": [
    { "title": "Konu başlığı", "description": "1-2 cümle açıklama" }
  ]
}

Kurallar:
- Haberlere göre en az 3, en fazla 6 bölüm (section) oluştur. Yeterli haber olmayan kategorileri ATLA.
- Her bölümün summary'si detaylı olsun (en az 80 kelime). Sadece başlıkları değil, gelişmelerin bağlamını ve önemini açıkla.
- highlights her bölümde 2-4 madde olsun.
- ${tweetInstruction}
- top_topics en çok konuşulan 3-5 ana konuyu listelesin (bölümlerden bağımsız).
- Tüm içerik Türkçe olsun.
- Toplam bülten yaklaşık 500-700 kelime olmalı.
- icon alanında kategoriye uygun tek bir emoji kullan (örn: 🏛️ Siyaset, 💰 Ekonomi, ⚽ Spor, 🌍 Dünya, 🛡️ Güvenlik, 💻 Teknoloji, 🏥 Sağlık, ⚡ Enerji, 🎭 Kültür, 📰 Gündem, 🗺️ Jeopolitik).

Sadece JSON formatında cevap ver.`;

    const result = await aiChatCompletion<any>(
        {
            model: 'gpt-4o-mini',
            messages: [
                {
                    role: 'system',
                    content: 'Sen deneyimli bir Türkiye haber analisti AI\'sısın. Günlük haber bültenleri oluşturuyorsun. Haberleri kategorilere ayırarak detaylı, bilgilendirici özetler hazırlıyorsun. Sadece JSON formatında cevap ver.',
                },
                { role: 'user', content: prompt },
            ],
            response_format: { type: 'json_object' },
            temperature: 0.5,
        },
        {
            circuitName: 'openai:digest-tr',
            useQuickClient: false,
            skipCircuitBreaker: true,
            fallback: () => getDigestFallback(articles.length, true),
            maxContentLength: 50000, // Larger budget for TR sectioned prompt
        }
    );

    // Parse sections
    const sections: DigestSection[] = (result.sections || []).map((s: any) => ({
        category: String(s.category || ''),
        icon: String(s.icon || '📰'),
        summary: String(s.summary || ''),
        highlights: Array.isArray(s.highlights) ? s.highlights.map(String) : [],
        tweetContext: s.tweetContext ? String(s.tweetContext) : undefined,
    })).filter((s: DigestSection) => s.category && s.summary);

    // Parse top_topics
    const topTopics = (result.top_topics || []).map((topic: any) => {
        if (typeof topic === 'string') return { title: topic, description: '' };
        return { title: topic.title || '', description: topic.description || '' };
    });

    let summaryText = result.summary;
    if (typeof summaryText !== 'string') {
        summaryText = summaryText ? JSON.stringify(summaryText) : 'Günün özeti oluşturulamadı.';
    }

    return {
        summaryText: summaryText || 'Günün özeti oluşturulamadı.',
        topTopics,
        sections,
        articleCount: articles.length,
        tweetCount: tweets.length,
    };
}

/**
 * Generate daily digest with AI — routes to TR-specific or default prompt
 */
async function generateDigestWithAI(
    articles: ArticleInput[],
    tweets: TweetInput[],
    period: Period,
    countryCode: CountryCode
): Promise<DigestResult> {
    try {
        if (countryCode === 'tr') {
            return await generateTRDigestWithAI(articles, tweets, period);
        }
        return await generateDefaultDigestWithAI(articles, tweets, period);
    } catch (error) {
        logger.error({ error, countryCode }, 'Digest AI generation failed');
        return { ...getDigestFallback(articles.length, true), tweetCount: 0 };
    }
}

function formatCount(n: number): string {
    if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
    if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
    return String(n);
}

// Keywords that indicate a promotional/ad tweet (case-insensitive match)
const PROMO_KEYWORDS = [
    'reklam', 'kampanya', 'indirim', 'fırsat', 'hediye', 'çekiliş',
    'kazan', 'promosyon', 'sponsor', 'tanıtım', 'lansman',
    'uygulamayı indir', 'hemen katıl', 'hemen al', 'son gün',
    'tıkla', 'link bio', 'linktree', 'bit.ly', 'goo.gl',
    'ad', 'sponsored', 'giveaway', 'promo', 'discount', 'sale',
];

function isPromotionalTweet(text: string): boolean {
    const lower = text.toLowerCase();
    return PROMO_KEYWORDS.some(kw => lower.includes(kw));
}

/**
 * Generate daily digest for a specific country and period
 */
export async function generateDailyDigest(
    countryCode: CountryCode,
    period: Period,
    date?: Date
): Promise<{ id: string; success: boolean; error?: string }> {
    try {
        const tables = COUNTRY_TABLES[countryCode];
        const targetDate = date || new Date();

        // Calculate time range based on period
        let startTime: Date;
        let endTime: Date;

        if (period === 'morning') {
            // Morning digest: 19:00 previous day to 07:00 today
            startTime = new Date(targetDate);
            startTime.setHours(7, 0, 0, 0);
            startTime.setDate(startTime.getDate() - 1);
            startTime.setHours(19, 0, 0, 0);

            endTime = new Date(targetDate);
            endTime.setHours(7, 0, 0, 0);
        } else {
            // Evening digest: 07:00 to 19:00 today
            startTime = new Date(targetDate);
            startTime.setHours(7, 0, 0, 0);

            endTime = new Date(targetDate);
            endTime.setHours(19, 0, 0, 0);
        }

        // TR gets more articles for richer sectioned digest
        const articleLimit = countryCode === 'tr' ? 80 : 50;

        // Use raw SQL for date comparisons to avoid libsql type binding issues
        let articles = await db
            .select({
                translatedTitle: tables.articles.translatedTitle,
                summary: tables.articles.summary,
                categoryId: tables.articles.categoryId,
            })
            .from(tables.articles)
            .where(and(
                gte(tables.articles.publishedAt, startTime),
                lte(tables.articles.publishedAt, endTime),
                eq(tables.articles.isFiltered, false)
            ))
            .limit(articleLimit);

        // Fallback: if no articles in exact window, use most recent articles (last 7 days)
        if (articles.length === 0) {
            logger.warn({ countryCode, period }, 'No articles in time window, falling back to recent articles');
            const fallbackStart = new Date(targetDate);
            fallbackStart.setDate(fallbackStart.getDate() - 7);

            articles = await db
                .select({
                    translatedTitle: tables.articles.translatedTitle,
                    summary: tables.articles.summary,
                    categoryId: tables.articles.categoryId,
                })
                .from(tables.articles)
                .where(and(
                    gte(tables.articles.publishedAt, fallbackStart),
                    eq(tables.articles.isFiltered, false)
                ))
                .orderBy(desc(tables.articles.publishedAt))
                .limit(articleLimit);
        }

        if (articles.length === 0) {
            logger.warn({ countryCode, period }, 'No articles found for digest (even with fallback)');
            return { id: '', success: false, error: 'No articles found' };
        }

        // Fetch tweets from last 24 hours (sorted by engagement)
        let tweets: TweetInput[] = [];
        try {
            const tweetTableName = `${countryCode}_tweets`;
            const tweetEnd = Math.floor(endTime.getTime() / 1000);
            const tweetStart = tweetEnd - (24 * 60 * 60); // 24 hours before endTime
            const rawTweets = await db.all<{ text: string; user_name: string; display_name: string; like_count: number; retweet_count: number }>(
                sql`SELECT text, user_name, display_name, like_count, retweet_count
                    FROM ${sql.raw(tweetTableName)}
                    WHERE tweeted_at >= ${tweetStart} AND tweeted_at <= ${tweetEnd}
                    ORDER BY like_count DESC
                    LIMIT 50`
            );
            // Filter out promotional/ad tweets
            tweets = rawTweets
                .filter(t => !isPromotionalTweet(t.text))
                .slice(0, 30)
                .map(t => ({
                    text: t.text,
                    userName: t.user_name,
                    displayName: t.display_name,
                    likeCount: t.like_count,
                    retweetCount: t.retweet_count,
                }));
            logger.info({ countryCode, tweetCount: tweets.length, rawCount: rawTweets.length }, 'Tweets fetched for digest (filtered)');
        } catch (error) {
            // Tweet table might not exist yet — graceful fallback
            logger.warn({ countryCode, error: error instanceof Error ? error.message : String(error) }, 'Failed to fetch tweets for digest, continuing without');
        }

        // Generate digest with AI
        const digestResult = await generateDigestWithAI(articles, tweets, period, countryCode);

        // Format date string
        const digestDate = targetDate.toISOString().split('T')[0];

        // Check if digest already exists
        const existing = await db
            .select()
            .from(tables.digests)
            .where(and(
                eq(tables.digests.digestDate, digestDate),
                eq(tables.digests.period, period)
            ))
            .get();

        // Ensure all values are primitives for libsql local driver compatibility
        const safeTopics = JSON.stringify(Array.isArray(digestResult.topTopics) ? digestResult.topTopics : []);
        const safeSections = JSON.stringify(Array.isArray(digestResult.sections) ? digestResult.sections : []);
        const safeSummary = String(digestResult.summaryText || 'Günün özeti oluşturulamadı.');
        const safeCount = Number(digestResult.articleCount) || 0;
        const safeTweetCount = Number(digestResult.tweetCount) || 0;

        // Use raw SQL for writes to bypass drizzle json mode serialization issues with local libsql
        const tableName = `${countryCode}_daily_digests`;

        if (existing) {
            await db.run(sql`UPDATE ${sql.raw(tableName)} SET summary_text = ${safeSummary}, top_topics = ${safeTopics}, sections = ${safeSections}, article_count = ${safeCount}, tweet_count = ${safeTweetCount} WHERE id = ${existing.id}`);

            logger.info({ countryCode, period, digestId: existing.id, tweetCount: safeTweetCount, sectionCount: digestResult.sections.length }, 'Digest updated');
            return { id: existing.id, success: true };
        }

        const digestId = uuidv4();
        await db.run(sql`INSERT INTO ${sql.raw(tableName)} (id, country_code, period, digest_date, summary_text, top_topics, sections, article_count, tweet_count, comment_count, created_at) VALUES (${digestId}, ${countryCode}, ${period}, ${digestDate}, ${safeSummary}, ${safeTopics}, ${safeSections}, ${safeCount}, ${safeTweetCount}, 0, unixepoch())`);

        logger.info({ countryCode, period, digestId, articleCount: digestResult.articleCount, tweetCount: safeTweetCount, sectionCount: digestResult.sections.length }, 'Digest created');
        return { id: digestId, success: true };
    } catch (error) {
        const errMsg = error instanceof Error ? error.message : String(error);
        const errStack = error instanceof Error ? error.stack : undefined;
        logger.error({ error: errMsg, stack: errStack, countryCode, period }, 'Generate digest failed');
        return { id: '', success: false, error: errMsg };
    }
}

/**
 * Get latest digest for a country
 */
export async function getLatestDigest(countryCode: CountryCode) {
    const tables = COUNTRY_TABLES[countryCode];

    const digest = await db
        .select()
        .from(tables.digests)
        .orderBy(desc(tables.digests.createdAt))
        .limit(1)
        .get();

    return digest;
}

/**
 * Get digest by date and period
 */
export async function getDigestByDateAndPeriod(
    countryCode: CountryCode,
    date: string,
    period: Period
) {
    const tables = COUNTRY_TABLES[countryCode];

    const digest = await db
        .select()
        .from(tables.digests)
        .where(and(
            eq(tables.digests.digestDate, date),
            eq(tables.digests.period, period)
        ))
        .get();

    return digest;
}

/**
 * Generate digests for all countries
 */
export async function generateAllDigests(period: Period) {
    const countries = Object.keys(COUNTRY_TABLES) as CountryCode[];
    const results = [];

    for (const country of countries) {
        const result = await generateDailyDigest(country, period);
        results.push({ country, ...result });
    }

    return results;
}
