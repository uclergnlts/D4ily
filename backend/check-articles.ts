import 'dotenv/config';
import { db } from './src/config/db.js';
import { tr_articles } from './src/db/schema/index.js';
import { desc } from 'drizzle-orm';

async function check() {
    const articles = await db
        .select()
        .from(tr_articles)
        .orderBy(desc(tr_articles.scrapedAt))
        .limit(5);

    console.log('\n📰 Son 5 Haber:\n');

    for (const a of articles) {
        console.log(`📌 ${a.originalTitle?.substring(0, 60)}...`);
        console.log(`   Çeviri: ${a.translatedTitle?.substring(0, 60)}...`);
        console.log(`   Özet: ${a.summary?.substring(0, 80)}...`);
        console.log(`   Duygusal Analiz: ${a.emotionalTone ? '✅ VAR' : '❌ YOK'}`);
        console.log(`   Sensasyonalizm: ${a.sensationalismScore ?? 'null'}`);
        console.log(`   Siyasi Ton: ${a.politicalTone} (Güven: ${a.politicalConfidence})`);
        console.log('');
    }

    process.exit(0);
}

check();
