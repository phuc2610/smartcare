const express = require('express');
const router = express.Router();
const { getComprehensiveReport, exportPDF } = require('../controllers/report.controller');
const { authenticate } = require('../middleware/auth');

router.get('/overview', authenticate, getComprehensiveReport);
// PDF export can use token in query param (for mobile Linking.openURL)
router.get('/export-pdf', (req, res, next) => {
  // Try authenticate middleware first, but don't fail if no header token
  if (req.headers.authorization) {
    return authenticate(req, res, next);
  }
  // If no header token but has query token, continue (will be handled in controller)
  next();
}, exportPDF);

module.exports = router;





