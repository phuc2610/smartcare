const mongoose = require('mongoose');

const prescriptionMedicationSchema = new mongoose.Schema({
  name: { type: String, required: true },
  dosage: { type: String, default: '' },
  quantity: { type: Number, default: 0 },
  unit: { type: String, default: 'Viên' },
  sessions: [{ type: String, enum: ['MORNING', 'NOON', 'AFTERNOON', 'EVENING'] }],
  mealTiming: { type: String, enum: ['BEFORE_MEAL', 'AFTER_MEAL', 'DURING_MEAL', 'NONE'], default: 'AFTER_MEAL' },
  instructions: { type: String, default: '' },
  usage: { type: String, default: '' }, // Công dụng tham khảo
  isActive: { type: Boolean, default: true },
});

const prescriptionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  imageUrl: { type: String, default: null },
  doctorName: { type: String, default: '' },
  patientName: { type: String, default: '' },
  diagnosis: { type: String, default: '' },
  startDate: { type: String, default: '' },
  notes: { type: String, default: '' },
  medications: [prescriptionMedicationSchema],
  status: { type: String, enum: ['draft', 'confirmed', 'archived'], default: 'draft' },
}, {
  timestamps: true,
});

module.exports = mongoose.model('Prescription', prescriptionSchema);
