/**
 * NOTIFICATION CONTROLLER - Utility functions cho thông báo
 * Chức năng: Kiểm tra thuốc đã quên, lên lịch thông báo cho custom reminders và appointments
 * Lưu ý: Các functions này chủ yếu log, chưa tích hợp push notification thực tế
 */

const Reminder = require('../models/Reminder');
const CustomReminder = require('../models/CustomReminder');
const Appointment = require('../models/Appointment');
const User = require('../models/User');

/**
 * Kiểm tra thuốc đã quên (quá 1-2 giờ, status vẫn PENDING) và gửi thông báo
 * Luồng: Tính thời gian 1-2 giờ trước -> Tìm reminders quá hạn -> Kiểm tra user có bật notification -> Log (TODO: gửi push)
 */
const checkMissedMedications = async () => {
  try {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000); // 1 giờ trước
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000); // 2 giờ trước

    // Tìm reminders đã quá 1-2 giờ và vẫn còn PENDING
    const missedReminders = await Reminder.find({
      scheduledTime: { $gte: twoHoursAgo, $lte: oneHourAgo },
      status: 'PENDING',
    }).populate('medicationId', 'userId'); // Populate để lấy userId

    // Duyệt qua từng reminder và gửi thông báo (nếu user bật notification)
    for (const reminder of missedReminders) {
      if (reminder.medicationId && reminder.medicationId.userId) {
        const user = await User.findById(reminder.medicationId.userId);
        if (user && user.notificationSettings?.medicationEnabled) {
          // TODO: Gửi push notification thực tế (hiện tại chỉ log)
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

/**
 * Lên lịch thông báo cho custom reminder
 * Luồng: Kiểm tra reminderTime chưa qua -> Log (TODO: schedule notification bằng notifee)
 * Lưu ý: Function này được gọi từ mobile app khi tạo/cập nhật reminder
 */
const scheduleCustomReminderNotifications = async (reminder) => {
  try {
    const reminderTime = new Date(reminder.reminderTime);
    const now = new Date();

    // Nếu reminder đã qua thì bỏ qua
    if (reminderTime <= now) {
      return; // Past reminder, skip
    }

    // TODO: Sử dụng notifee để schedule notification thực tế
    // Function này được gọi từ mobile app khi tạo/cập nhật reminder
    console.log(`[NOTIFICATION] Schedule custom reminder: ${reminder.title} at ${reminderTime}`);

    return reminder;
  } catch (error) {
    console.error('[NOTIFICATION] Schedule custom reminder error:', error);
    throw error;
  }
};

/**
 * Lên lịch thông báo cho appointment
 * Luồng: Tính reminderTime (appointmentDate - reminderBefore giờ) -> Kiểm tra chưa qua -> Log (TODO: schedule notification)
 * Lưu ý: Function này được gọi từ mobile app khi tạo/cập nhật appointment
 */
const scheduleAppointmentNotifications = async (appointment) => {
  try {
    const appointmentDate = new Date(appointment.appointmentDate);
    const reminderTime = new Date(appointmentDate);
    // Tính thời gian nhắc: appointmentDate - reminderBefore giờ
    reminderTime.setHours(reminderTime.getHours() - appointment.reminderBefore);

    const now = new Date();

    // Nếu reminder đã qua thì bỏ qua
    if (reminderTime <= now) {
      return; // Past reminder, skip
    }

    // TODO: Sử dụng notifee để schedule notification thực tế
    // Function này được gọi từ mobile app khi tạo/cập nhật appointment
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

