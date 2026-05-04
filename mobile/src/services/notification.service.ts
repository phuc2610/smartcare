import notifee, { AndroidImportance } from '@notifee/react-native';

export const requestNotificationPermission = async (): Promise<boolean> => {
  const settings = await notifee.requestPermission();
  return settings.authorizationStatus >= 1;
};

export const scheduleMedicationReminder = async (
  title: string,
  body: string,
  scheduledTime: Date,
  reminderId: string
): Promise<string[]> => {
  const channelId = await notifee.createChannel({
    id: 'medication-reminders',
    name: 'Medication Reminders',
    importance: AndroidImportance.HIGH,
    sound: 'default',
    vibration: true,
    vibrationPattern: [300, 500],
    bypassDnd: true, // Bypass Do Not Disturb
  });

  const notificationIds: string[] = [];
  const now = new Date();
  const taskTime = new Date(scheduledTime);
  
  // Calculate notification times: 15p, 10p, 5p, 0p (if task is in the future)
  const notificationTimes = [
    { minutes: 15, body: body },
    { minutes: 10, body: body },
    { minutes: 5, body: body },
    { minutes: 0, body: 'Bạn trễ hẹn! ' + body },
  ];

  for (const { minutes, body: notificationBody } of notificationTimes) {
    const notificationTime = new Date(taskTime);
    notificationTime.setMinutes(notificationTime.getMinutes() - minutes);
    
    // Only schedule if notification time is in the future
    if (notificationTime > now) {
      const notificationId = await notifee.createTriggerNotification(
        {
          title: minutes === 0 ? '⚠️ Trễ hẹn' : title,
          body: notificationBody,
          data: { 
            reminderId,
            notificationType: 'medication',
            minutesBefore: minutes.toString(),
          },
          android: {
            channelId,
            importance: AndroidImportance.HIGH,
            pressAction: {
              id: 'default',
            },
            actions: [
              {
                title: 'Đã uống',
                pressAction: { id: 'mark_taken' }
              },
              {
                title: 'Nhắc sau 15p',
                pressAction: { id: 'snooze_15' }
              }
            ],
            showChronometer: false,
            autoCancel: true,
            ongoing: false,
            smallIcon: 'ic_notification_logo',
          },
        },
        {
          type: 0, // TIMESTAMP = 0
          timestamp: notificationTime.getTime(),
        }
      );
      notificationIds.push(notificationId);
    }
  }

  return notificationIds;
};

export const cancelNotification = async (notificationId: string): Promise<void> => {
  await notifee.cancelNotification(notificationId);
};

export const cancelNotifications = async (notificationIds: string[]): Promise<void> => {
  await Promise.all(notificationIds.map(id => notifee.cancelNotification(id)));
};

export const cancelAllNotifications = async (): Promise<void> => {
  await notifee.cancelAllNotifications();
};

export const scheduleHealthLogReminder = async (
  title: string,
  body: string,
  scheduledTime: Date,
  healthLogId: string
): Promise<string[]> => {
  const channelId = await notifee.createChannel({
    id: 'health-reminders',
    name: 'Health Reminders',
    importance: AndroidImportance.HIGH,
    sound: 'default',
    vibration: true,
    vibrationPattern: [300, 500],
  });

  const notificationIds: string[] = [];
  const now = new Date();
  const taskTime = new Date(scheduledTime);
  
  // Calculate notification times: 15p, 10p, 5p, 0p (if task is in the future)
  const notificationTimes = [
    { minutes: 15, body: body },
    { minutes: 10, body: body },
    { minutes: 5, body: body },
    { minutes: 0, body: 'Bạn trễ hẹn! ' + body },
  ];

  for (const { minutes, body: notificationBody } of notificationTimes) {
    const notificationTime = new Date(taskTime);
    notificationTime.setMinutes(notificationTime.getMinutes() - minutes);
    
    // Only schedule if notification time is in the future
    if (notificationTime > now) {
      const notificationId = await notifee.createTriggerNotification(
        {
          title: minutes === 0 ? '⚠️ Trễ hẹn' : title,
          body: notificationBody,
          data: { 
            healthLogId,
            notificationType: 'health',
            minutesBefore: minutes.toString(),
          },
          android: {
            channelId,
            importance: AndroidImportance.HIGH,
            pressAction: {
              id: 'default',
            },
            showChronometer: false,
            autoCancel: true,
            ongoing: false,
            visibility: 1, // PUBLIC - show on lock screen
            smallIcon: 'ic_notification_logo',
          },
        },
        {
          type: 0, // TIMESTAMP = 0
          timestamp: notificationTime.getTime(),
        }
      );
      notificationIds.push(notificationId);
    }
  }

  return notificationIds;
};

export const scheduleCustomReminder = async (
  title: string,
  body: string,
  scheduledTime: Date,
  reminderId: string
): Promise<string> => {
  const channelId = await notifee.createChannel({
    id: 'custom-reminders',
    name: 'Custom Reminders',
    importance: AndroidImportance.HIGH,
    sound: 'default',
  });

  const notificationId = await notifee.createTriggerNotification(
    {
      title,
      body,
      data: { reminderId, type: 'custom-reminder' },
      android: {
        channelId,
        importance: AndroidImportance.HIGH,
        pressAction: {
          id: 'default',
        },
        smallIcon: 'ic_notification_logo',
      },
    },
    {
      type: 0, // TIMESTAMP = 0
      timestamp: scheduledTime.getTime(),
    }
  );

  return notificationId;
};

