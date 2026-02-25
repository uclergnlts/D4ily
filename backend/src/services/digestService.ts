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
type LegacyPeriod = 'morning' | 'evening';
type Period = 'daily';

interface TopicItem {
    title: string;
    description: string;
}

interface TweetInput {
    text: string;
    userName: string;
    displayName: string;
    profileImageUrl?: string | null;
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
    id: string;
    translatedTitle: string;
    summary: string;
    categoryId: number | null;
    sourceCount: number;
    politicalTone: number;
    alignmentSummary?: string;
}

interface ArticleAlignmentProfile {
    articleId: string;
    totalSources: number;
    oppositionSources: number;
    proGovernmentSources: number;
    centerSources: number;
    unknownSources: number;
    sourceLeanScore: number;
    toneLeanScore: number;
    combinedLeanScore: number;
    dominantLabel: 'muhalif' | 'iktidar' | 'merkez' | 'belirsiz';
    minoritySignal: boolean;
    summary: string;
}

const SUPPORTING_ARTICLE_LIMIT_WITH_TWEETS = {
    tr: 24,
    default: 18,
} as const;

const GENERIC_SUMMARY_PATTERNS: RegExp[] = [
    /bugun .*? onemli gelismeler yasandi/i,
    /gundem yogun gecti/i,
    /dikkat cek/i,
    /one cik/i,
    /gundemde yer aldi/i,
    /yanki buldu|yanki uyandirdi/i,
];

function normalizeText(text: string): string {
    return text.replace(/\s+/g, ' ').trim();
}

function getWordCount(text: string): number {
    if (!text) return 0;
    return normalizeText(text).split(' ').filter(Boolean).length;
}

function countTweetReferences(text: string): number {
    if (!text) return 0;
    return (text.match(/@\w+/g) || []).length;
}

function splitSentences(text: string): string[] {
    const clean = normalizeText(text);
    if (!clean) return [];
    return clean
        .split(/(?<=[.!?])\s+/)
        .map(s => s.trim())
        .filter(Boolean);
}

function normalizeForPattern(text: string): string {
    return normalizeText(text)
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
}

function isGenericSummary(text: string): boolean {
    const clean = normalizeForPattern(text);
    if (!clean) return true;
    return GENERIC_SUMMARY_PATTERNS.some(pattern => pattern.test(clean));
}

function buildFallbackSummary(
    sections: DigestSection[],
    topics: TopicItem[],
    articles: ArticleInput[],
): string {
    const parts: string[] = [];

    for (const section of sections) {
        const firstSentence = splitSentences(section.summary)[0];
        if (firstSentence) parts.push(firstSentence);
        if (parts.length >= 6) break;
    }

    if (parts.length < 4) {
        for (const topic of topics) {
            const desc = normalizeText(topic.description);
            if (!desc) continue;
            parts.push(desc.endsWith('.') ? desc : `${desc}.`);
            if (parts.length >= 6) break;
        }
    }

    if (parts.length < 4) {
        for (const article of articles) {
            const title = normalizeText(article.translatedTitle);
            const firstSentence = splitSentences(article.summary)[0];
            if (title && firstSentence) {
                parts.push(`${title}: ${firstSentence}`);
            } else if (title) {
                parts.push(`${title}.`);
            }
            if (parts.length >= 6) break;
        }
    }

    return normalizeText(parts.join(' '));
}

