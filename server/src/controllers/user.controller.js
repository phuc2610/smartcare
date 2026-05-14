/**
 * USER CONTROLLER - Quản lý thông tin người dùng
 * Chức năng: Lấy thông tin user, cập nhật profile (chiều cao, cân nặng, tình trạng bệnh, avatar)
 */

const User = require('../models/User');
const { z } = require('zod');

const updateProfileSchema = z.object({
  body: z.object({
    height: z.number().optional(),
    weight: z.number().optional(),
    medicalCondition: z.string().optional(),
    avatar: z.string().url().optional(),
    gender: z.enum(['MALE', 'FEMALE', 'OTHER']).optional(),
    allergies: z.array(z.string()).optional(),
    dateOfBirth: z.string().optional(),
    isOnboardingCompleted: z.boolean().optional(),
  }),
});

/**
 * Lấy thông tin user hiện tại (từ JWT token)
 * Luồng: Lấy user từ database -> Loại bỏ passwordHash và otpCode -> Nếu là CAREGIVER thì set medicalCondition = null -> Trả về
 */
const getMe = async (req, res) => {
  try {
    // Tìm user theo ID từ JWT token, loại bỏ các field nhạy cảm
    const user = await User.findById(req.user._id).select('-passwordHash -otpCode');
    const userObj = user.toObject();
    
    // CAREGIVER không có tình trạng bệnh lý, set về null
    if (user.role === 'CAREGIVER') {
      userObj.medicalCondition = null;
    }
    
    // Trả về thông tin user (đảm bảo avatar không undefined)
    res.json({ 
      user: {
        ...userObj,
        avatar: user.avatar || null,
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Cập nhật thông tin profile của user
 * Luồng: Tìm user -> Cập nhật các field được gửi lên -> Nếu là PATIENT mới cho phép cập nhật medicalCondition -> Lưu -> Trả về
 */
const updateProfile = async (req, res) => {
  try {
    const { height, weight, medicalCondition, avatar, gender, allergies, dateOfBirth, isOnboardingCompleted } = req.body;

    // Tìm user theo ID từ JWT token
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Cập nhật các field nếu có trong request body
    if (height !== undefined) user.height = height;
    if (weight !== undefined) user.weight = weight;
    if (avatar !== undefined) user.avatar = avatar;
    if (gender !== undefined) user.gender = gender;
    if (allergies !== undefined) user.allergies = allergies;
    if (dateOfBirth !== undefined) user.dateOfBirth = dateOfBirth;
    if (isOnboardingCompleted !== undefined) user.isOnboardingCompleted = isOnboardingCompleted;
    
    // Chỉ cho phép PATIENT cập nhật medicalCondition, CAREGIVER luôn là null
    if (medicalCondition !== undefined) {
      if (user.role === 'PATIENT') {
        user.medicalCondition = medicalCondition;
      } else {
        // CAREGIVER không có tình trạng bệnh lý, set về null
        user.medicalCondition = null;
      }
    }

    // Lưu thay đổi vào database
    await user.save();

    // Trả về thông tin user đã cập nhật
    res.json({
      user: {
        _id: user._id,
        name: user.name,
        phone: user.phone,
        role: user.role,
        medicalCondition: user.role === 'PATIENT' ? user.medicalCondition : null,
        height: user.height,
        weight: user.weight,
        avatar: user.avatar,
        gender: user.gender,
        allergies: user.allergies,
        dateOfBirth: user.dateOfBirth,
        isOnboardingCompleted: user.isOnboardingCompleted,
        caregiverId: user.caregiverId,
        caregiverPhone: user.caregiverPhone,
        isVerified: user.isVerified,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getMe,
  updateProfile,
  updateProfileSchema,
};





