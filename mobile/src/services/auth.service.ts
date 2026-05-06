import { api } from '../utils/api-wrapper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../utils/constants';
import { User, UserRole } from '../types';
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

export const register = async (data: RegisterData): Promise<AuthResponse> => {
  logger.auth('REGISTER: Starting', { phone: data.phone, name: data.name, role: data.role });
  
  try {
    const result = await api.post<AuthResponse>('/api/auth/register', data);
  
    logger.auth('REGISTER: API response', { ok: result.ok, status: result.status, hasData: !!result.data });
    
    if (!result.ok) {
      logger.error('REGISTER: Failed', { error: result.error, status: result.status, data: result.data });
      throw new Error(result.error || 'Register failed');
    }

    const { user, token } = result.data;
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.TOKEN, token);
      await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
    } catch (error) {
      logger.error('Failed to save auth data', error);
    }

    logger.auth('REGISTER: Success', { userId: user?._id, phone: user?.phone });
    return { user, token };
  } catch (error: any) {
    logger.error('REGISTER: Exception', { 
      message: error?.message, 
      stack: error?.stack,
      response: error?.response?.data 
    });
    throw error;
  }
};

// requestOTP and verifyOTP removed for Firebase Phone Auth

export const login = async (data: LoginData): Promise<AuthResponse> => {
  logger.auth('LOGIN: Starting', { phone: data.phone });
  
  try {
    const result = await api.post<AuthResponse>('/api/auth/login', data);
    
    logger.auth('LOGIN: API response', { 
      ok: result.ok, 
      status: result.status, 
      hasUser: !!result.data?.user,
      hasToken: !!result.data?.token 
    });
  
    if (!result.ok) {
      logger.error('LOGIN: Failed', { 
        error: result.error, 
        status: result.status, 
        data: result.data 
      });
      throw new Error(result.error || 'Login failed');
    }

    const { user, token } = result.data;
    logger.auth('LOGIN: Saving to storage', { userId: user?._id, hasToken: !!token });
    
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.TOKEN, token);
      await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
      logger.auth('LOGIN: Storage saved successfully');
    } catch (error) {
      logger.error('LOGIN: Failed to save auth data', error);
      throw error;
  }
  
    logger.auth('LOGIN: Success', { userId: user?._id, name: user?.name });
    return { user, token };
  } catch (error: any) {
    logger.error('LOGIN: Exception', { 
      message: error?.message, 
      stack: error?.stack,
      response: error?.response?.data 
    });
    throw error;
  }
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

export const forgotPassword = async (phone: string, name: string): Promise<{ message: string; phone: string; verified: boolean }> => {
  const result = await api.post<{ message: string; phone: string; verified: boolean }>('/api/auth/forgot-password', { phone, name });
  
  if (!result.ok) {
    throw new Error(result.error || 'Xác minh thất bại');
  }
  
  return result.data;
};

export const resetPassword = async (phone: string, name: string, newPassword: string): Promise<AuthResponse> => {
  const result = await api.post<AuthResponse>('/api/auth/reset-password', { phone, name, newPassword });
  
  if (!result.ok) {
    throw new Error(result.error || 'Đổi mật khẩu thất bại');
  }

  const { user, token } = result.data;
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.TOKEN, token);
    await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
  } catch (error) {
    logger.error('Failed to save auth data', error);
  }
  return { user, token };
};

export const changePassword = async (currentPassword: string, newPassword: string): Promise<{ message: string }> => {
  const result = await api.post<{ message: string }>('/api/auth/change-password', {
    currentPassword,
    newPassword,
  });
  
  if (!result.ok) {
    throw new Error(result.error || 'Change password failed');
  }
  
  return result.data;
};

export const deleteAccount = async (password: string): Promise<{ message: string }> => {
  const result = await api.post<{ message: string }>('/api/auth/delete-account', { password });
  
  if (!result.ok) {
    throw new Error(result.error || 'Delete account failed');
  }
  
  // Xoá dữ liệu local
  try {
    await AsyncStorage.removeItem(STORAGE_KEYS.TOKEN);
    await AsyncStorage.removeItem(STORAGE_KEYS.USER);
  } catch (error) {
    logger.error('Failed to clear auth storage after account deletion', error);
  }
  
  return result.data;
};

