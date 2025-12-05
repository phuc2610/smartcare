import { api } from '../utils/api-wrapper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../utils/constants';
import { User, UserRole } from '../types';
import { mockResponses } from '../mocks';
import { logger } from '../utils/logger';

export interface RegisterData {
  name: string;
  phone: string;
  password: string;
  role: UserRole;
}

export interface LoginData {
  phone: string;
  password: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export const register = async (data: RegisterData): Promise<{ message: string; phone: string }> => {
  const result = await api.post<{ message: string; phone: string }>('/auth/register', data);
  
  if (result.ok) {
    return result.data;
  }
  
  // Fallback to mock on error
  logger.auth('Register failed, using mock', result.error);
  return mockResponses.auth.register;
};

export const requestOTP = async (phone: string): Promise<{ message: string; phone: string }> => {
  const result = await api.post<{ message: string; phone: string }>('/auth/otp/request', { phone });
  
  if (result.ok) {
    return result.data;
  }
  
  logger.auth('Request OTP failed, using mock', result.error);
  return { message: 'OTP đã được gửi (mock)', phone };
};

export const verifyOTP = async (phone: string, otp: string): Promise<AuthResponse> => {
  const result = await api.post<AuthResponse>('/auth/otp/verify', { phone, otp });
  
  if (result.ok) {
    const { user, token } = result.data;
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.TOKEN, token);
      await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
    } catch (error) {
      logger.error('Failed to save auth data', error);
    }
    return { user, token };
  }
  
  // Fallback to mock
  logger.auth('Verify OTP failed, using mock', result.error);
  const mockResponse = mockResponses.auth.verifyOTP;
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.TOKEN, mockResponse.token);
    await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(mockResponse.user));
  } catch (error) {
    logger.error('Failed to save mock auth data', error);
  }
  return mockResponse;
};

export const login = async (data: LoginData): Promise<AuthResponse> => {
  const result = await api.post<AuthResponse>('/auth/login', data);
  
  if (result.ok) {
    const { user, token } = result.data;
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.TOKEN, token);
      await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
    } catch (error) {
      logger.error('Failed to save auth data', error);
    }
    return { user, token };
  }
  
  // Fallback to mock
  logger.auth('Login failed, using mock', result.error);
  const mockResponse = mockResponses.auth.login;
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.TOKEN, mockResponse.token);
    await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(mockResponse.user));
  } catch (error) {
    logger.error('Failed to save mock auth data', error);
  }
  return mockResponse;
};

export const logout = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(STORAGE_KEYS.TOKEN);
    await AsyncStorage.removeItem(STORAGE_KEYS.USER);
    logger.auth('Logged out successfully');
  } catch (error) {
    logger.error('Failed to clear auth storage', error);
  }
};

export const getCurrentUser = async (): Promise<User | null> => {
  try {
    const userStr = await AsyncStorage.getItem(STORAGE_KEYS.USER);
    if (userStr) {
      return JSON.parse(userStr);
    }
    return null;
  } catch (error) {
    logger.error('Failed to get current user from storage', error);
    return null;
  }
};

export const getStoredToken = async (): Promise<string | null> => {
  try {
    return await AsyncStorage.getItem(STORAGE_KEYS.TOKEN);
  } catch (error) {
    logger.error('Failed to get token from storage', error);
    return null;
  }
};





