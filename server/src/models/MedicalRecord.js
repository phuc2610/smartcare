const mongoose = require('mongoose');

/**
 * MedicalRecord — Hồ sơ khám bệnh (Visit Record)
 * Mỗi lần bác sĩ khám tạo ra 1 bản ghi độc lập.
 * Liên kết: Appointment → MedicalRecord → Medications (Prescription)
 */
const medicalRecordSchema = new mongoose.Schema({
  // Liên kết cơ bản
  patientId:     { type: mongoose.Schema.Types.ObjectId, ref: 'User',        required: true },
  doctorId:      { type: mongoose.Schema.Types.ObjectId, ref: 'User',        required: true },
  appointmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment', default: null },

  // Triệu chứng (array of { name, severity 1-10, notes })
  symptoms: [{
    name:     { type: String, required: true },
    severity: { type: Number, min: 1, max: 10, default: 5 },
    notes:    { type: String, default: '' },
  }],

  // Dấu hiệu sinh tồn
  vitalSigns: {
    bloodPressure: { type: String, default: '' },  // VD: "120/80"
    heartRate:     { type: Number, default: null }, // bpm
    temperature:   { type: Number, default: null }, // °C
    weight:        { type: Number, default: null }, // kg
    height:        { type: Number, default: null }, // cm
    spO2:          { type: Number, default: null }, // %
    bloodSugar:    { type: Number, default: null }, // mmol/L
  },

  // Chẩn đoán
  diagnosis:   { type: String, required: true },
  icdCode:     { type: String, default: '' },     // ICD-10 (optional)
  note:        { type: String, default: '' },     // Ghi chú thêm của bác sĩ

  // Đơn thuốc được kê trong lần khám này
  prescriptionIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Medication' }],

  // Lịch tái khám đề nghị
  followUpDate: { type: Date, default: null },

  // Trạng thái hồ sơ
  status: {
    type: String,
    enum: ['DRAFT', 'COMPLETED'],
    default: 'COMPLETED',
  },
}, { timestamps: true });

// Index tìm nhanh theo bệnh nhân và thời gian
medicalRecordSchema.index({ patientId: 1, createdAt: -1 });
medicalRecordSchema.index({ doctorId: 1,  createdAt: -1 });
medicalRecordSchema.index({ patientId: 1, doctorId: 1 });

module.exports = mongoose.model('MedicalRecord', medicalRecordSchema);
