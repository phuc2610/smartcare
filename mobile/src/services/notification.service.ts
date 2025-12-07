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
): Promise<string> => {
  const channelId = await notifee.createChannel({
    id: 'medication-reminders',
    name: 'Medication Reminders',
    importance: AndroidImportance.HIGH,
    sound: 'default',
  });

  const notificationId = await notifee.createTriggerNotification(
    {
      title,
      body,
      android: {
        channelId,
        importance: AndroidImportance.HIGH,
        pressAction: {
          id: 'default',
        },
        data: { reminderId },
      },
    },
    {
      type: 'timestamp',
      timestamp: scheduledTime.getTime(),
    }
  );

  return notificationId;
};

export const cancelNotification = async (notificationId: string): Promise<void> => {
  await notifee.cancelNotification(notificationId);
};

export const cancelAllNotifications = async (): Promise<void> => {
  await notifee.cancelAllNotifications();
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
      android: {
        channelId,
        importance: AndroidImportance.HIGH,
        pressAction: {
          id: 'default',
        },
        data: { reminderId, type: 'custom-reminder' },
      },
    },
    {
      type: 'timestamp',
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
      android: {
        channelId,
        importance: AndroidImportance.HIGH,
        pressAction: {
          id: 'default',
        },
        data: { appointmentId, type: 'appointment' },
      },
    },
    {
      type: 'timestamp',
      timestamp: scheduledTime.getTime(),
    }
  );

  return notificationId;
};





