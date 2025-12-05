const mongoose = require('mongoose');

const wellnessLogSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['breathing', 'music'], required: true },
  durationSeconds: { type: Number, required: true },
  date: { type: Date, default: Date.now },
}, {
  timestamps: true,
});

module.exports = mongoose.model('WellnessLog', wellnessLogSchema);