export const scheduleAppointmentReminder = async (
  title: string,
  body: string,
  scheduledTime: Date,
  appointmentId: string
): Promise<string> => {
  const channelId = await notifee.createChannel({
    id: 'appointments',
    name: 'Appointment Reminders',
    importance: AndroidImportance.HIGH,
    sound: 'default',
  });

  const notificationId = await notifee.createTriggerNotification(
    {
      title,
      body,
      data: { appointmentId, type: 'appointment' },
      android: {
        channelId,
        importance: AndroidImportance.HIGH,
        pressAction: {
          id: 'default',
        },
        smallIcon: 'ic_notification_logo',
      },
    },
    {
      type: 0, // TIMESTAMP = 0
      timestamp: scheduledTime.getTime(),
    }
  );

  return notificationId;
};

// Schedule notifications for a reminder (15p, 10p, 5p, 0p before scheduled time)
export const scheduleReminderNotifications = async (
  reminder: { _id: string; medicationName: string; dosage: string; unit: string; scheduledTime: string; status: string; notificationIds?: string[] }
): Promise<string[]> => {
  // If already completed, don't schedule
  if (reminder.status === 'TAKEN' || reminder.status === 'SKIPPED') {
    return [];
  }

  // Cancel existing notifications if any
  if (reminder.notificationIds && reminder.notificationIds.length > 0) {
    await cancelNotifications(reminder.notificationIds);
  }

  const scheduledTime = new Date(reminder.scheduledTime);
  const title = `Nhắc nhở uống thuốc`;
  const body = `${reminder.medicationName} - ${reminder.dosage} ${reminder.unit}`;

  return await scheduleMedicationReminder(title, body, scheduledTime, reminder._id);
};

// Schedule notifications for a health log (15p, 10p, 5p, 0p before scheduled time)
export const scheduleHealthLogNotifications = async (
  healthLog: { _id: string; type: string; scheduledDate?: string; scheduledTime?: string; isCompleted?: boolean; notificationIds?: string[]; details?: any }
): Promise<string[]> => {
  // If already completed or no scheduled time, don't schedule
  if (healthLog.isCompleted || !healthLog.scheduledDate || !healthLog.scheduledTime) {
    return [];
  }

  // Cancel existing notifications if any
  if (healthLog.notificationIds && healthLog.notificationIds.length > 0) {
    await cancelNotifications(healthLog.notificationIds);
  }

  // Parse scheduled date and time
  const scheduledDate = new Date(healthLog.scheduledDate);
  const [hours, minutes] = healthLog.scheduledTime.split(':').map(Number);
  scheduledDate.setHours(hours, minutes, 0, 0);

  let title = '';
  let body = '';

  if (healthLog.type === 'meal') {
    title = 'Nhắc nhở bữa ăn';
    body = healthLog.details?.foodName || 'Bữa ăn của bạn';
  } else if (healthLog.type === 'exercise') {
    title = 'Nhắc nhở vận động';
    body = healthLog.details?.exerciseType || 'Vận động của bạn';
  } else {
    return []; // Don't schedule for symptoms
  }

  return await scheduleHealthLogReminder(title, body, scheduledDate, healthLog._id);
};

// Test notification function - hiển thị notification ngay lập tức để test
export const testNotification = async (): Promise<void> => {
  try {
    const channelId = await notifee.createChannel({
      id: 'test-notifications',
      name: 'Test Notifications',
      importance: AndroidImportance.HIGH,
      sound: 'default',
      vibration: true,
      vibrationPattern: [300, 500],
    });

    // Hiển thị notification ngay lập tức (không schedule)
    await notifee.displayNotification({
      title: '🧪 Test Notification',
      body: 'Nếu bạn thấy thông báo này, hệ thống notifications đang hoạt động!',
      android: {
        channelId,
        importance: AndroidImportance.HIGH,
        pressAction: {
          id: 'default',
        },
        visibility: 1, // PUBLIC
        smallIcon: 'ic_notification_logo', // Sử dụng logo làm icon notification
      },
    });

    console.log('[TEST] Notification displayed successfully');
  } catch (error) {
    console.error('[TEST] Failed to display test notification:', error);
    throw error;
  }
};

// Test scheduled notification - schedule notification sau 5 giây
export const testScheduledNotification = async (seconds: number = 5): Promise<string> => {
  try {
    const channelId = await notifee.createChannel({
      id: 'test-notifications',
      name: 'Test Notifications',
      importance: AndroidImportance.HIGH,
      sound: 'default',
      vibration: true,
      vibrationPattern: [300, 500],
    });

    const scheduledTime = new Date();
    scheduledTime.setSeconds(scheduledTime.getSeconds() + seconds);

    const notificationId = await notifee.createTriggerNotification(
      {
        title: '⏰ Test Scheduled Notification',
        body: `Thông báo này được schedule sau ${seconds} giây`,
        android: {
          channelId,
          importance: AndroidImportance.HIGH,
          pressAction: {
            id: 'default',
          },
          visibility: 1,
          smallIcon: 'ic_notification_logo', // Sử dụng logo làm icon notification
        },
      },
      {
        type: 0, // TIMESTAMP
        timestamp: scheduledTime.getTime(),
      }
    );

    console.log(`[TEST] Scheduled notification for ${seconds} seconds later`);
    return notificationId;
  } catch (error) {
    console.error('[TEST] Failed to schedule test notification:', error);
    throw error;
  }
};

// Kiểm tra quyền notification
export const checkNotificationPermission = async (): Promise<{
  authorized: boolean;
  status: number;
  settings: any;
}> => {
  try {
    const settings = await notifee.getNotificationSettings();
    return {
      authorized: settings.authorizationStatus >= 1,
      status: settings.authorizationStatus,
      settings,
    };
  } catch (error) {
    console.error('[TEST] Failed to check notification permission:', error);
    throw error;
  }
};

