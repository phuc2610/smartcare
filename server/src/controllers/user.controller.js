const User = require('../models/User');
const { z } = require('zod');

const updateProfileSchema = z.object({
  body: z.object({
    height: z.number().optional(),
    weight: z.number().optional(),
    medicalCondition: z.string().optional(),
  }),
});

const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-passwordHash -otpCode');
    res.json({ user });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const updateProfile = async (req, res) => {
  try {
    const { height, weight, medicalCondition } = req.body;

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (height !== undefined) user.height = height;
    if (weight !== undefined) user.weight = weight;
    if (medicalCondition !== undefined) user.medicalCondition = medicalCondition;

    await user.save();

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





