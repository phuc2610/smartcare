const User = require('../models/User');
const { z } = require('zod');

const updateProfileSchema = z.object({
  body: z.object({
    height: z.number().optional(),
    weight: z.number().optional(),
    medicalCondition: z.string().optional(),
    avatar: z.string().url().optional(),
  }),
});

const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-passwordHash -otpCode');
    const userObj = user.toObject();
    
    // Caregiver should not have medical condition
    if (user.role === 'CAREGIVER') {
      userObj.medicalCondition = null;
    }
    
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

const updateProfile = async (req, res) => {
  try {
    const { height, weight, medicalCondition, avatar } = req.body;

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (height !== undefined) user.height = height;
    if (weight !== undefined) user.weight = weight;
    if (avatar !== undefined) user.avatar = avatar;
    
    // Only allow medicalCondition update for PATIENT role
    if (medicalCondition !== undefined) {
      if (user.role === 'PATIENT') {
        user.medicalCondition = medicalCondition;
      } else {
        // Caregiver should not have medical condition - ignore or set to null
        user.medicalCondition = null;
      }
    }

    await user.save();

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





