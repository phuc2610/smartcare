const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  phone: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ['PATIENT', 'CAREGIVER'], required: true },
  caregiverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  caregiverPhone: { type: String, default: null },
  email: { type: String, default: null },
  isVerified: { type: Boolean, default: false },
  medicalCondition: { type: String, default: 'Normal' },
  height: { type: Number, default: null },
  weight: { type: Number, default: null },
  otpCode: { type: String, default: null },
  otpExpiresAt: { type: Date, default: null },
}, {
  timestamps: true,
});

module.exports = mongoose.model('User', userSchema);





