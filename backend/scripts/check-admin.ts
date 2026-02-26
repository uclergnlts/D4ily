import { db } from '../src/config/db.js';
import { users } from '../src/db/schema/index.js';
import { eq } from 'drizzle-orm';

async function checkAdminUsers() {
    console.log('Checking for admin users in database...\n');

    const allUsers = await db.select().from(users);

    console.log(`Total users in database: ${allUsers.length}\n`);

    const adminUsers = allUsers.filter(u => u.userRole === 'admin');

    if (adminUsers.length === 0) {
        console.log('⚠️  WARNING: No admin users found in database!');
        console.log('You need to have at least one admin user to access the admin panel.\n');
        console.log('To make a user an admin, run:');
        console.log('  npm run db:admin <USER_EMAIL>\n');
    } else {
        console.log(`✅ Found ${adminUsers.length} admin user(s):\n`);
        adminUsers.forEach(user => {
            console.log(`  - ${user.name} (${user.email})`);
            console.log(`    ID: ${user.id}`);
            console.log(`    Role: ${user.userRole}`);
            console.log();
        });
    }

    // Show all users for reference
    if (allUsers.length > 0) {
        console.log('All users in database:');
        allUsers.forEach(user => {
            console.log(`  - ${user.name} (${user.email}) - Role: ${user.userRole}`);
        });
    }

    process.exit(0);
}

checkAdminUsers().catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
