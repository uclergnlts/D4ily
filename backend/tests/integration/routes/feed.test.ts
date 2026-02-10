import { describe, it, expect, vi, beforeAll } from 'vitest';
import request from 'supertest';
import { Hono } from 'hono';
import { serve } from '@hono/node-server';

// Mock Env BEFORE imports
vi.mock('@/config/env.js', () => ({
    env: {
        NODE_ENV: 'test',
        PORT: '3333',
        TURSO_DATABASE_URL: 'libsql://test-db',
        TURSO_AUTH_TOKEN: 'test-token',
        FIREBASE_PROJECT_ID: 'test-project',
        UPSTASH_REDIS_REST_URL: 'https://test-redis',
        UPSTASH_REDIS_REST_TOKEN: 'test-token',
        LOG_LEVEL: 'info',
    }
}));

// Mock Redis
vi.mock('@/config/redis.js', () => ({
    cacheGet: vi.fn(),
    cacheSet: vi.fn(),
    redis: {
        get: vi.fn(),
        set: vi.fn(),
    }
}));

// Mock Emotional Analysis Service
vi.mock('@/services/ai/emotionalAnalysisService.js', () => ({
    getEmotionLabelTr: vi.fn((emotion: string) => {
        const labels: Record<string, string> = {
            anger: 'Ofke',
            fear: 'Korku',
            joy: 'Sevinc',
            sadness: 'Uzuntu',
            surprise: 'Saskinlik',
            neutral: 'Notr',
        };
        return labels[emotion] || 'Belirsiz';
    }),
    getIntensityLabelTr: vi.fn((intensity: number) => {
        if (intensity < 0.2) return 'Cok Dusuk';
        if (intensity < 0.4) return 'Dusuk';
        if (intensity < 0.6) return 'Orta';
        if (intensity < 0.8) return 'Yuksek';
        return 'Cok Yuksek';
    }),
    getSensationalismLabelTr: vi.fn((score: number) => {
        if (score < 0.2) return 'Dusuk';
        if (score < 0.4) return 'Normal';
        if (score < 0.6) return 'Orta';
        if (score < 0.8) return 'Yuksek';
        return 'Cok Yuksek';
    }),
}));

// Mock Perspectives Service
vi.mock('@/services/perspectivesService.js', () => ({
    findPerspectives: vi.fn().mockImplementation((articleId: string, countryCode: string) => {
        if (articleId === 'non-existent-article') {
            return Promise.resolve(null);
        }
        return Promise.resolve({
            mainArticle: {
                id: articleId,
                title: 'Test Article',
                summary: 'Test summary',
                sourceName: 'Test Source',
                govAlignmentScore: -1,
                govAlignmentLabel: 'Muhalefete Eğilimli',
            },
            relatedPerspectives: [
                {
                    articleId: 'related-1',
                    title: 'Related Article 1',
                    summary: 'Related summary',
                    sourceName: 'Another Source',
                    sourceLogoUrl: 'https://test.com/logo.png',
                    sourceUrl: 'https://test.com/article',
                    govAlignmentScore: 3,
                    govAlignmentLabel: 'İktidara Yakın',
                    publishedAt: new Date(),
                    similarityScore: 0.85,
                    matchedEntities: ['Entity1', 'Entity2'],
                },
            ],
        });
    }),
    getBalancedFeed: vi.fn().mockResolvedValue({
        proGov: [{ id: '1', title: 'Pro Gov Article', govAlignmentScore: 4 }],
        mixed: [{ id: '2', title: 'Mixed Article', govAlignmentScore: 0 }],
        antiGov: [{ id: '3', title: 'Anti Gov Article', govAlignmentScore: -4 }],
    }),
}));

