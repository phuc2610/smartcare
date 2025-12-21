const mongoose = require('mongoose');

const caregiverRequestSchema = new mongoose.Schema({
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  caregiverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: { 
    type: String, 
    enum: ['pending', 'accepted', 'rejected'], 
    default: 'pending' 
  },
  requestedAt: { type: Date, default: Date.now },
  respondedAt: { type: Date, default: null },
}, {
  timestamps: true,
});

caregiverRequestSchema.index({ patientId: 1, caregiverId: 1 });
caregiverRequestSchema.index({ patientId: 1, status: 1 });
caregiverRequestSchema.index({ caregiverId: 1, status: 1 });

module.exports = mongoose.model('CaregiverRequest', caregiverRequestSchema);


