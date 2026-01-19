require('dotenv').config({ path: '../.env' });
const https = require('https');

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
    // Try current folder
    require('dotenv').config();
    if (!process.env.GEMINI_API_KEY) {
        console.error('No GEMINI_API_KEY found');
        process.exit(1);
    }
}

const key = process.env.GEMINI_API_KEY || require('dotenv').config().parsed?.GEMINI_API_KEY;

const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`;

console.log('Querying:', url.replace(key, 'HIDDEN_KEY'));

https.get(url, (res) => {
    let data = '';

    res.on('data', (chunk) => {
        data += chunk;
    });

    res.on('end', () => {
        try {
            const json = JSON.parse(data);
            if (json.error) {
                console.error('API Error:', json.error);
            } else if (json.models) {
                console.log('Available Models:');
                json.models.forEach(m => {
                    if (m.supportedGenerationMethods && m.supportedGenerationMethods.includes('generateContent')) {
                        console.log(`- ${m.name} (Display: ${m.displayName})`);
                    }
                });
            } else {
                console.log('Unexpected response:', json);
            }
        } catch (e) {
            console.error('Error parsing JSON:', e);
            console.log('Raw data:', data);
        }
    });

}).on('error', (err) => {
    console.error('Request error:', err);
});
