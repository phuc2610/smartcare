import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { User, UserRole } from '../types';
import { RegisterData, LoginData } from '../services/auth.service';
import { logger } from '../utils/logger';

let authService: any = null;
let getCurrentUser: (() => Promise<User | null>) | null = null;
let registerAPI: ((data: RegisterData) => Promise<{ user: User; token: string }>) | null = null;
let loginAPI: ((data: { phone: string; password: string }) => Promise<{ user: User; token: string }>) | null = null;
let logoutAPI: (() => Promise<void>) | null = null;

try {
  authService = require('../services/auth.service');
  getCurrentUser = authService?.getCurrentUser || null;
  registerAPI = authService?.register || null;
  loginAPI = authService?.login || null;
  logoutAPI = authService?.logout || null;
} catch (error) {
  console.warn('Failed to load auth.service module (non-critical):', error);
}

// Safe wrapper functions với guards
const safeGetCurrentUser = async (): Promise<User | null> => {
  try {
    // Guard: Kiểm tra getCurrentUser có tồn tại và là function
    if (getCurrentUser && typeof getCurrentUser === 'function') {
      return await getCurrentUser();
    }
    console.warn('getCurrentUser is not available');
    return null;
  } catch (error) {
    console.warn('getCurrentUser failed (non-critical):', error);
    return null;
  }
};

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  signIn: (phone: string, password: string) => Promise<void>;
  signUp: (data: RegisterData) => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (updatedUser: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Guard: Đảm bảo getCurrentUser tồn tại và là function
        const currentUser = await safeGetCurrentUser();
        setUser(currentUser);
      } catch (e) {
        console.warn('Auth Check Failed (non-critical):', e);
        // Set user to null và tiếp tục, không crash app
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };
    checkAuth();
  }, []);

  const signIn = async (phone: string, password: string) => {
    logger.auth('AuthContext.signIn: Starting', { phone });
    try {
      // Guard: Kiểm tra loginAPI có tồn tại
      if (!loginAPI || typeof loginAPI !== 'function') {
        logger.error('AuthContext.signIn: loginAPI not available');
        throw new Error('Login service is not available');
      }
      logger.auth('AuthContext.signIn: Calling loginAPI');
      const res = await loginAPI({ phone, password });
      logger.auth('AuthContext.signIn: API success', { hasUser: !!res?.user, userId: res?.user?._id });
      setUser(res?.user || null);
      logger.auth('AuthContext.signIn: User state updated');
    } catch (error: any) {
      logger.error('AuthContext.signIn: Failed', { 
        message: error?.message, 
        stack: error?.stack,
        error 
      });
      throw new Error(error?.message || 'Đăng nhập thất bại. Vui lòng thử lại.');
    }
  };

  const signUp = async (data: RegisterData) => {
    logger.auth('AuthContext.signUp: Starting', { phone: data.phone, name: data.name, role: data.role });
    try {
      // Guard: Kiểm tra registerAPI có tồn tại
      if (!registerAPI || typeof registerAPI !== 'function') {
        logger.error('AuthContext.signUp: registerAPI not available');
        throw new Error('Register service is not available');
      }
      logger.auth('AuthContext.signUp: Calling registerAPI');
      const res = await registerAPI(data);
      logger.auth('AuthContext.signUp: API success', { hasUser: !!res?.user, userId: res?.user?._id });
      setUser(res?.user || null);
    } catch (error: any) {
      logger.error('AuthContext.signUp: Failed', { 
        message: error?.message, 
        stack: error?.stack,
        error 
      });
      throw new Error(error?.message || 'Đăng ký thất bại. Vui lòng thử lại.');
    }
  };

  const signOut = async () => {
    try {
      // Guard: Kiểm tra logoutAPI có tồn tại
      if (logoutAPI && typeof logoutAPI === 'function') {
        await logoutAPI();
      }
      // Luôn set user to null, kể cả khi logoutAPI không có
      setUser(null);
    } catch (error) {
      console.warn('Logout failed (non-critical):', error);
      // Vẫn set user to null ngay cả khi logout fail
      setUser(null);
    }
  };

  const updateProfile = (updatedUser: User) => {
    setUser(updatedUser);
  };

  return (
    <AuthContext.Provider
      value={{ user, isLoading, signIn, signUp, signOut, updateProfile }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};





