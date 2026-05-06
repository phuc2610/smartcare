const express = require('express');
const router = express.Router();
const {
  requestLink,
  acceptLink,
  getCaregiverRequests,
  respondToRequest,
  getPatients,
  getPatientDetail,
  getAlerts,
  markAlertAsRead,
  getMedicationTimeline,
  getMedicationWeekHistory,
  getMedicationAdherence,
  getDailyHealthSummary,
  getAppointments,
  getCareNotes,
  createCareNote,
  getLocationStatus,
  getEmergencyContacts,
  getPatientTasks,
  sendTaskNotification,
  getPatientTodayStatus,
  requestLinkSchema,
  acceptLinkSchema,
  respondToRequestSchema,
  createCareNoteSchema,
  sendTaskNotificationSchema,
} = require('../controllers/caregiver.controller');
const { authenticate } = require('../middleware/auth');
const validate = require('../middleware/validate');

// Link management
router.post('/link/request', authenticate, validate(requestLinkSchema), requestLink);
router.post('/link/accept', authenticate, validate(acceptLinkSchema), acceptLink);
router.get('/requests', authenticate, getCaregiverRequests);
router.post('/requests/respond', authenticate, validate(respondToRequestSchema), respondToRequest);

// Patient management
router.get('/patients', authenticate, getPatients);
router.get('/patients/:patientId', authenticate, getPatientDetail);
router.get('/patients/:patientId/today-status', authenticate, getPatientTodayStatus);

// Alerts
router.get('/alerts', authenticate, getAlerts);
router.patch('/alerts/:alertId/read', authenticate, markAlertAsRead);

// Medication tracking
router.get('/patients/:patientId/medications/timeline', authenticate, getMedicationTimeline);
router.get('/patients/:patientId/medications/week-history', authenticate, getMedicationWeekHistory);
router.get('/patients/:patientId/medications/adherence', authenticate, getMedicationAdherence);

// Health tracking
router.get('/patients/:patientId/health/daily', authenticate, getDailyHealthSummary);

// Appointments
router.get('/patients/:patientId/appointments', authenticate, getAppointments);

// Care notes
router.get('/patients/:patientId/notes', authenticate, getCareNotes);
router.post('/patients/:patientId/notes', authenticate, validate(createCareNoteSchema), createCareNote);

// Location & Safety
router.get('/patients/:patientId/location', authenticate, getLocationStatus);

// Emergency contacts
router.get('/patients/:patientId/emergency-contacts', authenticate, getEmergencyContacts);

// Patient tasks
router.get('/patients/:patientId/tasks', authenticate, getPatientTasks);
router.post('/patients/:patientId/tasks/:taskId/notify', authenticate, validate(sendTaskNotificationSchema), sendTaskNotification);

module.exports = router;





