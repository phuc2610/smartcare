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
    otp: z.string().length(6),
  }),
});

const register = async (req, res) => {
  try {
    const { name, phone, password, role } = req.body;

    const existingUser = await User.findOne({ phone });
    if (existingUser) {
      return res.status(400).json({ error: 'Số điện thoại đã được đăng ký.' });
    }

    const passwordHash = await hashPassword(password);
    const otpCode = '123456'; // Mock OTP for dev
    const otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    const user = await User.create({
      name,
      phone,
      passwordHash,
      role,
      isVerified: false,
      medicalCondition: 'Diabetes', // Default for demo
      otpCode,
      otpExpiresAt,
    });

    console.log(`[OTP] Code for ${phone}: ${otpCode}`);

    res.status(201).json({
      message: 'OTP sent',
      phone: user.phone,
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
      return res.status(404).json({ error: 'User not found' });
    }

    const otpCode = '123456';
    const otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000);

    user.otpCode = otpCode;
    user.otpExpiresAt = otpExpiresAt;
    await user.save();

    console.log(`[OTP] Code for ${phone}: ${otpCode}`);

    res.json({ message: 'OTP sent', phone });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const verifyOTP = async (req, res) => {
  try {
    const { phone, otp } = req.body;

    const user = await User.findOne({ phone });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.otpCode !== otp) {
      return res.status(400).json({ error: 'Mã xác thực không đúng.' });
    }

    if (user.otpExpiresAt < new Date()) {
      return res.status(400).json({ error: 'Mã OTP đã hết hạn.' });
    }

    user.isVerified = true;
    user.otpCode = null;
    user.otpExpiresAt = null;
    await user.save();

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

    if (!user.isVerified) {
      return res.status(401).json({ error: 'Tài khoản chưa được xác thực.' });
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

module.exports = {
  register,
  login,
  requestOTP,
  verifyOTP,
  registerSchema,
  loginSchema,
  otpVerifySchema,
};





