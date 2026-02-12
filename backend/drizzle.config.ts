import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

const url = process.env.TURSO_DATABASE_URL || 'file:local.db';
const isLocal = url.startsWith('file:');

export default defineConfig({
    schema: './src/db/schema/index.ts',
    out: './src/db/migrations',
    dialect: 'sqlite',
    driver: 'libsql',
    dbCredentials: {
        url,
        ...(isLocal ? {} : { authToken: process.env.TURSO_AUTH_TOKEN! }),
    },
});