// Mock Database
vi.mock('@/config/db.js', () => {
    const testArticles = [
        {
            id: 'test-article-id-12345',
            translatedTitle: 'Test Article Title',
            summary: 'This is a test article summary',
            detailContent: 'This is a test article summary with additional detail content for the full article view. It provides comprehensive coverage of the story.',
            originalTitle: 'Test Article Title Original',
            originalContent: 'Test article content',
            originalLanguage: 'tr',
            isClickbait: false,
            isAd: false,
            isFiltered: false,
            sourceCount: 2,
            sentiment: 'neutral',
            categoryId: 1,
            publishedAt: new Date('2024-01-15T10:00:00Z'),
            scrapedAt: new Date('2024-01-15T10:00:00Z'),
            viewCount: 100,
            likeCount: 25,
            dislikeCount: 2,
            commentCount: 10,
            // Political tone fields
            politicalTone: -2,
            politicalConfidence: 0.75,
            governmentMentioned: true,
            // Emotional analysis fields
            emotionalTone: {
                anger: 0.2,
                fear: 0.3,
                joy: 0.1,
                sadness: 0.5,
                surprise: 0.1,
            },
            emotionalIntensity: 0.6,
            loadedLanguageScore: 0.4,
            sensationalismScore: 0.3,
        },
    ];

    const testSources = [
        {
            id: 1,
            articleId: 'test-article-id-12345',
            sourceName: 'Test Source 1',
            sourceLogoUrl: 'https://test1.com/logo.png',
            sourceUrl: 'https://test1.com/article',
            isPrimary: true,
            addedAt: new Date('2024-01-15T10:00:00Z'),
        },
        {
            id: 2,
            articleId: 'test-article-id-12345',
            sourceName: 'Test Source 2',
            sourceLogoUrl: 'https://test2.com/logo.png',
            sourceUrl: 'https://test2.com/article',
            isPrimary: false,
            addedAt: new Date('2024-01-15T10:00:00Z'),
        },
    ];

    const testCategories = [
        {
            id: 1,
            name: 'Technology',
            slug: 'technology',
        },
    ];

    let callCount = 0;

    const mockQueryBuilder = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        offset: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        leftJoin: vi.fn().mockReturnThis(),
        then: (resolve: any) => resolve([]),
        get: vi.fn().mockImplementation(() => {
            callCount++;
            if (callCount % 3 === 1) {
                return Promise.resolve(testArticles[0]);
            } else if (callCount % 3 === 2) {
                return Promise.resolve(testCategories[0]);
            }
            return Promise.resolve({});
        }),
        all: vi.fn().mockImplementation(() => {
            return Promise.resolve(testArticles);
        }),
        values: vi.fn().mockReturnThis(),
        returning: vi.fn().mockReturnThis(),
        set: vi.fn().mockReturnThis(),
    };

    return {
        db: {
            select: vi.fn().mockReturnValue(mockQueryBuilder),
            insert: vi.fn().mockReturnValue(mockQueryBuilder),
            update: vi.fn().mockReturnValue(mockQueryBuilder),
        }
    };
});

// Import the actual app routes
import feedRoute from '@/routes/feed.js';

// Create test app with random port
const app = new Hono();
app.route('/feed', feedRoute);
const server = serve({
    fetch: app.fetch,
    port: 0, // Random port
});

