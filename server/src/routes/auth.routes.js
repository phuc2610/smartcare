const express = require('express');
const router = express.Router();
const {
  register,
  login,
  forgotPassword,
  resetPassword,
  changePassword,
  deleteAccount,
  sendOTP,
  verifyOTP,
  googleLogin,
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
  deleteAccountSchema,
  sendOTPSchema,
  verifyOTPSchema,
  googleLoginSchema,
} = require('../controllers/auth.controller');
const { authenticate } = require('../middleware/auth');
const validate = require('../middleware/validate');

router.post('/register', validate(registerSchema), register);
router.post('/login', validate(loginSchema), login);
router.post('/forgot-password', validate(forgotPasswordSchema), forgotPassword);
router.post('/reset-password', validate(resetPasswordSchema), resetPassword);
router.post('/change-password', authenticate, validate(changePasswordSchema), changePassword);
router.post('/delete-account', authenticate, validate(deleteAccountSchema), deleteAccount);

// Email OTP
router.post('/send-otp', validate(sendOTPSchema), sendOTP);
router.post('/verify-otp', validate(verifyOTPSchema), verifyOTP);

// Google Sign-In
router.post('/google', validate(googleLoginSchema), googleLogin);

module.exports = router;
