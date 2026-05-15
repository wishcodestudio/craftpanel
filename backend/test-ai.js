require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const https = require('https');

async function listModels() {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    console.error('GEMINI_API_KEY not found in .env');
    return;
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;

  https.get(url, (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
      try {
        const json = JSON.parse(data);
        if (json.error) {
          console.error('❌ API Error:', json.error.message);
          return;
        }
        
        console.log('✅ Connected! Available models for your key:');
        const models = json.models || [];
        models.forEach(m => {
          if (m.supportedGenerationMethods.includes('generateContent')) {
            console.log(` - ${m.name.replace('models/', '')}`);
          }
        });
        
        if (models.length === 0) {
          console.log('No models found for this API key.');
        }
      } catch (e) {
        console.error('Failed to parse response:', e.message);
        console.log('Raw response:', data);
      }
    });
  }).on('error', (err) => {
    console.error('Request Error:', err.message);
  });
}

listModels();