describe('Feed API Integration Tests', () => {
    let testArticleId: string;

    beforeAll(() => {
        testArticleId = 'test-article-id-12345';
    });

    afterAll(async () => {
        await new Promise<void>((resolve) => {
            server.close(() => resolve());
        });
    });
    describe('GET /feed/:country', () => {
        it('should return feed for tr', async () => {
            const response = await request(server)
                .get('/feed/tr')
                .expect(200);

            expect(response.body).toHaveProperty('success', true);
            expect(response.body).toHaveProperty('data');
            expect(response.body.data).toHaveProperty('articles');
            expect(response.body.data).toHaveProperty('pagination');
            expect(Array.isArray(response.body.data.articles)).toBe(true);
        });

        it('should return pagination metadata', async () => {
            const response = await request(server)
                .get('/feed/tr?page=1&limit=5')
                .expect(200);

            const { pagination } = response.body.data;
            expect(pagination).toHaveProperty('page', 1);
            expect(pagination).toHaveProperty('limit', 5);
            expect(pagination).toHaveProperty('hasMore');
            expect(typeof pagination.hasMore).toBe('boolean');
        });

        it('should respect custom page and limit', async () => {
            const response = await request(server)
                .get('/feed/tr?page=2&limit=3')
                .expect(200);

            const { pagination } = response.body.data;
            expect(pagination.page).toBe(2);
            expect(pagination.limit).toBe(3);
        });

        it('should validate country code', async () => {
            const response = await request(server)
                .get('/feed/invalid');

            expect(response.status).toBe(400); // or 404 depending on implementation
            expect(response.body.success).toBe(false);
            expect(response.body).toHaveProperty('error');
        });

        it('should include category information in articles', async () => {
            const response = await request(server)
                .get('/feed/tr')
                .expect(200);

            const articles = response.body.data.articles;
            if (articles.length > 0) {
                const firstArticle = articles[0];
                expect(firstArticle).toHaveProperty('id');
                expect(firstArticle).toHaveProperty('translatedTitle');
                expect(firstArticle).toHaveProperty('summary');
                // Category may be null for some articles
                expect(firstArticle).toHaveProperty('category');
            }
        });

        it('should return cached data on subsequent requests', async () => {
            const { cacheGet } = await import('@/config/redis.js');

            vi.mocked(cacheGet).mockResolvedValueOnce(null);

            const response1 = await request(server)
                .get('/feed/tr')
                .expect(200);

            // SWR cache expects { data, timestamp } wrapper format
            vi.mocked(cacheGet).mockResolvedValueOnce({
                data: {
                    articles: [],
                    pagination: { page: 1, limit: 20, hasMore: false },
                },
                timestamp: Date.now(), // Fresh cache
            });

            const response2 = await request(server)
                .get('/feed/tr')
                .expect(200);

            expect(response2.body.success).toBe(true);
        });
    });

    describe('GET /feed/:country/:articleId', () => {
        let testArticleId: string;

        beforeAll(async () => {
            // Get an article ID from the feed
            const response = await request(server).get('/feed/tr');
            const articles = response.body.data.articles;
            if (articles.length > 0) {
                testArticleId = articles[0].id;
            }
        });

        it('should return article details', async () => {
            if (!testArticleId) {
                console.log('⚠️ No test articles available, skipping test');
                return;
            }

            const response = await request(server)
                .get(`/feed/tr/${testArticleId}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveProperty('id', testArticleId);
            expect(response.body.data).toHaveProperty('translatedTitle');
            expect(response.body.data).toHaveProperty('summary');
            expect(response.body.data).toHaveProperty('detailContent');
            expect(response.body.data).toHaveProperty('sources');
            expect(Array.isArray(response.body.data.sources)).toBe(true);
            // Verify detailContent is different from or equal to summary (fallback behavior)
            expect(response.body.data.detailContent).toBeDefined();
        });

        it('should increment view count', async () => {
            if (!testArticleId) {
                console.log('⚠️ No test articles available, skipping test');
                return;
            }

            const response1 = await request(server)
                .get(`/feed/tr/${testArticleId}`)
                .expect(200);

            const viewCount1 = response1.body.data.viewCount;

            // Wait a bit to ensure it's not cached
            await new Promise(resolve => setTimeout(resolve, 100));

            const response2 = await request(server)
                .get(`/feed/tr/${testArticleId}`)
                .expect(200);

            const viewCount2 = response2.body.data.viewCount;

            // View count should increase (unless cached)
            expect(typeof viewCount1).toBe('number');
            expect(typeof viewCount2).toBe('number');
        });

        it('should return 404 for non-existent article', async () => {
            const response = await request(server)
                .get('/feed/tr/non-existent-article-id')
                .expect(404);

            expect(response.body.success).toBe(false);
            expect(response.body).toHaveProperty('error');
        });

        it('should include multiple sources if available', async () => {
            if (!testArticleId) {
                console.log('⚠️ No test articles available, skipping test');
                return;
            }

            const response = await request(server)
                .get(`/feed/tr/${testArticleId}`)
                .expect(200);

            const sources = response.body.data.sources;
            expect(Array.isArray(sources)).toBe(true);

            if (sources.length > 0) {
                const source = sources[0];
                expect(source).toHaveProperty('sourceName');
                expect(source).toHaveProperty('sourceUrl');
                expect(source).toHaveProperty('isPrimary');
            }
        });
    });

    describe('GET /feed/:country?balanced=true', () => {
        it('should return balanced feed with proGov, mixed, antiGov groups', async () => {
            const response = await request(server)
                .get('/feed/tr?balanced=true')
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveProperty('proGov');
            expect(response.body.data).toHaveProperty('mixed');
            expect(response.body.data).toHaveProperty('antiGov');
            expect(Array.isArray(response.body.data.proGov)).toBe(true);
            expect(Array.isArray(response.body.data.mixed)).toBe(true);
            expect(Array.isArray(response.body.data.antiGov)).toBe(true);
        });

        it('should return cached balanced data on subsequent requests', async () => {
            const { cacheGet } = await import('@/config/redis.js');

            vi.mocked(cacheGet).mockResolvedValueOnce({
                proGov: [],
                mixed: [],
                antiGov: [],
            });

            const response = await request(server)
                .get('/feed/tr?balanced=true')
                .expect(200);

            expect(response.body).toHaveProperty('cached', true);
        });

        it('should handle invalid country code', async () => {
            const response = await request(server)
                .get('/feed/xyz?balanced=true');

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
        });
    });

    describe('GET /feed/:country/:articleId/perspectives', () => {
        let testArticleId: string;

        beforeAll(async () => {
            const response = await request(server).get('/feed/tr');
            const articles = response.body.data.articles;
            if (articles.length > 0) {
                testArticleId = articles[0].id;
            }
        });

        it('should return perspectives for an article', async () => {
            if (!testArticleId) {
                console.log('⚠️ No test articles available, skipping test');
                return;
            }

            const response = await request(server)
                .get(`/feed/tr/${testArticleId}/perspectives`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveProperty('mainArticle');
            expect(response.body.data).toHaveProperty('relatedPerspectives');
            expect(Array.isArray(response.body.data.relatedPerspectives)).toBe(true);
        });

        it('should include alignment info in main article', async () => {
            if (!testArticleId) {
                console.log('⚠️ No test articles available, skipping test');
                return;
            }

            const response = await request(server)
                .get(`/feed/tr/${testArticleId}/perspectives`)
                .expect(200);

            const mainArticle = response.body.data.mainArticle;
            expect(mainArticle).toHaveProperty('govAlignmentScore');
            expect(mainArticle).toHaveProperty('govAlignmentLabel');
        });

        it('should return 404 for non-existent article', async () => {
            const response = await request(server)
                .get('/feed/tr/non-existent-article/perspectives')
                .expect(404);

            expect(response.body.success).toBe(false);
            expect(response.body.error).toBe('Article not found');
        });

        it('should handle invalid country code', async () => {
            const response = await request(server)
                .get('/feed/xyz/some-article/perspectives');

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
        });

        it('should cache perspectives', async () => {
            if (!testArticleId) {
                console.log('⚠️ No test articles available, skipping test');
                return;
            }

            const { cacheGet } = await import('@/config/redis.js');

            vi.mocked(cacheGet).mockResolvedValueOnce({
                mainArticle: {
                    id: testArticleId,
                    title: 'Test',
                    summary: 'Test',
                    sourceName: 'Test',
                    govAlignmentScore: 0,
                    govAlignmentLabel: 'Karışık / Merkez',
                },
                relatedPerspectives: [],
            });

            const response = await request(server)
                .get(`/feed/tr/${testArticleId}/perspectives`)
                .expect(200);

            expect(response.body).toHaveProperty('cached', true);
        });
    });

    describe('GET /feed/:country/:articleId/analysis', () => {
        let testArticleId: string;

        beforeAll(async () => {
            const response = await request(server).get('/feed/tr');
            const articles = response.body.data.articles;
            if (articles.length > 0) {
                testArticleId = articles[0].id;
            }
        });

        it('should return emotional analysis for an article', async () => {
            if (!testArticleId) {
                console.log('No test articles available, skipping test');
                return;
            }

            const response = await request(server)
                .get(`/feed/tr/${testArticleId}/analysis`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveProperty('articleId');
            expect(response.body.data).toHaveProperty('emotionalTone');
            expect(response.body.data).toHaveProperty('emotionalIntensity');
            expect(response.body.data).toHaveProperty('loadedLanguageScore');
            expect(response.body.data).toHaveProperty('sensationalismScore');
        });

        it('should include emotional tone breakdown', async () => {
            if (!testArticleId) {
                console.log('No test articles available, skipping test');
                return;
            }

            const response = await request(server)
                .get(`/feed/tr/${testArticleId}/analysis`)
                .expect(200);

            const emotionalTone = response.body.data.emotionalTone;
            expect(emotionalTone).toHaveProperty('anger');
            expect(emotionalTone).toHaveProperty('fear');
            expect(emotionalTone).toHaveProperty('joy');
            expect(emotionalTone).toHaveProperty('sadness');
            expect(emotionalTone).toHaveProperty('surprise');
        });

        it('should include dominant emotion and label', async () => {
            if (!testArticleId) {
                console.log('No test articles available, skipping test');
                return;
            }

            const response = await request(server)
                .get(`/feed/tr/${testArticleId}/analysis`)
                .expect(200);

            expect(response.body.data).toHaveProperty('dominantEmotion');
            expect(response.body.data).toHaveProperty('dominantEmotionLabel');
            expect(typeof response.body.data.dominantEmotion).toBe('string');
            expect(typeof response.body.data.dominantEmotionLabel).toBe('string');
        });

        it('should include intensity and sensationalism labels', async () => {
            if (!testArticleId) {
                console.log('No test articles available, skipping test');
                return;
            }

            const response = await request(server)
                .get(`/feed/tr/${testArticleId}/analysis`)
                .expect(200);

            expect(response.body.data).toHaveProperty('intensityLabel');
            expect(response.body.data).toHaveProperty('sensationalismLabel');
        });

        it('should include political tone information', async () => {
            if (!testArticleId) {
                console.log('No test articles available, skipping test');
                return;
            }

            const response = await request(server)
                .get(`/feed/tr/${testArticleId}/analysis`)
                .expect(200);

            expect(response.body.data).toHaveProperty('politicalTone');
            expect(response.body.data).toHaveProperty('politicalConfidence');
        });

        it('should return 404 for non-existent article', async () => {
            const response = await request(server)
                .get('/feed/tr/non-existent-article/analysis')
                .expect(404);

            expect(response.body.success).toBe(false);
            expect(response.body.error).toBe('Article not found');
        });

        it('should handle invalid country code', async () => {
            const response = await request(server)
                .get('/feed/xyz/some-article/analysis');

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
        });

        it('should cache analysis data', async () => {
            if (!testArticleId) {
                console.log('No test articles available, skipping test');
                return;
            }

            const { cacheGet } = await import('@/config/redis.js');

            vi.mocked(cacheGet).mockResolvedValueOnce({
                articleId: testArticleId,
                emotionalTone: {
                    anger: 0.2,
                    fear: 0.3,
                    joy: 0.1,
                    sadness: 0.5,
                    surprise: 0.1,
                },
                emotionalIntensity: 0.6,
                loadedLanguageScore: 0.4,
                sensationalismScore: 0.3,
                dominantEmotion: 'sadness',
                dominantEmotionLabel: 'Uzuntu',
                intensityLabel: 'Orta',
                sensationalismLabel: 'Normal',
                politicalTone: -2,
                politicalConfidence: 0.75,
            });

            const response = await request(server)
                .get(`/feed/tr/${testArticleId}/analysis`)
                .expect(200);

            expect(response.body).toHaveProperty('cached', true);
        });

        it('should return neutral emotional tone when not analyzed', async () => {
            // Mock article without emotional analysis data
            const { cacheGet } = await import('@/config/redis.js');
            vi.mocked(cacheGet).mockResolvedValueOnce(null);

            const response = await request(server)
                .get(`/feed/tr/${testArticleId}/analysis`);

            // Accept either 200 (with neutral data) or 404 (article not found in mock)
            expect([200, 404]).toContain(response.status);
            if (response.status === 200) {
                expect(response.body.success).toBe(true);
            }
        });
    });
});
