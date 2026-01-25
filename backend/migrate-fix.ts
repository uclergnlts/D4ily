import 'dotenv/config';
import { execSync } from 'child_process';

console.log('Running drizzle-kit push:sqlite...');
try {
    execSync('npx drizzle-kit push:sqlite', { stdio: 'inherit', env: process.env });
    console.log('Migration completed.');
} catch (e) {
    console.error('Migration failed', e);
}
