const mongoose = require('mongoose');

const healthLogSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: Date, required: true },
  type: { type: String, enum: ['meal', 'exercise', 'symptom'], required: true },
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

module.exports = mongoose.model('HealthLog', healthLogSchema);





