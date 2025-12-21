import { api } from '../utils/api-wrapper';
import { Recommendation } from '../types';
import { logger } from '../utils/logger';

export const chatWithAI = async (message: string): Promise<{ response: string }> => {
  const result = await api.post<{ response: string }>('/api/ai/chat', { message });
  
  if (!result.ok) {
    throw new Error(result.error || 'AI chat failed');
  }

  return result.data;
};

export const parseMedicationFromImage = async (
  imageUrl: string
): Promise<{ medication: Partial<any> }> => {
  const result = await api.post<{ medication: Partial<any> }>('/api/ai/medication/parse', { imageUrl });
  
  if (!result.ok) {
    throw new Error(result.error || 'Parse medication from image failed');
  }

  return result.data;
};

export const parseMedicationFromText = async (
  instruction: string
): Promise<{ medication: Partial<any> }> => {
  const result = await api.post<{ medication: Partial<any> }>('/api/ai/medication/parse', { instruction });
  
  if (!result.ok) {
    throw new Error(result.error || 'Parse medication from text failed');
  }

  return result.data;
};

export const estimateCalories = async (
  query: string,
  type: 'food' | 'exercise'
): Promise<{ calories: number; foodName?: string; exerciseType?: string }> => {
  const result = await api.post<{ calories: number; foodName?: string; exerciseType?: string }>('/api/ai/meal/estimate', { query, type });
  
  if (!result.ok) {
    throw new Error(result.error || 'Estimate calories failed');
  }

  return result.data;
};

export const identifyDisease = async (input: string): Promise<{ condition: string }> => {
  const result = await api.post<{ condition: string }>('/api/ai/disease/identify', { input });
  
  if (!result.ok) {
    throw new Error(result.error || 'Identify disease failed');
  }

  return result.data;
};

export const getHealthRecommendations = async (
  medicalCondition?: string
): Promise<{ recommendations: Recommendation[] }> => {
  const result = await api.post<{ recommendations: Recommendation[] }>('/api/ai/health/recommendations', {
    medicalCondition,
  });
  
  if (!result.ok) {
    throw new Error(result.error || 'Get health recommendations failed');
  }

  return result.data;
};

export const getChatHistory = async (): Promise<{ messages: Array<{ message: string; response: string; sender: string; timestamp: string }> }> => {
  const result = await api.get<{ messages: Array<{ message: string; response: string; sender: string; timestamp: string }> }>('/api/ai/chat/history');
  
  if (!result.ok) {
    throw new Error(result.error || 'Get chat history failed');
  }

  return result.data;
};

export const analyzeReport = async (
  range: 'week' | 'month',
  medicalCondition: string | undefined,
  reportData: {
    totalCaloriesIn: number;
    totalCaloriesOut: number;
    meals?: Array<{ foodName: string; calories: number; date: string }>;
    exercises?: Array<{ exerciseType: string; durationMinutes: number; caloriesBurned: number }>;
    symptoms?: Array<{ symptomName: string; severity: number; note?: string }>;
  }
): Promise<{ notes: string }> => {
  const result = await api.post<{ notes: string }>('/api/ai/report/analyze', {
    range,
    medicalCondition,
    reportData,
  });
  
  if (!result.ok) {
    throw new Error(result.error || 'Analyze report failed');
  }

  return result.data;
};





