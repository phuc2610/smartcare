import { api } from '../utils/api-wrapper';
import { User } from '../types';
import { mockData } from '../mocks';
import { logger } from '../utils/logger';

export const generateLinkCode = async (): Promise<{ code: string }> => {
  const result = await api.post<{ code: string }>('/caregiver/link/request');
  
  if (result.ok) {
    return result.data;
  }
  
  logger.api('Generate link code failed, using mock', result.error);
  return { code: 'MOCK123' };
};

export const submitLinkCode = async (code: string): Promise<{ success: boolean; patientName: string }> => {
  const result = await api.post<{ success: boolean; patientName: string }>('/caregiver/link/accept', { code });
  
  if (result.ok) {
    return result.data;
  }
  
  logger.api('Submit link code failed, using mock', result.error);
  return { success: true, patientName: mockData.user.name };
};

export const getPatients = async (): Promise<{ patients: User[] }> => {
  const result = await api.get<{ patients: User[] }>('/caregiver/patients');
  
  if (result.ok) {
    return result.data;
  }
  
  logger.api('Get patients failed, using mock', result.error);
  return { patients: [mockData.user] };
};





