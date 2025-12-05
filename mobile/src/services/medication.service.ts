import { api } from '../utils/api-wrapper';
import { Medication, Reminder, ReminderStatus } from '../types';
import { mockResponses, mockData } from '../mocks';
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
  const result = await api.post<{ medication: Medication }>('/medications', data);
  
  if (result.ok) {
    logger.api('Create medication SUCCESS - saved to MongoDB', { status: result.status });
    return result.data;
  }
  
  // Nếu API fail, queue để sync sau
  logger.api('Create medication failed, queueing for sync', result.error);
  await queueOperation({
    type: 'CREATE_MEDICATION',
    data,
  });
  
  // Return mock để UI vẫn hoạt động
  return mockResponses.medications.create;
};

export const getTodayReminders = async (userId?: string): Promise<{ reminders: Reminder[] }> => {
  const params = userId ? { userId } : {};
  const result = await api.get<{ reminders: Reminder[] }>('/medications/today', { params });
  
  if (result.ok) {
    return result.data;
  }
  
  logger.api('Get today reminders failed, using mock', result.error);
  return mockResponses.medications.today;
};

export const updateReminderStatus = async (
  id: string,
  status: ReminderStatus
): Promise<{ reminder: Reminder }> => {
  const result = await api.patch<{ reminder: Reminder }>(`/medications/${id}/take`, { status });
  
  if (result.ok) {
    logger.api('Update reminder SUCCESS - saved to MongoDB', { status: result.status });
    return result.data;
  }
  
  // Nếu API fail, queue để sync sau
  logger.api('Update reminder failed, queueing for sync', result.error);
  await queueOperation({
    type: 'UPDATE_REMINDER',
    data: { id, status },
  });
  
  // Return mock để UI vẫn hoạt động
  const mockReminder = { ...mockData.reminders[0], _id: id, status };
  return { reminder: mockReminder };
};

export const getMedications = async (): Promise<{ medications: Medication[] }> => {
  const result = await api.get<{ medications: Medication[] }>('/medications');
  
  if (result.ok) {
    return result.data;
  }
  
  logger.api('Get medications failed, using mock', result.error);
  return mockResponses.medications.list;
};

export const deleteMedication = async (id: string): Promise<void> => {
  const result = await api.delete(`/medications/${id}`);
  
  if (!result.ok) {
    logger.api('Delete medication failed (non-critical)', result.error);
  }
};





