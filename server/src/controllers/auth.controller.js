/**
 * AUTH CONTROLLER - Xử lý xác thực và đăng nhập
 * Chức năng: Đăng ký, đăng nhập, OTP, quên mật khẩu, đổi mật khẩu
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
const { generateToken } = require('../utils/jwt');
const { z } = require('zod');

// Schema validation cho đăng ký: kiểm tra name, phone (format VN), password (tối thiểu 6 ký tự), role
const registerSchema = z.object({
  body: z.object({
    name: z.string().min(1),
    phone: z.string().regex(/^(\+84|84|0[3|5|7|8|9])+([0-9]{8})\b/),
    password: z.string().min(6),
    role: z.enum(['PATIENT', 'CAREGIVER', 'DOCTOR']),
    firebaseIdToken: z.string(), // Added firebaseIdToken
  }),
});

// Schema validation cho đăng nhập: phone và password
const loginSchema = z.object({
  body: z.object({
    phone: z.string().regex(/^(\+84|84|0[3|5|7|8|9])+([0-9]{8})\b/),
    password: z.string(),
  }),
});

/**
 * Tạo mã OTP ngẫu nhiên 4 chữ số (1000-9999)
 * @returns {string} Mã OTP 4 số
 */
const generateOTP = () => {
  return Math.floor(1000 + Math.random() * 9000).toString();
};

const admin = require('../config/firebase');

/**
 * Đăng ký tài khoản mới với Firebase Phone Auth
 * Luồng: Nhận thông tin + firebaseIdToken -> Kiểm tra SĐT chưa tồn tại -> Xác minh token Firebase -> Hash mật khẩu -> Tạo user -> Trả JWT
 */
const register = async (req, res) => {
  try {
    const { name, phone, password, role, firebaseIdToken } = req.body;

    // Kiểm tra số điện thoại đã được đăng ký chưa
    const existingUser = await User.findOne({ phone });
    if (existingUser) {
      return res.status(400).json({ error: 'Số điện thoại đã được đăng ký.' });
    }

    // Xác minh Firebase ID Token
    let decodedToken;
    try {
      decodedToken = await admin.auth().verifyIdToken(firebaseIdToken);
    } catch (e) {
      console.error('Firebase token verification failed:', e);
      return res.status(401).json({ error: 'Xác thực số điện thoại thất bại hoặc token đã hết hạn.' });
    }

    // Đảm bảo số điện thoại xác thực khớp với số truyền vào
    // Firebase phone number format is like +84...
    // We can normalize or just trust the backend. For simplicity, we assume the frontend ensures they match,
    // or we can use decodedToken.phone_number directly.
    const verifiedPhone = decodedToken.phone_number;
    if (!verifiedPhone || !verifiedPhone.endsWith(phone.slice(-9))) { // So sánh 9 số cuối
      return res.status(400).json({ error: 'Số điện thoại không khớp với thông tin xác thực.' });
    }

    // Hash mật khẩu
    const passwordHash = await hashPassword(password);

    // Tạo user (đã verify)
    const userData = {
      name,
      phone, // We use the user-provided phone format for consistency in DB
      passwordHash,
      role,
      isVerified: true, // Firebase handled verification
    };

    if (role === 'PATIENT') {
      userData.medicalCondition = null;
    }

    const user = await User.create(userData);

    // Tạo JWT token
    const token = generateToken(user._id);

    res.status(201).json({
      message: 'Đăng ký thành công.',
      user: {
        _id: user._id,
        name: user.name,
        phone: user.phone,
        role: user.role,
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

    // Kiểm tra tài khoản đã được xác thực chưa
    if (!user.isVerified) {
      return res.status(403).json({ 
        error: 'Tài khoản chưa được xác thực. Vui lòng liên hệ hỗ trợ.',
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
    phone: z.string().regex(/^(\+84|84|0[3|5|7|8|9])+([0-9]{8})\b/),
  }),
});

/**
 * Kiểm tra xem số điện thoại có tồn tại không trước khi gửi OTP quên mật khẩu
 */
const forgotPassword = async (req, res) => {
  try {
    const { phone } = req.body;
    
    // Tìm user theo số điện thoại
    const user = await User.findOne({ phone });
    if (!user) {
      return res.status(404).json({ error: 'Số điện thoại chưa được đăng ký.' });
    }

    res.json({ message: 'Số điện thoại hợp lệ.', phone });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const resetPasswordSchema = z.object({
  body: z.object({
    phone: z.string(),
    firebaseIdToken: z.string(),
    newPassword: z.string().min(6),
  }),
});

/**
 * Đặt lại mật khẩu bằng Firebase Token (sau khi quên mật khẩu)
 * Luồng: Nhận token -> Xác minh với Firebase -> Tìm user -> Cập nhật pass -> Trả về JWT
 */
const resetPassword = async (req, res) => {
  try {
    const { phone, firebaseIdToken, newPassword } = req.body;

    // Xác minh Firebase ID Token
    let decodedToken;
    try {
      decodedToken = await admin.auth().verifyIdToken(firebaseIdToken);
    } catch (e) {
      console.error('Firebase token verification failed:', e);
      return res.status(401).json({ error: 'Xác thực số điện thoại thất bại.' });
    }

    const verifiedPhone = decodedToken.phone_number;
    if (!verifiedPhone || !verifiedPhone.endsWith(phone.slice(-9))) {
      return res.status(400).json({ error: 'Số điện thoại không khớp với thông tin xác thực.' });
    }

    // Tìm user theo số điện thoại
    const user = await User.findOne({ phone });
    if (!user) {
      return res.status(404).json({ error: 'Số điện thoại chưa được đăng ký.' });
    }

    // Hash mật khẩu mới và cập nhật vào database
    const passwordHash = await hashPassword(newPassword);
    user.passwordHash = passwordHash;
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

module.exports = {
  register,
  login,
  forgotPassword,
  resetPassword,
  changePassword,
  deleteAccount,
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
  deleteAccountSchema,
};





