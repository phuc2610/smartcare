import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { User, AuthResponse } from '../types';
import { getCurrentUser, loginUser, logoutUser, registerUser, verifyOtp } from '../services/authService';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  signIn: (phone: string, pass: string) => Promise<void>;
  signUp: (name: string, phone: string, pass: string, role: any) => Promise<void>;
  verify: (phone: string, otp: string) => Promise<void>;
  signOut: () => void;
  updateProfile: (updatedUser: User) => void; // New method
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check login status on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const currentUser = await getCurrentUser();
        setUser(currentUser);
      } catch (e) {
        console.error('Auth Check Failed', e);
      } finally {
        setIsLoading(false);
      }
    };
    checkAuth();
  }, []);

  const signIn = async (phone: string, pass: string) => {
    const res = await loginUser(phone, pass);
    setUser(res.user);
  };

  const signUp = async (name: string, phone: string, pass: string, role: any) => {
    await registerUser(name, phone, pass, role);
    // Flow: Register -> wait for Verify. Don't set user yet.
  };

  const verify = async (phone: string, otp: string) => {
    const res = await verifyOtp(phone, otp);
    setUser(res.user);
  };

  const signOut = () => {
    logoutUser();
    setUser(null);
  };

  const updateProfile = (updatedUser: User) => {
      setUser(updatedUser);
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, signIn, signUp, verify, signOut, updateProfile }}>
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