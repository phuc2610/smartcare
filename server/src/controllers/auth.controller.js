const User = require('../models/User');
const { hashPassword, comparePassword } = require('../utils/hash');
const { generateToken } = require('../utils/jwt');
const { z } = require('zod');

const registerSchema = z.object({
  body: z.object({
    name: z.string().min(1),
    phone: z.string().regex(/^(84|0[3|5|7|8|9])+([0-9]{8})\b/),
    password: z.string().min(6),
    role: z.enum(['PATIENT', 'CAREGIVER']),
  }),
});

const loginSchema = z.object({
  body: z.object({
    phone: z.string(),
    password: z.string(),
  }),
});

const otpVerifySchema = z.object({
  body: z.object({
    phone: z.string(),
    otp: z.string().length(4),
  }),
});

// Generate random 4-digit OTP
const generateOTP = () => {
  return Math.floor(1000 + Math.random() * 9000).toString();
};

const register = async (req, res) => {
  try {
    const { name, phone, password, role } = req.body;

    const existingUser = await User.findOne({ phone });
    if (existingUser) {
      return res.status(400).json({ error: 'Số điện thoại đã được đăng ký.' });
    }

    const passwordHash = await hashPassword(password);

    // Generate OTP for verification
    const otpCode = generateOTP();
    const otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    // Create user but not verified yet
    const userData = {
      name,
      phone,
      passwordHash,
      role,
      isVerified: false, // Chưa verify, cần OTP
      otpCode,
      otpExpiresAt,
    };

    // Only set medicalCondition for PATIENT role, default to null
    if (role === 'PATIENT') {
      userData.medicalCondition = null;
    }

    const user = await User.create(userData);

    // Log OTP to console for demo (không gửi SMS)
    console.log('========================================');
    console.log(`[OTP DEMO] Mã xác thực cho ${phone}:`);
    console.log(`         OTP: ${otpCode}`);
    console.log(`         Hết hạn sau: 5 phút`);
    console.log('========================================');

    res.status(201).json({
      message: 'Đăng ký thành công. Vui lòng nhập mã OTP để xác thực.',
      phone: user.phone,
      requiresOTP: true,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const requestOTP = async (req, res) => {
  try {
    const { phone } = req.body;
    const user = await User.findOne({ phone });

    if (!user) {
      return res.status(404).json({ error: 'Số điện thoại chưa được đăng ký.' });
    }

    // Generate new 4-digit OTP
    const otpCode = generateOTP();
    const otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    user.otpCode = otpCode;
    user.otpExpiresAt = otpExpiresAt;
    await user.save();

    // Log OTP to console for demo (không gửi SMS)
    console.log('========================================');
    console.log(`[OTP DEMO] Mã xác thực mới cho ${phone}:`);
    console.log(`         OTP: ${otpCode}`);
    console.log(`         Hết hạn sau: 5 phút`);
    console.log('========================================');

    res.json({ message: 'Mã OTP đã được gửi. Vui lòng kiểm tra log console.', phone });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const verifyOTP = async (req, res) => {
  try {
    const { phone, otp } = req.body;

    const user = await User.findOne({ phone });
    if (!user) {
      return res.status(404).json({ error: 'Số điện thoại chưa được đăng ký.' });
    }

    // Check if OTP exists
    if (!user.otpCode) {
      return res.status(400).json({ error: 'Mã OTP không tồn tại. Vui lòng yêu cầu mã mới.' });
    }

    // Check if OTP matches
    if (user.otpCode !== otp) {
      console.log(`[OTP VERIFY] Failed attempt for ${phone}: entered "${otp}", expected "${user.otpCode}"`);
      return res.status(400).json({ error: 'Mã xác thực không đúng.' });
    }

    // Check if OTP expired
    if (user.otpExpiresAt < new Date()) {
      return res.status(400).json({ error: 'Mã OTP đã hết hạn. Vui lòng yêu cầu mã mới.' });
    }

    // Verify user
    user.isVerified = true;
    user.otpCode = null;
    user.otpExpiresAt = null;
    await user.save();

    console.log(`[OTP VERIFY] Successfully verified user: ${phone}`);

    const token = generateToken(user._id);

    res.json({
      user: {
        _id: user._id,
        name: user.name,
        phone: user.phone,
        role: user.role,
        medicalCondition: user.medicalCondition,
        height: user.height,
        weight: user.weight,
        caregiverId: user.caregiverId,
        caregiverPhone: user.caregiverPhone,
        isVerified: user.isVerified,
      },
      token,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const login = async (req, res) => {
  try {
    const { phone, password } = req.body;

    const user = await User.findOne({ phone });
    if (!user) {
      return res.status(401).json({ error: 'Sai số điện thoại hoặc mật khẩu.' });
    }

    const isValid = await comparePassword(password, user.passwordHash);
    if (!isValid) {
      return res.status(401).json({ error: 'Sai số điện thoại hoặc mật khẩu.' });
    }

    // Check if user is verified
    if (!user.isVerified) {
      return res.status(403).json({ 
        error: 'Tài khoản chưa được xác thực. Vui lòng xác thực bằng mã OTP.',
        requiresOTP: true,
      });
    }

    const token = generateToken(user._id);

    res.json({
      user: {
        _id: user._id,
        name: user.name,
        phone: user.phone,
        role: user.role,
        medicalCondition: user.medicalCondition,
        height: user.height,
        weight: user.weight,
        caregiverId: user.caregiverId,
        caregiverPhone: user.caregiverPhone,
        isVerified: user.isVerified,
      },
      token,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const forgotPasswordSchema = z.object({
  body: z.object({
    phone: z.string(),
  }),
});

const resetPasswordSchema = z.object({
  body: z.object({
    phone: z.string(),
    otp: z.string().length(4),
    newPassword: z.string().min(6),
  }),
});

const forgotPassword = async (req, res) => {
  try {
    const { phone } = req.body;
    const user = await User.findOne({ phone });

    if (!user) {
      return res.status(404).json({ error: 'Số điện thoại chưa được đăng ký.' });
    }

    // Generate OTP
    const otpCode = generateOTP();
    const otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    user.otpCode = otpCode;
    user.otpExpiresAt = otpExpiresAt;
    await user.save();

    // Log OTP to console for demo
    console.log('========================================');
    console.log(`[FORGOT PASSWORD] Mã xác thực cho ${phone}:`);
    console.log(`         OTP: ${otpCode}`);
    console.log(`         Hết hạn sau: 5 phút`);
    console.log('========================================');

    res.json({ message: 'Mã OTP đã được gửi. Vui lòng kiểm tra log console.', phone });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { phone, otp, newPassword } = req.body;

    const user = await User.findOne({ phone });
    if (!user) {
      return res.status(404).json({ error: 'Số điện thoại chưa được đăng ký.' });
    }

    // Check OTP
    if (!user.otpCode || user.otpCode !== otp) {
      return res.status(400).json({ error: 'Mã xác thực không đúng.' });
    }

    if (user.otpExpiresAt < new Date()) {
      return res.status(400).json({ error: 'Mã OTP đã hết hạn. Vui lòng yêu cầu mã mới.' });
    }

    // Update password
    const passwordHash = await hashPassword(newPassword);
    user.passwordHash = passwordHash;
    user.otpCode = null;
    user.otpExpiresAt = null;
    await user.save();

    console.log(`[RESET PASSWORD] Successfully reset password for: ${phone}`);

    // Auto login after reset
    const token = generateToken(user._id);

    res.json({
      message: 'Đổi mật khẩu thành công',
      user: {
        _id: user._id,
        name: user.name,
        phone: user.phone,
        role: user.role,
        medicalCondition: user.medicalCondition,
        height: user.height,
        weight: user.weight,
        caregiverId: user.caregiverId,
        caregiverPhone: user.caregiverPhone,
        isVerified: user.isVerified,
      },
      token,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const changePasswordSchema = z.object({
  body: z.object({
    currentPassword: z.string().min(1),
    newPassword: z.string().min(6),
  }),
});

const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user._id;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'Người dùng không tồn tại.' });
    }

    // Verify current password
    const isPasswordValid = await comparePassword(currentPassword, user.passwordHash);
    if (!isPasswordValid) {
      return res.status(400).json({ error: 'Mật khẩu hiện tại không đúng.' });
    }

    // Check if new password is same as current
    const isSamePassword = await comparePassword(newPassword, user.passwordHash);
    if (isSamePassword) {
      return res.status(400).json({ error: 'Mật khẩu mới phải khác mật khẩu hiện tại.' });
    }

    // Update password
    const passwordHash = await hashPassword(newPassword);
    user.passwordHash = passwordHash;
    await user.save();

    console.log(`[CHANGE PASSWORD] Successfully changed password for user: ${userId}`);

    res.json({
      message: 'Đổi mật khẩu thành công',
    });
  } catch (error) {
    console.error('[CHANGE PASSWORD] Error:', error);
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  register,
  login,
  requestOTP,
  verifyOTP,
  forgotPassword,
  resetPassword,
  changePassword,
  registerSchema,
  loginSchema,
  otpVerifySchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
};





