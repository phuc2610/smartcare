/**
 * EMAIL SERVICE - Gửi email OTP xác thực
 * Sử dụng Brevo API (gửi qua HTTP, không bị chặn bởi Render)
 */

/**
 * Gửi email chứa mã OTP qua Brevo API
 * @param {string} toEmail - Email người nhận
 * @param {string} otpCode - Mã OTP 6 số
 */
const sendOTPEmail = async (toEmail, otpCode) => {
  const apiKey = process.env.BREVO_API_KEY;
  const senderEmail = process.env.SMTP_EMAIL || 'yennie.lhu@gmail.com';
  
  if (!apiKey) {
    throw new Error('Thiếu cấu hình BREVO_API_KEY. Vui lòng thêm vào .env hoặc biến môi trường trên Render.');
  }

  const htmlContent = `
    <div style="font-family: 'Segoe UI', Tahoma, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #f8fafc; border-radius: 16px;">
      <div style="text-align: center; margin-bottom: 24px;">
        <h1 style="color: #0D9488; margin: 0; font-size: 28px;">SmartCare</h1>
        <p style="color: #64748b; margin-top: 4px;">Quản lý sức khỏe thông minh</p>
      </div>
      
      <div style="background: #fff; border-radius: 12px; padding: 32px; text-align: center; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
        <p style="color: #374151; font-size: 16px; margin-bottom: 24px;">
          Mã xác thực tài khoản của bạn là:
        </p>
        
        <div style="background: linear-gradient(135deg, #0D9488, #14B8A6); border-radius: 12px; padding: 20px; margin-bottom: 24px;">
          <span style="font-size: 36px; font-weight: bold; color: #fff; letter-spacing: 8px;">
            ${otpCode}
          </span>
        </div>
        
        <p style="color: #9CA3AF; font-size: 14px; margin-bottom: 0;">
          Mã này có hiệu lực trong <strong>5 phút</strong>.<br/>
          Nếu bạn không yêu cầu mã này, hãy bỏ qua email này.
        </p>
      </div>
      
      <p style="text-align: center; color: #9CA3AF; font-size: 12px; margin-top: 24px;">
        © 2026 SmartCare Team. All rights reserved.
      </p>
    </div>
  `;

  try {
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': apiKey,
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        sender: { name: 'SmartCare', email: senderEmail },
        to: [{ email: toEmail }],
        subject: \`[SmartCare] Mã xác thực: \${otpCode}\`,
        htmlContent: htmlContent
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('[EMAIL] Brevo API Error:', errorData);
      throw new Error(errorData.message || 'Lỗi từ Brevo API');
    }

    const data = await response.json();
    console.log(\`[EMAIL] OTP sent to \${toEmail}, messageId: \${data.messageId}\`);
    return data;
  } catch (error) {
    console.error('[EMAIL] Lỗi khi gọi Brevo API:', error.message);
    throw error;
  }
};

module.exports = { sendOTPEmail };
