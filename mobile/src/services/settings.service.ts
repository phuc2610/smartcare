import { api } from '../utils/api-wrapper';

export interface NotificationSettings {
  medicationReminderBefore: number;
  mealReminderBefore: number;
  exerciseReminderBefore: number;
  medicationEnabled: boolean;
  mealEnabled: boolean;
  exerciseEnabled: boolean;
}

export const getNotificationSettings = async (): Promise<{ settings: NotificationSettings }> => {
  const result = await api.get<{ settings: NotificationSettings }>('/api/settings/notifications');
  
  if (!result.ok) {
    throw new Error(result.error || 'Get notification settings failed');
  }

  return result.data;
};

export const updateNotificationSettings = async (
  settings: NotificationSettings
): Promise<{ settings: NotificationSettings }> => {
  const result = await api.patch<{ settings: NotificationSettings }>(
    '/api/settings/notifications',
    settings
  );
  
  if (!result.ok) {
    throw new Error(result.error || 'Update notification settings failed');
  }

  return result.data;
};

