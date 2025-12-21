const mongoose = require('mongoose');

const careNoteSchema = new mongoose.Schema({
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  caregiverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  content: { type: String, required: true },
  tags: [{ type: String }],
}, {
  timestamps: true,
});

careNoteSchema.index({ patientId: 1, createdAt: -1 });
careNoteSchema.index({ caregiverId: 1, createdAt: -1 });

module.exports = mongoose.model('CareNote', careNoteSchema);


