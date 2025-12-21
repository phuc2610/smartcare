const mongoose = require('mongoose');

const healthLogSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: Date, required: true },
  type: { type: String, enum: ['meal', 'exercise', 'symptom'], required: true },
  scheduledDate: { type: Date }, // Ngày dự kiến thực hiện
  scheduledTime: { type: String }, // Giờ dự kiến (format: "HH:mm")
  isCompleted: { type: Boolean, default: false }, // Đã hoàn thành hay chưa
  notificationIds: { type: [String], default: [] }, // Array of notification IDs for multiple reminders
  details: {
    foodName: String,
    calories: Number,
    exerciseType: String,
    durationMinutes: Number,
    caloriesBurned: Number,
    symptomName: String,
    severity: Number,
    note: String,
  },
}, {
  timestamps: true,
});

healthLogSchema.index({ userId: 1, date: -1 });
healthLogSchema.index({ userId: 1, scheduledDate: 1, scheduledTime: 1 });

module.exports = mongoose.model('HealthLog', healthLogSchema);





