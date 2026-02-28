import { db } from '../config/db.js';
import { sql } from 'drizzle-orm';
import { logger } from '../config/logger.js';
import { aiChatCompletion } from '../utils/aiRequestWrapper.js';
import { getDigestFallback } from '../utils/aiFallbacks.js';
import type { DigestSection } from '../utils/aiFallbacks.js';
import { processArticleWithAI } from './ai/aiService.js';
import { findPerspectives } from './perspectivesService.js';
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
import { gte, lte, eq, desc, and, inArray } from 'drizzle-orm';
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
const DIGEST_TIMEZONE = 'Europe/Istanbul';

function toDateParts(date: Date, timeZone: string): { year: string; month: string; day: string } {
    const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).formatToParts(date);

    const year = parts.find((part) => part.type === 'year')?.value || '';
    const month = parts.find((part) => part.type === 'month')?.value || '';
    const day = parts.find((part) => part.type === 'day')?.value || '';
    return { year, month, day };
}

export function getDigestDateString(date: Date = new Date()): string {
    const { year, month, day } = toDateParts(date, DIGEST_TIMEZONE);
    return `${year}-${month}-${day}`;
}

interface TopicItem {
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

interface TweetInput {
    text: string;
    userName: string;
    displayName: string;
    profileImageUrl?: string | null;
    accountType?: 'government' | 'news_agency' | 'journalist' | 'institution' | 'political_party' | null;
    qualityScore?: number;
    engagementScore?: number;
    likeCount: number;
    retweetCount: number;
}

interface DigestTelemetry {
    promptVariant: 'A' | 'B';
    rawArticleCount: number;
    dedupedArticleCount: number;
    selectedArticleCount: number;
    rawTweetCount: number;
    selectedTweetCount: number;
    highImportanceCount: number;
    minorityIncludedCount: number;
}

interface DigestResult {
    summaryText: string;
    topTopics: TopicItem[];
    sections: DigestSection[];
    articleCount: number;
    tweetCount: number;
    telemetry?: DigestTelemetry;
}

interface ArticleInput {
    id: string;
    translatedTitle: string;
    summary: string;
    categoryId: number | null;
    sourceCount: number;
    politicalTone: number;
    publishedAt: Date;
    reliabilityScore?: number;
    uncertaintyLevel?: 'Kesin' | 'Muhtemel' | 'Gelisiyor';
    importanceScore?: number;
    importanceTier?: 'yuksek' | 'orta' | 'dusuk';
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
    avgReliabilityScore: number;
    dominantLabel: 'muhalif' | 'iktidar' | 'merkez' | 'belirsiz';
    minoritySignal: boolean;
    summary: string;
}

const SUPPORTING_ARTICLE_LIMIT_WITH_TWEETS = {
    tr: 24,
    default: 18,
} as const;

const DETAIL_PREFETCH_TOPIC_LIMIT = 5;
const DETAIL_PREFETCH_CONCURRENCY = 2;
const PERSPECTIVE_PREFETCH_TOPIC_LIMIT = 4;
const PERSPECTIVE_PREFETCH_CONCURRENCY = 1;

const GENERIC_SUMMARY_PATTERNS: RegExp[] = [
    /bugun .*? onemli gelismeler yasandi/i,
    /gundem yogun gecti/i,
    /dikkat cek/i,
    /one cik/i,
    /gundemde yer aldi/i,
    /yanki buldu|yanki uyandirdi/i,
];

const SENSATIONAL_TWEET_KEYWORDS = [
    'son dakika', 'şok', 'inanilmaz', 'inanılmaz', 'yikildi', 'yıkıldı', 'patladi', 'patladı',
    'skandal', 'ifsa', 'ifşa', 'yalanlandi', 'yalanlandı', 'hemen izle', 'click', 'tikla', 'tıkla',
];

const STOPWORDS = new Set([
    've', 'ile', 'ama', 'fakat', 'icin', 'için', 'bu', 'su', 'şu', 'bir', 'de', 'da', 'veya', 'ya',
    'the', 'and', 'for', 'from', 'that', 'this', 'are', 'was', 'you',
]);

function clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
}

function safeNumber(value: unknown, fallback = 0): number {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string') {
        const parsed = Number(value);
        if (Number.isFinite(parsed)) return parsed;
    }
    return fallback;
}

function normalizeHandle(value: string): string {
    return value.replace(/^@+/, '').trim().toLowerCase();
}

function normalizeTokenText(text: string): string {
    return normalizeText(text)
        .toLowerCase()
        .replace(/[^a-z0-9çğıöşü\s]/gi, ' ');
}

function getTokenSet(text: string): Set<string> {
    const tokens = normalizeTokenText(text).split(/\s+/).filter(Boolean);
    return new Set(tokens.filter(token => token.length >= 3 && !STOPWORDS.has(token)));
}

function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
    if (a.size === 0 || b.size === 0) return 0;
    let intersection = 0;
    for (const token of a) {
        if (b.has(token)) intersection++;
    }
    const union = a.size + b.size - intersection;
    return union > 0 ? intersection / union : 0;
}

function computeTweetEngagementScore(tweet: TweetInput): number {
    const weighted = (tweet.likeCount || 0) + ((tweet.retweetCount || 0) * 2);
    return clamp(Math.log10(weighted + 1) / 6, 0, 1);
}

function computeTweetQualityScore(tweet: TweetInput): number {
    const text = normalizeText(tweet.text || '');
    if (!text) return 0;

    let score = computeTweetEngagementScore(tweet) * 0.55;

    if (tweet.accountType === 'government' || tweet.accountType === 'news_agency' || tweet.accountType === 'institution') {
        score += 0.2;
    } else if (tweet.accountType === 'journalist') {
        score += 0.1;
    }

    if (/\d/.test(text)) score += 0.08;
    if (text.length >= 80 && text.length <= 380) score += 0.08;
    if (/(acikladi|açıkladı|duyurdu|belirtti|rapor|veri|resmi|official|statement|update)/i.test(text)) score += 0.08;
    if (/[!?]{3,}/.test(text)) score -= 0.1;
    if (SENSATIONAL_TWEET_KEYWORDS.some(k => text.toLowerCase().includes(k))) score -= 0.15;

    return clamp(score, 0, 1);
}

