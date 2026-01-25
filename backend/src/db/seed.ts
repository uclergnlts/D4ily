import 'dotenv/config';
import { db } from '../config/db.js';
import { categories, rss_sources } from '../db/schema/index.js';

async function seed() {
    console.log('🌱 Seeding database...');

    // Insert categories (skip if already exists)
    await db.insert(categories).values([
        { id: 1, name: 'Politika', slug: 'politika', icon: '🏛️', color: '#3B82F6' },
        { id: 2, name: 'Ekonomi', slug: 'ekonomi', icon: '💰', color: '#10B981' },
        { id: 3, name: 'Spor', slug: 'spor', icon: '⚽', color: '#F59E0B' },
        { id: 4, name: 'Teknoloji', slug: 'teknoloji', icon: '💻', color: '#8B5CF6' },
        { id: 5, name: 'Sağlık', slug: 'saglik', icon: '🏥', color: '#EF4444' },
        { id: 6, name: 'Bilim', slug: 'bilim', icon: '🔬', color: '#06B6D4' },
        { id: 7, name: 'Kültür', slug: 'kultur', icon: '🎭', color: '#EC4899' },
        { id: 8, name: 'Dünya', slug: 'dunya', icon: '🌍', color: '#14B8A6' },
    ]).onConflictDoNothing();
    console.log('✅ Categories seeded (or already exist)');

    // Insert RSS sources with government alignment data for Turkish sources (skip if already exists)
    await db.insert(rss_sources).values([
        // Turkey - with government alignment scores
        {
            id: 1,
            countryCode: 'tr',
            sourceName: 'Hürriyet',
            sourceLogoUrl: 'https://via.placeholder.com/100x100?text=Hurriyet',
            rssUrl: 'https://www.hurriyet.com.tr/rss/anasayfa',
            isActive: true,
            biasScoreSystem: 5.5,
            govAlignmentScore: -1,
            govAlignmentLabel: 'Muhalefete Eğilimli',
            govAlignmentConfidence: 0.72,
            govAlignmentNotes: 'DYH grubu, editoryal çizgide iktidar politikalarına eleştirel vurgular daha sık.',
            govAlignmentLastUpdated: new Date(),
        },
        {
            id: 2,
            countryCode: 'tr',
            sourceName: 'Sözcü',
            sourceLogoUrl: 'https://via.placeholder.com/100x100?text=Sozcu',
            rssUrl: 'https://www.sozcu.com.tr/feed/',
            isActive: true,
            biasScoreSystem: 4.0,
            govAlignmentScore: -4,
            govAlignmentLabel: 'Muhalefete Yakın',
            govAlignmentConfidence: 0.85,
            govAlignmentNotes: 'Güçlü muhalefet yanlısı editoryal çizgi.',
            govAlignmentLastUpdated: new Date(),
        },
        {
            id: 3,
            countryCode: 'tr',
            sourceName: 'NTV',
            sourceLogoUrl: 'https://via.placeholder.com/100x100?text=NTV',
            rssUrl: 'https://www.ntv.com.tr/gundem.rss',
            isActive: true,
            biasScoreSystem: 6.5,
            govAlignmentScore: 0,
            govAlignmentLabel: 'Karışık / Merkez',
            govAlignmentConfidence: 0.68,
            govAlignmentNotes: 'Görece dengeli yayın politikası.',
            govAlignmentLastUpdated: new Date(),
        },
        {
            id: 4,
            countryCode: 'tr',
            sourceName: 'Sabah',
            sourceLogoUrl: 'https://via.placeholder.com/100x100?text=Sabah',
            rssUrl: 'https://www.sabah.com.tr/rss/anasayfa.xml',
            isActive: true,
            biasScoreSystem: 3.0,
            govAlignmentScore: 4,
            govAlignmentLabel: 'İktidara Yakın',
            govAlignmentConfidence: 0.88,
            govAlignmentNotes: 'Turkuaz medya grubu, iktidar yanlısı editoryal çizgi.',
            govAlignmentLastUpdated: new Date(),
        },
        {
            id: 5,
            countryCode: 'tr',
            sourceName: 'Cumhuriyet',
            sourceLogoUrl: 'https://via.placeholder.com/100x100?text=Cumhuriyet',
            rssUrl: 'https://www.cumhuriyet.com.tr/rss',
            isActive: true,
            biasScoreSystem: 4.0,
            govAlignmentScore: -4,
            govAlignmentLabel: 'Muhalefete Yakın',
            govAlignmentConfidence: 0.90,
            govAlignmentNotes: 'Sol/laik çizgi, güçlü muhalefet yanlısı.',
            govAlignmentLastUpdated: new Date(),
        },
        {
            id: 6,
            countryCode: 'tr',
            sourceName: 'TRT Haber',
            sourceLogoUrl: 'https://via.placeholder.com/100x100?text=TRT',
            rssUrl: 'https://www.trthaber.com/sondakika.rss',
            isActive: true,
            biasScoreSystem: 5.0,
            govAlignmentScore: 4,
            govAlignmentLabel: 'İktidara Yakın',
            govAlignmentConfidence: 0.95,
            govAlignmentNotes: 'Resmi yayın kuruluşu.',
            govAlignmentLastUpdated: new Date(),
        },
        {
            id: 7,
            countryCode: 'tr',
            sourceName: 'CNN Türk',
            sourceLogoUrl: 'https://via.placeholder.com/100x100?text=CNNTurk',
            rssUrl: 'https://www.cnnturk.com/feed/rss/all/news',
            isActive: true,
            biasScoreSystem: 5.5,
            govAlignmentScore: 1,
            govAlignmentLabel: 'İktidara Eğilimli',
            govAlignmentConfidence: 0.70,
            govAlignmentNotes: 'Demirören medya grubu, merkez-sağ çizgi.',
            govAlignmentLastUpdated: new Date(),
        },
        {
            id: 8,
            countryCode: 'tr',
            sourceName: 'Milliyet',
            sourceLogoUrl: 'https://via.placeholder.com/100x100?text=Milliyet',
            rssUrl: 'https://www.milliyet.com.tr/rss/rssNew/gundemRss.xml',
            isActive: true,
            biasScoreSystem: 5.5,
            govAlignmentScore: 1,
            govAlignmentLabel: 'İktidara Eğilimli',
            govAlignmentConfidence: 0.72,
            govAlignmentNotes: 'Demirören medya grubu.',
            govAlignmentLastUpdated: new Date(),
        },

        // Germany (no alignment scores yet)
        {
            id: 9,
            countryCode: 'de',
            sourceName: 'Der Spiegel',
            sourceLogoUrl: 'https://via.placeholder.com/100x100?text=Spiegel',
            rssUrl: 'https://www.spiegel.de/schlagzeilen/index.rss',
            isActive: true,
            biasScoreSystem: 7.0,
            govAlignmentScore: 0,
            govAlignmentConfidence: 0.5,
        },
        {
            id: 10,
            countryCode: 'de',
            sourceName: 'Bild',
            sourceLogoUrl: 'https://via.placeholder.com/100x100?text=Bild',
            rssUrl: 'https://www.bild.de/rssfeeds/vw-alles/vw-alles-26970192,sort=1,view=rss2.bild.xml',
            isActive: true,
            biasScoreSystem: 4.5,
            govAlignmentScore: 0,
            govAlignmentConfidence: 0.5,
        },

        // USA (no alignment scores yet)
        {
            id: 11,
            countryCode: 'us',
            sourceName: 'CNN',
            sourceLogoUrl: 'https://via.placeholder.com/100x100?text=CNN',
            rssUrl: 'http://rss.cnn.com/rss/edition.rss',
            isActive: true,
            biasScoreSystem: 5.0,
            govAlignmentScore: 0,
            govAlignmentConfidence: 0.5,
        },
        {
            id: 12,
            countryCode: 'us',
            sourceName: 'Reuters',
            sourceLogoUrl: 'https://via.placeholder.com/100x100?text=Reuters',
            rssUrl: 'https://www.reutersagency.com/feed/',
            isActive: true,
            biasScoreSystem: 8.0,
            govAlignmentScore: 0,
            govAlignmentConfidence: 0.5,
        },
        {
            id: 13,
            countryCode: 'us',
            sourceName: 'The Guardian',
            sourceLogoUrl: 'https://via.placeholder.com/100x100?text=Guardian',
            rssUrl: 'https://www.theguardian.com/world/rss',
            isActive: true,
            biasScoreSystem: 6.0,
            govAlignmentScore: 0,
            govAlignmentConfidence: 0.5,
        },
    ]).onConflictDoNothing();
    console.log('✅ RSS sources seeded (or already exist)');

    console.log('🎉 Seeding completed!');
}

seed()
    .catch((error) => {
        console.error('❌ Seeding failed:', error);
        process.exit(1);
    })
    .then(() => {
        process.exit(0);
    });
