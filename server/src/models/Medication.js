const mongoose = require('mongoose');

const medicationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  dosage: { type: String, required: true },
  unit: { type: String, default: 'mg' },
  notes: { type: String, default: '' },
  frequency: { type: String, enum: ['DAILY', 'EVERY_OTHER_DAY'], required: true },
  times: [{ type: String }], // Array of "HH:mm"
  startDate: { type: Date, required: true },
}, {
  timestamps: true,
});

module.exports = mongoose.model('Medication', medicationSchema);