function enforceSummaryQuality(
    summary: string,
    options: {
        sections?: DigestSection[];
        topics?: TopicItem[];
        articles?: ArticleInput[];
        tweets?: TweetInput[];
        minWords: number;
        minTweetRefs?: number;
    }
): string {
    const cleanSummary = normalizeText(summary);
    const sections = options.sections || [];
    const topics = options.topics || [];
    const articles = options.articles || [];
    const tweets = options.tweets || [];

    const buildTweetExamples = (minRefs: number): string => {
        if (minRefs <= 0 || tweets.length === 0) return '';
        const selected = tweets.slice(0, Math.min(Math.max(minRefs, 2), 5));
        if (selected.length === 0) return '';
        const examples = selected.map(t => {
            const shortText = normalizeText(t.text).slice(0, 110).trim();
            return `@${t.userName} "${shortText}${t.text.length > 110 ? '...' : ''}"`;
        });
        return `X'ten ornekler: ${examples.join('; ')}.`;
    };

    if (getWordCount(cleanSummary) >= options.minWords && !isGenericSummary(cleanSummary)) {
        if (!options.minTweetRefs || countTweetReferences(cleanSummary) >= options.minTweetRefs) {
            return cleanSummary;
        }

        const withTweets = normalizeText(`${cleanSummary} ${buildTweetExamples(options.minTweetRefs)}`);
        if (countTweetReferences(withTweets) >= options.minTweetRefs) {
            return withTweets;
        }
    }

    const fallback = buildFallbackSummary(sections, topics, articles);
    if (getWordCount(fallback) > getWordCount(cleanSummary)) {
        return fallback;
    }

    let finalSummary = cleanSummary || fallback || 'Gunun ozeti olusturulamadi.';
    if (options.minTweetRefs && countTweetReferences(finalSummary) < options.minTweetRefs) {
        finalSummary = normalizeText(`${finalSummary} ${buildTweetExamples(options.minTweetRefs)}`);
    }
    return finalSummary;
}

function getDominantAlignmentLabel(score: number): 'muhalif' | 'iktidar' | 'merkez' | 'belirsiz' {
    if (score <= -0.25) return 'muhalif';
    if (score >= 0.25) return 'iktidar';
    if (Math.abs(score) < 0.25) return 'merkez';
    return 'belirsiz';
}

function getToneLabel(score: number): 'muhalif-ton' | 'iktidar-ton' | 'notr-ton' {
    if (score <= -2) return 'muhalif-ton';
    if (score >= 2) return 'iktidar-ton';
    return 'notr-ton';
}

function buildAlignmentSummary(profile: ArticleAlignmentProfile): string {
    const toneLabel = getToneLabel(profile.toneLeanScore * 5);
    return `Etiket:${profile.dominantLabel} (m:${profile.oppositionSources}, i:${profile.proGovernmentSources}, k:${profile.centerSources}, b:${profile.unknownSources}, ton:${toneLabel})`;
}

