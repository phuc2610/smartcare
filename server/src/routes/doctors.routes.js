const express = require('express');
const router = express.Router();
const doctorController = require('../controllers/doctor.controller');
const { authenticate } = require('../middleware/auth');

// Lấy profile của bác sĩ
router.get('/profile', authenticate, doctorController.getProfile);

// Bệnh nhân link với bác sĩ
router.post('/link', authenticate, doctorController.linkDoctor);

// Bệnh nhân hủy link với bác sĩ
router.post('/revoke/:doctorId', authenticate, doctorController.revokeDoctor);

// Bệnh nhân lấy danh sách bác sĩ của mình
router.get('/my-doctors', authenticate, doctorController.getMyDoctors);

// Bác sĩ lấy danh sách bệnh nhân
router.get('/patients', authenticate, doctorController.getPatients);

// Bác sĩ lấy thông tin hồ sơ của 1 bệnh nhân
router.get('/patients/:patientId/profile', authenticate, doctorController.getPatientProfile);

// Bác sĩ lấy chỉ số của 1 bệnh nhân
router.get('/patients/:patientId/vitals', authenticate, doctorController.getPatientVitals);

// Bác sĩ kê đơn thuốc cho bệnh nhân
router.post('/patients/:patientId/prescriptions', authenticate, doctorController.prescribeMedication);

// Bác sĩ xem độ tuân thủ thuốc của bệnh nhân
router.get('/patients/:patientId/adherence', authenticate, doctorController.getPatientAdherence);

module.exports = router;
