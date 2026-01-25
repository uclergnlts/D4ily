
import 'dotenv/config';
import { db } from '../src/config/db.js';
import { rss_sources } from '../src/db/schema/index.js';
import { eq } from 'drizzle-orm';

const updates = [
    { id: 1, logo: 'https://logo.clearbit.com/hurriyet.com.tr' },
    { id: 2, logo: 'https://logo.clearbit.com/sozcu.com.tr' },
    { id: 3, logo: 'https://logo.clearbit.com/ntv.com.tr' },
    { id: 4, logo: 'https://logo.clearbit.com/sabah.com.tr' },
    { id: 5, logo: 'https://logo.clearbit.com/cumhuriyet.com.tr' },
    { id: 6, logo: 'https://logo.clearbit.com/trthaber.com' },
    { id: 7, logo: 'https://logo.clearbit.com/cnnturk.com' },
    { id: 8, logo: 'https://logo.clearbit.com/milliyet.com.tr' },
    { id: 9, logo: 'https://logo.clearbit.com/spiegel.de' },
    { id: 10, logo: 'https://logo.clearbit.com/bild.de' },
    { id: 11, logo: 'https://logo.clearbit.com/cnn.com' },
    { id: 12, logo: 'https://logo.clearbit.com/reuters.com' },
    { id: 13, logo: 'https://logo.clearbit.com/theguardian.com' },
];

async function main() {
    console.log('🔄 Updating source logos...');

    for (const update of updates) {
        await db.update(rss_sources)
            .set({ sourceLogoUrl: update.logo })
            .where(eq(rss_sources.id, update.id));
        console.log(`✅ Updated source ${update.id}`);
    }

    console.log('🎉 Logos updated successfully!');
    process.exit(0);
}

main().catch(console.error);
