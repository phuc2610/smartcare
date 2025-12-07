import { api } from '../utils/api-wrapper';
import { Medication, Reminder, ReminderStatus } from '../types';
import { logger } from '../utils/logger';
import { queueOperation } from './sync.service';

export const createMedication = async (data: {
  name: string;
  dosage: string;
  unit?: string;
  notes?: string;
  frequency: 'DAILY' | 'EVERY_OTHER_DAY';
  times: string[];
  startDate: string;
}): Promise<{ medication: Medication }> => {
  const result = await api.post<{ medication: Medication }>('/api/medications', data);
  
  if (result.ok) {
    logger.api('Create medication SUCCESS - saved to MongoDB', { status: result.status });
    return result.data;
  }

  // Nếu API fail, queue để sync sau (không trả mock)
  logger.api('Create medication failed, queueing for sync', result.error);
  await queueOperation({
    type: 'CREATE_MEDICATION',
    data,
  });

  throw new Error(result.error || 'Create medication failed, queued for sync');
};

export const getTodayReminders = async (userId?: string): Promise<{ reminders: Reminder[] }> => {
  const params = userId ? { userId } : {};
  const result = await api.get<{ reminders: Reminder[] }>('/api/medications/today', { params });
  
  if (!result.ok) {
    throw new Error(result.error || 'Get today reminders failed');
  }

  return result.data;
};

export const updateReminderStatus = async (
  id: string,
  status: ReminderStatus
): Promise<{ reminder: Reminder }> => {
  const result = await api.patch<{ reminder: Reminder }>(`/api/medications/${id}/take`, { status });
  
  if (result.ok) {
    logger.api('Update reminder SUCCESS - saved to MongoDB', { status: result.status });
    return result.data;
  }

  // Nếu API fail, queue để sync sau (không trả mock)
  logger.api('Update reminder failed, queueing for sync', result.error);
  await queueOperation({
    type: 'UPDATE_REMINDER',
    data: { id, status },
  });

  throw new Error(result.error || 'Update reminder failed, queued for sync');
};

export const getMedications = async (): Promise<{ medications: Medication[] }> => {
  const result = await api.get<{ medications: Medication[] }>('/api/medications');
  
  if (!result.ok) {
    throw new Error(result.error || 'Get medications failed');
  }

  return result.data;
};

export const deleteMedication = async (id: string): Promise<void> => {
  const result = await api.delete(`/api/medications/${id}`);
  
  if (!result.ok) {
    logger.api('Delete medication failed (non-critical)', result.error);
  }
};

export const updateReminder = async (
  id: string,
  data: { scheduledTime?: string; dosage?: string; unit?: string }
): Promise<{ reminder: Reminder }> => {
  const result = await api.patch<{ reminder: Reminder }>(`/api/medications/reminders/${id}`, data);
  
  if (!result.ok) {
    throw new Error(result.error || 'Update reminder failed');
  }

  return result.data;
};





