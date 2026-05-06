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
  sessions?: ('MORNING' | 'NOON' | 'EVENING')[];
  mealTiming?: 'BEFORE_MEAL' | 'AFTER_MEAL' | 'NONE';
  times?: string[];
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

export const takeAllNow = async (reminderIds: string[]): Promise<{ updated: number }> => {
  const result = await api.post<{ updated: number }>('/api/medications/take-all-now', { reminderIds });
  if (!result.ok) {
    throw new Error(result.error || 'Take all failed');
  }
  return result.data;
};

export const getMedications = async (prescriptionId?: string): Promise<{ medications: Medication[] }> => {
  const params = prescriptionId ? { prescriptionId } : {};
  const result = await api.get<{ medications: Medication[] }>('/api/medications', { params });
  
  if (!result.ok) {
    throw new Error(result.error || 'Failed to fetch medications');
  }
  return result.data;
};

export const batchDeleteMedications = async (medicationIds: string[]): Promise<void> => {
  const result = await api.delete('/api/medications/batch', { body: { medicationIds } });
  if (!result.ok) {
    throw new Error(result.error || 'Batch delete failed');
  }
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

export const getMissedMedications = async (userId?: string): Promise<{ missedReminders: Reminder[] }> => {
  const params = userId ? { userId } : {};
  const result = await api.get<{ missedReminders: Reminder[] }>('/api/medications/missed', { params });
  
  if (!result.ok) {
    const error: any = new Error(result.error || 'Get missed medications failed');
    error.status = result.status;
    error.data = result.data;
    throw error;
  }

  return result.data;
};

export const deleteReminder = async (id: string): Promise<void> => {
  const result = await api.delete(`/api/medications/reminders/${id}`);
  
  if (!result.ok) {
    throw new Error(result.error || 'Delete reminder failed');
  }
};





