const mongoose = require('mongoose');

const linkSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true },
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  expiresAt: { type: Date, required: true },
}, {
  timestamps: true,
});

linkSchema.index({ code: 1, expiresAt: 1 });

module.exports = mongoose.model('Link', linkSchema);





