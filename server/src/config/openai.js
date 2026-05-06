const OpenAI = require('openai');

const apiKey = process.env.OPENAI_API_KEY;

// Key hợp lệ phải bắt đầu bằng "sk-" và dài hơn 20 ký tự
const isValidKey = apiKey && apiKey.startsWith('sk-') && apiKey.length > 20;

if (!isValidKey) {
  console.warn('[OPENAI] OPENAI_API_KEY chưa được cấu hình hoặc đang dùng key demo; AI endpoints sẽ chạy chế độ offline.');
  module.exports = null;
} else {
  const openai = new OpenAI({ apiKey });
  module.exports = openai;
}






