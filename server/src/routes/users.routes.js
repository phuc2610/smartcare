const express = require('express');
const router = express.Router();
const { getMe, updateProfile, updateProfileSchema } = require('../controllers/user.controller');
const { authenticate } = require('../middleware/auth');
const validate = require('../middleware/validate');

router.get('/me', authenticate, getMe);
router.patch('/me', authenticate, validate(updateProfileSchema), updateProfile);

module.exports = router;





