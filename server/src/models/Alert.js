const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema({
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { 
    type: String, 
    enum: ['medication', 'symptom', 'appointment', 'sos', 'fall'], 
    required: true 
  },
  severity: { 
    type: String, 
    enum: ['warning', 'error', 'info'], 
    default: 'info' 
  },
  title: { type: String, required: true },
  message: { type: String, required: true },
  actionUrl: { type: String }, // e.g., 'medication', 'appointment'
  isRead: { type: Boolean, default: false },
  readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // Caregivers who read it
}, {
  timestamps: true,
});

alertSchema.index({ patientId: 1, createdAt: -1 });
alertSchema.index({ patientId: 1, isRead: 1 });
alertSchema.index({ patientId: 1, severity: 1 });

module.exports = mongoose.model('Alert', alertSchema);


