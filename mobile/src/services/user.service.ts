import { api } from '../utils/api-wrapper';
import { User } from '../types';
import { logger } from '../utils/logger';

export const getMe = async (): Promise<{ user: User }> => {
  const result = await api.get<{ user: User }>('/api/users/me');
  
  if (!result.ok) {
    throw new Error(result.error || 'Get user profile failed');
  }

  return result.data;
};

export const updateProfile = async (data: {
  height?: number;
  weight?: number;
  medicalCondition?: string;
}): Promise<{ user: User }> => {
  const result = await api.patch<{ user: User }>('/api/users/me', data);
  
  if (!result.ok) {
    throw new Error(result.error || 'Update profile failed');
  }

  return result.data;
};





