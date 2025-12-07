const Reminder = require('../models/Reminder');
const CustomReminder = require('../models/CustomReminder');
const Appointment = require('../models/Appointment');
const User = require('../models/User');

// Check for missed medications and send notifications
const checkMissedMedications = async () => {
  try {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000); // 1 hour ago
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000); // 2 hours ago

    // Find reminders that are 1-2 hours past due and still PENDING
    const missedReminders = await Reminder.find({
      scheduledTime: { $gte: twoHoursAgo, $lte: oneHourAgo },
      status: 'PENDING',
    }).populate('medicationId', 'userId');

    for (const reminder of missedReminders) {
      if (reminder.medicationId && reminder.medicationId.userId) {
        const user = await User.findById(reminder.medicationId.userId);
        if (user && user.notificationSettings?.medicationEnabled) {
          // TODO: Send push notification
          console.log(`[MISSED] User ${user.name} missed medication: ${reminder.medicationName}`);
        }
      }
    }

    return { count: missedReminders.length };
  } catch (error) {
    console.error('[NOTIFICATION] Check missed medications error:', error);
    throw error;
  }
};

// Schedule notifications for custom reminders
const scheduleCustomReminderNotifications = async (reminder) => {
  try {
    const reminderTime = new Date(reminder.reminderTime);
    const now = new Date();

    if (reminderTime <= now) {
      return; // Past reminder, skip
    }

    // TODO: Use notifee to schedule notification
    // This would be called from mobile app when creating/updating reminder
    console.log(`[NOTIFICATION] Schedule custom reminder: ${reminder.title} at ${reminderTime}`);

    return reminder;
  } catch (error) {
    console.error('[NOTIFICATION] Schedule custom reminder error:', error);
    throw error;
  }
};

// Schedule notifications for appointments
const scheduleAppointmentNotifications = async (appointment) => {
  try {
    const appointmentDate = new Date(appointment.appointmentDate);
    const reminderTime = new Date(appointmentDate);
    reminderTime.setHours(reminderTime.getHours() - appointment.reminderBefore);

    const now = new Date();

    if (reminderTime <= now) {
      return; // Past reminder, skip
    }

    // TODO: Use notifee to schedule notification
    // This would be called from mobile app when creating/updating appointment
    console.log(`[NOTIFICATION] Schedule appointment reminder: ${appointment.doctorName} at ${reminderTime}`);

    return appointment;
  } catch (error) {
    console.error('[NOTIFICATION] Schedule appointment reminder error:', error);
    throw error;
  }
};

module.exports = {
  checkMissedMedications,
  scheduleCustomReminderNotifications,
  scheduleAppointmentNotifications,
};

