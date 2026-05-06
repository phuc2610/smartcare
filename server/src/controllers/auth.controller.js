/**
 * AUTH CONTROLLER - Xử lý xác thực và đăng nhập
 * Chức năng: Đăng ký, đăng nhập, quên mật khẩu, đổi mật khẩu
 * Xác thực: SĐT + Mật khẩu (không OTP)
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

// Schema validation cho đăng ký: name, phone (format VN), password (tối thiểu 6 ký tự), role
const registerSchema = z.object({
  body: z.object({
    name: z.string().min(1),
    phone: z.string().regex(/^(\+84|84|0)(3|5|7|8|9)[0-9]{8}$/),
    password: z.string().min(6),
    role: z.enum(['PATIENT', 'CAREGIVER', 'DOCTOR']),
  }),
});

// Schema validation cho đăng nhập: phone và password
const loginSchema = z.object({
  body: z.object({
    phone: z.string().regex(/^(\+84|84|0)(3|5|7|8|9)[0-9]{8}$/),
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
      isVerified: true,
    };

    if (role === 'PATIENT') {
      userData.medicalCondition = null;
    }

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

    // Kiểm tra tài khoản đã được xác thực chưa (đã bỏ vì không dùng OTP nữa)
    if (!user.isVerified) {
      // Tự động cập nhật thành true cho các tài khoản cũ
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





