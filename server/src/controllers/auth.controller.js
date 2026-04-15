/**
 * AUTH CONTROLLER - Xử lý xác thực và đăng nhập
 * Chức năng: Đăng ký, đăng nhập, OTP, quên mật khẩu, đổi mật khẩu
 */

const User = require('../models/User');
const { hashPassword, comparePassword } = require('../utils/hash');
const { generateToken } = require('../utils/jwt');
const { z } = require('zod');

// Schema validation cho đăng ký: kiểm tra name, phone (format VN), password (tối thiểu 6 ký tự), role
const registerSchema = z.object({
  body: z.object({
    name: z.string().min(1),
    phone: z.string().regex(/^(84|0[3|5|7|8|9])+([0-9]{8})\b/),
    password: z.string().min(6),
    role: z.enum(['PATIENT', 'CAREGIVER', 'DOCTOR']),
  }),
});

// Schema validation cho đăng nhập: phone và password
const loginSchema = z.object({
  body: z.object({
    phone: z.string(),
    password: z.string(),
  }),
});

// Schema validation cho xác thực OTP: phone và mã OTP 4 số
const otpVerifySchema = z.object({
  body: z.object({
    phone: z.string(),
    otp: z.string().length(4),
  }),
});

/**
 * Tạo mã OTP ngẫu nhiên 4 chữ số (1000-9999)
 * @returns {string} Mã OTP 4 số
 */
const generateOTP = () => {
  return Math.floor(1000 + Math.random() * 9000).toString();
};

/**
 * Đăng ký tài khoản mới
 * Luồng: Kiểm tra số điện thoại đã tồn tại -> Hash mật khẩu -> Tạo OTP -> Tạo user (chưa verify) -> Trả về yêu cầu OTP
 */
