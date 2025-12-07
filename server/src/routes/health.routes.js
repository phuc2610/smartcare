const express = require('express');
const router = express.Router();
const {
  createHealthLog,
  getHealthSummary,
  getScheduledTasks,
  getTodayHealthLogs,
  updateHealthLog,
  deleteHealthLog,
  createHealthLogSchema,
  updateHealthLogSchema,
} = require('../controllers/health.controller');
const { authenticate } = require('../middleware/auth');
const validate = require('../middleware/validate');

router.post('/logs', authenticate, validate(createHealthLogSchema), createHealthLog);
router.get('/summary', authenticate, getHealthSummary);
router.get('/scheduled', authenticate, getScheduledTasks);
router.get('/today', authenticate, getTodayHealthLogs);
router.patch('/logs/:id', authenticate, validate(updateHealthLogSchema), updateHealthLog);
router.delete('/logs/:id', authenticate, deleteHealthLog);

module.exports = router;





