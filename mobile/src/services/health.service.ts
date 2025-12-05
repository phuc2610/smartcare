import { api } from '../utils/api-wrapper';
import { HealthLog, HealthLogType, HealthLogDetails, WeeklyStats } from '../types';
import { mockResponses } from '../mocks';
import { logger } from '../utils/logger';
import { queueOperation } from './sync.service';

export const createHealthLog = async (
  type: HealthLogType,
  details: HealthLogDetails,
  date?: string
): Promise<{ healthLog: HealthLog }> => {
  const result = await api.post<{ healthLog: HealthLog }>('/health/logs', { type, details, date });
  
  if (result.ok) {
    logger.api('Create health log SUCCESS - saved to MongoDB', { status: result.status });
    return result.data;
  }
  
  // Nếu API fail, queue để sync sau
  logger.api('Create health log failed, queueing for sync', result.error);
  await queueOperation({
    type: 'CREATE_HEALTH_LOG',
    data: { type, details, date },
  });
  
  // Return mock để UI vẫn hoạt động
  return mockResponses.health.logs;
};

export const getHealthSummary = async (
  range: '7d' | '30d' = '7d',
  userId?: string
): Promise<{ logs: HealthLog[]; weeklyStats: WeeklyStats[] }> => {
  const params: any = { range };
  if (userId) params.userId = userId;
  const result = await api.get<{ logs: HealthLog[]; weeklyStats: WeeklyStats[] }>('/health/summary', { params });
  
  if (result.ok) {
    return result.data;
  }
  
  logger.api('Get health summary failed, using mock', result.error);
  return mockResponses.health.summary;
};





