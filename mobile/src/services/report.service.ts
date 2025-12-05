import { api } from '../utils/api-wrapper';
import { ReportSummary } from '../types';
import { mockResponses } from '../mocks';
import { logger } from '../utils/logger';

export const getComprehensiveReport = async (
  range: 'today' | '7d' | '30d' = '30d',
  userId?: string
): Promise<ReportSummary> => {
  const params: any = { range };
  if (userId) params.userId = userId;
  const result = await api.get<ReportSummary>('/reports/overview', { params });
  
  if (result.ok) {
    return result.data;
  }
  
  logger.api('Get report failed, using mock', result.error);
  return mockResponses.reports.overview;
};