function dedupeTweetsSemantically(tweets: TweetInput[]): TweetInput[] {
    const kept: TweetInput[] = [];
    const tokenSets: Set<string>[] = [];

    for (const tweet of tweets) {
        const currentTokens = getTokenSet(tweet.text);
        let duplicate = false;
        for (let i = 0; i < kept.length; i++) {
            const sim = jaccardSimilarity(currentTokens, tokenSets[i]);
            if (sim >= 0.82) {
                duplicate = true;
                break;
            }
        }
        if (!duplicate) {
            kept.push(tweet);
            tokenSets.push(currentTokens);
        }
    }

    return kept;
}

function dedupeArticlesSemantically(articles: ArticleInput[]): ArticleInput[] {
    const kept: ArticleInput[] = [];
    const titleTokens: Set<string>[] = [];
    const summaryTokens: Set<string>[] = [];

    const ordered = [...articles].sort((a, b) => {
        const importanceDelta = (b.importanceScore || 0) - (a.importanceScore || 0);
        if (importanceDelta !== 0) return importanceDelta;
        return b.publishedAt.getTime() - a.publishedAt.getTime();
    });

    for (const article of ordered) {
        const currentTitleTokens = getTokenSet(article.translatedTitle);
        const currentSummaryTokens = getTokenSet(article.summary);
        let duplicate = false;

        for (let i = 0; i < kept.length; i++) {
            const titleSim = jaccardSimilarity(currentTitleTokens, titleTokens[i]);
            const summarySim = jaccardSimilarity(currentSummaryTokens, summaryTokens[i]);
            if (titleSim >= 0.78 || summarySim >= 0.84) {
                duplicate = true;
                break;
            }
        }

        if (!duplicate) {
            kept.push(article);
            titleTokens.push(currentTitleTokens);
            summaryTokens.push(currentSummaryTokens);
        }
    }

    return kept;
}

