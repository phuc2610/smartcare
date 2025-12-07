const OpenAI = require('openai');

const apiKey = process.env.OPENAI_API_KEY;

if (!apiKey) {
  console.warn('[OPENAI] OPENAI_API_KEY is missing; AI endpoints will be disabled.');
  module.exports = null;
} else {
  const openai = new OpenAI({ apiKey });
  module.exports = openai;
}





