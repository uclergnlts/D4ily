import OpenAI from 'openai';
import { env } from './env.js';

// Main OpenAI client with standard timeout
export const openai = new OpenAI({
    apiKey: env.OPENAI_API_KEY,
    timeout: 30000,      // 30 seconds timeout
    maxRetries: 2,       // 2 retries on failure
});

// Quick OpenAI client for faster operations (shorter timeout)
export const openaiQuick = new OpenAI({
    apiKey: env.OPENAI_API_KEY,
    timeout: 15000,      // 15 seconds timeout
    maxRetries: 1,       // 1 retry only
});
