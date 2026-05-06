const { GoogleGenerativeAI } = require('@google/generative-ai');

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey || apiKey.length < 10) {
  console.warn('[GEMINI] GEMINI_API_KEY chưa được cấu hình; Gemini vision sẽ không khả dụng.');
  module.exports = null;
} else {
  const genAI = new GoogleGenerativeAI(apiKey);
  module.exports = genAI;
}
