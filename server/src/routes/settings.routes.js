const express = require('express');
const router = express.Router();
const {
  getNotificationSettings,
  updateNotificationSettings,
  getMedicationTimes,
  updateMedicationTimes,
} = require('../controllers/settings.controller');

router.get('/notifications', getNotificationSettings);
router.patch('/notifications', updateNotificationSettings);

router.get('/medication-times', getMedicationTimes);
router.patch('/medication-times', updateMedicationTimes);

module.exports = router;

