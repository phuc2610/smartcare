const express = require('express');
const router = express.Router();
const { getComprehensiveReport } = require('../controllers/report.controller');
const { authenticate } = require('../middleware/auth');

router.get('/overview', authenticate, getComprehensiveReport);

module.exports = router;





