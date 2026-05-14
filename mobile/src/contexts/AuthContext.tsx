import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { User, UserRole } from '../types';
import { RegisterData, LoginData } from '../services/auth.service';
import { logger } from '../utils/logger';

let authService: any = null;
let getCurrentUser: (() => Promise<User | null>) | null = null;
let registerAPI: ((data: RegisterData) => Promise<{ user: User; token: string }>) | null = null;
let registerWithEmailAPI: ((data: import('../services/auth.service').RegisterEmailData) => Promise<{ user: User; token: string }>) | null = null;
let setupAccountAPI: ((data: import('../services/auth.service').SetupAccountData) => Promise<{ message: string; user: User }>) | null = null;
let loginAPI: ((data: { identifier: string; password: string }) => Promise<{ user: User; token: string }>) | null = null;
let logoutAPI: (() => Promise<void>) | null = null;
let googleSignInAPI: (() => Promise<{ user: User; token: string }>) | null = null;

try {
  authService = require('../services/auth.service');
  getCurrentUser = authService?.getCurrentUser || null;
  registerAPI = authService?.register || null;
  registerWithEmailAPI = authService?.registerWithEmail || null;
  setupAccountAPI = authService?.setupAccount || null;
  loginAPI = authService?.login || null;
  logoutAPI = authService?.logout || null;
  googleSignInAPI = authService?.googleSignIn || null;
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
  signIn: (identifier: string, password: string) => Promise<void>;
  signUp: (data: RegisterData) => Promise<void>;
  signUpWithEmail: (data: import('../services/auth.service').RegisterEmailData) => Promise<void>;
  setupAccount: (data: import('../services/auth.service').SetupAccountData) => Promise<void>;
  completeRegistration: (registerData: import('../services/auth.service').RegisterEmailData, setupData: import('../services/auth.service').SetupAccountData) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
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

  const signIn = async (identifier: string, password: string) => {
    logger.auth('AuthContext.signIn: Starting', { identifier });
    try {
      // Guard: Kiểm tra loginAPI có tồn tại
      if (!loginAPI || typeof loginAPI !== 'function') {
        logger.error('AuthContext.signIn: loginAPI not available');
        throw new Error('Login service is not available');
      }
      logger.auth('AuthContext.signIn: Calling loginAPI');
      const res = await loginAPI({ identifier, password });
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

  const signUpWithEmail = async (data: import('../services/auth.service').RegisterEmailData) => {
    logger.auth('AuthContext.signUpWithEmail: Starting', { email: data.email });
    try {
      if (!registerWithEmailAPI || typeof registerWithEmailAPI !== 'function') {
        throw new Error('Register with email service is not available');
      }
      const res = await registerWithEmailAPI(data);
      setUser(res?.user || null);
    } catch (error: any) {
      logger.error('AuthContext.signUpWithEmail: Failed', { error });
      throw new Error(error?.message || 'Đăng ký bằng email thất bại.');
    }
  };

  const setupAccount = async (data: import('../services/auth.service').SetupAccountData) => {
    logger.auth('AuthContext.setupAccount: Starting');
    try {
      if (!setupAccountAPI || typeof setupAccountAPI !== 'function') {
        throw new Error('Setup account service is not available');
      }
      const res = await setupAccountAPI(data);
      setUser(res?.user || null);
    } catch (error: any) {
      logger.error('AuthContext.setupAccount: Failed', { error });
      throw new Error(error?.message || 'Thiết lập tài khoản thất bại.');
    }
  };

  const completeRegistration = async (
    registerData: import('../services/auth.service').RegisterEmailData,
    setupData: import('../services/auth.service').SetupAccountData
  ) => {
    logger.auth('AuthContext.completeRegistration: Starting', { email: registerData.email });
    try {
      if (!registerWithEmailAPI || typeof registerWithEmailAPI !== 'function') {
        throw new Error('Register with email service is not available');
      }
      if (!setupAccountAPI || typeof setupAccountAPI !== 'function') {
        throw new Error('Setup account service is not available');
      }
      
      // 1. Đăng ký tài khoản (không set user ngay để tránh unmount component)
      const registerRes = await registerWithEmailAPI(registerData);
      
      // 2. Thiết lập thông tin (API cần JWT đã được lưu vào AsyncStorage từ bước 1)
      const setupRes = await setupAccountAPI(setupData);
      
      // 3. Hoàn tất và navigate
      setUser(setupRes?.user || registerRes?.user || null);
    } catch (error: any) {
      logger.error('AuthContext.completeRegistration: Failed', { error });
      throw new Error(error?.message || 'Đăng ký và thiết lập thất bại.');
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

  const signInWithGoogle = async () => {
    logger.auth('AuthContext.signInWithGoogle: Starting');
    try {
      if (!googleSignInAPI || typeof googleSignInAPI !== 'function') {
        logger.error('AuthContext.signInWithGoogle: googleSignInAPI not available');
        throw new Error('Google Sign-In service is not available');
      }
      const res = await googleSignInAPI();
      logger.auth('AuthContext.signInWithGoogle: Success', { hasUser: !!res?.user });
      setUser(res?.user || null);
    } catch (error: any) {
      logger.error('AuthContext.signInWithGoogle: Failed', { message: error?.message });
      throw new Error(error?.message || 'Đăng nhập Google thất bại');
    }
  };

  const updateProfile = (updatedUser: User) => {
    setUser(updatedUser);
  };

  return (
    <AuthContext.Provider
      value={{ user, isLoading, signIn, signUp, signUpWithEmail, setupAccount, completeRegistration, signInWithGoogle, signOut, updateProfile }}
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





