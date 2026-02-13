import { db } from '../../config/db.js';
import { logger } from '../../config/logger.js';
import { twitter_accounts } from '../../db/schema/index.js';
import {
    tr_tweets, de_tweets, us_tweets, uk_tweets,
    fr_tweets, es_tweets, it_tweets, ru_tweets,
} from '../../db/schema/index.js';
import { eq, sql } from 'drizzle-orm';

const TWITTER_API_BASE = 'https://api.twitterapi.io';
const TWITTER_API_KEY = process.env.TWITTER_API_KEY;
const DELAY_BETWEEN_ACCOUNTS_MS = 200;
const MAX_RETRIES = 3;

const COUNTRY_TWEET_TABLES = {
    tr: tr_tweets,
    de: de_tweets,
    us: us_tweets,
    uk: uk_tweets,
    fr: fr_tweets,
    es: es_tweets,
    it: it_tweets,
    ru: ru_tweets,
} as const;

type CountryCode = keyof typeof COUNTRY_TWEET_TABLES;

interface TwitterApiTweet {
    id: string;
    text: string;
    createdAt: string;
    lang: string;
    likeCount: number;
    retweetCount: number;
    replyCount: number;
    viewCount: number;
    author: {
        userName: string;
        name: string;
    };
}

interface TwitterApiResponse {
    tweets: TwitterApiTweet[];
    has_next_page: boolean;
    next_cursor: string;
    status: string;
}

async function fetchWithRetry(url: string, retries = MAX_RETRIES): Promise<Response> {
    for (let attempt = 1; attempt <= retries; attempt++) {
        const response = await fetch(url, {
            headers: { 'X-API-Key': TWITTER_API_KEY! },
        });

        if (response.ok) return response;

        if (response.status === 429 && attempt < retries) {
            const delay = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s
            logger.warn({ attempt, delay, url }, 'Twitter API rate limited, retrying');
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
        }

        throw new Error(`Twitter API error: ${response.status} ${response.statusText}`);
    }
    throw new Error('Max retries exceeded');
}

async function fetchUserTweets(userName: string): Promise<TwitterApiTweet[]> {
    const url = `${TWITTER_API_BASE}/twitter/user/last_tweets?userName=${encodeURIComponent(userName)}`;
    const response = await fetchWithRetry(url);
    const data: TwitterApiResponse = await response.json();

    if (data.status !== 'success' || !data.tweets) {
        logger.warn({ userName, status: data.status }, 'Twitter API returned non-success');
        return [];
    }

    return data.tweets;
}

async function scrapeTwitterAccount(
    account: { id: number; userName: string; displayName: string },
    countryCode: CountryCode
): Promise<{ fetched: number; duplicates: number }> {
    const table = COUNTRY_TWEET_TABLES[countryCode];
    let fetched = 0;
    let duplicates = 0;

    const tweets = await fetchUserTweets(account.userName);

    for (const tweet of tweets) {
        if (!tweet.id || !tweet.text) continue;

        const tweetedAt = tweet.createdAt ? new Date(tweet.createdAt) : new Date();

        // Use INSERT OR IGNORE for idempotent inserts (tweet.id is primary key)
        const tableName = `${countryCode}_tweets`;
        const result = await db.run(sql`
            INSERT OR IGNORE INTO ${sql.raw(tableName)}
            (id, account_id, user_name, display_name, text, lang, like_count, retweet_count, reply_count, view_count, tweeted_at, fetched_at, used_in_digest)
            VALUES (
                ${tweet.id},
                ${account.id},
                ${tweet.author?.userName || account.userName},
                ${tweet.author?.name || account.displayName},
                ${tweet.text},
                ${tweet.lang || null},
                ${tweet.likeCount || 0},
                ${tweet.retweetCount || 0},
                ${tweet.replyCount || 0},
                ${tweet.viewCount || 0},
                ${Math.floor(tweetedAt.getTime() / 1000)},
                unixepoch(),
                0
            )
        `);

        if (result.rowsAffected > 0) {
            fetched++;
        } else {
            duplicates++;
        }
    }

    // Update lastFetchedAt
    await db
        .update(twitter_accounts)
        .set({ lastFetchedAt: new Date() })
        .where(eq(twitter_accounts.id, account.id));

    return { fetched, duplicates };
}

export async function scrapeAllTwitterAccounts(): Promise<void> {
    if (!TWITTER_API_KEY) {
        logger.warn('TWITTER_API_KEY not set, skipping tweet scraping');
        return;
    }

    try {
        const accounts = await db
            .select()
            .from(twitter_accounts)
            .where(eq(twitter_accounts.isActive, true));

        if (accounts.length === 0) {
            logger.info('No active Twitter accounts to scrape');
            return;
        }

        logger.info({ accountCount: accounts.length }, 'Starting Twitter scraping');

        let totalFetched = 0;
        let totalDuplicates = 0;
        let failures = 0;

        for (const account of accounts) {
            try {
                const countryCode = account.countryCode as CountryCode;
                if (!(countryCode in COUNTRY_TWEET_TABLES)) {
                    logger.warn({ countryCode, userName: account.userName }, 'Unknown country code for tweet account');
                    continue;
                }

                const result = await scrapeTwitterAccount(
                    { id: account.id, userName: account.userName, displayName: account.displayName },
                    countryCode
                );

                totalFetched += result.fetched;
                totalDuplicates += result.duplicates;

                logger.info({
                    userName: account.userName,
                    countryCode,
                    fetched: result.fetched,
                    duplicates: result.duplicates,
                }, 'Twitter account scraped');

                // Delay between accounts
                await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_ACCOUNTS_MS));
            } catch (error) {
                failures++;
                logger.error({ error, userName: account.userName }, 'Failed to scrape Twitter account');
            }
        }

        logger.info({ totalFetched, totalDuplicates, failures }, 'Twitter scraping cycle completed');
    } catch (error) {
        logger.error({ error }, 'Twitter scraping cycle failed');
    }
}