const register = async (req, res) => {
  try {
    const { name, phone, password, role } = req.body;

    // Kiểm tra số điện thoại đã được đăng ký chưa
    const existingUser = await User.findOne({ phone });
    if (existingUser) {
      return res.status(400).json({ error: 'Số điện thoại đã được đăng ký.' });
    }

    // Hash mật khẩu trước khi lưu vào database
    const passwordHash = await hashPassword(password);

    // Tạo mã OTP 4 số và thời gian hết hạn (5 phút)
    const otpCode = generateOTP();
    const otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    // Tạo user nhưng chưa verify (isVerified = false), cần nhập OTP để kích hoạt
    const userData = {
      name,
      phone,
      passwordHash,
      role,
      isVerified: false, // Chưa verify, cần OTP
      otpCode,
      otpExpiresAt,
    };

    // Chỉ set medicalCondition cho PATIENT, mặc định là null
    if (role === 'PATIENT') {
      userData.medicalCondition = null;
    }

    // Lưu user vào database
    const user = await User.create(userData);

    // Log OTP ra console để demo (không gửi SMS thật)
    console.log('========================================');
    console.log(`[OTP DEMO] Mã xác thực cho ${phone}:`);
    console.log(`         OTP: ${otpCode}`);
    console.log(`         Hết hạn sau: 5 phút`);
    console.log('========================================');

    // Trả về thông báo yêu cầu nhập OTP
    res.status(201).json({
      message: 'Đăng ký thành công. Vui lòng nhập mã OTP để xác thực.',
      phone: user.phone,
      requiresOTP: true,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Yêu cầu mã OTP mới (dùng khi đăng ký hoặc quên mật khẩu)
 * Luồng: Tìm user theo phone -> Tạo OTP mới -> Lưu vào user -> Log ra console
 */
const requestOTP = async (req, res) => {
  try {
    const { phone } = req.body;
    
    // Tìm user theo số điện thoại
    const user = await User.findOne({ phone });
    if (!user) {
      return res.status(404).json({ error: 'Số điện thoại chưa được đăng ký.' });
    }

    // Tạo mã OTP mới 4 số và thời gian hết hạn (5 phút)
    const otpCode = generateOTP();
    const otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    // Cập nhật OTP vào user
    user.otpCode = otpCode;
    user.otpExpiresAt = otpExpiresAt;
    await user.save();

    // Log OTP ra console để demo (không gửi SMS thật)
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

/**
 * Xác thực mã OTP và kích hoạt tài khoản
 * Luồng: Tìm user -> Kiểm tra OTP tồn tại -> Kiểm tra OTP đúng -> Kiểm tra OTP chưa hết hạn -> Kích hoạt user -> Tạo JWT token -> Trả về user + token
 */
const verifyOTP = async (req, res) => {
  try {
    const { phone, otp } = req.body;

    // Tìm user theo số điện thoại
    const user = await User.findOne({ phone });
    if (!user) {
      return res.status(404).json({ error: 'Số điện thoại chưa được đăng ký.' });
    }

    // Kiểm tra OTP có tồn tại không
    if (!user.otpCode) {
      return res.status(400).json({ error: 'Mã OTP không tồn tại. Vui lòng yêu cầu mã mới.' });
    }

    // Kiểm tra OTP có khớp không
    if (user.otpCode !== otp) {
      console.log(`[OTP VERIFY] Failed attempt for ${phone}: entered "${otp}", expected "${user.otpCode}"`);
      return res.status(400).json({ error: 'Mã xác thực không đúng.' });
    }

    // Kiểm tra OTP đã hết hạn chưa
    if (user.otpExpiresAt < new Date()) {
      return res.status(400).json({ error: 'Mã OTP đã hết hạn. Vui lòng yêu cầu mã mới.' });
    }

    // Kích hoạt tài khoản: đánh dấu đã verify và xóa OTP
    user.isVerified = true;
    user.otpCode = null;
    user.otpExpiresAt = null;
    await user.save();

    console.log(`[OTP VERIFY] Successfully verified user: ${phone}`);

    // Tạo JWT token để đăng nhập tự động
    const token = generateToken(user._id);

    // Trả về thông tin user và token
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

/**
 * Đăng nhập bằng số điện thoại và mật khẩu
 * Luồng: Tìm user -> Kiểm tra mật khẩu -> Kiểm tra đã verify -> Tạo JWT token -> Trả về user + token
 */
const login = async (req, res) => {
  try {
    const { phone, password } = req.body;

    // Tìm user theo số điện thoại
    const user = await User.findOne({ phone });
    if (!user) {
      return res.status(401).json({ error: 'Sai số điện thoại hoặc mật khẩu.' });
    }

    // So sánh mật khẩu với hash trong database
    const isValid = await comparePassword(password, user.passwordHash);
    if (!isValid) {
      return res.status(401).json({ error: 'Sai số điện thoại hoặc mật khẩu.' });
    }

    // Kiểm tra tài khoản đã được xác thực chưa (phải verify OTP trước)
    if (!user.isVerified) {
      return res.status(403).json({ 
        error: 'Tài khoản chưa được xác thực. Vui lòng xác thực bằng mã OTP.',
        requiresOTP: true,
      });
    }

    // Tạo JWT token để đăng nhập
    const token = generateToken(user._id);

    // Trả về thông tin user và token
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

/**
 * Quên mật khẩu - Yêu cầu OTP để đặt lại mật khẩu
 * Luồng: Tìm user -> Tạo OTP mới -> Lưu vào user -> Log ra console
 */
const forgotPassword = async (req, res) => {
  try {
    const { phone } = req.body;
    
    // Tìm user theo số điện thoại
    const user = await User.findOne({ phone });
    if (!user) {
      return res.status(404).json({ error: 'Số điện thoại chưa được đăng ký.' });
    }

    // Tạo mã OTP mới và thời gian hết hạn (5 phút)
    const otpCode = generateOTP();
    const otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    // Lưu OTP vào user
    user.otpCode = otpCode;
    user.otpExpiresAt = otpExpiresAt;
    await user.save();

    // Log OTP ra console để demo
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

/**
 * Đặt lại mật khẩu bằng OTP (sau khi quên mật khẩu)
 * Luồng: Tìm user -> Kiểm tra OTP -> Hash mật khẩu mới -> Cập nhật -> Tự động đăng nhập -> Trả về user + token
 */
const resetPassword = async (req, res) => {
  try {
    const { phone, otp, newPassword } = req.body;

    // Tìm user theo số điện thoại
    const user = await User.findOne({ phone });
    if (!user) {
      return res.status(404).json({ error: 'Số điện thoại chưa được đăng ký.' });
    }

    // Kiểm tra OTP có đúng không
    if (!user.otpCode || user.otpCode !== otp) {
      return res.status(400).json({ error: 'Mã xác thực không đúng.' });
    }

    // Kiểm tra OTP đã hết hạn chưa
    if (user.otpExpiresAt < new Date()) {
      return res.status(400).json({ error: 'Mã OTP đã hết hạn. Vui lòng yêu cầu mã mới.' });
    }

    // Hash mật khẩu mới và cập nhật vào database
    const passwordHash = await hashPassword(newPassword);
    user.passwordHash = passwordHash;
    user.otpCode = null; // Xóa OTP sau khi dùng
    user.otpExpiresAt = null;
    await user.save();

    console.log(`[RESET PASSWORD] Successfully reset password for: ${phone}`);

    // Tự động đăng nhập sau khi đặt lại mật khẩu
    const token = generateToken(user._id);

    // Trả về thông tin user và token
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

/**
 * Đổi mật khẩu (khi đã đăng nhập)
 * Luồng: Kiểm tra mật khẩu hiện tại -> Kiểm tra mật khẩu mới khác mật khẩu cũ -> Hash mật khẩu mới -> Cập nhật
 */
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user._id; // Lấy user ID từ JWT token (đã authenticate)

    // Tìm user theo ID
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'Người dùng không tồn tại.' });
    }

    // Kiểm tra mật khẩu hiện tại có đúng không
    const isPasswordValid = await comparePassword(currentPassword, user.passwordHash);
    if (!isPasswordValid) {
      return res.status(400).json({ error: 'Mật khẩu hiện tại không đúng.' });
    }

    // Kiểm tra mật khẩu mới có khác mật khẩu cũ không
    const isSamePassword = await comparePassword(newPassword, user.passwordHash);
    if (isSamePassword) {
      return res.status(400).json({ error: 'Mật khẩu mới phải khác mật khẩu hiện tại.' });
    }

    // Hash mật khẩu mới và cập nhật vào database
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





