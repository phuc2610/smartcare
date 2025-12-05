import { api } from '../utils/api-wrapper';
import { User } from '../types';
import { mockData } from '../mocks';
import { logger } from '../utils/logger';

export const getMe = async (): Promise<{ user: User }> => {
  const result = await api.get<{ user: User }>('/users/me');
  
  if (result.ok) {
    return result.data;
  }
  
  logger.api('Get user profile failed, using mock', result.error);
  return { user: mockData.user };
};

export const updateProfile = async (data: {
  height?: number;
  weight?: number;
  medicalCondition?: string;
}): Promise<{ user: User }> => {
  const result = await api.patch<{ user: User }>('/users/me', data);
  
  if (result.ok) {
    return result.data;
  }
  
  logger.api('Update profile failed, using mock', result.error);
  const updatedUser = { ...mockData.user, ...data };
  return { user: updatedUser };
};





