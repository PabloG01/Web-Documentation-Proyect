require('dotenv').config({ path: '../.env' }); // Try parent folder
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function listModels() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        // Try current folder just in case
        require('dotenv').config();
        if (!process.env.GEMINI_API_KEY) {
            console.error('No GEMINI_API_KEY found in ../.env or .env');
            return;
        }
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

    // Test common models
    const modelsToTry = [
        'gemini-1.5-flash',
        'gemini-1.5-pro',
        'gemini-pro',
        'gemini-1.0-pro'
    ];

    console.log('Testing models availability...');

    for (const modelName of modelsToTry) {
        try {
            console.log(`Testing ${modelName}...`);
            const model = genAI.getGenerativeModel({ model: modelName });
            const result = await model.generateContent('Hello');
            const response = await result.response;
            console.log(`✅ ${modelName} is AVAILABLE.`);
            // If one works, we can stop or list all working ones.
        } catch (error) {
            console.log(`❌ ${modelName} failed: ${error.message.split('\n')[0]}`);
        }
    }
}

listModels();
