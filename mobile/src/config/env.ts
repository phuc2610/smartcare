// Simple env config - fallback if react-native-config fails
import { Platform } from 'react-native';

// Try to load from react-native-config first
let envConfig: Record<string, string> = {};

try {
  const RNConfig = require('react-native-config');
  const config = RNConfig.default || RNConfig;
  if (config && typeof config === 'object') {
    envConfig = config;
    if (__DEV__) {
      console.log('[ENV] Loaded from react-native-config:', Object.keys(envConfig));
    }
  }
} catch (error) {
  console.warn('[ENV] react-native-config not available, using defaults');
}

// Fallback values (CHỈ DÙNG KHI react-native-config KHÔNG HOẠT ĐỘNG)
const FALLBACK_CONFIG: Record<string, string> = {
  API_BASE_URL: 'https://smartcare-uqgi.onrender.com',
  USE_MOCK_API: 'false',
  DEBUG_LOGS: __DEV__ ? 'true' : 'false',
  MAP_PROVIDER: 'osm',
  EMERGENCY_PHONE: '115',
  GOOGLE_WEB_CLIENT_ID: '432754323436-nmhelogscaf5s1vnr1krtel0jusqj7br.apps.googleusercontent.com',
};

export const getEnv = (key: string, defaultValue?: string): string => {
  // Try react-native-config first
  if (envConfig[key] != null && envConfig[key] !== '') {
    return String(envConfig[key]).trim();
  }
  
  // Fallback to hardcoded values
  if (FALLBACK_CONFIG[key] != null) {
    if (__DEV__ && key === 'API_BASE_URL') {
      console.warn(`[ENV] Using fallback for ${key}: ${FALLBACK_CONFIG[key]}`);
    }
    return FALLBACK_CONFIG[key];
  }
  
  // Return provided default or empty
  return defaultValue || '';
};

export const API_BASE_URL = getEnv('API_BASE_URL', FALLBACK_CONFIG.API_BASE_URL);
export const USE_MOCK_API = getEnv('USE_MOCK_API', 'false') === 'true';
export const DEBUG_LOGS = getEnv('DEBUG_LOGS', __DEV__ ? 'true' : 'false') === 'true';
export const MAP_PROVIDER = getEnv('MAP_PROVIDER', 'osm');
export const EMERGENCY_PHONE = getEnv('EMERGENCY_PHONE', '115');
export const GOOGLE_WEB_CLIENT_ID = getEnv('GOOGLE_WEB_CLIENT_ID', '');

if (__DEV__) {
  console.log('[ENV] Final config:', {
    API_BASE_URL,
    USE_MOCK_API,
    DEBUG_LOGS,
    MAP_PROVIDER,
    EMERGENCY_PHONE,
    GOOGLE_WEB_CLIENT_ID,
  });
}




