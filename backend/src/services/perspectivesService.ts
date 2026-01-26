import { db } from '../config/db.js';
import { openai } from '../config/openai.js';
import { logger } from '../config/logger.js';
import {
    tr_articles,
    tr_article_sources,
    de_articles,
    de_article_sources,
    us_articles,
    us_article_sources,
    uk_articles,
    uk_article_sources,
    fr_articles,
    fr_article_sources,
    es_articles,
    es_article_sources,
    it_articles,
    it_article_sources,
    ru_articles,
    ru_article_sources,
    rss_sources,
    articlePerspectives,
} from '../db/schema/index.js';
import { eq, and, gte, lte, ne, sql, desc } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { getAlignmentLabel, AlignmentLabel } from '../utils/alignment.js';

const COUNTRY_TABLES = {
    tr: { articles: tr_articles, sources: tr_article_sources },
    de: { articles: de_articles, sources: de_article_sources },
    us: { articles: us_articles, sources: us_article_sources },
    uk: { articles: uk_articles, sources: uk_article_sources },
    fr: { articles: fr_articles, sources: fr_article_sources },
    es: { articles: es_articles, sources: es_article_sources },
    it: { articles: it_articles, sources: it_article_sources },
    ru: { articles: ru_articles, sources: ru_article_sources },
} as const;

type CountryCode = keyof typeof COUNTRY_TABLES;

export interface ExtractedEntities {
    persons: string[];
    organizations: string[];
    locations: string[];
    events: string[];
}

export interface PerspectiveMatch {
    articleId: string;
    title: string;
    summary: string;
    sourceName: string;
    sourceLogoUrl: string;
    sourceUrl: string;
    govAlignmentScore: number;
    govAlignmentLabel: AlignmentLabel;
    publishedAt: Date;
    similarityScore: number;
    matchedEntities: string[];
}

export interface PerspectivesResult {
    mainArticle: {
        id: string;
        title: string;
        summary: string;
        sourceName: string;
        govAlignmentScore: number;
        govAlignmentLabel: string;
    };
    relatedPerspectives: PerspectiveMatch[];
}

/**
 * Extract named entities from text using OpenAI
 */
export async function extractEntities(text: string): Promise<ExtractedEntities> {
    try {
        const response = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                {
                    role: 'system',
                    content: 'You are a named entity extraction AI. Extract entities from news text and return JSON only.',
                },
                {
                    role: 'user',
                    content: `Extract named entities from the following text. Return JSON with these arrays:
- persons: Names of people mentioned
- organizations: Names of organizations, companies, political parties
- locations: Cities, countries, places
- events: Specific events or incidents mentioned

Text: ${text.substring(0, 1500)}

Return ONLY valid JSON, no additional text.`,
                },
            ],
            response_format: { type: 'json_object' },
            temperature: 0.2,
        });

        const result = JSON.parse(response.choices[0].message.content || '{}');

        return {
            persons: result.persons || [],
            organizations: result.organizations || [],
            locations: result.locations || [],
            events: result.events || [],
        };
    } catch (error) {
        logger.error({ error }, 'Entity extraction failed');
        return { persons: [], organizations: [], locations: [], events: [] };
    }
}

/**
 * Calculate Jaccard similarity between two entity sets
 */
export function calculateEntityOverlap(entities1: ExtractedEntities, entities2: ExtractedEntities): number {
    const allEntities1 = new Set([
        ...entities1.persons.map(e => e.toLowerCase()),
        ...entities1.organizations.map(e => e.toLowerCase()),
        ...entities1.locations.map(e => e.toLowerCase()),
        ...entities1.events.map(e => e.toLowerCase()),
    ]);

    const allEntities2 = new Set([
        ...entities2.persons.map(e => e.toLowerCase()),
        ...entities2.organizations.map(e => e.toLowerCase()),
        ...entities2.locations.map(e => e.toLowerCase()),
        ...entities2.events.map(e => e.toLowerCase()),
    ]);

    if (allEntities1.size === 0 || allEntities2.size === 0) {
        return 0;
    }

    // Calculate Jaccard similarity
    const intersection = new Set([...allEntities1].filter(x => allEntities2.has(x)));
    const union = new Set([...allEntities1, ...allEntities2]);

    return intersection.size / union.size;
}

/**
 * Get common entities between two entity sets
 */
export function getCommonEntities(entities1: ExtractedEntities, entities2: ExtractedEntities): string[] {
    const allEntities1 = new Set([
        ...entities1.persons,
        ...entities1.organizations,
        ...entities1.locations,
        ...entities1.events,
    ].map(e => e.toLowerCase()));

    const allEntities2 = [
        ...entities2.persons,
        ...entities2.organizations,
        ...entities2.locations,
        ...entities2.events,
    ];

    return allEntities2.filter(e => allEntities1.has(e.toLowerCase()));
}

