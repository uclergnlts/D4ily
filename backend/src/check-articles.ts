import { db } from './config/db.js';
import { tr_articles, tr_article_sources } from './db/schema/index.js';
import { sql } from 'drizzle-orm';

async function checkArticles() {
    console.log('Checking articles...');

    const articles = await db.select().from(tr_articles).limit(5);

    for (const article of articles) {
        console.log(`Article: ${article.originalTitle} (Sources: ${article.sourceCount})`);

        const sources = await db
            .select()
            .from(tr_article_sources)
            .where(sql`article_id = ${article.id}`);

        console.log('Sources found:', sources.length);
        sources.forEach(s => console.log(`- ${s.sourceName}: ${s.sourceUrl}`));
    }
}

checkArticles();
