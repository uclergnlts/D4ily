import xml2js from 'xml2js';
import { logger } from '../../config/logger.js';

export interface RSSItem {
    title: string;
    link: string;
    description?: string;
    content?: string;
    pubDate?: string;
    guid?: string;
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
                'User-Agent': 'NewsAggregator/1.0',
            },
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
            items = rawItems.filter(Boolean).map((item: any) => ({
                title: item.title || '',
                link: item.link || '',
                description: item.description || '',
                content: item['content:encoded'] || item.description || '',
                pubDate: item.pubDate || '',
                guid: item.guid?._text || item.guid || item.link || '',
            }));
        } else if (result.feed?.entry) {
            // Atom
            feedTitle = result.feed.title || '';
            feedDescription = result.feed.subtitle || '';

            const rawEntries = Array.isArray(result.feed.entry) ? result.feed.entry : [result.feed.entry];
            items = rawEntries.filter(Boolean).map((entry: any) => ({
                title: entry.title || '',
                link: entry.link?.$.href || entry.link || '',
                description: entry.summary || '',
                content: entry.content?._text || entry.summary || '',
                pubDate: entry.published || entry.updated || '',
                guid: entry.id || entry.link || '',
            }));
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
