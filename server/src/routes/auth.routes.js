const express = require('express');
const router = express.Router();
const {
  register,
  login,
  forgotPassword,
  resetPassword,
  changePassword,
  deleteAccount,
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
  deleteAccountSchema,
} = require('../controllers/auth.controller');
const { authenticate } = require('../middleware/auth');
const validate = require('../middleware/validate');

router.post('/register', validate(registerSchema), register);
router.post('/login', validate(loginSchema), login);
router.post('/forgot-password', validate(forgotPasswordSchema), forgotPassword);
router.post('/reset-password', validate(resetPasswordSchema), resetPassword);
router.post('/change-password', authenticate, validate(changePasswordSchema), changePassword);
router.post('/delete-account', authenticate, validate(deleteAccountSchema), deleteAccount);

module.exports = router;