async function getArticleAlignmentProfiles(
    countryCode: CountryCode,
    articles: ArticleInput[],
): Promise<Map<string, ArticleAlignmentProfile>> {
    const result = new Map<string, ArticleAlignmentProfile>();
    if (articles.length === 0) return result;

    const articleIds = articles.map(a => a.id).filter(Boolean);
    if (articleIds.length === 0) return result;

    const articleSourceTable = `${countryCode}_article_sources`;
    const ids = sql.join(articleIds.map(id => sql`${id}`), sql`, `);

    type RawProfile = {
        articleId: string;
        totalSources: number;
        oppositionSources: number;
        proGovernmentSources: number;
        centerSources: number;
        unknownSources: number;
    };

    try {
        const rows = await db.all<RawProfile>(sql`
            SELECT
                src.article_id as articleId,
                COUNT(*) as totalSources,
                SUM(CASE WHEN rs.id IS NULL THEN 1 ELSE 0 END) as unknownSources,
                SUM(CASE WHEN rs.gov_alignment_score <= -1 THEN 1 ELSE 0 END) as oppositionSources,
                SUM(CASE WHEN rs.gov_alignment_score >= 1 THEN 1 ELSE 0 END) as proGovernmentSources,
                SUM(CASE WHEN rs.id IS NOT NULL AND rs.gov_alignment_score = 0 THEN 1 ELSE 0 END) as centerSources
            FROM ${sql.raw(articleSourceTable)} src
            LEFT JOIN rss_sources rs
              ON LOWER(TRIM(src.source_name)) = LOWER(TRIM(rs.source_name))
             AND rs.country_code = ${countryCode}
            WHERE src.article_id IN (${ids})
            GROUP BY src.article_id
        `);

        const articleById = new Map(articles.map(a => [a.id, a]));
        for (const row of rows) {
            const article = articleById.get(row.articleId);
            if (!article) continue;

            const knownSources = Math.max(1, row.oppositionSources + row.proGovernmentSources + row.centerSources);
            const sourceLeanScore = (row.proGovernmentSources - row.oppositionSources) / knownSources;
            const toneLeanScore = Math.max(-1, Math.min(1, article.politicalTone / 5));
            const combinedLeanScore = (sourceLeanScore * 0.7) + (toneLeanScore * 0.3);
            const dominantLabel = getDominantAlignmentLabel(combinedLeanScore);
            const minoritySignal = Math.abs(combinedLeanScore) >= 0.2
                && Math.sign(sourceLeanScore || 0) !== Math.sign(toneLeanScore || 0)
                && Math.abs(sourceLeanScore) >= 0.25
                && Math.abs(toneLeanScore) >= 0.25;

            const profile: ArticleAlignmentProfile = {
                articleId: row.articleId,
                totalSources: row.totalSources || article.sourceCount,
                oppositionSources: row.oppositionSources || 0,
                proGovernmentSources: row.proGovernmentSources || 0,
                centerSources: row.centerSources || 0,
                unknownSources: row.unknownSources || 0,
                sourceLeanScore,
                toneLeanScore,
                combinedLeanScore,
                dominantLabel,
                minoritySignal,
                summary: '',
            };
            profile.summary = buildAlignmentSummary(profile);
            result.set(row.articleId, profile);
        }
    } catch (error) {
        logger.warn({ countryCode, error: error instanceof Error ? error.message : String(error) }, 'Failed to compute article alignment profiles');
    }

    // Fallback profile for any article without source rows.
    for (const article of articles) {
        if (result.has(article.id)) continue;
        const toneLeanScore = Math.max(-1, Math.min(1, article.politicalTone / 5));
        const combinedLeanScore = toneLeanScore * 0.3;
        const profile: ArticleAlignmentProfile = {
            articleId: article.id,
            totalSources: article.sourceCount,
            oppositionSources: 0,
            proGovernmentSources: 0,
            centerSources: 0,
            unknownSources: article.sourceCount,
            sourceLeanScore: 0,
            toneLeanScore,
            combinedLeanScore,
            dominantLabel: getDominantAlignmentLabel(combinedLeanScore),
            minoritySignal: false,
            summary: '',
        };
        profile.summary = buildAlignmentSummary(profile);
        result.set(article.id, profile);
    }

    return result;
}

/**
 * Generate daily digest for non-TR countries
 * Tweets are the PRIMARY source, RSS articles provide supporting context.
 */
