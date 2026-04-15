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

export interface MedicationTimes {
  morning: string;
  noon: string;
  evening: string;
}

export const getMedicationTimes = async (): Promise<{ medicationTimes: MedicationTimes }> => {
  const result = await api.get<{ medicationTimes: MedicationTimes }>('/api/settings/medication-times');
  
  if (!result.ok) {
    throw new Error(result.error || 'Get medication times failed');
  }

  return result.data;
};

export const updateMedicationTimes = async (
  times: MedicationTimes
): Promise<{ medicationTimes: MedicationTimes }> => {
  const result = await api.patch<{ medicationTimes: MedicationTimes }>(
    '/api/settings/medication-times',
    times
  );
  
  if (!result.ok) {
    throw new Error(result.error || 'Update medication times failed');
  }

  return result.data;
};

