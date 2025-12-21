const mongoose = require('mongoose');

const reminderSchema = new mongoose.Schema({
  medicationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Medication', required: true },
  medicationName: { type: String, required: true },
  dosage: { type: String, required: true },
  unit: { type: String, required: true },
  scheduledTime: { type: Date, required: true },
  status: { type: String, enum: ['PENDING', 'TAKEN', 'SKIPPED'], default: 'PENDING' },
  takenAt: { type: Date, default: null },
  isSynced: { type: Boolean, default: true },
  lastUpdated: { type: Date, default: Date.now },
  notificationIds: { type: [String], default: [] }, // Array of notification IDs for multiple reminders
}, {
  timestamps: true,
});

reminderSchema.index({ medicationId: 1, scheduledTime: 1 });

module.exports = mongoose.model('Reminder', reminderSchema);





