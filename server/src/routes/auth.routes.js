const express = require('express');
const router = express.Router();
const {
  register,
  login,
  requestOTP,
  verifyOTP,
  forgotPassword,
  resetPassword,
  changePassword,
  registerSchema,
  loginSchema,
  otpVerifySchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
} = require('../controllers/auth.controller');
const { authenticate } = require('../middleware/auth');
const validate = require('../middleware/validate');

router.post('/register', validate(registerSchema), register);
router.post('/login', validate(loginSchema), login);
router.post('/otp/request', requestOTP);
router.post('/otp/verify', validate(otpVerifySchema), verifyOTP);
router.post('/forgot-password', validate(forgotPasswordSchema), forgotPassword);
router.post('/reset-password', validate(resetPasswordSchema), resetPassword);
router.post('/change-password', authenticate, validate(changePasswordSchema), changePassword);

module.exports = router;





