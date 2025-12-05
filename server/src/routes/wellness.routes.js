const express = require('express');
const router = express.Router();
const { logWellness, logWellnessSchema } = require('../controllers/wellness.controller');
const { authenticate } = require('../middleware/auth');
const validate = require('../middleware/validate');

router.post('/log', authenticate, validate(logWellnessSchema), logWellness);

module.exports = router;





