import { api } from '../utils/api-wrapper';
import { ReportSummary } from '../types';
import { logger } from '../utils/logger';

export const getComprehensiveReport = async (
  range: 'today' | 'week' | 'month' | '7d' | '30d' = '30d',
  userId?: string
): Promise<ReportSummary> => {
  const params: any = { range };
  if (userId) params.userId = userId;
  const result = await api.get<ReportSummary>('/api/reports/overview', { params });
  
  if (!result.ok) {
    throw new Error(result.error || 'Get report failed');
  }

  return result.data;
};





