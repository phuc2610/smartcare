const express = require('express');
const router = express.Router();
const {
  getNotificationSettings,
  updateNotificationSettings,
} = require('../controllers/settings.controller');

router.get('/notifications', getNotificationSettings);
router.patch('/notifications', updateNotificationSettings);

module.exports = router;

