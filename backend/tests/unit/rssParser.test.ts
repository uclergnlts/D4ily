import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/config/logger.js', () => ({
    logger: {
        info: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
    },
}));

vi.mock('@/utils/sanitize.js', () => ({
    sanitizeUrl: vi.fn((url: string) => url ?? ''),
}));

// Mock global fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

import { parseRSSFeed } from '@/services/scraper/rssParser.js';

const RSS_2_XML = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:media="http://search.yahoo.com/mrss/">
  <channel>
    <title>Test News Feed</title>
    <description>A test RSS feed</description>
    <item>
      <title>Breaking News</title>
      <link>https://example.com/news/1</link>
      <description>News description here.</description>
      <pubDate>Mon, 10 Feb 2026 09:00:00 +0000</pubDate>
      <guid>https://example.com/news/1</guid>
      <media:content url="https://example.com/img/1.jpg" medium="image"/>
    </item>
    <item>
      <title>Second Story</title>
      <link>https://example.com/news/2</link>
      <description>Second description.</description>
      <pubDate>Mon, 10 Feb 2026 10:00:00 +0000</pubDate>
    </item>
  </channel>
</rss>`;

const ATOM_XML = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>Atom Test Feed</title>
  <subtitle>Test subtitle</subtitle>
  <entry>
    <id>https://example.com/atom/1</id>
    <title>Atom Entry 1</title>
    <link href="https://example.com/atom/1"/>
    <published>2026-02-10T09:00:00Z</published>
    <summary>Atom summary here.</summary>
  </entry>
</feed>`;

const RSS_WITH_ENCLOSURE = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Feed with Enclosure</title>
    <item>
      <title>Image Story</title>
      <link>https://example.com/3</link>
      <enclosure url="https://example.com/photo.jpg" type="image/jpeg"/>
      <description>Story with enclosure image.</description>
    </item>
  </channel>
</rss>`;

const RSS_WITH_IMG_IN_DESC = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Feed with img in desc</title>
    <item>
      <title>Img Story</title>
      <link>https://example.com/4</link>
      <description><![CDATA[<p><img src="https://example.com/inline.jpg" />Story text.</p>]]></description>
    </item>
  </channel>
</rss>`;

function makeResponse(body: string, ok = true, status = 200) {
    return {
        ok,
        status,
        statusText: ok ? 'OK' : 'Not Found',
        text: async () => body,
    } as Response;
}

describe('parseRSSFeed', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('RSS 2.0', () => {
        it('should parse a valid RSS 2.0 feed', async () => {
            mockFetch.mockResolvedValue(makeResponse(RSS_2_XML));
            const feed = await parseRSSFeed('https://example.com/rss');

            expect(feed.title).toBe('Test News Feed');
            expect(feed.description).toBe('A test RSS feed');
            expect(feed.items).toHaveLength(2);
        });

        it('should parse item fields correctly', async () => {
            mockFetch.mockResolvedValue(makeResponse(RSS_2_XML));
            const feed = await parseRSSFeed('https://example.com/rss');

            const item = feed.items[0];
            expect(item.title).toBe('Breaking News');
            expect(item.link).toBe('https://example.com/news/1');
            expect(item.pubDate).toBeTruthy();
        });

        it('should extract media:content image URL', async () => {
            mockFetch.mockResolvedValue(makeResponse(RSS_2_XML));
            const feed = await parseRSSFeed('https://example.com/rss');

            expect(feed.items[0].imageUrl).toBe('https://example.com/img/1.jpg');
        });

        it('should extract enclosure image URL', async () => {
            mockFetch.mockResolvedValue(makeResponse(RSS_WITH_ENCLOSURE));
            const feed = await parseRSSFeed('https://example.com/rss');

            expect(feed.items[0].imageUrl).toBe('https://example.com/photo.jpg');
        });

        it('should fall back to img tag in description', async () => {
            mockFetch.mockResolvedValue(makeResponse(RSS_WITH_IMG_IN_DESC));
            const feed = await parseRSSFeed('https://example.com/rss');

            expect(feed.items[0].imageUrl).toBe('https://example.com/inline.jpg');
        });
    });

    describe('Atom feed', () => {
        it('should parse a valid Atom feed', async () => {
            mockFetch.mockResolvedValue(makeResponse(ATOM_XML));
            const feed = await parseRSSFeed('https://example.com/atom');

            expect(feed.title).toBe('Atom Test Feed');
            expect(feed.items).toHaveLength(1);
        });

        it('should parse Atom entry fields', async () => {
            mockFetch.mockResolvedValue(makeResponse(ATOM_XML));
            const feed = await parseRSSFeed('https://example.com/atom');

            const item = feed.items[0];
            expect(item.title).toBe('Atom Entry 1');
            expect(item.pubDate).toBeTruthy();
            expect(item.description).toBe('Atom summary here.');
        });
    });

    describe('error handling', () => {
        it('should throw on HTTP error response', async () => {
            mockFetch.mockResolvedValue(makeResponse('', false, 404));
            await expect(parseRSSFeed('https://example.com/rss')).rejects.toThrow('HTTP 404');
        });

        it('should throw on network error', async () => {
            mockFetch.mockRejectedValue(new Error('Network Error'));
            await expect(parseRSSFeed('https://example.com/rss')).rejects.toThrow('Network Error');
        });

        it('should throw on invalid XML', async () => {
            mockFetch.mockResolvedValue(makeResponse('not valid xml <<<'));
            await expect(parseRSSFeed('https://example.com/rss')).rejects.toThrow();
        });

        it('should send correct User-Agent header', async () => {
            mockFetch.mockResolvedValue(makeResponse(RSS_2_XML));
            await parseRSSFeed('https://example.com/rss');

            expect(mockFetch).toHaveBeenCalledWith(
                'https://example.com/rss',
                expect.objectContaining({
                    headers: expect.objectContaining({
                        'User-Agent': 'NewsAggregator/1.0',
                    }),
                })
            );
        });
    });
});
