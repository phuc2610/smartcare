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

import { API_BASE_URL } from '../config/env';
import { getStoredToken } from './auth.service';

export const exportReportPDF = async (
  range: 'today' | 'week' | 'month' | '7d' | '30d' = 'today',
  userId?: string
): Promise<string> => {
  const params: any = { range };
  if (userId) params.userId = userId;
  
  const token = await getStoredToken();
  if (token) {
    params.token = token;
  }
  
  const queryString = new URLSearchParams(params).toString();
  const url = `${API_BASE_URL}/api/reports/export-pdf?${queryString}`;
  
  return url;
};





