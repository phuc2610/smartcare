const mongoose = require('mongoose');

const aiReportSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  range: {
    type: String,
    enum: ['week', 'month'],
    required: true,
  },
  medicalCondition: {
    type: String,
    required: true,
  },
  notes: {
    type: String,
    required: true,
  },
  dateKey: {
    type: String, // YYYY-MM-DD format
    required: true,
    index: true,
  },
  expiresAt: {
    type: Date,
    required: true,
    index: true,
  },
}, {
  timestamps: true,
});

// Compound index for efficient queries
aiReportSchema.index({ userId: 1, range: 1, medicalCondition: 1, dateKey: 1 }, { unique: true });

// Auto-delete expired documents (optional, can be handled by TTL index)
aiReportSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('AIReport', aiReportSchema);


