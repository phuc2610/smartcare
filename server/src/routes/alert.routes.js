const express = require('express');
const router  = express.Router();
const { authenticate } = require('../middleware/auth');
const {
  analyzeOne,
  analyzeAll,
  getPatientAlerts,
  getDoctorAlertSummary,
  markRead,
  markAllRead,
} = require('../controllers/alert.controller');

// Chạy engine phân tích cho tất cả bệnh nhân của bác sĩ (gọi từ Dashboard)
router.post('/analyze-all', authenticate, analyzeAll);

// Chạy engine cho 1 bệnh nhân cụ thể (gọi từ PatientDetails)
router.post('/analyze/:patientId', authenticate, analyzeOne);

// Tổng hợp alerts cho bác sĩ (Dashboard widget)
router.get('/doctor/summary', authenticate, getDoctorAlertSummary);

// Lấy alerts của 1 bệnh nhân
router.get('/patient/:patientId', authenticate, getPatientAlerts);

// Đánh dấu 1 alert đã đọc
router.patch('/:alertId/read', authenticate, markRead);

// Đánh dấu tất cả alerts của bệnh nhân đã đọc
router.patch('/patient/:patientId/read-all', authenticate, markAllRead);

module.exports = router;
