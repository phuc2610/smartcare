import { api } from '../utils/api-wrapper';

export interface CustomReminder {
  _id: string;
  userId: string;
  title: string;
  description: string;
  reminderTime: string;
  repeatType: 'NONE' | 'DAILY' | 'WEEKLY' | 'MONTHLY';
  repeatDays: number[];
  isActive: boolean;
  notificationId?: string;
  lastTriggered?: string;
  createdAt: string;
  updatedAt: string;
}

export const createCustomReminder = async (data: {
  title: string;
  description?: string;
  reminderTime: string;
  repeatType?: 'NONE' | 'DAILY' | 'WEEKLY' | 'MONTHLY';
  repeatDays?: number[];
}): Promise<{ reminder: CustomReminder }> => {
  const result = await api.post<{ reminder: CustomReminder }>('/api/custom-reminders', data);
  
  if (!result.ok) {
    throw new Error(result.error || 'Create custom reminder failed');
  }

  return result.data;
};

export const getCustomReminders = async (): Promise<{ reminders: CustomReminder[] }> => {
  const result = await api.get<{ reminders: CustomReminder[] }>('/api/custom-reminders');
  
  if (!result.ok) {
    throw new Error(result.error || 'Get custom reminders failed');
  }

  return result.data;
};

export const updateCustomReminder = async (
  id: string,
  data: {
    title?: string;
    description?: string;
    reminderTime?: string;
    repeatType?: 'NONE' | 'DAILY' | 'WEEKLY' | 'MONTHLY';
    repeatDays?: number[];
    isActive?: boolean;
    notificationId?: string;
  }
): Promise<{ reminder: CustomReminder }> => {
  const result = await api.patch<{ reminder: CustomReminder }>(`/api/custom-reminders/${id}`, data);
  
  if (!result.ok) {
    throw new Error(result.error || 'Update custom reminder failed');
  }

  return result.data;
};

export const deleteCustomReminder = async (id: string): Promise<void> => {
  const result = await api.delete(`/api/custom-reminders/${id}`);
  
  if (!result.ok) {
    throw new Error(result.error || 'Delete custom reminder failed');
  }
};

