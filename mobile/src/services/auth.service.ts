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
  email?: string;
}

export interface RegisterEmailData {
  name: string;
  email: string;
  password: string;
  verificationToken: string;
}

export interface SetupAccountData {
  role: UserRole;
  medicalCondition?: string;
  height?: number;
  weight?: number;
  dateOfBirth?: string;
}

export interface LoginData {
  identifier: string; // Accepts email or phone
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
  logger.auth('LOGIN: Starting', { identifier: data.identifier });
  
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
      // Lưu SĐT hoặc email để hiển thị lại khi đăng nhập lần sau
      if (data.identifier) {
        await AsyncStorage.setItem(STORAGE_KEYS.SAVED_PHONE, data.identifier);
      }
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
    // Chỉ xóa token và user, GIỮ LẠI SĐT đã lưu để điền sẵn khi đăng nhập lại
    await AsyncStorage.removeItem(STORAGE_KEYS.TOKEN);
    await AsyncStorage.removeItem(STORAGE_KEYS.USER);
    logger.auth('Logged out successfully (saved phone kept)');
  } catch (error) {
    logger.error('Failed to clear auth storage', error);
  }
};

/**
 * Lấy SĐT đã lưu từ lần đăng nhập trước
 * Hữu ích cho người già: không cần nhớ/gõ lại SĐT
 */
export const getSavedPhone = async (): Promise<string | null> => {
  try {
    return await AsyncStorage.getItem(STORAGE_KEYS.SAVED_PHONE);
  } catch (error) {
    logger.error('Failed to get saved phone', error);
    return null;
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

/**
 * Gửi mã OTP đến email
 */
export const sendOTP = async (email: string): Promise<{ message: string }> => {
  const result = await api.post<{ message: string }>('/api/auth/send-otp', { email });
  
  if (!result.ok) {
    throw new Error(result.error || 'Không thể gửi mã OTP');
  }
  
  return result.data;
};

/**
 * Xác thực mã OTP từ email
 */
export const verifyOTP = async (email: string, otp: string): Promise<{ message: string; verified: boolean; verificationToken: string }> => {
  const result = await api.post<{ message: string; verified: boolean; verificationToken: string }>('/api/auth/verify-otp', { email, otp });
  
  if (!result.ok) {
    throw new Error(result.error || 'Mã OTP không đúng');
  }
  
  return result.data;
};

/**
 * Đăng ký tài khoản với Email
 */
export const registerWithEmail = async (data: RegisterEmailData): Promise<AuthResponse> => {
  logger.auth('REGISTER_EMAIL: Starting', { email: data.email, name: data.name });
  
  try {
    const result = await api.post<AuthResponse>('/api/auth/register-email', data);
    
    if (!result.ok) {
      throw new Error(result.error || 'Register with email failed');
    }

    const { user, token } = result.data;
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.TOKEN, token);
      await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
      await AsyncStorage.setItem(STORAGE_KEYS.SAVED_PHONE, user.email || '');
    } catch (error) {
      logger.error('Failed to save auth data', error);
    }

    logger.auth('REGISTER_EMAIL: Success', { userId: user?._id });
    return { user, token };
  } catch (error: any) {
    throw error;
  }
};

/**
 * Thiết lập tài khoản (bổ sung thông tin sau khi đăng ký)
 */
export const setupAccount = async (data: SetupAccountData): Promise<{ message: string; user: User }> => {
  logger.auth('SETUP_ACCOUNT: Starting', { role: data.role });
  
  try {
    const result = await api.post<{ message: string; user: User }>('/api/auth/setup-account', data);
    
    if (!result.ok) {
      throw new Error(result.error || 'Setup account failed');
    }

    // Cập nhật user trong storage
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(result.data.user));
    } catch (error) {
      logger.error('Failed to update user in storage', error);
    }

    return result.data;
  } catch (error: any) {
    throw error;
  }
};

/**
 * Đăng nhập bằng Google
 * Gọi Google Sign-In SDK → lấy idToken → gửi lên server → nhận JWT
 */
export const googleSignIn = async (): Promise<AuthResponse> => {
  logger.auth('GOOGLE SIGN-IN: Starting');
  
  try {
    const { GoogleSignin, statusCodes } = require('@react-native-google-signin/google-signin');
    const { GOOGLE_WEB_CLIENT_ID } = require('../config/env');

    // Cấu hình Google Sign-In
    GoogleSignin.configure({
      webClientId: GOOGLE_WEB_CLIENT_ID,
      offlineAccess: false,
    });

    // Kiểm tra Play Services
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

    // Mở popup đăng nhập Google
    const response = await GoogleSignin.signIn();
    logger.auth('GOOGLE SIGN-IN: Google response received', { 
      hasDataToken: !!response?.data?.idToken,
      hasDirectToken: !!response?.idToken 
    });

    const idToken = response?.data?.idToken || response?.idToken;
    if (!idToken) {
      throw new Error('Không lấy được token từ Google. Có thể do thiếu Web Client ID.');
    }

    // Gửi idToken lên server để xác thực
    const result = await api.post<AuthResponse>('/api/auth/google', { idToken });

    if (!result.ok) {
      throw new Error(result.error || 'Đăng nhập Google thất bại');
    }

    const { user, token } = result.data;

    // Lưu token và user vào AsyncStorage
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.TOKEN, token);
      await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
      logger.auth('GOOGLE SIGN-IN: Storage saved successfully');
    } catch (error) {
      logger.error('GOOGLE SIGN-IN: Failed to save auth data', error);
    }

    logger.auth('GOOGLE SIGN-IN: Success', { userId: user?._id, name: user?.name });
    return { user, token };
  } catch (error: any) {
    logger.error('GOOGLE SIGN-IN: Exception', {
      message: error?.message,
      code: error?.code,
    });
    
    // Xử lý các lỗi đặc biệt của Google Sign-In
    if (error?.code === '12501' || error?.code === 'SIGN_IN_CANCELLED') {
      throw new Error('Đã hủy đăng nhập Google');
    }
    if (error?.code === '7' || error?.code === 'NETWORK_ERROR') {
      throw new Error('Lỗi mạng. Vui lòng kiểm tra kết nối internet');
    }
    
    throw error;
  }
};
