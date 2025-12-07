const express = require('express');
const router = express.Router();
const {
  createMedication,
  getTodayReminders,
  updateReminderStatus,
  updateReminder,
  getMedications,
  deleteMedication,
  createMedicationSchema,
  updateReminderSchema,
} = require('../controllers/medication.controller');
const { authenticate } = require('../middleware/auth');
const validate = require('../middleware/validate');

router.post('/', authenticate, validate(createMedicationSchema), createMedication);
router.get('/today', authenticate, getTodayReminders);
router.get('/', authenticate, getMedications);
router.patch('/:id/take', authenticate, updateReminderStatus);
router.patch('/reminders/:id', authenticate, validate(updateReminderSchema), updateReminder);
router.delete('/:id', authenticate, deleteMedication);

module.exports = router;





