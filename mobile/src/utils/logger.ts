// Logger với tags và ENV control
let Config: any = null;
try {
  Config = require('react-native-config').default || require('react-native-config');
} catch (error) {
  // Silent
}

const DEBUG_LOGS = Config?.DEBUG_LOGS === 'true' || __DEV__;

type LogTag = 'API' | 'AUTH' | 'CONFIG' | 'NAV' | 'ERROR' | 'MOCK';

const formatMessage = (tag: LogTag, message: string, data?: any): string => {
  const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
  let msg = `[${timestamp}] [${tag}] ${message}`;
  if (data !== undefined) {
    msg += ` ${typeof data === 'object' ? JSON.stringify(data, null, 2) : String(data)}`;
  }
  return msg;
};

export const logger = {
  api: (message: string, data?: any) => {
    if (DEBUG_LOGS) {
      console.log(formatMessage('API', message, data));
    }
  },
  auth: (message: string, data?: any) => {
    if (DEBUG_LOGS) {
      console.log(formatMessage('AUTH', message, data));
    }
  },
  config: (message: string, data?: any) => {
    if (DEBUG_LOGS) {
      console.log(formatMessage('CONFIG', message, data));
    }
  },
  nav: (message: string, data?: any) => {
    if (DEBUG_LOGS) {
      console.log(formatMessage('NAV', message, data));
    }
  },
  error: (message: string, error?: any) => {
    // Errors always log
    const errorData = error instanceof Error 
      ? { message: error.message, stack: error.stack }
      : error;
    console.error(formatMessage('ERROR', message, errorData));
  },
  mock: (message: string, data?: any) => {
    if (DEBUG_LOGS) {
      console.log(formatMessage('MOCK', message, data));
    }
  },
  log: (tag: LogTag | string, message: string, data?: any) => {
    if (DEBUG_LOGS || tag === 'ERROR') {
      const logTag = (tag as LogTag) || 'INFO';
      console.log(formatMessage(logTag, message, data));
    }
  },
  warn: (tag: LogTag | string, message: string, data?: any) => {
    const logTag = (tag as LogTag) || 'WARN';
    console.warn(formatMessage(logTag, message, data));
  },
};

