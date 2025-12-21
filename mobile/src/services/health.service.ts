import { api } from '../utils/api-wrapper';
import { HealthLog, HealthLogType, HealthLogDetails, WeeklyStats } from '../types';
import { logger } from '../utils/logger';
import { queueOperation } from './sync.service';

export const createHealthLog = async (
  type: HealthLogType,
  details: HealthLogDetails,
  date?: string,
  scheduledDate?: string,
  scheduledTime?: string
): Promise<{ healthLog: HealthLog }> => {
  const result = await api.post<{ healthLog: HealthLog }>('/api/health/logs', { 
    type, 
    details, 
    date,
    scheduledDate,
    scheduledTime,
  });
  
  if (result.ok) {
    logger.api('Create health log SUCCESS - saved to MongoDB', { status: result.status });
    return result.data;
  }

  // Nếu API fail, queue để sync sau (không trả mock)
  logger.api('Create health log failed, queueing for sync', result.error);
  await queueOperation({
    type: 'CREATE_HEALTH_LOG',
    data: { type, details, date },
  });

  throw new Error(result.error || 'Create health log failed, queued for sync');
};

export const getHealthSummary = async (
  range: '7d' | '30d' = '7d',
  userId?: string
): Promise<{ logs: HealthLog[]; weeklyStats: WeeklyStats[] }> => {
  const params: any = { range };
  if (userId) params.userId = userId;
  const result = await api.get<{ logs: HealthLog[]; weeklyStats: WeeklyStats[] }>('/api/health/summary', { params });
  
  if (!result.ok) {
    throw new Error(result.error || 'Get health summary failed');
  }

  return result.data;
};

export const getScheduledTasks = async (
  date?: string // Format: "YYYY-MM-DD"
): Promise<{ healthLogs: HealthLog[] }> => {
  const params: any = {};
  if (date) params.date = date;
  const result = await api.get<{ healthLogs: HealthLog[] }>('/api/health/scheduled', { params });
  
  if (!result.ok) {
    throw new Error(result.error || 'Get scheduled tasks failed');
  }

  return result.data;
};

export const getTodayHealthLogs = async (
  userId?: string
): Promise<{ healthLogs: HealthLog[] }> => {
  const params: any = {};
  if (userId) params.userId = userId;
  const result = await api.get<{ healthLogs: HealthLog[] }>('/api/health/today', { params });
  
  if (!result.ok) {
    const error: any = new Error(result.error || 'Get today health logs failed');
    error.status = result.status;
    error.data = result.data;
    throw error;
  }

  return result.data;
};

export const updateHealthLog = async (
  id: string,
  data: Partial<HealthLog>
): Promise<{ healthLog: HealthLog }> => {
  const result = await api.patch<{ healthLog: HealthLog }>(`/api/health/logs/${id}`, data);
  
  if (!result.ok) {
    throw new Error(result.error || 'Update health log failed');
  }

  return result.data;
};

export const deleteHealthLog = async (id: string): Promise<void> => {
  const result = await api.delete(`/api/health/logs/${id}`);
  
  if (!result.ok) {
    throw new Error(result.error || 'Delete health log failed');
  }
};





