import { db } from '../src/config/db.js';
import { users } from '../src/db/schema/index.js';
import { eq } from 'drizzle-orm';

const email = process.argv[2];

if (!email) {
    console.error('Usage: npx tsx scripts/make-admin.ts <EMAIL>');
    process.exit(1);
}

async function makeAdmin() {
    console.log(`Looking for user with email: ${email}...\n`);

    const user = await db.select().from(users).where(eq(users.email, email)).get();

    if (!user) {
        console.error(`❌ Error: User with email "${email}" not found in database.`);
        console.log('\nAvailable users:');
        const allUsers = await db.select({ email: users.email, name: users.name }).from(users);
        allUsers.forEach(u => console.log(`  - ${u.name} (${u.email})`));
        process.exit(1);
    }

    console.log(`Found user: ${user.name} (${user.email})`);
    console.log(`Current role: ${user.userRole}\n`);

    if (user.userRole === 'admin') {
        console.log('✅ User is already an admin!');
        process.exit(0);
    }

    await db.update(users)
        .set({ userRole: 'admin', updatedAt: new Date() })
        .where(eq(users.id, user.id));

    console.log(`✅ Successfully promoted ${user.name} to admin!`);
    process.exit(0);
}

makeAdmin().catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
