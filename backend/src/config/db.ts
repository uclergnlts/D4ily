import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import { env } from './env.js';

const isLocalFile = env.TURSO_DATABASE_URL.startsWith('file:');

const client = createClient({
    url: env.TURSO_DATABASE_URL,
    ...(isLocalFile ? {} : { authToken: env.TURSO_AUTH_TOKEN }),
});

export const db = drizzle(client);
