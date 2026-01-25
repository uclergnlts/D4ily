import 'dotenv/config';
import { processArticleWithAI } from './src/services/ai/aiService.js';

async function test() {
    console.log('🧪 Testing OpenAI connection...');

    try {
        const result = await processArticleWithAI(
            'Test Article Title',
            'This is a test article content to verify OpenAI connection is working.',
            'en'
        );

        console.log('✅ OpenAI Response:', JSON.stringify(result, null, 2));
    } catch (error) {
        console.error('❌ OpenAI Error:', error);
    }
}

test();
