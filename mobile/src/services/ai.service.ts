import { api } from '../utils/api-wrapper';
import { Recommendation } from '../types';
import { logger } from '../utils/logger';

export const chatWithAI = async (message: string): Promise<{ response: string }> => {
  const result = await api.post<{ response: string }>('/ai/chat', { message });
  
  if (result.ok) {
    return result.data;
  }
  
  logger.api('AI chat failed, using mock', result.error);
  return { response: 'Xin lỗi, tôi không thể kết nối với AI service. Vui lòng thử lại sau.' };
};

export const parseMedicationFromImage = async (
  imageUrl: string
): Promise<{ medication: Partial<any> }> => {
  const result = await api.post<{ medication: Partial<any> }>('/ai/medication/parse', { imageUrl });
  
  if (result.ok) {
    return result.data;
  }
  
  logger.api('Parse medication from image failed, using mock', result.error);
  return { medication: { name: 'Unknown', dosage: 'N/A' } };
};

export const parseMedicationFromText = async (
  instruction: string
): Promise<{ medication: Partial<any> }> => {
  const result = await api.post<{ medication: Partial<any> }>('/ai/medication/parse', { instruction });
  
  if (result.ok) {
    return result.data;
  }
  
  logger.api('Parse medication from text failed, using mock', result.error);
  return { medication: { name: 'Unknown', dosage: 'N/A' } };
};

export const estimateCalories = async (
  query: string,
  type: 'food' | 'exercise'
): Promise<{ calories: number }> => {
  const result = await api.post<{ calories: number }>('/ai/meal/estimate', { query, type });
  
  if (result.ok) {
    return result.data;
  }
  
  logger.api('Estimate calories failed, using mock', result.error);
  return { calories: type === 'food' ? 200 : 100 };
};

export const identifyDisease = async (input: string): Promise<{ condition: string }> => {
  const result = await api.post<{ condition: string }>('/ai/disease/identify', { input });
  
  if (result.ok) {
    return result.data;
  }
  
  logger.api('Identify disease failed, using mock', result.error);
  return { condition: 'Không xác định được. Vui lòng tham khảo ý kiến bác sĩ.' };
};





