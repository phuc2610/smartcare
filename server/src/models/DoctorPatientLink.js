const mongoose = require('mongoose');

const doctorPatientLinkSchema = new mongoose.Schema({
  doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: { type: String, enum: ['ACTIVE', 'REVOKED'], default: 'ACTIVE' },
  expiresAt: { type: Date, default: null }, // Null means permanent until revoked
  grantedAt: { type: Date, default: Date.now },
  permissions: {
    // Phase 3 placeholder: fine-grained permissions
    canViewVitals: { type: Boolean, default: true },
    canViewMedications: { type: Boolean, default: true },
    canPrescribe: { type: Boolean, default: true },
  }
}, {
  timestamps: true,
});

// Ensure a patient doesn't connect to the same doctor twice with multiple active links
doctorPatientLinkSchema.index({ doctorId: 1, patientId: 1 }, { unique: true });

module.exports = mongoose.model('DoctorPatientLink', doctorPatientLinkSchema);
