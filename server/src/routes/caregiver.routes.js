const express = require('express');
const router = express.Router();
const {
  requestLink,
  acceptLink,
  getPatients,
  requestLinkSchema,
  acceptLinkSchema,
} = require('../controllers/caregiver.controller');
const { authenticate } = require('../middleware/auth');
const validate = require('../middleware/validate');

router.post('/link/request', authenticate, validate(requestLinkSchema), requestLink);
router.post('/link/accept', authenticate, validate(acceptLinkSchema), acceptLink);
router.get('/patients', authenticate, getPatients);

module.exports = router;





