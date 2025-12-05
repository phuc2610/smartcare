const express = require('express');
const router = express.Router();
const {
  createHealthLog,
  getHealthSummary,
  createHealthLogSchema,
} = require('../controllers/health.controller');
const { authenticate } = require('../middleware/auth');
const validate = require('../middleware/validate');

router.post('/logs', authenticate, validate(createHealthLogSchema), createHealthLog);
router.get('/summary', authenticate, getHealthSummary);

module.exports = router;





