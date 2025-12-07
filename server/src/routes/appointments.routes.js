const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const {
  createAppointment,
  getAppointments,
  updateAppointment,
  deleteAppointment,
  createAppointmentSchema,
} = require('../controllers/appointment.controller');
const validate = require('../middleware/validate');

router.use(authenticate);

router.post('/', validate(createAppointmentSchema), createAppointment);
router.get('/', getAppointments);
router.patch('/:id', updateAppointment);
router.delete('/:id', deleteAppointment);

module.exports = router;

