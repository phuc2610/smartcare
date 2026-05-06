const cron = require('node-cron');
const Reminder = require('../models/Reminder');
const Alert = require('../models/Alert');
const Medication = require('../models/Medication');

/**
 * Creates an alert for the patient's caregivers.
 */
const createMissedMedicationAlert = async (patientId, medicationName, delayMinutes, severity = 'warning') => {
  try {
    await Alert.create({
      patientId,
      type: 'medication_missed',
      severity,
      title: 'Quên uống thuốc',
      message: `Bệnh nhân đã quên uống thuốc ${medicationName} quá ${delayMinutes} phút.`,
      actionUrl: 'medication',
    });
    console.log(`[ESCALATION] Created ${severity} alert for patient ${patientId} (missed ${medicationName} by ${delayMinutes}m)`);
  } catch (error) {
    console.error('[ESCALATION] Error creating alert:', error);
  }
};

/**
 * Escalate pending reminders based on time past due.
 * Level 1: 5 minutes past due (Notify Patient)
 * Level 2: 15 minutes past due (Notify Patient)
 * Level 3: 30 minutes past due (Notify Patient + Warning Alert to Caregiver)
 * Level 4: 60+ minutes past due (Error Alert to Caregiver)
 */
const checkAndEscalateReminders = async () => {
  try {
    const now = new Date();
    
    // Find all pending reminders scheduled in the past
    const pendingReminders = await Reminder.find({
      status: 'PENDING',
      scheduledTime: { $lt: now }
    }).populate('medicationId');

    for (const reminder of pendingReminders) {
      if (!reminder.medicationId || !reminder.medicationId.userId) continue;
      
      const scheduledTime = new Date(reminder.scheduledTime).getTime();
      const delayMs = now.getTime() - scheduledTime;
      const delayMinutes = Math.floor(delayMs / 60000);
      
      const patientId = reminder.medicationId.userId;
      const medicationName = reminder.medicationName;

      // 60+ mins late -> Level 4
      if (delayMinutes >= 60 && reminder.escalationLevel < 4) {
        reminder.escalationLevel = 4;
        await reminder.save();
        await createMissedMedicationAlert(patientId, medicationName, delayMinutes, 'error');
      } 
      // 30+ mins late -> Level 3
      else if (delayMinutes >= 30 && delayMinutes < 60 && reminder.escalationLevel < 3) {
        reminder.escalationLevel = 3;
        await reminder.save();
        await createMissedMedicationAlert(patientId, medicationName, delayMinutes, 'warning');
      }
      // 15+ mins late -> Level 2
      else if (delayMinutes >= 15 && delayMinutes < 30 && reminder.escalationLevel < 2) {
        reminder.escalationLevel = 2;
        await reminder.save();
        console.log(`[ESCALATION] Level 2: Patient ${patientId} missed ${medicationName} by 15m. Patient needs another notification.`);
        // In a real app with FCM: sendPushNotification(patientId, '...', '...');
      }
      // 5+ mins late -> Level 1
      else if (delayMinutes >= 5 && delayMinutes < 15 && reminder.escalationLevel < 1) {
        reminder.escalationLevel = 1;
        await reminder.save();
        console.log(`[ESCALATION] Level 1: Patient ${patientId} missed ${medicationName} by 5m. Patient needs a reminder.`);
        // In a real app with FCM: sendPushNotification(patientId, '...', '...');
      }
    }
  } catch (error) {
    console.error('[ESCALATION] Error checking reminders:', error);
  }
};

/**
 * Initializes the escalation cron job.
 * Runs every minute.
 */
const initEscalationCron = () => {
  cron.schedule('* * * * *', () => {
    checkAndEscalateReminders();
  });
  console.log('[CRON] Smart Escalation Service initialized.');
};

module.exports = {
  initEscalationCron,
  checkAndEscalateReminders
};