/**
 * Calculate semantic similarity using OpenAI embeddings
 */
export async function calculateSemanticSimilarity(text1: string, text2: string): Promise<number> {
    try {
        const [embedding1, embedding2] = await Promise.all([
            openai.embeddings.create({
                model: 'text-embedding-3-small',
                input: text1.substring(0, 2000),
            }),
            openai.embeddings.create({
                model: 'text-embedding-3-small',
                input: text2.substring(0, 2000),
            }),
        ]);

        const vec1 = embedding1.data[0].embedding;
        const vec2 = embedding2.data[0].embedding;

        // Cosine similarity
        let dotProduct = 0;
        let norm1 = 0;
        let norm2 = 0;

        for (let i = 0; i < vec1.length; i++) {
            dotProduct += vec1[i] * vec2[i];
            norm1 += vec1[i] * vec1[i];
            norm2 += vec2[i] * vec2[i];
        }

        return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
    } catch (error) {
        logger.error({ error }, 'Semantic similarity calculation failed');
        return 0;
    }
}

/**
 * Find different perspectives on the same story
 */
export async function findPerspectives(
    articleId: string,
    countryCode: CountryCode,
    options: {
        timeWindowHours?: number;
        entityThreshold?: number;
        combinedThreshold?: number;
        maxResults?: number;
    } = {}
): Promise<PerspectivesResult | null> {
    const {
        timeWindowHours = 24,
        entityThreshold = 0.25,
        combinedThreshold = 0.65,
        maxResults = 5,
    } = options;

    const tables = COUNTRY_TABLES[countryCode];
    if (!tables) {
        logger.error({ countryCode }, 'Invalid country code');
        return null;
    }

    // 1. Get main article
    const mainArticles = await db
        .select()
        .from(tables.articles)
        .where(eq(tables.articles.id, articleId))
        .limit(1);

    if (mainArticles.length === 0) {
        return null;
    }

    const mainArticle = mainArticles[0];

    // Get main article's primary source
    const mainSources = await db
        .select()
        .from(tables.sources)
        .where(and(
            eq(tables.sources.articleId, articleId),
            eq(tables.sources.isPrimary, true)
        ))
        .limit(1);

    const mainSource = mainSources[0];
    if (!mainSource) {
        return null;
    }

    // Get main source's alignment info
    const mainSourceInfo = await db
        .select()
        .from(rss_sources)
        .where(eq(rss_sources.sourceName, mainSource.sourceName))
        .get();

    const mainGovScore = mainSourceInfo?.govAlignmentScore ?? 0;
    const mainConfidence = mainSourceInfo?.govAlignmentConfidence ?? 0.5;

    // 2. Check cache first
    const cachedPerspectives = await db
        .select()
        .from(articlePerspectives)
        .where(eq(articlePerspectives.mainArticleId, articleId))
        .orderBy(desc(articlePerspectives.similarityScore))
        .limit(maxResults);

    if (cachedPerspectives.length > 0) {
        // Return cached perspectives
        const perspectives = await Promise.all(
            cachedPerspectives.map(async (p) => {
                const relatedArticles = await db
                    .select()
                    .from(tables.articles)
                    .where(eq(tables.articles.id, p.relatedArticleId))
                    .limit(1);

                if (relatedArticles.length === 0) return null;
                const relatedArticle = relatedArticles[0];

                const relatedSources = await db
                    .select()
                    .from(tables.sources)
                    .where(and(
                        eq(tables.sources.articleId, p.relatedArticleId),
                        eq(tables.sources.isPrimary, true)
                    ))
                    .limit(1);

                const relatedSource = relatedSources[0];
                if (!relatedSource) return null;

                const relatedSourceInfo = await db
                    .select()
                    .from(rss_sources)
                    .where(eq(rss_sources.sourceName, relatedSource.sourceName))
                    .get();

                const govScore = relatedSourceInfo?.govAlignmentScore ?? 0;
                const confidence = relatedSourceInfo?.govAlignmentConfidence ?? 0.5;

                return {
                    articleId: p.relatedArticleId,
                    title: relatedArticle.translatedTitle,
                    summary: relatedArticle.summary,
                    sourceName: relatedSource.sourceName,
                    sourceLogoUrl: relatedSource.sourceLogoUrl,
                    sourceUrl: relatedSource.sourceUrl,
                    govAlignmentScore: govScore,
                    govAlignmentLabel: getAlignmentLabel(govScore, confidence),
                    publishedAt: relatedArticle.publishedAt,
                    similarityScore: p.similarityScore,
                    matchedEntities: (p.matchedEntities as string[]) || [],
                };
            })
        );

        return {
            mainArticle: {
                id: mainArticle.id,
                title: mainArticle.translatedTitle,
                summary: mainArticle.summary,
                sourceName: mainSource.sourceName,
                govAlignmentScore: mainGovScore,
                govAlignmentLabel: getAlignmentLabel(mainGovScore, mainConfidence),
            },
            relatedPerspectives: perspectives.filter((p): p is PerspectiveMatch => p !== null),
        };
    }

    // 3. Time window filter (±24 hours)
    const publishedAt = mainArticle.publishedAt;
    const timeWindowMs = timeWindowHours * 60 * 60 * 1000;
    const startTime = new Date(publishedAt.getTime() - timeWindowMs);
    const endTime = new Date(publishedAt.getTime() + timeWindowMs);

    const candidates = await db
        .select()
        .from(tables.articles)
        .where(and(
            gte(tables.articles.publishedAt, startTime),
            lte(tables.articles.publishedAt, endTime),
            ne(tables.articles.id, articleId),
            eq(tables.articles.isFiltered, false)
        ))
        .orderBy(desc(tables.articles.publishedAt))
        .limit(50);

    if (candidates.length === 0) {
        return {
            mainArticle: {
                id: mainArticle.id,
                title: mainArticle.translatedTitle,
                summary: mainArticle.summary,
                sourceName: mainSource.sourceName,
                govAlignmentScore: mainGovScore,
                govAlignmentLabel: getAlignmentLabel(mainGovScore, mainConfidence),
            },
            relatedPerspectives: [],
        };
    }

    // 4. Extract entities from main article
    const mainText = `${mainArticle.translatedTitle}. ${mainArticle.summary}`;
    const mainEntities = await extractEntities(mainText);

    // 5. Score each candidate
    const scoredCandidates: {
        article: typeof candidates[0];
        source: typeof mainSource;
        sourceInfo: typeof mainSourceInfo;
        entityOverlap: number;
        semanticSim: number;
        combinedScore: number;
        matchedEntities: string[];
    }[] = [];

    for (const candidate of candidates) {
        // Get candidate source
        const candidateSources = await db
            .select()
            .from(tables.sources)
            .where(and(
                eq(tables.sources.articleId, candidate.id),
                eq(tables.sources.isPrimary, true)
            ))
            .limit(1);

        const candidateSource = candidateSources[0];
        if (!candidateSource) continue;

        // Skip same source
        if (candidateSource.sourceName === mainSource.sourceName) continue;

        // Get source alignment info
        const candidateSourceInfo = await db
            .select()
            .from(rss_sources)
            .where(eq(rss_sources.sourceName, candidateSource.sourceName))
            .get();

        // Extract entities
        const candidateText = `${candidate.translatedTitle}. ${candidate.summary}`;
        const candidateEntities = await extractEntities(candidateText);

        // Calculate entity overlap
        const entityOverlap = calculateEntityOverlap(mainEntities, candidateEntities);

        if (entityOverlap < entityThreshold) {
            continue; // Not enough entity overlap
        }

        // Calculate semantic similarity
        const semanticSim = await calculateSemanticSimilarity(mainText, candidateText);

        // Combined score: 40% entity overlap + 60% semantic similarity
        const combinedScore = (entityOverlap * 0.4) + (semanticSim * 0.6);

        if (combinedScore >= combinedThreshold) {
            scoredCandidates.push({
                article: candidate,
                source: candidateSource,
                sourceInfo: candidateSourceInfo,
                entityOverlap,
                semanticSim,
                combinedScore,
                matchedEntities: getCommonEntities(mainEntities, candidateEntities),
            });
        }
    }

    // 6. Sort by alignment diversity (prefer variety across political spectrum)
    scoredCandidates.sort((a, b) => {
        // First, prefer higher combined scores
        if (Math.abs(a.combinedScore - b.combinedScore) > 0.1) {
            return b.combinedScore - a.combinedScore;
        }
        // Then, prefer sources with different alignment from main
        const aDiff = Math.abs((a.sourceInfo?.govAlignmentScore ?? 0) - mainGovScore);
        const bDiff = Math.abs((b.sourceInfo?.govAlignmentScore ?? 0) - mainGovScore);
        return bDiff - aDiff;
    });

    // 7. Take top results and cache them
    const topCandidates = scoredCandidates.slice(0, maxResults);

    // Cache the perspectives
    for (const candidate of topCandidates) {
        await db.insert(articlePerspectives).values({
            id: uuidv4(),
            mainArticleId: articleId,
            relatedArticleId: candidate.article.id,
            similarityScore: candidate.combinedScore,
            matchedEntities: candidate.matchedEntities,
            createdAt: new Date(),
        }).onConflictDoNothing();
    }

    // 8. Format response
    const perspectives: PerspectiveMatch[] = topCandidates.map(c => ({
        articleId: c.article.id,
        title: c.article.translatedTitle,
        summary: c.article.summary,
        sourceName: c.source.sourceName,
        sourceLogoUrl: c.source.sourceLogoUrl,
        sourceUrl: c.source.sourceUrl,
        govAlignmentScore: c.sourceInfo?.govAlignmentScore ?? 0,
        govAlignmentLabel: getAlignmentLabel(
            c.sourceInfo?.govAlignmentScore ?? 0,
            c.sourceInfo?.govAlignmentConfidence ?? 0.5
        ),
        publishedAt: c.article.publishedAt,
        similarityScore: c.combinedScore,
        matchedEntities: c.matchedEntities,
    }));

    logger.info({
        articleId,
        candidatesFound: candidates.length,
        perspectivesMatched: perspectives.length,
    }, 'Perspectives search completed');

    return {
        mainArticle: {
            id: mainArticle.id,
            title: mainArticle.translatedTitle,
            summary: mainArticle.summary,
            sourceName: mainSource.sourceName,
            govAlignmentScore: mainGovScore,
            govAlignmentLabel: getAlignmentLabel(mainGovScore, mainConfidence),
        },
        relatedPerspectives: perspectives,
    };
}

