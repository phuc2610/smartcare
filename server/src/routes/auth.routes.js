const express = require('express');
const router = express.Router();
const {
  register,
  login,
  requestOTP,
  verifyOTP,
  registerSchema,
  loginSchema,
  otpVerifySchema,
} = require('../controllers/auth.controller');
const validate = require('../middleware/validate');

router.post('/register', validate(registerSchema), register);
router.post('/login', validate(loginSchema), login);
router.post('/otp/request', requestOTP);
router.post('/otp/verify', validate(otpVerifySchema), verifyOTP);

module.exports = router;