function normalizeText(text: string | null | undefined): string {
    return String(text || '').replace(/\s+/g, ' ').trim();
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

function normalizeUncertaintyLevel(value: unknown): 'Kesin' | 'Muhtemel' | 'Gelisiyor' {
    const raw = normalizeText(String(value || '')).toLowerCase();
    if (raw.includes('kesin')) return 'Kesin';
    if (raw.includes('muht')) return 'Muhtemel';
    if (raw.includes('geli') || raw.includes('develop')) return 'Gelisiyor';
    return 'Muhtemel';
}

function getImportanceTier(score: number): 'yuksek' | 'orta' | 'dusuk' {
    if (score >= 0.72) return 'yuksek';
    if (score >= 0.45) return 'orta';
    return 'dusuk';
}

function pickPromptVariant(countryCode: CountryCode, date: Date): 'A' | 'B' {
    const key = `${countryCode}-${date.toISOString().slice(0, 10)}`;
    let hash = 0;
    for (let i = 0; i < key.length; i++) {
        hash = ((hash << 5) - hash) + key.charCodeAt(i);
        hash |= 0;
    }
    return Math.abs(hash) % 2 === 0 ? 'A' : 'B';
}

function determineUncertaintyLevel(
    sourceCount: number,
    reliabilityScore: number,
    engagementScore: number,
): 'Kesin' | 'Muhtemel' | 'Gelisiyor' {
    if (sourceCount >= 8 && reliabilityScore >= 0.55 && engagementScore >= 0.2) {
        return 'Kesin';
    }
    if (sourceCount >= 3 || engagementScore >= 0.15) {
        return 'Muhtemel';
    }
    return 'Gelisiyor';
}

function computeArticleImportanceScores(
    articles: ArticleInput[],
    tweets: TweetInput[],
    alignmentProfiles: Map<string, ArticleAlignmentProfile>,
    endTime: Date,
): ArticleInput[] {
    if (articles.length === 0) return articles;

    const maxSourceCount = Math.max(...articles.map(a => Math.max(1, a.sourceCount)));
    const tweetSignals = tweets.map(tweet => ({
        tweet,
        tokens: getTokenSet(tweet.text),
        engagement: computeTweetEngagementScore(tweet),
        quality: safeNumber(tweet.qualityScore, 0),
    }));

    return articles.map(article => {
        const profile = alignmentProfiles.get(article.id);
        const articleTokens = getTokenSet(article.translatedTitle);

        let matchedEngagement = 0;
        for (const signal of tweetSignals) {
            const similarity = jaccardSimilarity(articleTokens, signal.tokens);
            if (similarity >= 0.16) {
                matchedEngagement = Math.max(matchedEngagement, (signal.engagement * 0.65) + (signal.quality * 0.35));
            }
        }

        const sourceCoverageScore = clamp(Math.log1p(article.sourceCount) / Math.log1p(maxSourceCount), 0, 1);
        const hoursOld = clamp((endTime.getTime() - article.publishedAt.getTime()) / (1000 * 60 * 60), 0, 72);
        const recencyScore = clamp(1 - (hoursOld / 24), 0, 1);

        const reliabilityRaw = safeNumber(profile?.avgReliabilityScore, safeNumber(article.reliabilityScore, 0.5));
        const reliabilityScore = reliabilityRaw > 1 ? clamp(reliabilityRaw / 5, 0, 1) : clamp(reliabilityRaw, 0, 1);
        const minorityBoost = profile?.minoritySignal ? 0.08 : 0;
        const importanceScore = clamp(
            (sourceCoverageScore * 0.38) +
            (matchedEngagement * 0.27) +
            (recencyScore * 0.2) +
            (reliabilityScore * 0.15) +
            minorityBoost,
            0,
            1,
        );

        const uncertaintyLevel = determineUncertaintyLevel(article.sourceCount, reliabilityScore, matchedEngagement);
        return {
            ...article,
            reliabilityScore,
            importanceScore,
            importanceTier: getImportanceTier(importanceScore),
            uncertaintyLevel,
        };
    });
}

function buildTopicFallbacks(articles: ArticleInput[], count = 5): TopicItem[] {
    return [...articles]
        .sort((a, b) => (b.importanceScore || 0) - (a.importanceScore || 0))
        .slice(0, count)
        .map(article => ({
            title: article.translatedTitle,
            description: normalizeText(article.summary).slice(0, 180),
            articleId: article.id,
            whyImportant: article.importanceTier === 'yuksek'
                ? 'Yuksek kaynak yogunlugu ve hizli yayilim nedeniyle ana gundem etkisi yaratiyor.'
                : article.importanceTier === 'orta'
                    ? 'Birden fazla kaynakta yer buldugu ve etkisinin surmesi beklendigi icin izleniyor.'
                    : 'Sinirli kaynakta yer alsa da farkli bir perspektif sundugu icin izlenmeli.',
            uncertaintyLevel: article.uncertaintyLevel || 'Muhtemel',
            counterNarrative: 'Ayni olay farkli kaynaklarda farkli vurgu ile aktariliyor; birincil aciklamalar izleniyor.',
            timeline: {
                before: 'Ilk sinyal sinirli sayida kaynakta goruldu.',
                now: 'Gelisme guncel akisa girdi ve teyit adimi suruyor.',
                next: 'Yetkili aciklamalar ve saha verisi takip edilecek.',
            },
            importanceScore: safeNumber(article.importanceScore, 0),
            importanceTier: article.importanceTier || 'orta',
        }));
}

function normalizeTopicItems(rawTopics: any[], articles: ArticleInput[]): TopicItem[] {
    const byTitle = new Map(articles.map(article => [normalizeForPattern(article.translatedTitle), article]));
    const topics: TopicItem[] = [];

    for (const rawTopic of rawTopics || []) {
        const topicObj = typeof rawTopic === 'string'
            ? { title: rawTopic, description: '' }
            : rawTopic || {};

        const title = normalizeText(String(topicObj.title || ''));
        if (!title) continue;

        const matchedArticle = byTitle.get(normalizeForPattern(title))
            || articles.find(article => normalizeForPattern(title).includes(normalizeForPattern(article.translatedTitle).slice(0, 16)));

        const uncertaintyLevel = normalizeUncertaintyLevel(topicObj.uncertainty_level || topicObj.uncertaintyLevel || matchedArticle?.uncertaintyLevel);
        const importanceScore = clamp(safeNumber(topicObj.importance_score ?? topicObj.importanceScore, matchedArticle?.importanceScore ?? 0.5), 0, 1);
        const importanceTier = (topicObj.importance_tier || topicObj.importanceTier || matchedArticle?.importanceTier || getImportanceTier(importanceScore)) as 'yuksek' | 'orta' | 'dusuk';

        topics.push({
            title,
            description: normalizeText(String(topicObj.description || matchedArticle?.summary || '')),
            articleId: topicObj.articleId || matchedArticle?.id,
            whyImportant: normalizeText(String(topicObj.why_important || topicObj.whyImportant || '')),
            uncertaintyLevel,
            counterNarrative: normalizeText(String(topicObj.counter_narrative || topicObj.counterNarrative || '')),
            timeline: {
                before: normalizeText(String(topicObj.timeline?.before || topicObj.timeline_before || '')),
                now: normalizeText(String(topicObj.timeline?.now || topicObj.timeline_now || '')),
                next: normalizeText(String(topicObj.timeline?.next || topicObj.timeline_next || '')),
            },
            importanceScore,
            importanceTier,
        });
    }

    const filtered: TopicItem[] = topics
        .filter(topic => topic.title && topic.description)
        .slice(0, 5)
        .map(topic => ({
            ...topic,
            whyImportant: topic.whyImportant || 'Bu gelisme ekonomik, siyasal veya kurumsal etkisi nedeniyle gunluk ajandayi etkiliyor.',
            counterNarrative: topic.counterNarrative || 'Farkli kaynaklarda olayin neden-sonuc iliskisi farkli cerceveleniyor.',
            timeline: {
                before: topic.timeline?.before || 'Gelisme once sinirli sinyal olarak goruldu.',
                now: topic.timeline?.now || 'Su anda birden fazla kaynakta teyit sureci devam ediyor.',
                next: topic.timeline?.next || 'Sonraki adimda resmi aciklama ve sahadaki veriler izlenecek.',
            },
        }));

    if (filtered.length >= 3) return filtered;

    const fallbackTopics = buildTopicFallbacks(articles, 5);
    const merged: TopicItem[] = [...filtered];
    for (const fallback of fallbackTopics) {
        if (merged.some(topic => normalizeForPattern(topic.title) === normalizeForPattern(fallback.title))) continue;
        merged.push(fallback);
        if (merged.length >= 5) break;
    }

    return merged;
}

function buildConfidenceNote(telemetry: DigestTelemetry): string {
    return `Guven notu: ${telemetry.selectedArticleCount} haber, ${telemetry.selectedTweetCount} X paylasimi ve ${telemetry.minorityIncludedCount} azinlik-perspektifli baslik analiz edildi.`;
}

function buildSectionFallbacksFromArticles(articles: ArticleInput[]): DigestSection[] {
    const grouped = new Map<string, ArticleInput[]>();
    for (const article of articles) {
        const category = article.categoryId ? (CATEGORY_NAMES[article.categoryId] || 'Gundem') : 'Gundem';
        const bucket = grouped.get(category) || [];
        bucket.push(article);
        grouped.set(category, bucket);
    }

    return Array.from(grouped.entries())
        .sort((a, b) => b[1].length - a[1].length)
        .slice(0, 5)
        .map(([category, items]) => {
            const leadSentences = items
                .slice(0, 3)
                .map((a) => splitSentences(a.summary)[0] || `${normalizeText(a.translatedTitle)}.`)
                .filter(Boolean)
                .map((s) => (/[.!?]$/.test(s) ? s : `${s}.`));

            const highlights = items
                .slice(0, 4)
                .map((a) => normalizeText(a.translatedTitle))
                .filter(Boolean)
                .map((t) => (/[.!?]$/.test(t) ? t : `${t}.`));

            const avgImportance = items.length > 0
                ? items.reduce((acc, curr) => acc + safeNumber(curr.importanceScore, 0.55), 0) / items.length
                : 0.55;

            return {
                category,
                icon: '??',
                summary: normalizeText(leadSentences.join(' ')),
                highlights,
                counterNarrative: 'Farkli kaynaklar ayni olayi farkli neden-sonuc zinciri ile aktariyor.',
                uncertaintyLevel: items.some((a) => a.uncertaintyLevel === 'Gelisiyor') ? 'Gelisiyor' : 'Muhtemel',
                timeline: {
                    before: 'Gelisme once sinirli kaynakta goruldu.',
                    now: 'Birden fazla kaynakta dogrulama ve etkileri tartisiliyor.',
                    next: 'Resmi aciklamalar ve yeni saha verileri beklenecek.',
                },
                importanceScore: clamp(avgImportance, 0, 1),
            } as DigestSection;
        })
        .filter((s) => s.summary && s.highlights.length > 0);
}

function buildOperationalDigestFallback(
    articles: ArticleInput[],
    tweets: TweetInput[],
    countryCode: CountryCode,
    promptVariant: 'A' | 'B',
): DigestResult {
    let sections: DigestSection[] = [];
    let topTopics: TopicItem[] = [];

    try {
        sections = countryCode === 'tr' ? buildSectionFallbacksFromArticles(articles) : [];
    } catch (error) {
        logger.warn({ countryCode, error: error instanceof Error ? error.message : String(error) }, 'buildSectionFallbacksFromArticles failed');
    }

    try {
        topTopics = normalizeTopicItems([], articles);
    } catch (error) {
        logger.warn({ countryCode, error: error instanceof Error ? error.message : String(error) }, 'normalizeTopicItems failed in fallback');
        // Build minimal topics directly from articles
        topTopics = articles.slice(0, 5).map(a => ({
            title: normalizeText(a.translatedTitle),
            description: normalizeText(a.summary).slice(0, 180),
            articleId: a.id,
            importanceScore: safeNumber(a.importanceScore, 0.5),
            importanceTier: a.importanceTier || 'orta' as const,
        })).filter(t => t.title);
    }

    let summaryText = '';
    try {
        summaryText = enforceSummaryQuality('', {
            sections,
            topics: topTopics,
            articles,
            tweets,
            minWords: countryCode === 'tr' ? 100 : 90,
            minTweetRefs: countryCode === 'tr' ? 3 : 2,
        });
    } catch (error) {
        logger.warn({ countryCode, error: error instanceof Error ? error.message : String(error) }, 'enforceSummaryQuality failed in fallback');
        // Build summary directly from articles
        const parts = articles.slice(0, 6).map(a => {
            const title = normalizeText(a.translatedTitle);
            const summary = normalizeText(a.summary);
            return title && summary ? `${title}: ${summary.split(/[.!?]/)[0]}.` : title ? `${title}.` : '';
        }).filter(Boolean);
        summaryText = normalizeText(parts.join(' '));
    }

    const telemetry: DigestTelemetry = {
        promptVariant,
        rawArticleCount: articles.length,
        dedupedArticleCount: articles.length,
        selectedArticleCount: articles.length,
        rawTweetCount: tweets.length,
        selectedTweetCount: tweets.length,
        highImportanceCount: articles.filter(a => a.importanceTier === 'yuksek').length,
        minorityIncludedCount: articles.filter(a => (a.alignmentSummary || '').includes('Etiket:muhalif') || (a.alignmentSummary || '').includes('Etiket:iktidar')).length,
    };

    if (!normalizeForPattern(summaryText).includes('guven notu')) {
        summaryText = normalizeText(`${summaryText} ${buildConfidenceNote(telemetry)}`);
    }

    return {
        summaryText: summaryText || getDigestFallback(articles.length, countryCode === 'tr').summaryText,
        topTopics,
        sections,
        articleCount: articles.length,
        tweetCount: tweets.length,
        telemetry,
    };
}

function needsDetailPrefetch(article: {
    summary: string | null;
    detailContent: string | null;
    originalContent: string | null;
}): boolean {
    const summary = normalizeText(String(article.summary || ''));
    const detail = normalizeText(String(article.detailContent || ''));
    const original = normalizeText(String(article.originalContent || ''));

    if (!detail) return true;
    if (!summary) return detail.length < 180;
    if (detail === summary) return true;

    const detailSentenceCount = splitSentences(detail).length;
    if (detailSentenceCount < 2 && original.length > detail.length) return true;
    if (detail.length < 180 && original.length > detail.length) return true;

    return false;
}

async function precomputeDigestTopicDetails(
    countryCode: CountryCode,
    tables: (typeof COUNTRY_TABLES)[CountryCode],
    topTopics: TopicItem[],
): Promise<void> {
    const topicArticleIds = Array.from(new Set(
        topTopics
            .map(topic => String(topic.articleId || '').trim())
            .filter(Boolean)
    )).slice(0, DETAIL_PREFETCH_TOPIC_LIMIT);

    if (topicArticleIds.length === 0) return;

    const topicArticles = await db
        .select({
            id: tables.articles.id,
            translatedTitle: tables.articles.translatedTitle,
            originalContent: tables.articles.originalContent,
            originalLanguage: tables.articles.originalLanguage,
            summary: tables.articles.summary,
            detailContent: tables.articles.detailContent,
        })
        .from(tables.articles)
        .where(inArray(tables.articles.id, topicArticleIds));

    const toPrefetch = topicArticles.filter(needsDetailPrefetch);
    if (toPrefetch.length === 0) return;

    const queue = [...toPrefetch];
    let updated = 0;
    let failed = 0;

    const workers = Array.from({ length: Math.min(DETAIL_PREFETCH_CONCURRENCY, queue.length) }, async () => {
        while (queue.length > 0) {
            const article = queue.shift();
            if (!article) continue;

            try {
                const sourceContent = normalizeText(String(
                    article.originalContent || article.detailContent || article.summary || article.translatedTitle
                ));
                const language = String(
                    article.originalLanguage || (countryCode === 'tr' ? 'tr' : countryCode === 'de' ? 'de' : 'en')
                );
                const aiResult = await processArticleWithAI(article.translatedTitle, sourceContent, language);
                const nextDetail = normalizeText(String(aiResult.detailContent || ''));
                if (!nextDetail) continue;

                const currentDetail = normalizeText(String(article.detailContent || ''));
                if (nextDetail === currentDetail) continue;

                await db
                    .update(tables.articles)
                    .set({ detailContent: nextDetail })
                    .where(eq(tables.articles.id, article.id));
                updated++;
            } catch (error) {
                failed++;
                logger.warn({
                    countryCode,
                    articleId: article.id,
                    error: error instanceof Error ? error.message : String(error),
                }, 'Failed to precompute digest topic detail');
            }
        }
    });

    await Promise.all(workers);
    logger.info({
        countryCode,
        requestedTopics: topicArticleIds.length,
        prefetchedTopics: toPrefetch.length,
        updated,
        failed,
    }, 'Digest topic detail precompute completed');
}

async function precomputeDigestTopicPerspectives(
    countryCode: CountryCode,
    topTopics: TopicItem[],
): Promise<void> {
    const topicArticleIds = Array.from(new Set(
        topTopics
            .map(topic => String(topic.articleId || '').trim())
            .filter(Boolean)
    )).slice(0, PERSPECTIVE_PREFETCH_TOPIC_LIMIT);

    if (topicArticleIds.length === 0) return;

    const queue = [...topicArticleIds];
    let succeeded = 0;
    let failed = 0;

    const workers = Array.from({ length: Math.min(PERSPECTIVE_PREFETCH_CONCURRENCY, queue.length) }, async () => {
        while (queue.length > 0) {
            const articleId = queue.shift();
            if (!articleId) continue;

            try {
                await findPerspectives(articleId, countryCode, {
                    maxResults: 5,
                    timeWindowHours: 24,
                });
                succeeded++;
            } catch (error) {
                failed++;
                logger.warn({
                    countryCode,
                    articleId,
                    error: error instanceof Error ? error.message : String(error),
                }, 'Failed to precompute digest topic perspectives');
            }
        }
    });

    await Promise.all(workers);
    logger.info({
        countryCode,
        requestedTopics: topicArticleIds.length,
        succeeded,
        failed,
    }, 'Digest topic perspectives precompute completed');
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
    return `Etiket:${profile.dominantLabel} (m:${profile.oppositionSources}, i:${profile.proGovernmentSources}, k:${profile.centerSources}, b:${profile.unknownSources}, ton:${toneLabel}, guven:${Math.round(profile.avgReliabilityScore * 100)}%)`;
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
        avgReliabilityScore: number | null;
    };

    try {
        const rows = await db.all<RawProfile>(sql`
            SELECT
                src.article_id as articleId,
                COUNT(*) as totalSources,
                SUM(CASE WHEN rs.id IS NULL THEN 1 ELSE 0 END) as unknownSources,
                SUM(CASE WHEN rs.gov_alignment_score <= -1 THEN 1 ELSE 0 END) as oppositionSources,
                SUM(CASE WHEN rs.gov_alignment_score >= 1 THEN 1 ELSE 0 END) as proGovernmentSources,
                SUM(CASE WHEN rs.id IS NOT NULL AND rs.gov_alignment_score = 0 THEN 1 ELSE 0 END) as centerSources,
                AVG(CASE WHEN rs.reliability_score IS NOT NULL THEN rs.reliability_score ELSE NULL END) as avgReliabilityScore
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
                avgReliabilityScore: clamp(safeNumber(row.avgReliabilityScore, 2.5) / 5, 0, 1),
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
            avgReliabilityScore: clamp(safeNumber(article.reliabilityScore, 0.5), 0, 1),
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


/**
 * Generate detailed sectioned digest for Turkey
 * Tweets are the PRIMARY source — they set the agenda.
 * RSS articles provide depth and context.
 */
async function generateDefaultDigestWithAI(
    articles: ArticleInput[],
    tweets: TweetInput[],
    promptVariant: 'A' | 'B',
): Promise<DigestResult> {
    const periodLabel = 'gunluk';
    const sourceStats = `${tweets.length} tweet${articles.length > 0 ? ` ve ${articles.length} haber` : ''}`;
    const narrativeStyle = promptVariant === 'A'
        ? 'Ritim A: acilis cumlesi ana habere direkt girsin.'
        : 'Ritim B: acilis sahadan sinyal ile baslasin.';

    const tweetBlock = tweets.length > 0
        ? tweets.map((t, i) => `${i + 1}. @${t.userName} (${t.displayName}): "${t.text}" [L ${formatCount(t.likeCount)}, RT ${formatCount(t.retweetCount)}]`).join('\n')
        : '(Tweet verisi yok)';

    const articleBlock = articles.length > 0
        ? articles.map((a, i) => `${i + 1}. [Kaynak:${a.sourceCount}] [Onem:${Math.round((a.importanceScore || 0) * 100)}] [Belirsizlik:${a.uncertaintyLevel || 'Muhtemel'}] [${a.alignmentSummary || 'Etiket:belirsiz'}] ${a.translatedTitle}: ${a.summary}`).join('\n')
        : '(Haber verisi yok)';

    const prompt = `${sourceStats} ile ${periodLabel} bulteni olustur.

${narrativeStyle}

=== X (Twitter) - Birincil Kaynak ===
${tweetBlock}

=== Haber Siteleri - Destekleyici ===
${articleBlock}

JSON uret:
1. summary (4-6 madde, her madde tam cumle, 200-300 kelime toplam):
   YASAK KALIPLAR — bunlari kesinlikle kullanma:
   ✗ "Bugun onemli gelismeler yasandi"
   ✗ "Gundem yogun gecti"
   ✗ "Dikkat cekici gelismeler"
   ✗ "...one cikiyor/one cikti"
   ✗ "...dikkat cekti/dikkat cekiyor"
   ✗ "...gundemde yer aldi/gundemde"
   ✗ "...yanki buldu/yanki uyandirdi"
   ✗ Cumleleri yarida kesme

   DOGRU YAZIM:
   ✓ Her madde tam ve eksiksiz bir cumle olsun
   ✓ Her madde dogrudan bir olayla baslasin: "• [Isim] [ne yapti/ne acikladi]."
   ✓ Ornek: "Dışişleri Bakanı Fidan, Gazze Yönetim Baskan'ini Ankara'da kabul etti."
   ✓ Her cumle yeni bir bilgi versin. Yorum veya degerlendirme ekleme, sadece olgu.
   ✓ Cumleleri nokta ile bitir, virgul veya tire ile kesme
   ✓ Her madde ayri bir paragraf olsun

2. top_topics (3-5 konu):
   - title: Tam cumle, nokta ile bitir
   - description: 15-25 kelime, tam cumle, nokta ile bitir
   - Turkce karakterleri dogru kullan (ş, İ, ğ, ö, ü, ç)

{ "summary": "• Madde 1.\\n• Madde 2.\\n• Madde 3.", "top_topics": [{ "title": "...", "description": "..." }] }

Sadece JSON.`;

    const result = await aiChatCompletion<any>(
        {
            model: 'gpt-4o-mini',
            messages: [
                { role: 'system', content: 'Profesyonel haber spikerisin. Kisa, net, olgusal yaz. JSON dondur.' },
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
            maxContentLength: 45000,
        }
    );

    const topTopics = normalizeTopicItems((result.top_topics || result.topTopics || []), articles);
    let summaryText = result.summary || result.summaryText;
    if (typeof summaryText !== 'string') {
        summaryText = summaryText ? JSON.stringify(summaryText) : 'Gunun ozeti olusturulamadi.';
    }

    summaryText = enforceSummaryQuality(summaryText, {
        topics: topTopics,
        articles,
        tweets,
        minWords: 90,
        minTweetRefs: 2,
    });

    const telemetry: DigestTelemetry = {
        promptVariant,
        rawArticleCount: articles.length,
        dedupedArticleCount: articles.length,
        selectedArticleCount: articles.length,
        rawTweetCount: tweets.length,
        selectedTweetCount: tweets.length,
        highImportanceCount: articles.filter(a => a.importanceTier === 'yuksek').length,
        minorityIncludedCount: articles.filter(a => (a.alignmentSummary || '').includes('Etiket:muhalif') || (a.alignmentSummary || '').includes('Etiket:iktidar')).length,
    };

    if (!normalizeForPattern(summaryText).includes('guven notu')) {
        summaryText = normalizeText(`${summaryText} ${buildConfidenceNote(telemetry)}`);
    }

    return {
        summaryText: summaryText || 'Gunun ozeti olusturulamadi.',
        topTopics,
        sections: [],
        articleCount: articles.length,
        tweetCount: tweets.length,
        telemetry,
    };
}

async function generateTRDigestWithAI(
    articles: ArticleInput[],
    tweets: TweetInput[],
    promptVariant: 'A' | 'B',
): Promise<DigestResult> {
    const narrativeStyle = promptVariant === 'A'
        ? 'Ritim A: ana gundemi ac, sonra kategori akisini buyut.'
        : 'Ritim B: saha sinyali -> kurum tepkisi -> sonraki adim zinciri kur.';

    const highEngagement = tweets.filter(t => t.likeCount >= 1000 || t.retweetCount >= 200);
    const medEngagement = tweets.filter(t => t.likeCount < 1000 && t.retweetCount < 200);
    const formatTweet = (t: TweetInput, i: number) =>
        `${i + 1}. @${t.userName} (${t.displayName}): "${t.text}" [L ${formatCount(t.likeCount)}, RT ${formatCount(t.retweetCount)}]`;

    const tweetBlock = [
        highEngagement.length > 0 ? `[Yuksek Etkilesim]\n${highEngagement.map(formatTweet).join('\n')}` : '',
        medEngagement.length > 0 ? `[Diger Onemli Paylasimlar]\n${medEngagement.map(formatTweet).join('\n')}` : '',
    ].filter(Boolean).join('\n\n') || '(Tweet verisi yok)';

    const grouped: Record<string, ArticleInput[]> = {};
    for (const article of articles) {
        const catName = article.categoryId ? (CATEGORY_NAMES[article.categoryId] || 'Gundem') : 'Gundem';
        if (!grouped[catName]) grouped[catName] = [];
        grouped[catName].push(article);
    }

    const categoryBlocks = Object.entries(grouped)
        .sort((a, b) => b[1].length - a[1].length)
        .map(([cat, arts]) => {
            const items = arts.map((a, i) => `${i + 1}. [Kaynak:${a.sourceCount}] [Onem:${Math.round((a.importanceScore || 0) * 100)}] [Belirsizlik:${a.uncertaintyLevel || 'Muhtemel'}] [${a.alignmentSummary || 'Etiket:belirsiz'}] ${a.translatedTitle}: ${a.summary}`).join('\n');
            return `[${cat}] (${arts.length} haber)\n${items}`;
        })
        .join('\n\n') || '(Haber verisi yok)';

    const prompt = `${tweets.length} tweet ve ${articles.length} haber ile Turkiye gunluk bulteni olustur.

${narrativeStyle}

=== X (Twitter) - Birincil Kaynak ===
${tweetBlock}

=== Haber Siteleri - Destekleyici ===
${categoryBlocks}

JSON uret:
1. summary (4-6 madde, her madde tam cumle, 200-300 kelime toplam):
   YASAK KALIPLAR — bunlari kesinlikle kullanma:
   ✗ "Bugun onemli gelismeler yasandi"
   ✗ "Gundem yogun gecti"
   ✗ "Dikkat cekici gelismeler"
   ✗ "...one cikiyor/one cikti"
   ✗ "...dikkat cekti/dikkat cekiyor"
   ✗ "...gundemde yer aldi/gundemde"
   ✗ "...yanki buldu/yanki uyandirdi"
   ✗ Cumleleri yarida kesme

   DOGRU YAZIM:
   ✓ Her madde tam ve eksiksiz bir cumle olsun
   ✓ Her madde dogrudan bir olayla baslasin: "• [Isim] [ne yapti/ne acikladi]."
   ✓ Ornek: "Dışişleri Bakanı Fidan, Gazze Yönetim Baskan'ini Ankara'da kabul etti."
   ✓ Her cumle yeni bir bilgi versin. Yorum veya degerlendirme ekleme, sadece olgu.
   ✓ Cumleleri nokta ile bitir, virgul veya tire ile kesme
   ✓ Her madde ayri bir paragraf olsun

2. sections (Kategorilere gore bolumler):
   - summary: En az 80 kelime
   - highlights: 3-5 anahtar nokta

3. top_topics (3-5 konu):
   - title: Tam cumle, nokta ile bitir
   - description: 15-25 kelime, tam cumle, nokta ile bitir
   - Turkce karakterleri dogru kullan (ş, İ, ğ, ö, ü, ç)

Sadece JSON.`;

    logger.info({ promptLength: prompt.length, articleCount: articles.length, tweetCount: tweets.length }, 'TR digest AI call starting');

    const result = await aiChatCompletion<any>(
        {
            model: 'gpt-4o-mini',
            messages: [
                { role: 'system', content: 'Profesyonel haber spikerisin. Yorum yapma, olgusal yaz, JSON dondur.' },
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
            maxContentLength: 70000,
        }
    );

    const isFallbackResult = !result.sections && !result.summary && !result.top_topics;
    logger.info({
        isFallbackResult,
        hasResultSections: !!result.sections,
        hasResultSummary: !!result.summary,
        hasResultTopics: !!(result.top_topics || result.topTopics),
        resultKeys: Object.keys(result),
    }, 'TR digest AI call completed');

    const tweetAvatarByHandle = new Map<string, string>();
    const tweetAvatarByAuthor = new Map<string, string>();
    for (const tweet of tweets) {
        const profileImage = typeof tweet.profileImageUrl === 'string' ? tweet.profileImageUrl.trim() : '';
        if (!profileImage) continue;

        const handleKey = normalizeHandle(tweet.userName || '');
        if (handleKey && !tweetAvatarByHandle.has(handleKey)) {
            tweetAvatarByHandle.set(handleKey, profileImage);
        }

        const authorKey = String(tweet.displayName || '').trim().toLowerCase();
        if (authorKey && !tweetAvatarByAuthor.has(authorKey)) {
            tweetAvatarByAuthor.set(authorKey, profileImage);
        }
    }

    const sections: DigestSection[] = (result.sections || []).map((s: any) => ({
        category: String(s.category || ''),
        icon: String(s.icon || '??'),
        summary: String(s.summary || ''),
        highlights: Array.isArray(s.highlights) ? s.highlights.map(String) : [],
        counterNarrative: s.counterNarrative ? String(s.counterNarrative) : 'Ayni olaya farkli kaynaklar farkli vurgu yapti.',
        uncertaintyLevel: s.uncertaintyLevel ? normalizeUncertaintyLevel(s.uncertaintyLevel) : 'Muhtemel',
        timeline: s.timeline ? {
            before: String(s.timeline.before || ''),
            now: String(s.timeline.now || ''),
            next: String(s.timeline.next || ''),
        } : {
            before: 'Gelisme once sinirli sinyal olarak goruldu.',
            now: 'Su anda birden fazla kaynakta teyit sureci suruyor.',
            next: 'Resmi aciklamalar ve saha verisi takip edilecek.',
        },
        importanceScore: s.importanceScore ? clamp(safeNumber(s.importanceScore), 0, 1) : 0.6,
        tweetContext: s.tweetContext ? String(s.tweetContext) : undefined,
        tweets: Array.isArray(s.tweets)
            ? s.tweets.map((t: any) => {
                const author = String(t.author || '').trim();
                const handle = String(t.handle || '').trim();
                const text = String(t.text || '').trim();
                const handleKey = normalizeHandle(handle);
                const authorKey = author.toLowerCase();
                const directProfileImage = typeof t.profileImageUrl === 'string'
                    ? t.profileImageUrl.trim()
                    : typeof t.profile_image_url === 'string'
                        ? t.profile_image_url.trim()
                        : '';
                const profileImageUrl = directProfileImage
                    || tweetAvatarByHandle.get(handleKey)
                    || tweetAvatarByAuthor.get(authorKey)
                    || null;

                return {
                    author,
                    handle,
                    text,
                    profileImageUrl,
                };
            }).filter((t: any) => t.text)
            : undefined,
    })).filter((s: DigestSection) => s.category && s.summary);

    const topTopics = normalizeTopicItems((result.top_topics || result.topTopics || []), articles);
    let summaryText = result.summary || result.summaryText;
    if (typeof summaryText !== 'string') {
        summaryText = summaryText ? JSON.stringify(summaryText) : 'Gunun ozeti olusturulamadi.';
    }

    summaryText = enforceSummaryQuality(summaryText, {
        sections,
        topics: topTopics,
        articles,
        tweets,
        minWords: 100,
        minTweetRefs: 3,
    });

    const telemetry: DigestTelemetry = {
        promptVariant,
        rawArticleCount: articles.length,
        dedupedArticleCount: articles.length,
        selectedArticleCount: articles.length,
        rawTweetCount: tweets.length,
        selectedTweetCount: tweets.length,
        highImportanceCount: articles.filter(a => a.importanceTier === 'yuksek').length,
        minorityIncludedCount: articles.filter(a => (a.alignmentSummary || '').includes('Etiket:muhalif') || (a.alignmentSummary || '').includes('Etiket:iktidar')).length,
    };
    if (!normalizeForPattern(summaryText).includes('guven notu')) {
        summaryText = normalizeText(`${summaryText} ${buildConfidenceNote(telemetry)}`);
    }

    return {
        summaryText: summaryText || 'Gunun ozeti olusturulamadi.',
        topTopics,
        sections,
        articleCount: articles.length,
        tweetCount: tweets.length,
        telemetry,
    };
}

async function generateDigestWithAI(
    articles: ArticleInput[],
    tweets: TweetInput[],
    countryCode: CountryCode,
    promptVariant: 'A' | 'B'
): Promise<DigestResult> {
    try {
        if (countryCode === 'tr') {
            return await generateTRDigestWithAI(articles, tweets, promptVariant);
        }
        return await generateDefaultDigestWithAI(articles, tweets, promptVariant);
    } catch (error) {
        const errMsg = error instanceof Error ? error.message : String(error);
        const errStack = error instanceof Error ? error.stack : undefined;
        logger.error({ error: errMsg, stack: errStack, countryCode, articleCount: articles.length, tweetCount: tweets.length }, 'Digest AI generation failed, using operational fallback');
        try {
            return buildOperationalDigestFallback(articles, tweets, countryCode, promptVariant);
        } catch (fallbackError) {
            logger.error({ error: fallbackError instanceof Error ? fallbackError.message : String(fallbackError), countryCode }, 'Operational fallback also failed');
            return {
                summaryText: getDigestFallback(articles.length, countryCode === 'tr').summaryText,
                topTopics: [],
                sections: [],
                articleCount: articles.length,
                tweetCount: tweets.length,
            };
        }
    }
}

function formatCount(n: number): string {
    if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
    if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
    return String(n);
}

const PROMO_KEYWORDS = [
    'reklam', 'kampanya', 'indirim', 'firsat', 'hediye', 'cekilis',
    'kazan', 'promosyon', 'sponsor', 'tanitim', 'lansman',
    'uygulamayi indir', 'hemen katil', 'hemen al', 'son gun',
    'tikla', 'link bio', 'linktree', 'bit.ly', 'goo.gl',
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

    const sortedByPriority = [...articles].sort((a, b) => {
        const importanceDelta = safeNumber(b.importanceScore, 0) - safeNumber(a.importanceScore, 0);
        if (importanceDelta !== 0) return importanceDelta;
        return b.sourceCount - a.sourceCount;
    });
    const highCoverageCount = Math.max(4, Math.floor(limit * 0.6));
    const lowCoverageCount = Math.max(3, Math.floor(limit * 0.25));
    const minorityCount = Math.max(2, Math.floor(limit * 0.15));

    const highCoverage = sortedByPriority.slice(0, highCoverageCount);
    const lowCoverage = [...sortedByPriority]
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

    const minorityPerspective = sortedByPriority
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
        let usedStaleArticleFallback = false;
        let articles = await db
            .select({
                id: tables.articles.id,
                translatedTitle: tables.articles.translatedTitle,
                summary: tables.articles.summary,
                categoryId: tables.articles.categoryId,
                sourceCount: tables.articles.sourceCount,
                politicalTone: tables.articles.politicalTone,
                publishedAt: tables.articles.publishedAt,
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
                    publishedAt: tables.articles.publishedAt,
                })
                .from(tables.articles)
                .where(and(
                    gte(tables.articles.publishedAt, fallbackStart),
                    eq(tables.articles.isFiltered, false)
                ))
                .orderBy(desc(tables.articles.publishedAt))
                .limit(articleLimit);
        }

        // Last-resort fallback: use latest available articles even if stale.
        // This guarantees digest continuity when scraper is temporarily down.
        if (articles.length === 0) {
            logger.warn({ countryCode, period }, 'No articles in last 7 days, falling back to latest available articles');
            usedStaleArticleFallback = true;

            articles = await db
                .select({
                    id: tables.articles.id,
                    translatedTitle: tables.articles.translatedTitle,
                    summary: tables.articles.summary,
                    categoryId: tables.articles.categoryId,
                    sourceCount: tables.articles.sourceCount,
                    politicalTone: tables.articles.politicalTone,
                    publishedAt: tables.articles.publishedAt,
                })
                .from(tables.articles)
                .where(eq(tables.articles.isFiltered, false))
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
            const rawTweets = await db.all<{
                text: string;
                user_name: string;
                display_name: string;
                profile_image_url: string | null;
                like_count: number;
                retweet_count: number;
                account_type: 'government' | 'news_agency' | 'journalist' | 'institution' | 'political_party' | null;
            }>(
                sql`SELECT tw.text, tw.user_name, tw.display_name, tw.profile_image_url, tw.like_count, tw.retweet_count, acc.account_type
                    FROM ${sql.raw(tweetTableName)} tw
                    LEFT JOIN twitter_accounts acc
                      ON acc.id = tw.account_id
                     AND acc.country_code = ${countryCode}
                    WHERE tw.tweeted_at >= ${tweetStart} AND tw.tweeted_at <= ${tweetEnd}
                    ORDER BY (tw.like_count + tw.retweet_count * 2) DESC
                    LIMIT 80`
            );
            const mappedTweets = rawTweets.map(t => {
                const base: TweetInput = {
                    text: t.text,
                    userName: t.user_name,
                    displayName: t.display_name,
                    profileImageUrl: t.profile_image_url,
                    accountType: t.account_type,
                    likeCount: t.like_count,
                    retweetCount: t.retweet_count,
                };
                base.engagementScore = computeTweetEngagementScore(base);
                base.qualityScore = computeTweetQualityScore(base);
                return base;
            });
            tweets = dedupeTweetsSemantically(mappedTweets)
                .filter(t => !isPromotionalTweet(t.text))
                .filter(t => safeNumber(t.qualityScore, 0) >= 0.32)
                .sort((a, b) => safeNumber(b.qualityScore, 0) - safeNumber(a.qualityScore, 0))
                .slice(0, 30);
            logger.info({
                countryCode,
                tweetCount: tweets.length,
                rawCount: rawTweets.length,
                avgTweetQuality: tweets.length > 0
                    ? Number((tweets.reduce((acc, t) => acc + safeNumber(t.qualityScore, 0), 0) / tweets.length).toFixed(3))
                    : 0,
            }, 'Tweets fetched for digest (quality-filtered)');
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
        const scoredArticles = computeArticleImportanceScores(enrichedArticles, tweets, alignmentProfiles, endTime);
        const dedupedArticles = dedupeArticlesSemantically(scoredArticles);
        const supportingArticles = getSupportingArticles(dedupedArticles, countryCode, tweets.length, alignmentProfiles);
        const promptVariant = pickPromptVariant(countryCode, targetDate);
        logger.info({
            countryCode,
            period,
            tweetCount: tweets.length,
            totalArticles: enrichedArticles.length,
            dedupedArticles: dedupedArticles.length,
            supportingArticles: supportingArticles.length,
            xPrimary: tweets.length > 0,
            promptVariant,
            labeledArticles: enrichedArticles.filter(a => a.alignmentSummary && !a.alignmentSummary.includes('belirsiz')).length,
        }, 'Digest source priority applied');

        let digestResult: DigestResult;
        if (usedStaleArticleFallback) {
            logger.warn({
                countryCode,
                articleCount: supportingArticles.length,
            }, 'Using stale article fallback digest (AI skipped)');
            digestResult = buildOperationalDigestFallback(supportingArticles, tweets, countryCode, promptVariant);
        } else {
            // Generate digest with AI for fresh/recent data windows.
            digestResult = await generateDigestWithAI(supportingArticles, tweets, countryCode, promptVariant);
        }

        // Precompute missing topic details so article screens open faster from digest headlines.
        try {
            await precomputeDigestTopicDetails(countryCode, tables, digestResult.topTopics);
        } catch (error) {
            logger.warn({
                countryCode,
                error: error instanceof Error ? error.message : String(error),
            }, 'Digest topic detail precompute skipped');
        }

        // Precompute perspectives at write-time to avoid expensive read-time generation.
        try {
            await precomputeDigestTopicPerspectives(countryCode, digestResult.topTopics);
        } catch (error) {
            logger.warn({
                countryCode,
                error: error instanceof Error ? error.message : String(error),
            }, 'Digest topic perspectives precompute skipped');
        }

        // Format date string
        const digestDate = getDigestDateString(targetDate);

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

    const todayDigestDate = getDigestDateString(new Date());
    const todayDigest = await db
        .select()
        .from(tables.digests)
        .where(eq(tables.digests.digestDate, todayDigestDate))
        .orderBy(desc(tables.digests.createdAt))
        .limit(1)
        .get();

    if (todayDigest) {
        return todayDigest;
    }

    const digest = await db
        .select()
        .from(tables.digests)
        .orderBy(desc(tables.digests.digestDate), desc(tables.digests.createdAt))
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
