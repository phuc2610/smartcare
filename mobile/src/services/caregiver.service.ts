import { api } from '../utils/api-wrapper';
import { User } from '../types';
import { logger } from '../utils/logger';

export const generateLinkCode = async (): Promise<{ code: string }> => {
  const result = await api.post<{ code: string }>('/api/caregiver/link/request');
  
  if (!result.ok) {
    throw new Error(result.error || 'Generate link code failed');
  }

  return result.data;
};

export const submitLinkCode = async (code: string): Promise<{ success: boolean; patientName: string }> => {
  const result = await api.post<{ success: boolean; patientName: string }>('/api/caregiver/link/accept', { code });
  
  if (!result.ok) {
    throw new Error(result.error || 'Submit link code failed');
  }

  return result.data;
};

export const getPatients = async (): Promise<{ patients: User[] }> => {
  const result = await api.get<{ patients: User[] }>('/api/caregiver/patients');
  
  if (!result.ok) {
    throw new Error(result.error || 'Get patients failed');
  }

  return result.data;
};





