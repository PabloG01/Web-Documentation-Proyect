require('dotenv').config({ path: '../.env' });
const https = require('https');
const fs = require('fs');

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
    require('dotenv').config();
}
const key = process.env.GEMINI_API_KEY || require('dotenv').config().parsed?.GEMINI_API_KEY;
const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`;

https.get(url, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        try {
            const json = JSON.parse(data);
            fs.writeFileSync('models_output.json', JSON.stringify(json, null, 2));
            console.log('Wrote to models_output.json');
        } catch (e) {
            console.error('Error:', e);
        }
    });
});
