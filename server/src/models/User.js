const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  phone: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ['PATIENT', 'CAREGIVER', 'DOCTOR'], required: true },
  caregiverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  caregiverPhone: { type: String, default: null },
  email: { type: String, default: null },
  googleId: { type: String, default: null },
  isVerified: { type: Boolean, default: false },
  isEmailVerified: { type: Boolean, default: false },
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
  medicationTimes: {
    morning: { type: String, default: '08:00' },
    noon: { type: String, default: '12:00' },
    evening: { type: String, default: '20:00' },
  },
  avatar: { type: String, default: null },
  linkCode: { type: String, unique: true, sparse: true }, // Mã cố định để liên kết (chỉ cho PATIENT và DOCTOR)
  doctorProfile: {
    hospital: { type: String, default: null },
    specialty: { type: String, default: null },
    licenseNumber: { type: String, default: null }
  }
}, {
  timestamps: true,
});

module.exports = mongoose.model('User', userSchema);





