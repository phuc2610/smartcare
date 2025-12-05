import AsyncStorage from '@react-native-async-storage/async-storage';
import * as logger from '../utils/logger';
import { api } from '../utils/api-wrapper';
import { STORAGE_KEYS } from '../utils/constants';

// Storage keys for offline data
const OFFLINE_KEYS = {
  PENDING_MEDICATIONS: '@smartcare_pending_medications',
  PENDING_HEALTH_LOGS: '@smartcare_pending_health_logs',
  PENDING_REMINDERS: '@smartcare_pending_reminders',
};

interface PendingOperation {
  id: string;
  type: 'CREATE_MEDICATION' | 'UPDATE_REMINDER' | 'CREATE_HEALTH_LOG';
  data: any;
  timestamp: number;
}

/**
 * Lưu operation vào queue để sync sau
 */
export const queueOperation = async (operation: Omit<PendingOperation, 'id' | 'timestamp'>): Promise<void> => {
  try {
    const key = getStorageKey(operation.type);
    const existing = await AsyncStorage.getItem(key);
    const queue: PendingOperation[] = existing ? JSON.parse(existing) : [];
    
    const newOp: PendingOperation = {
      ...operation,
      id: Date.now().toString(),
      timestamp: Date.now(),
    };
    
    queue.push(newOp);
    await AsyncStorage.setItem(key, JSON.stringify(queue));
    logger.logger.log('SYNC', `Queued operation: ${operation.type}`);
  } catch (error) {
    logger.logger.error('SYNC: Failed to queue operation', error);
  }
};

/**
 * Sync tất cả pending operations lên server
 */
export const syncPendingOperations = async (): Promise<void> => {
  try {
    logger.logger.log('SYNC', 'Starting sync...');
    
    // Sync medications
    await syncMedications();
    
    // Sync health logs
    await syncHealthLogs();
    
    // Sync reminders
    await syncReminders();
    
    logger.logger.log('SYNC', 'Sync completed');
  } catch (error) {
    logger.logger.error('SYNC: Sync failed', error);
  }
};

const syncMedications = async (): Promise<void> => {
  try {
    const key = OFFLINE_KEYS.PENDING_MEDICATIONS;
    const data = await AsyncStorage.getItem(key);
    if (!data) return;
    
    const queue: PendingOperation[] = JSON.parse(data);
    const synced: string[] = [];
    
    for (const op of queue) {
      try {
        const result = await api.post('/medications', op.data);
        if (result.ok) {
          synced.push(op.id);
          logger.logger.log('SYNC', `Synced medication: ${op.id}`);
        }
      } catch (error) {
        logger.logger.warn('SYNC', `Failed to sync medication ${op.id}: ${error}`);
      }
    }
    
    // Remove synced operations
    const remaining = queue.filter(op => !synced.includes(op.id));
    if (remaining.length === 0) {
      await AsyncStorage.removeItem(key);
    } else {
      await AsyncStorage.setItem(key, JSON.stringify(remaining));
    }
  } catch (error) {
    logger.logger.error('SYNC: Failed to sync medications', error);
  }
};

const syncHealthLogs = async (): Promise<void> => {
  try {
    const key = OFFLINE_KEYS.PENDING_HEALTH_LOGS;
    const data = await AsyncStorage.getItem(key);
    if (!data) return;
    
    const queue: PendingOperation[] = JSON.parse(data);
    const synced: string[] = [];
    
    for (const op of queue) {
      try {
        const result = await api.post('/health/logs', op.data);
        if (result.ok) {
          synced.push(op.id);
          logger.logger.log('SYNC', `Synced health log: ${op.id}`);
        }
      } catch (error) {
        logger.logger.warn('SYNC', `Failed to sync health log ${op.id}: ${error}`);
      }
    }
    
    // Remove synced operations
    const remaining = queue.filter(op => !synced.includes(op.id));
    if (remaining.length === 0) {
      await AsyncStorage.removeItem(key);
    } else {
      await AsyncStorage.setItem(key, JSON.stringify(remaining));
    }
  } catch (error) {
    logger.logger.error('SYNC: Failed to sync health logs', error);
  }
};

const syncReminders = async (): Promise<void> => {
  try {
    const key = OFFLINE_KEYS.PENDING_REMINDERS;
    const data = await AsyncStorage.getItem(key);
    if (!data) return;
    
    const queue: PendingOperation[] = JSON.parse(data);
    const synced: string[] = [];
    
    for (const op of queue) {
      try {
        const result = await api.patch(`/medications/${op.data.id}/take`, { status: op.data.status });
        if (result.ok) {
          synced.push(op.id);
          logger.logger.log('SYNC', `Synced reminder: ${op.id}`);
        }
      } catch (error) {
        logger.logger.warn('SYNC', `Failed to sync reminder ${op.id}: ${error}`);
      }
    }
    
    // Remove synced operations
    const remaining = queue.filter(op => !synced.includes(op.id));
    if (remaining.length === 0) {
      await AsyncStorage.removeItem(key);
    } else {
      await AsyncStorage.setItem(key, JSON.stringify(remaining));
    }
  } catch (error) {
    logger.logger.error('SYNC: Failed to sync reminders', error);
  }
};

const getStorageKey = (type: string): string => {
  switch (type) {
    case 'CREATE_MEDICATION':
      return OFFLINE_KEYS.PENDING_MEDICATIONS;
    case 'CREATE_HEALTH_LOG':
      return OFFLINE_KEYS.PENDING_HEALTH_LOGS;
    case 'UPDATE_REMINDER':
      return OFFLINE_KEYS.PENDING_REMINDERS;
    default:
      return '';
  }
};

/**
 * Kiểm tra có pending operations không
 */
export const hasPendingOperations = async (): Promise<boolean> => {
  try {
    const keys = Object.values(OFFLINE_KEYS);
    for (const key of keys) {
      const data = await AsyncStorage.getItem(key);
      if (data) {
        const queue: PendingOperation[] = JSON.parse(data);
        if (queue.length > 0) return true;
      }
    }
    return false;
  } catch (error) {
    return false;
  }
};

