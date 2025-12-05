const Link = require('../models/Link');
const User = require('../models/User');
const { z } = require('zod');

const requestLinkSchema = z.object({
  body: z.object({}),
});

const acceptLinkSchema = z.object({
  body: z.object({
    code: z.string().length(6),
  }),
});

const requestLink = async (req, res) => {
  try {
    if (req.user.role !== 'PATIENT') {
      return res.status(403).json({ error: 'Only patients can generate link codes' });
    }

    // Generate 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    // Remove old codes
    await Link.deleteMany({ patientId: req.user._id });

    const link = await Link.create({
      code,
      patientId: req.user._id,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
    });

    res.json({ code });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const acceptLink = async (req, res) => {
  try {
    if (req.user.role !== 'CAREGIVER') {
      return res.status(403).json({ error: 'Only caregivers can accept links' });
    }

    const { code } = req.body;

    const link = await Link.findOne({
      code,
      expiresAt: { $gt: new Date() },
    });

    if (!link) {
      return res.status(400).json({ error: 'Mã liên kết không hợp lệ hoặc đã hết hạn.' });
    }

    const patient = await User.findById(link.patientId);
    if (!patient) {
      return res.status(404).json({ error: 'Không tìm thấy người bệnh.' });
    }

    patient.caregiverId = req.user._id;
    await patient.save();

    await Link.deleteOne({ _id: link._id });

    res.json({
      success: true,
      patientName: patient.name,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getPatients = async (req, res) => {
  try {
    if (req.user.role !== 'CAREGIVER') {
      return res.status(403).json({ error: 'Only caregivers can view patients' });
    }

    const patients = await User.find({ caregiverId: req.user._id }).select('-passwordHash -otpCode');

    res.json({ patients });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  requestLink,
  acceptLink,
  getPatients,
  requestLinkSchema,
  acceptLinkSchema,
};





