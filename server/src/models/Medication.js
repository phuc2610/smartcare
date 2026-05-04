const mongoose = require('mongoose');

const medicationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  prescriptionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Prescription', default: null },
  name: { type: String, required: true },
  dosage: { type: String, required: true },
  unit: { type: String, default: 'mg' },
  notes: { type: String, default: null },
  isActive: { type: Boolean, default: true },
  prescribedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  frequency: { type: String, enum: ['DAILY', 'EVERY_OTHER_DAY'], required: true },
  sessions: [{ type: String, enum: ['MORNING', 'NOON', 'EVENING'] }],
  mealTiming: { type: String, enum: ['BEFORE_MEAL', 'AFTER_MEAL', 'NONE'], default: 'NONE' },
  times: [{ type: String }], // Array of "HH:mm" - Fallback for older apps or custom exact times
  startDate: { type: Date, required: true },
  endDate: { type: Date, default: null },
}, {
  timestamps: true,
});

module.exports = mongoose.model('Medication', medicationSchema);





