// Import from centralized env config
import {
  API_BASE_URL,
  USE_MOCK_API,
  DEBUG_LOGS,
  MAP_PROVIDER,
  EMERGENCY_PHONE,
} from '../config/env';

// Re-export for backward compatibility
export { API_BASE_URL, USE_MOCK_API, DEBUG_LOGS, MAP_PROVIDER, EMERGENCY_PHONE };

export const STORAGE_KEYS = {
  TOKEN: '@smartcare_token',
  USER: '@smartcare_user',
};

export const COLORS = {
  primary: '#0d9488',
  primaryLight: '#14b8a6',
  primaryDark: '#0f766e',
  secondary: '#6366f1',
  success: '#10b981',
  error: '#ef4444',
  warning: '#f59e0b',
  info: '#3b82f6',
  background: '#f3f4f6',
  surface: '#ffffff',
  text: '#1f2937',
  textSecondary: '#6b7280',
};





