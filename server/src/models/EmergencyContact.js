const mongoose = require('mongoose');

const emergencyContactSchema = new mongoose.Schema({
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  phone: { type: String, required: true },
  relationship: { type: String, required: true }, // e.g., 'Con trai', 'Vợ', 'Bác sĩ'
  isPrimary: { type: Boolean, default: false },
}, {
  timestamps: true,
});

emergencyContactSchema.index({ patientId: 1 });
emergencyContactSchema.index({ patientId: 1, isPrimary: 1 });

module.exports = mongoose.model('EmergencyContact', emergencyContactSchema);


