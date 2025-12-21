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
  notificationSettings: {
    medicationReminderBefore: { type: Number, default: 15 },
    mealReminderBefore: { type: Number, default: 15 },
    exerciseReminderBefore: { type: Number, default: 15 },
    medicationEnabled: { type: Boolean, default: true },
    mealEnabled: { type: Boolean, default: true },
    exerciseEnabled: { type: Boolean, default: true },
  },
  avatar: { type: String, default: null },
  linkCode: { type: String, unique: true, sparse: true }, // Mã cố định để liên kết (chỉ cho PATIENT)
}, {
  timestamps: true,
});

module.exports = mongoose.model('User', userSchema);





