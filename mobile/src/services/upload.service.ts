import { api } from '../utils/api-wrapper';
import { logger } from '../utils/logger';

export const uploadImage = async (uri: string): Promise<{ url: string; publicId: string }> => {
  const formData = new FormData();
  formData.append('image', {
    uri,
    type: 'image/jpeg',
    name: 'medication.jpg',
  } as any);

  const result = await api.post<{ url: string; publicId: string }>('/api/upload/image', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  
  if (!result.ok) {
    throw new Error(result.error || 'Upload image failed');
  }

  return result.data;
};





