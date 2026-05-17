/**
 * AUTH CONTROLLER - Xử lý xác thực và đăng nhập
 * Chức năng: Đăng ký, đăng nhập, quên mật khẩu, đổi mật khẩu, OTP email, Google Sign-In
 * Xác thực: SĐT + Mật khẩu, Email OTP, Google OAuth
 */

const User = require('../models/User');
const Prescription = require('../models/Prescription');
const Medication = require('../models/Medication');
const Reminder = require('../models/Reminder');
const HealthLog = require('../models/HealthLog');
const MedicalRecord = require('../models/MedicalRecord');
const Appointment = require('../models/Appointment');
const Alert = require('../models/Alert');
const { hashPassword, comparePassword } = require('../utils/hash');
const { generateToken, verifyToken, generateVerificationToken } = require('../utils/jwt');
const { z } = require('zod');
const { sendOTPEmail } = require('../services/email.service');

// Schema validation cho đăng ký: name, phone (format VN), password (tối thiểu 6 ký tự), role
const registerSchema = z.object({
  body: z.object({
    name: z.string().min(1),
    phone: z.string().regex(/^(\+84|84|0)(3|5|7|8|9)[0-9]{8}$/),
    password: z.string().min(6),
    role: z.enum(['PATIENT', 'CAREGIVER', 'DOCTOR']),
    email: z.string().email().optional(),
  }),
});

// Schema validation cho đăng ký email
const registerEmailSchema = z.object({
  body: z.object({
    name: z.string().min(1),
    email: z.string().email(),
    password: z.string().min(6),
    verificationToken: z.string(),
  }),
});

// Schema validation cho setup account
const setupAccountSchema = z.object({
  body: z.object({
    role: z.enum(['PATIENT', 'CAREGIVER', 'DOCTOR']),
    medicalCondition: z.string().optional(),
    height: z.number().optional(),
    weight: z.number().optional(),
    dateOfBirth: z.string().optional(), // Có thể nhận string ISO date
  }),
});

// Schema validation cho đăng nhập: email/phone và password
const loginSchema = z.object({
  body: z.object({
    identifier: z.string().min(1), // Nhận email hoặc phone
    password: z.string(),
  }),
});

/**
 * Đăng ký tài khoản mới (trực tiếp, không OTP)
 * Luồng: Nhận thông tin -> Kiểm tra SĐT chưa tồn tại -> Hash mật khẩu -> Tạo user -> Trả JWT
 */
