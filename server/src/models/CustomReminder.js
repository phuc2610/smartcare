const mongoose = require('mongoose');

const customReminderSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  description: { type: String, default: '' },
  reminderTime: { type: Date, required: true },
  repeatType: { 
    type: String, 
    enum: ['NONE', 'DAILY', 'WEEKLY', 'MONTHLY'], 
    default: 'NONE' 
  },
  repeatDays: [{ type: Number }], // 0-6 for weekly (0 = Sunday)
  isActive: { type: Boolean, default: true },
  notificationId: { type: String, default: null }, // For notifee
  lastTriggered: { type: Date, default: null },
}, {
  timestamps: true,
});

customReminderSchema.index({ userId: 1, reminderTime: 1 });
customReminderSchema.index({ userId: 1, isActive: 1 });

module.exports = mongoose.model('CustomReminder', customReminderSchema);

