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

// Re-export from theme for backward compatibility
export { COLORS } from '../theme';





