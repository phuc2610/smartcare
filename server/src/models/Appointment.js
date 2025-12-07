const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  doctorName: { type: String, required: true },
  doctorSpecialty: { type: String, default: '' },
  hospitalName: { type: String, default: '' },
  appointmentDate: { type: Date, required: true },
  appointmentTime: { type: String, default: '' }, // HH:mm format
  notes: { type: String, default: '' },
  reminderBefore: { type: Number, default: 24 }, // hours before appointment
  isCompleted: { type: Boolean, default: false },
  notificationId: { type: String, default: null }, // For notifee
}, {
  timestamps: true,
});

appointmentSchema.index({ userId: 1, appointmentDate: 1 });
appointmentSchema.index({ userId: 1, isCompleted: 1 });

module.exports = mongoose.model('Appointment', appointmentSchema);

