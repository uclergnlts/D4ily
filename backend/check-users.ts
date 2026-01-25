import { db } from './src/config/db.js';
import { users } from './src/db/schema/index.js';
import { desc } from 'drizzle-orm';

async function checkUsers() {
    console.log('Checking recent users in database...');
    try {
        const recentUsers = await db.select().from(users).orderBy(desc(users.createdAt)).limit(3);
        console.log('Found users:', recentUsers.length);
        recentUsers.forEach(u => {
            console.log(`- ${u.name} (${u.email}) [Role: ${u.userRole}]`);
        });
    } catch (error) {
        console.error('DB Check Failed:', error);
    }
}

checkUsers();
