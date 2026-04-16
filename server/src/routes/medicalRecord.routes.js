const express = require('express');
const router  = express.Router();
const { authenticate } = require('../middleware/auth');
const {
  createRecord,
  getRecords,
  getRecordById,
  updateRecord,
  getMyRecords,
} = require('../controllers/medicalRecord.controller');

// Bệnh nhân xem lịch sử khám của chính mình
router.get('/patient/my-records', authenticate, getMyRecords);

// Bác sĩ: lịch sử khám của 1 bệnh nhân
router.get('/:patientId', authenticate, getRecords);

// Bác sĩ: tạo hồ sơ khám mới (+ kê đơn) cho bệnh nhân
router.post('/:patientId', authenticate, createRecord);

// Bác sĩ: xem chi tiết 1 hồ sơ khám
router.get('/:patientId/:recordId', authenticate, getRecordById);

// Bác sĩ: cập nhật hồ sơ khám (chẩn đoán, ghi chú...)
router.patch('/:patientId/:recordId', authenticate, updateRecord);

module.exports = router;
