// Safe import Config với fallback
let Config: any = null;
try {
  Config = require('react-native-config').default || require('react-native-config');
} catch (error) {
  console.warn('react-native-config not available, using defaults');
}

// Safe access to Config with fallbacks
const getConfig = (key: string, defaultValue: string): string => {
  try {
    // Guard: Check if Config exists and is not null
    if (Config != null && typeof Config === 'object' && Config[key] != null) {
      return String(Config[key]);
    }
  } catch (error) {
    // Silent fail - return default
  }
  return defaultValue;
};

// Lazy evaluation để tránh crash khi module load
export const API_BASE_URL = getConfig('API_BASE_URL', 'http://10.0.2.2:4000');
export const EMERGENCY_PHONE = getConfig('EMERGENCY_PHONE', '115');
export const MAP_PROVIDER = getConfig('MAP_PROVIDER', 'osm');

// Feature flags
export const USE_MOCK_API = getConfig('USE_MOCK_API', 'false') === 'true';
export const DEBUG_LOGS = getConfig('DEBUG_LOGS', __DEV__ ? 'true' : 'false') === 'true';

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