/**
 * Get articles grouped by alignment for balanced feed
 */
export async function getBalancedFeed(
    countryCode: CountryCode,
    options: {
        limit?: number;
        page?: number;
    } = {}
): Promise<{
    proGov: any[];
    mixed: any[];
    antiGov: any[];
}> {
    const { limit = 10, page = 1 } = options;
    const offset = (page - 1) * limit;

    const tables = COUNTRY_TABLES[countryCode];
    if (!tables) {
        return { proGov: [], mixed: [], antiGov: [] };
    }

    // Get all active sources with their alignment
    const sources = await db
        .select()
        .from(rss_sources)
        .where(and(
            eq(rss_sources.countryCode, countryCode),
            eq(rss_sources.isActive, true)
        ));

    // Group sources by alignment
    const proGovSources = sources.filter(s => s.govAlignmentScore >= 2).map(s => s.sourceName);
    const mixedSources = sources.filter(s => s.govAlignmentScore > -2 && s.govAlignmentScore < 2).map(s => s.sourceName);
    const antiGovSources = sources.filter(s => s.govAlignmentScore <= -2).map(s => s.sourceName);

    // Helper to get articles from specific sources
    async function getArticlesFromSources(sourceNames: string[], articleLimit: number) {
        if (sourceNames.length === 0) return [];

        const articles = await db
            .select()
            .from(tables.articles)
            .where(eq(tables.articles.isFiltered, false))
            .orderBy(desc(tables.articles.publishedAt))
            .limit(100); // Get more to filter

        const result = [];
        for (const article of articles) {
            if (result.length >= articleLimit) break;

            const articleSources = await db
                .select()
                .from(tables.sources)
                .where(and(
                    eq(tables.sources.articleId, article.id),
                    eq(tables.sources.isPrimary, true)
                ))
                .limit(1);

            const primarySource = articleSources[0];
            if (primarySource && sourceNames.includes(primarySource.sourceName)) {
                const sourceInfo = sources.find(s => s.sourceName === primarySource.sourceName);
                result.push({
                    ...article,
                    source: primarySource.sourceName,
                    sourceLogoUrl: primarySource.sourceLogoUrl,
                    govAlignmentScore: sourceInfo?.govAlignmentScore ?? 0,
                    govAlignmentLabel: getAlignmentLabel(
                        sourceInfo?.govAlignmentScore ?? 0,
                        sourceInfo?.govAlignmentConfidence ?? 0.5
                    ),
                });
            }
        }

        return result;
    }

    const [proGov, mixed, antiGov] = await Promise.all([
        getArticlesFromSources(proGovSources, Math.ceil(limit / 3)),
        getArticlesFromSources(mixedSources, Math.ceil(limit / 3)),
        getArticlesFromSources(antiGovSources, Math.ceil(limit / 3)),
    ]);

    return { proGov, mixed, antiGov };
}
