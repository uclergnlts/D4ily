import { z } from 'zod';

const envSchema = z.object({
    NODE_ENV: z.enum(['development', 'staging', 'production', 'test']).default('development'),
    PORT: z.string().default('3000'),

    // Database (optional in dev — defaults to local SQLite file)
    TURSO_DATABASE_URL: z.string().default('file:local.db'),
    TURSO_AUTH_TOKEN: z.string().default(''),

    // Cache (optional in dev — app works without Redis)
    UPSTASH_REDIS_REST_URL: z.string().default(''),
    UPSTASH_REDIS_REST_TOKEN: z.string().default(''),

    // All other fields are optional
    ELASTICSEARCH_URL: z.string().optional(),
    ELASTICSEARCH_API_KEY: z.string().optional(),
    FIREBASE_PROJECT_ID: z.string().optional(),
    FIREBASE_PRIVATE_KEY: z.string().optional(),
    FIREBASE_CLIENT_EMAIL: z.string().optional(),
    OPENAI_API_KEY: z.string().optional(),
    RESEND_API_KEY: z.string().optional(),
    REVENUECAT_PUBLIC_API_KEY: z.string().optional(),
    REVENUECAT_SECRET_API_KEY: z.string().optional(),
    REVENUECAT_WEBHOOK_SECRET: z.string().optional(),
    CLOUDINARY_CLOUD_NAME: z.string().optional(),
    CLOUDINARY_API_KEY: z.string().optional(),
    CLOUDINARY_API_SECRET: z.string().optional(),
    LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
    LOGTAIL_TOKEN: z.string().optional(),
    SENTRY_DSN: z.string().optional(),
    POSTHOG_API_KEY: z.string().optional(),
    POSTHOG_HOST: z.string().optional(),
});

let env: z.infer<typeof envSchema>;

try {
    env = envSchema.parse(process.env);
} catch (error) {
    if (error instanceof z.ZodError) {
        console.error('❌ Environment validation failed:');
        console.error(error.errors);
    }
    throw error;
}

export { env };
export type Env = z.infer<typeof envSchema>;
