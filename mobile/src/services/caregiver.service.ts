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

export const submitLinkCode = async (code: string): Promise<{ success: boolean; message: string; patientName?: string }> => {
  const result = await api.post<{ success: boolean; message: string; patientName?: string }>('/api/caregiver/link/accept', { code });
  
  if (!result.ok) {
    throw new Error(result.error || 'Submit link code failed');
  }

  return result.data;
};

export const getCaregiverRequests = async (): Promise<{ requests: Array<{
  _id: string;
  caregiverId: string;
  caregiverName: string;
  caregiverPhone: string;
  caregiverAvatar?: string;
  status: string;
  requestedAt: string;
}> }> => {
  const result = await api.get<{ requests: Array<{
    _id: string;
    caregiverId: string;
    caregiverName: string;
    caregiverPhone: string;
    caregiverAvatar?: string;
    status: string;
    requestedAt: string;
  }> }>('/api/caregiver/requests');
  
  if (!result.ok) {
    const error: any = new Error(result.error || 'Get caregiver requests failed');
    error.status = result.status;
    error.data = result.data;
    throw error;
  }

  return result.data;
};

export const respondToRequest = async (requestId: string, action: 'accept' | 'reject'): Promise<{ success: boolean; message: string; caregiverName?: string }> => {
  const result = await api.post<{ success: boolean; message: string; caregiverName?: string }>('/api/caregiver/requests/respond', {
    requestId,
    action,
  });
  
  if (!result.ok) {
    throw new Error(result.error || 'Respond to request failed');
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





