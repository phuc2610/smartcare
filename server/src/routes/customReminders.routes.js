const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const {
  createCustomReminder,
  getCustomReminders,
  updateCustomReminder,
  deleteCustomReminder,
  createCustomReminderSchema,
} = require('../controllers/customReminder.controller');
const validate = require('../middleware/validate');

router.use(authenticate);

router.post('/', validate(createCustomReminderSchema), createCustomReminder);
router.get('/', getCustomReminders);
router.patch('/:id', updateCustomReminder);
router.delete('/:id', deleteCustomReminder);

module.exports = router;

