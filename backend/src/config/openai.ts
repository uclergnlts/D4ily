import OpenAI from 'openai';
import { env } from './env.js';

// Main OpenAI client with standard timeout
export const openai = new OpenAI({
    apiKey: env.OPENAI_API_KEY,
    timeout: 90000,      // 90 seconds timeout (digest prompts can be large)
    maxRetries: 3,       // 3 retries on failure (handles transient 429s)
});

// Quick OpenAI client for faster operations (shorter timeout)
export const openaiQuick = new OpenAI({
    apiKey: env.OPENAI_API_KEY,
    timeout: 15000,      // 15 seconds timeout
    maxRetries: 1,       // 1 retry only
});
