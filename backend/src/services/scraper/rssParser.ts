import xml2js from 'xml2js';
import { logger } from '../../config/logger.js';
import { sanitizeUrl } from '../../utils/sanitize.js';

export interface RSSItem {
    title: string;
    link: string;
    description?: string;
    content?: string;
    pubDate?: string;
    guid?: string;
    imageUrl?: string;
}

export interface RSSFeed {
    items: RSSItem[];
    title: string;
    description?: string;
}

export async function parseRSSFeed(url: string): Promise<RSSFeed> {
    try {
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; NewsAggregator/1.0)',
            },
            redirect: 'follow',
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const xmlText = await response.text();
        const parser = new xml2js.Parser({
            explicitArray: false,
            ignoreAttrs: false,
        });

        const result = await parser.parseStringPromise(xmlText);

        // Support both RSS 2.0 and Atom feeds
        let items: RSSItem[] = [];
        let feedTitle = '';
        let feedDescription = '';

        if (result.rss?.channel) {
            // RSS 2.0
            const channel = result.rss.channel;
            feedTitle = channel.title || '';
            feedDescription = channel.description || '';

            const rawItems = Array.isArray(channel.item) ? channel.item : [channel.item];
            items = rawItems.filter(Boolean).map((item: any) => {
                // Try to find image
                let imageUrl = '';
                if (item['media:content'] && item['media:content'].$ && item['media:content'].$.url) {
                    imageUrl = item['media:content'].$.url; // Standard media:content
                } else if (Array.isArray(item['media:content'])) {
                    imageUrl = item['media:content'][0]?.$.url;
                } else if (item['enclosure'] && item['enclosure'].$ && item['enclosure'].$.url && item['enclosure'].$.type?.startsWith('image')) {
                    imageUrl = item['enclosure'].$.url; // Standard enclosure
                } else if (item['media:thumbnail'] && item['media:thumbnail'].$ && item['media:thumbnail'].$.url) {
                    imageUrl = item['media:thumbnail'].$.url;
                } else if (item['image'] && item['image'].$ && item.image.url) { // Some feeds use <image>
                    imageUrl = item.image.url;
                }

                // Fallback: Try identifying image in description HTML
                if (!imageUrl && item.description) {
                    const imgMatch = item.description.match(/<img[^>]+src="([^">]+)"/);
                    if (imgMatch) {
                        imageUrl = sanitizeUrl(imgMatch[1]);
                    }
                }

                return {
                    title: item.title || '',
                    link: sanitizeUrl(item.link) || '',
                    description: item.description || '',
                    content: item['content:encoded'] || item.description || '',
                    pubDate: item.pubDate || '',
                    guid: item.guid?._text || item.guid || item.link || '',
                    imageUrl: imageUrl || undefined,
                };
            });
        } else if (result.feed?.entry) {
            // Atom
            feedTitle = typeof result.feed.title === 'object' ? result.feed.title._ || result.feed.title : result.feed.title || '';
            feedDescription = typeof result.feed.subtitle === 'object' ? result.feed.subtitle._ || '' : result.feed.subtitle || '';

            const rawEntries = Array.isArray(result.feed.entry) ? result.feed.entry : [result.feed.entry];
            items = rawEntries.filter(Boolean).map((entry: any) => {
                // Extract text from xml2js objects ({_: "text", $: {type: ...}})
                const getText = (v: any): string => {
                    if (!v) return '';
                    if (typeof v === 'string') return v;
                    if (typeof v === 'object') return v._ || v._text || '';
                    return String(v);
                };

                // Extract link href from Atom entry
                let entryLink = '';
                if (Array.isArray(entry.link)) {
                    const altLink = entry.link.find((l: any) => l.$?.rel === 'alternate');
                    entryLink = altLink?.$.href || entry.link[0]?.$.href || '';
                } else if (entry.link?.$?.href) {
                    entryLink = entry.link.$.href;
                } else if (typeof entry.link === 'string') {
                    entryLink = entry.link;
                }

                let imageUrl = '';
                // Atom: enclosure link or enclosure element
                if (Array.isArray(entry.link)) {
                    const imgLink = entry.link.find((l: any) => l.$?.rel === 'enclosure' && l.$?.type?.startsWith('image'));
                    if (imgLink) imageUrl = imgLink.$.href;
                } else if (entry.link?.$?.rel === 'enclosure' && entry.link?.$?.type?.startsWith('image')) {
                    imageUrl = entry.link.$.href;
                }
                // enclosure element (NTV-style)
                if (!imageUrl && entry.enclosure?.$?.url) {
                    imageUrl = entry.enclosure.$.url;
                }

                // Fallback: content HTML
                const contentStr = getText(entry.content);
                const summaryStr = getText(entry.summary);
                if (!imageUrl && (contentStr || summaryStr)) {
                    const html = contentStr || summaryStr;
                    const imgMatch = html.match(/<img[^>]+src="([^">]+)"/);
                    if (imgMatch) imageUrl = imgMatch[1];
                }

                const titleStr = getText(entry.title);

                return {
                    title: titleStr,
                    link: sanitizeUrl(entryLink) || '',
                    description: summaryStr,
                    content: contentStr || summaryStr,
                    pubDate: entry.published || entry.updated || '',
                    guid: entry.id || entryLink || '',
                    imageUrl: imageUrl || undefined,
                };
            });
        }

        logger.info({ url, itemCount: items.length }, 'RSS feed parsed successfully');

        return {
            items,
            title: feedTitle,
            description: feedDescription,
        };
    } catch (error) {
        logger.error({ url, error }, 'Failed to parse RSS feed');
        throw error;
    }
}