async function generateDefaultDigestWithAI(
    articles: ArticleInput[],
    tweets: TweetInput[],
): Promise<DigestResult> {
    const periodLabel = 'günlük';

    // Tweets are primary — build them first and prominently
    const tweetBlock = tweets.length > 0
        ? tweets.map((t, i) =>
            `${i + 1}. @${t.userName} (${t.displayName}): "${t.text}" [❤️ ${formatCount(t.likeCount)}, 🔄 ${formatCount(t.retweetCount)}]`
        ).join('\n')
        : '';

    // Articles are supporting context
    const articleBlock = articles.length > 0
        ? articles.map((a, i) => `${i + 1}. [Kaynak sayisi: ${a.sourceCount}] [${a.alignmentSummary || 'Etiket:belirsiz'}] ${a.translatedTitle}: ${a.summary}`).join('\n')
        : '';

    const sourceStats = `${tweets.length} tweet${articles.length > 0 ? ` ve ${articles.length} haber kaynağı` : ''}`;

    const prompt = `${sourceStats} ile ${periodLabel} bültenini oluştur.

=== X (Twitter) — Birincil Kaynak ===
${tweetBlock || '(Tweet verisi yok)'}

=== Haber Siteleri — Destekleyici ===
${articleBlock || '(Haber verisi yok)'}

JSON üret:
1. summary (tek paragraf, 4-6 cümle, 120-170 kelime):
   YASAK KALIPLAR — bunları kesinlikle kullanma:
   ✗ "Bugün önemli gelişmeler yaşandı"
   ✗ "Gündem yoğun geçti"
   ✗ "Dikkat çekici gelişmeler"
   ✗ "...öne çıkıyor/öne çıktı"
   ✗ "...dikkat çekti/dikkat çekiyor"
   ✗ "...gündemde yer aldı/gündemde"
   ✗ "...yankı buldu/yankı uyandırdı"

   DOĞRU YAZIM:
   ✓ İlk cümle doğrudan bir olayla başlasın: "[İsim] [ne yaptı/ne açıkladı]."
   ✓ Örnek: "Dışişleri Bakanı Fidan, Gazze Yönetimi Başkanı Şaat'ı Ankara'da kabul etti."
   ✓ Her cümle yeni bir bilgi versin. Yorum veya değerlendirme ekleme, sadece olgu.
   ✓ Toplam uzunluk 120 kelimenin altına düşmesin.
   ✓ Summary içinde en az 2 örnek tweet alıntısı kullan: @kullanici "tweetten kısa alıntı".

2. top_topics (3-5 konu): title + description (somut bilgi, klişe yok)

KAYNAK ONEM KURALI:
- [Kaynak sayisi] yuksek olan haberleri ana omurga olarak one cikar.
- [Kaynak sayisi] dusuk olan haberlerden en az 1-2 tanesini mutlaka summary veya top_topics'te belirt.
- Dusuk kaynakli haberleri "gizleniyor" diye kesin hukumle sunma; "sinirli sayida kaynakta yer aldi" gibi olgusal ifade kullan.
- [Etiket:*] bilgisini kaynak dagilimi + haber tonu birlikte uretiyor. Etiketi ve tonu celisen haberleri not et (ornegin "kaynak dagilimi iktidar, ton muhalif"), ama yorum yapma.

{ "summary": "...", "top_topics": [{ "title": "...", "description": "..." }] }

Sadece JSON.`;

    const result = await aiChatCompletion<any>(
        {
            model: 'gpt-4o-mini',
            messages: [
                {
                    role: 'system',
                    content: 'Profesyonel haber spikerisin. Sadece olgu yaz. Klişe/dolgu cümle YASAK. İlk cümle: [Kim] [ne yaptı]. Yorum ekleme. Tweet alıntılarını koru ve summary içinde örnek tweetlere yer ver. JSON döndür.',
                },
                { role: 'user', content: prompt },
            ],
            response_format: { type: 'json_object' },
            temperature: 0.3,
        },
        {
            circuitName: 'openai:digest',
            useQuickClient: false,
            skipCircuitBreaker: true,
            fallback: () => getDigestFallback(articles.length, true),
            maxContentLength: 40000,
        }
    );

    const topTopics = (result.top_topics || []).map((topic: any) => {
        if (typeof topic === 'string') return { title: topic, description: '' };
        return { title: topic.title || '', description: topic.description || '' };
    });

    let summaryText = result.summary || result.summaryText;
    if (typeof summaryText !== 'string') {
        summaryText = summaryText ? JSON.stringify(summaryText) : 'Günün özeti oluşturulamadı.';
    }
    summaryText = enforceSummaryQuality(summaryText, {
        topics: topTopics,
        articles,
        tweets,
        minWords: 90,
        minTweetRefs: 2,
    });

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
 * Tweets are the PRIMARY source — they set the agenda.
 * RSS articles provide depth and context.
 */
async function generateTRDigestWithAI(
    articles: ArticleInput[],
    tweets: TweetInput[],
): Promise<DigestResult> {
    const periodLabel = 'günlük';

    // --- PRIMARY: Tweets grouped by engagement tiers ---
    const highEngagement = tweets.filter(t => t.likeCount >= 1000 || t.retweetCount >= 200);
    const medEngagement = tweets.filter(t => t.likeCount < 1000 && t.retweetCount < 200);

    const formatTweet = (t: TweetInput, i: number) =>
        `  ${i + 1}. @${t.userName} (${t.displayName}): "${t.text}" [❤️ ${formatCount(t.likeCount)}, 🔄 ${formatCount(t.retweetCount)}]`;

    const tweetBlock = [
        highEngagement.length > 0 ? `[Yüksek Etkileşim]\n${highEngagement.map(formatTweet).join('\n')}` : '',
        medEngagement.length > 0 ? `[Diğer Önemli Paylaşımlar]\n${medEngagement.map(formatTweet).join('\n')}` : '',
    ].filter(Boolean).join('\n\n');

    // --- SUPPORTING: Articles grouped by category ---
    const grouped: Record<string, ArticleInput[]> = {};
    for (const article of articles) {
        const catName = article.categoryId ? (CATEGORY_NAMES[article.categoryId] || 'Gündem') : 'Gündem';
        if (!grouped[catName]) grouped[catName] = [];
        grouped[catName].push(article);
    }

    const categoryBlocks = Object.entries(grouped)
        .sort((a, b) => b[1].length - a[1].length)
        .map(([cat, arts]) => {
            const items = arts.map((a, i) => `  ${i + 1}. [Kaynak sayisi: ${a.sourceCount}] [${a.alignmentSummary || 'Etiket:belirsiz'}] ${a.translatedTitle}: ${a.summary}`).join('\n');
            return `[${cat}] (${arts.length} haber)\n${items}`;
        })
        .join('\n\n');

    const prompt = `${tweets.length} tweet ve ${articles.length} haber ile Türkiye ${periodLabel} bülteni oluştur.

=== X (Twitter) — Birincil Kaynak ===
${tweetBlock || '(Tweet verisi yok)'}

=== Haber Siteleri — Destekleyici ===
${categoryBlocks || '(Haber verisi yok)'}

JSON:
{
  "summary": "4-6 cümlelik, 120-170 kelime gündem özeti",
  "sections": [{
    "category": "Kategori",
    "icon": "emoji",
    "summary": "En az 80 kelime. [Kim] [ne yaptı] ile başla.",
    "highlights": ["Gelişme 1", "Gelişme 2"],
    "tweetContext": "Öne çıkan tweet alıntısı",
    "tweets": [
      { "author": "Görünen Ad", "handle": "@kullanici", "text": "Tweet metni (tam alıntı)" },
      { "author": "Başka Kişi", "handle": "@diger", "text": "İlgili tweet" }
    ]
  }],
  "top_topics": [{ "title": "...", "description": "..." }]
}

YASAK KALIPLAR — bunları kesinlikle kullanma:
✗ "Bugün Türkiye'de önemli gelişmeler yaşandı"
✗ "Gündem yoğun geçti" / "Gündemde yer aldı"
✗ "Dikkat çekici gelişmeler" / "Dikkat çekti"
✗ "...öne çıkıyor" / "...öne çıktı"
✗ "...yankı buldu" / "...yankı uyandırdı"
✗ "Bu durum, ...açısından önem taşıyor"
✗ "Bu bağlamda" / "Diğer yandan" / "Ayrıca" (paragraf açılışında)
✗ "...endişelerini artırıyor" / "...tartışmaları beraberinde getirdi"

DOĞRU YAZIM:
✓ Her cümle [Kim/Ne] [ne yaptı/ne oldu] formatında olsun.
✓ Örnek: "Erdoğan, BAE Devlet Başkanı ile telefonda Gazze'yi görüştü."
✓ Örnek: "İzmir'de fırtına sahildeki iş yerlerini su bastı, yollar göle döndü."
✓ Yorum ve değerlendirme ekleme, sadece olgu bildir.
✓ Her cümle yeni bilgi taşısın, tekrar yapma.

KURALLAR:
- 3-6 bölüm. Tweet bilgisi öncelikli.
- summary: 4-6 cümle, 120-170 kelime.
- summary içinde en az 3 örnek tweet alıntısı kullan: @kullanici "tweetten kısa alıntı".
- Yüksek kaynak sayılı (yaygın) haberleri temel gündem yap.
- Düşük kaynak sayılı haberlerden en az 1-2 tanesini mutlaka özet veya bölüm akışına dahil et.
- [Etiket:*] bilgisini kullan: bu etiket kaynak dagilimi + haber tonu sentezidir. Etiket ve ton ayrisiyorsa "kaynak dagilimi ... ton ..." formatinda olgusal belirt.
- tweetContext zorunlu.
- tweets: her bölümde 3-5 ilgili tweet alıntısı (author, handle, text). Kaynak tweetlerden birebir al.
- highlights: 2-4 madde, her biri somut.
- top_topics: 3-5 konu.
- Türkçe, 500-700 kelime.
- icon: 🏛️/💰/⚽/🌍/🛡️/💻/🏥/⚡/🎭/📰/🗺️

Sadece JSON.`;

    const result = await aiChatCompletion<any>(
        {
            model: 'gpt-4o-mini',
            messages: [
                {
                    role: 'system',
                    content: 'Profesyonel haber spikerisin. Türkiye gündemini oluştur. Sadece olgu yaz — yorum, değerlendirme, klişe YASAK. Her cümle: [Kim] [ne yaptı]. "Önemli gelişmeler yaşandı", "dikkat çekti", "öne çıktı", "gündemde" gibi dolgu ifadeler kullanırsan başarısız sayılırsın. Summary ve bölüm metinlerinde örnek tweet alıntılarına daha fazla yer ver. JSON döndür.',
                },
                { role: 'user', content: prompt },
            ],
            response_format: { type: 'json_object' },
            temperature: 0.3,
        },
        {
            circuitName: 'openai:digest-tr',
            useQuickClient: false,
            skipCircuitBreaker: true,
            fallback: () => getDigestFallback(articles.length, true),
            maxContentLength: 60000,
        }
    );

    // Parse sections
    const sections: DigestSection[] = (result.sections || []).map((s: any) => ({
        category: String(s.category || ''),
        icon: String(s.icon || '📰'),
        summary: String(s.summary || ''),
        highlights: Array.isArray(s.highlights) ? s.highlights.map(String) : [],
        tweetContext: s.tweetContext ? String(s.tweetContext) : undefined,
        tweets: Array.isArray(s.tweets)
            ? s.tweets.map((t: any) => ({
                author: String(t.author || ''),
                handle: String(t.handle || ''),
                text: String(t.text || ''),
            })).filter((t: any) => t.text)
            : undefined,
    })).filter((s: DigestSection) => s.category && s.summary);

    // Parse top_topics
    const topTopics = (result.top_topics || []).map((topic: any) => {
        if (typeof topic === 'string') return { title: topic, description: '' };
        return { title: topic.title || '', description: topic.description || '' };
    });

    let summaryText = result.summary || result.summaryText;
    if (typeof summaryText !== 'string') {
        summaryText = summaryText ? JSON.stringify(summaryText) : 'Günün özeti oluşturulamadı.';
    }
    summaryText = enforceSummaryQuality(summaryText, {
        sections,
        topics: topTopics,
        articles,
        tweets,
        minWords: 100,
        minTweetRefs: 3,
    });

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
    countryCode: CountryCode
): Promise<DigestResult> {
    try {
        if (countryCode === 'tr') {
            return await generateTRDigestWithAI(articles, tweets);
        }
        return await generateDefaultDigestWithAI(articles, tweets);
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

function getSupportingArticles(
    articles: ArticleInput[],
    countryCode: CountryCode,
    tweetCount: number,
    alignmentProfiles: Map<string, ArticleAlignmentProfile>
): ArticleInput[] {
    if (tweetCount <= 0) return articles;
    const limit = countryCode === 'tr'
        ? SUPPORTING_ARTICLE_LIMIT_WITH_TWEETS.tr
        : SUPPORTING_ARTICLE_LIMIT_WITH_TWEETS.default;

    if (articles.length <= limit) return articles;

    const sortedBySourceCount = [...articles].sort((a, b) => b.sourceCount - a.sourceCount);
    const highCoverageCount = Math.max(4, Math.floor(limit * 0.6));
    const lowCoverageCount = Math.max(3, Math.floor(limit * 0.25));
    const minorityCount = Math.max(2, Math.floor(limit * 0.15));

    const highCoverage = sortedBySourceCount.slice(0, highCoverageCount);
    const lowCoverage = [...sortedBySourceCount]
        .reverse()
        .filter(a => a.sourceCount <= 3)
        .slice(0, lowCoverageCount);

    let totalOpp = 0;
    let totalPro = 0;
    for (const article of articles) {
        const profile = alignmentProfiles.get(article.id);
        if (!profile) continue;
        totalOpp += profile.oppositionSources;
        totalPro += profile.proGovernmentSources;
    }
    const dominantSide: 'muhalif' | 'iktidar' | 'none' =
        totalOpp === totalPro ? 'none' : (totalOpp > totalPro ? 'muhalif' : 'iktidar');

    const minorityPerspective = sortedBySourceCount
        .filter(article => {
            const profile = alignmentProfiles.get(article.id);
            if (!profile) return false;
            if (profile.minoritySignal) return true;
            if (dominantSide === 'none') return false;
            return profile.dominantLabel !== dominantSide && profile.dominantLabel !== 'merkez' && profile.dominantLabel !== 'belirsiz';
        })
        .slice(0, minorityCount);

    const selectedMap = new Map<string, ArticleInput>();
    for (const item of highCoverage) {
        selectedMap.set(`${item.translatedTitle}|${item.summary}`, item);
    }
    for (const item of lowCoverage) {
        selectedMap.set(`${item.translatedTitle}|${item.summary}`, item);
    }
    for (const item of minorityPerspective) {
        selectedMap.set(`${item.translatedTitle}|${item.summary}`, item);
    }

    for (const article of articles) {
        if (selectedMap.size >= limit) break;
        selectedMap.set(`${article.translatedTitle}|${article.summary}`, article);
    }

    return articles
        .filter(a => selectedMap.has(`${a.translatedTitle}|${a.summary}`))
        .slice(0, limit);
}

/**
 * Generate daily digest for a specific country and period
 */
export async function generateDailyDigest(
    countryCode: CountryCode,
    _period: Period | LegacyPeriod = 'daily',
    date?: Date
): Promise<{ id: string; success: boolean; error?: string }> {
    try {
        const period: Period = 'daily';
        const tables = COUNTRY_TABLES[countryCode];
        const targetDate = date || new Date();

        // Single daily digest: analyze last 24 hours.
        const endTime = new Date(targetDate);
        const startTime = new Date(endTime);
        startTime.setHours(startTime.getHours() - 24);

        // TR gets more articles for richer sectioned digest
        const articleLimit = countryCode === 'tr' ? 80 : 50;

        // Use raw SQL for date comparisons to avoid libsql type binding issues
        let articles = await db
            .select({
                id: tables.articles.id,
                translatedTitle: tables.articles.translatedTitle,
                summary: tables.articles.summary,
                categoryId: tables.articles.categoryId,
                sourceCount: tables.articles.sourceCount,
                politicalTone: tables.articles.politicalTone,
            })
            .from(tables.articles)
            .where(and(
                gte(tables.articles.publishedAt, startTime),
                lte(tables.articles.publishedAt, endTime),
                eq(tables.articles.isFiltered, false)
            ))
            .orderBy(desc(tables.articles.publishedAt))
            .limit(articleLimit);

        // Fallback: if no articles in exact window, use most recent articles (last 7 days)
        if (articles.length === 0) {
            logger.warn({ countryCode, period }, 'No articles in time window, falling back to recent articles');
            const fallbackStart = new Date(targetDate);
            fallbackStart.setDate(fallbackStart.getDate() - 7);

            articles = await db
                .select({
                    id: tables.articles.id,
                    translatedTitle: tables.articles.translatedTitle,
                    summary: tables.articles.summary,
                    categoryId: tables.articles.categoryId,
                    sourceCount: tables.articles.sourceCount,
                    politicalTone: tables.articles.politicalTone,
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
            const rawTweets = await db.all<{ text: string; user_name: string; display_name: string; profile_image_url: string | null; like_count: number; retweet_count: number }>(
                sql`SELECT text, user_name, display_name, profile_image_url, like_count, retweet_count
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
                    profileImageUrl: t.profile_image_url,
                    likeCount: t.like_count,
                    retweetCount: t.retweet_count,
                }));
            logger.info({ countryCode, tweetCount: tweets.length, rawCount: rawTweets.length }, 'Tweets fetched for digest (filtered)');
        } catch (error) {
            // Tweet table might not exist yet — graceful fallback
            logger.warn({ countryCode, error: error instanceof Error ? error.message : String(error) }, 'Failed to fetch tweets for digest, continuing without');
        }

        // X is primary source: when tweets exist, keep RSS as supporting context only.
        const alignmentProfiles = await getArticleAlignmentProfiles(countryCode, articles);
        const enrichedArticles = articles.map(article => {
            const profile = alignmentProfiles.get(article.id);
            return {
                ...article,
                alignmentSummary: profile?.summary || `Etiket:belirsiz (m:0, i:0, k:0, b:${article.sourceCount}, ton:${getToneLabel(article.politicalTone)})`,
            };
        });
        const supportingArticles = getSupportingArticles(enrichedArticles, countryCode, tweets.length, alignmentProfiles);
        logger.info({
            countryCode,
            period,
            tweetCount: tweets.length,
            totalArticles: enrichedArticles.length,
            supportingArticles: supportingArticles.length,
            xPrimary: tweets.length > 0,
            labeledArticles: enrichedArticles.filter(a => a.alignmentSummary && !a.alignmentSummary.includes('belirsiz')).length,
        }, 'Digest source priority applied');

        // Generate digest with AI
        const digestResult = await generateDigestWithAI(supportingArticles, tweets, countryCode);

        // Format date string
        const digestDate = targetDate.toISOString().split('T')[0];

        // Check if digest already exists
        const existing = await db
            .select()
            .from(tables.digests)
            .where(eq(tables.digests.digestDate, digestDate))
            .orderBy(desc(tables.digests.createdAt))
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
        logger.error({ error: errMsg, stack: errStack, countryCode, period: 'daily' }, 'Generate digest failed');
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
export async function getDigestByDate(
    countryCode: CountryCode,
    date: string,
) {
    const tables = COUNTRY_TABLES[countryCode];

    const digest = await db
        .select()
        .from(tables.digests)
        .where(eq(tables.digests.digestDate, date))
        .orderBy(desc(tables.digests.createdAt))
        .get();

    return digest;
}

// Backward-compatible wrapper: period is ignored because digest is now daily.
export async function getDigestByDateAndPeriod(
    countryCode: CountryCode,
    date: string,
    _period: Period | LegacyPeriod
) {
    return getDigestByDate(countryCode, date);
}

/**
 * Generate digests for all countries
 */
export async function generateAllDigests(_period: Period | LegacyPeriod = 'daily') {
    const countries = Object.keys(COUNTRY_TABLES) as CountryCode[];
    const results = [];

    for (const country of countries) {
        const result = await generateDailyDigest(country, 'daily');
        results.push({ country, ...result });
    }

    return results;
}