const register = async (req, res) => {
  try {
    const { name, phone, password, role } = req.body;

    // Kiểm tra số điện thoại đã được đăng ký chưa
    const existingUser = await User.findOne({ phone });
    if (existingUser) {
      return res.status(400).json({ error: 'Số điện thoại đã được đăng ký.' });
    }

    // Hash mật khẩu
    const passwordHash = await hashPassword(password);

    // Tạo user (verified trực tiếp)
    const userData = {
      name,
      phone,
      passwordHash,
      role,
      email: req.body.email || null,
      isVerified: true,
      isEmailVerified: !!req.body.email,
    };

    const user = await User.create(userData);
    console.log(`[REGISTER] New user created: ${user.phone} (${user.role})`);

    // Tạo JWT token
    const token = generateToken(user._id);

    res.status(201).json({
      message: 'Đăng ký thành công.',
      user: {
        _id: user._id,
        name: user.name,
        phone: user.phone,
        email: user.email,
        role: user.role,
        isVerified: user.isVerified,
        isOnboardingCompleted: user.isOnboardingCompleted,
        avatar: user.avatar,
        gender: user.gender,
        allergies: user.allergies,
        medicalCondition: user.medicalCondition,
        height: user.height,
        weight: user.weight,
        dateOfBirth: user.dateOfBirth,
      },
      token,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Đăng nhập bằng số điện thoại hoặc email
 */
const login = async (req, res) => {
  try {
    const { identifier, password } = req.body;

    // Tìm user theo email hoặc số điện thoại
    const isEmail = identifier.includes('@');
    const query = isEmail ? { email: identifier } : { phone: identifier };
    
    const user = await User.findOne(query);
    if (!user) {
      return res.status(401).json({ error: 'Sai thông tin đăng nhập hoặc mật khẩu.' });
    }

    // So sánh mật khẩu với hash trong database
    const isValid = await comparePassword(password, user.passwordHash);
    if (!isValid) {
      return res.status(401).json({ error: 'Sai thông tin đăng nhập hoặc mật khẩu.' });
    }

    // Tự động cập nhật thành true cho các tài khoản cũ
    if (!user.isVerified) {
      user.isVerified = true;
      await user.save();
    }

    // Tạo JWT token để đăng nhập
    const token = generateToken(user._id);

    // Trả về thông tin user và token
    res.json({
      user: {
        _id: user._id,
        name: user.name,
        phone: user.phone,
        email: user.email,
        role: user.role,
        medicalCondition: user.medicalCondition,
        height: user.height,
        weight: user.weight,
        dateOfBirth: user.dateOfBirth,
        caregiverId: user.caregiverId,
        caregiverPhone: user.caregiverPhone,
        isVerified: user.isVerified,
        isOnboardingCompleted: user.isOnboardingCompleted,
        avatar: user.avatar,
        gender: user.gender,
        allergies: user.allergies,
      },
      token,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const forgotPasswordSchema = z.object({
  body: z.object({
    phone: z.string().regex(/^(\+84|84|0)(3|5|7|8|9)[0-9]{8}$/),
    name: z.string().min(1),
  }),
});

/**
 * Quên mật khẩu - Xác minh bằng tên + SĐT
 * Luồng: Kiểm tra SĐT tồn tại -> Kiểm tra tên khớp -> Trả về xác nhận
 */
const forgotPassword = async (req, res) => {
  try {
    const { phone, name } = req.body;
    
    // Tìm user theo số điện thoại
    const user = await User.findOne({ phone });
    if (!user) {
      return res.status(404).json({ error: 'Số điện thoại chưa được đăng ký.' });
    }

    // So sánh tên (không phân biệt hoa thường, bỏ khoảng trắng thừa)
    const normalizedInputName = name.trim().toLowerCase();
    const normalizedUserName = user.name.trim().toLowerCase();
    
    if (normalizedInputName !== normalizedUserName) {
      return res.status(400).json({ error: 'Họ tên không khớp với tài khoản.' });
    }

    res.json({ message: 'Xác minh thành công.', phone, verified: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const resetPasswordSchema = z.object({
  body: z.object({
    phone: z.string(),
    name: z.string().min(1),
    newPassword: z.string().min(6),
  }),
});

/**
 * Đặt lại mật khẩu (sau khi xác minh tên + SĐT)
 * Luồng: Xác minh lại tên + SĐT -> Tìm user -> Cập nhật pass -> Trả về JWT
 */
const resetPassword = async (req, res) => {
  try {
    const { phone, name, newPassword } = req.body;

    // Tìm user theo số điện thoại
    const user = await User.findOne({ phone });
    if (!user) {
      return res.status(404).json({ error: 'Số điện thoại chưa được đăng ký.' });
    }

    // Xác minh tên lần nữa
    const normalizedInputName = name.trim().toLowerCase();
    const normalizedUserName = user.name.trim().toLowerCase();
    
    if (normalizedInputName !== normalizedUserName) {
      return res.status(400).json({ error: 'Họ tên không khớp với tài khoản.' });
    }

    // Hash mật khẩu mới và cập nhật vào database
    const passwordHash = await hashPassword(newPassword);
    user.passwordHash = passwordHash;
    await user.save();

    console.log(`[RESET PASSWORD] Successfully reset password for: ${phone}`);

    // Tự động đăng nhập sau khi đặt lại mật khẩu
    const token = generateToken(user._id);

    res.json({
      message: 'Đổi mật khẩu thành công',
      user: {
        _id: user._id,
        name: user.name,
        phone: user.phone,
        email: user.email,
        role: user.role,
        isVerified: user.isVerified,
        isOnboardingCompleted: user.isOnboardingCompleted,
        avatar: user.avatar,
        gender: user.gender,
        allergies: user.allergies,
        medicalCondition: user.medicalCondition,
        height: user.height,
        weight: user.weight,
        dateOfBirth: user.dateOfBirth,
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

const deleteAccountSchema = z.object({
  body: z.object({
    password: z.string().min(1),
  }),
});

/**
 * Xoá tài khoản vĩnh viễn
 * Luồng: Xác nhận mật khẩu -> Xoá tất cả dữ liệu liên quan -> Xoá user
 */
const deleteAccount = async (req, res) => {
  try {
    const { password } = req.body;
    const userId = req.user._id;

    // Tìm user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'Người dùng không tồn tại.' });
    }

    // Xác nhận mật khẩu
    const isPasswordValid = await comparePassword(password, user.passwordHash);
    if (!isPasswordValid) {
      return res.status(400).json({ error: 'Mật khẩu không đúng.' });
    }

    // Xoá tất cả dữ liệu liên quan
    console.log(`[DELETE ACCOUNT] Deleting all data for user: ${userId}`);
    
    await Promise.all([
      Prescription.deleteMany({ $or: [{ patient: userId }, { doctor: userId }] }),
      Medication.deleteMany({ userId }),
      Reminder.deleteMany({ userId }),
      HealthLog.deleteMany({ userId }),
      MedicalRecord.deleteMany({ patientId: userId }),
      Appointment.deleteMany({ $or: [{ patientId: userId }, { doctorId: userId }] }),
      Alert.deleteMany({ userId }),
    ]);

    // Xoá user
    await User.findByIdAndDelete(userId);

    console.log(`[DELETE ACCOUNT] Successfully deleted account: ${userId} (${user.phone})`);

    res.json({ message: 'Tài khoản đã được xoá vĩnh viễn.' });
  } catch (error) {
    console.error('[DELETE ACCOUNT] Error:', error);
    res.status(500).json({ error: error.message });
  }
};

// ===== EMAIL OTP =====

const sendOTPSchema = z.object({
  body: z.object({
    email: z.string().email(),
  }),
});

/**
 * Gửi mã OTP đến email
 * Tạo mã 6 số, lưu vào DB (field otpCode + otpExpiresAt), gửi email
 */
const sendOTP = async (req, res) => {
  try {
    const { email } = req.body;

    // Kiểm tra email đã được đăng ký thật sự chưa
    const existingUser = await User.findOne({ email, isEmailVerified: true, name: { $ne: 'Pending' } });
    if (existingUser && req.path.includes('register')) {
      return res.status(400).json({ error: 'Email đã được đăng ký. Vui lòng đăng nhập.' });
    }

    // Tạo mã OTP 6 số
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 phút

    // Lưu OTP tạm (dùng email làm key, tìm hoặc tạo user tạm)
    let tempUser = await User.findOne({ email });
    if (!tempUser) {
      // Tạo bản ghi tạm (không set phone để sparse unique index hoạt động đúng)
      tempUser = await User.create({
        name: 'Pending',
        passwordHash: 'pending',
        role: 'PATIENT',
        email,
        otpCode,
        otpExpiresAt,
        isVerified: false,
        isEmailVerified: false,
      });
    } else {
      tempUser.otpCode = otpCode;
      tempUser.otpExpiresAt = otpExpiresAt;
      await tempUser.save();
    }

    // Gửi email OTP
    await sendOTPEmail(email, otpCode);

    console.log(`[SEND OTP] OTP sent to ${email}`);
    res.json({ message: 'Mã OTP đã được gửi đến email của bạn.' });
  } catch (error) {
    console.error('[SEND OTP] Error:', error);
    res.status(500).json({ error: `Không thể gửi mã OTP: ${error.message}` });
  }
};

const verifyOTPSchema = z.object({
  body: z.object({
    email: z.string().email(),
    otp: z.string().length(6),
  }),
});

/**
 * Xác thực mã OTP
 */
const verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ error: 'Email không tồn tại.' });
    }

    if (!user.otpCode || user.otpCode !== otp) {
      return res.status(400).json({ error: 'Mã OTP không đúng.' });
    }

    if (user.otpExpiresAt && new Date() > user.otpExpiresAt) {
      return res.status(400).json({ error: 'Mã OTP đã hết hạn. Vui lòng gửi lại.' });
    }

    // Xoá OTP sau khi verify thành công
    user.otpCode = null;
    user.otpExpiresAt = null;
    user.isEmailVerified = true;
    await user.save();

    // Tạo JWT token xác thực ngắn hạn cho bước đăng ký tiếp theo
    const verificationToken = generateVerificationToken(email);

    console.log(`[VERIFY OTP] Email ${email} verified successfully`);
    res.json({ 
      message: 'Xác thực email thành công.', 
      verified: true,
      verificationToken
    });
  } catch (error) {
    console.error('[VERIFY OTP] Error:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Đăng ký tài khoản với Email
 */
const registerWithEmail = async (req, res) => {
  try {
    const { name, email, password, verificationToken } = req.body;

    // Verify token
    let decoded;
    try {
      decoded = verifyToken(verificationToken);
    } catch (err) {
      return res.status(401).json({ error: 'Token xác thực không hợp lệ hoặc đã hết hạn.' });
    }

    if (decoded.email !== email || decoded.type !== 'otp_verification') {
      return res.status(401).json({ error: 'Token xác thực không khớp.' });
    }

    // Kiểm tra email
    const user = await User.findOne({ email });
    if (!user || !user.isEmailVerified) {
      return res.status(400).json({ error: 'Email chưa được xác thực.' });
    }

    // Hash mật khẩu
    const passwordHash = await hashPassword(password);

    // Cập nhật user tạm thành user thật
    user.name = name;
    user.passwordHash = passwordHash;
    user.isVerified = true;
    
    // Nếu là pending temp user được tạo từ sendOTP, xóa field name pending
    if (user.phone && user.phone.startsWith('temp_')) {
      user.phone = null;
    }

    await user.save();
    console.log(`[REGISTER EMAIL] User created: ${email}`);

    // Trả JWT token login
    const token = generateToken(user._id);

    res.status(201).json({
      message: 'Đăng ký thành công.',
      user: {
        _id: user._id,
        name: user.name,
        phone: user.phone,
        email: user.email,
        role: user.role,
        isVerified: user.isVerified,
        isOnboardingCompleted: user.isOnboardingCompleted,
        avatar: user.avatar,
        gender: user.gender,
        allergies: user.allergies,
        medicalCondition: user.medicalCondition,
        height: user.height,
        weight: user.weight,
        dateOfBirth: user.dateOfBirth,
      },
      token,
    });
  } catch (error) {
    console.error('[REGISTER EMAIL] Error:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Thiết lập tài khoản (Bổ sung thông tin sau khi đăng ký email)
 */
const setupAccount = async (req, res) => {
  try {
    const { role, medicalCondition, height, weight, dateOfBirth } = req.body;
    const userId = req.user._id;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'Người dùng không tồn tại.' });
    }

    if (role) user.role = role;
    if (medicalCondition) user.medicalCondition = medicalCondition;
    if (height) user.height = height;
    if (weight) user.weight = weight;
    if (dateOfBirth) user.dateOfBirth = new Date(dateOfBirth);

    await user.save();

    res.json({
      message: 'Thiết lập tài khoản thành công',
      user: {
        _id: user._id,
        name: user.name,
        phone: user.phone,
        email: user.email,
        role: user.role,
        medicalCondition: user.medicalCondition,
        height: user.height,
        weight: user.weight,
        dateOfBirth: user.dateOfBirth,
        isVerified: user.isVerified,
        isOnboardingCompleted: user.isOnboardingCompleted,
        avatar: user.avatar,
        gender: user.gender,
        allergies: user.allergies,
      }
    });
  } catch (error) {
    console.error('[SETUP ACCOUNT] Error:', error);
    res.status(500).json({ error: error.message });
  }
};

// ===== GOOGLE SIGN-IN =====

const googleLoginSchema = z.object({
  body: z.object({
    idToken: z.string().min(1),
  }),
});

/**
 * Đăng nhập bằng Google
 * Verify Google ID Token → tìm user đã đăng ký → trả JWT
 * Nếu email chưa đăng ký → trả lỗi "Tài khoản không hợp lệ"
 */
const googleLogin = async (req, res) => {
  try {
    const { idToken } = req.body;

    // Verify Google ID Token
    const { OAuth2Client } = require('google-auth-library');
    const client = new OAuth2Client(process.env.GOOGLE_WEB_CLIENT_ID);

    const ticket = await client.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_WEB_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { sub: googleId, email, name, picture } = payload;

    if (!email) {
      return res.status(400).json({ error: 'Không lấy được email từ tài khoản Google.' });
    }

    // Tìm user theo googleId hoặc email (phải là user thật, không phải Pending)
    let user = await User.findOne({ 
      $or: [{ googleId }, { email }],
      name: { $ne: 'Pending' },
      isVerified: true,
    });

    if (!user) {
      // Email chưa được đăng ký trong hệ thống
      return res.status(401).json({ 
        error: 'Tài khoản không hợp lệ. Email này chưa được đăng ký trong hệ thống. Vui lòng đăng ký tài khoản trước.' 
      });
    }

    // User đã tồn tại → cập nhật googleId và avatar nếu chưa có
    if (!user.googleId) {
      user.googleId = googleId;
    }
    if (!user.avatar && picture) {
      user.avatar = picture;
    }
    await user.save();

    const token = generateToken(user._id);

    res.json({
      user: {
        _id: user._id,
        name: user.name,
        phone: user.phone,
        email: user.email,
        role: user.role,
        medicalCondition: user.medicalCondition,
        height: user.height,
        weight: user.weight,
        dateOfBirth: user.dateOfBirth,
        isVerified: user.isVerified,
        isOnboardingCompleted: user.isOnboardingCompleted,
        avatar: user.avatar,
        gender: user.gender,
        allergies: user.allergies,
      },
      token,
    });
  } catch (error) {
    console.error('[GOOGLE LOGIN] Error:', error);
    res.status(401).json({ error: 'Xác thực Google thất bại. Vui lòng thử lại.' });
  }
};

module.exports = {
  register,
  login,
  forgotPassword,
  resetPassword,
  changePassword,
  deleteAccount,
  sendOTP,
  verifyOTP,
  googleLogin,
  registerWithEmail,
  setupAccount,
  registerSchema,
  registerEmailSchema,
  setupAccountSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
  deleteAccountSchema,
  sendOTPSchema,
  verifyOTPSchema,
  googleLoginSchema,
};
