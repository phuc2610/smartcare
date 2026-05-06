import { api } from '../utils/api-wrapper';

export const linkDoctor = async (doctorCode: string) => {
  const result = await api.post('/api/doctors/link', { doctorCode });
  
  if (!result.ok) {
    throw new Error(result.error || 'Connection to doctor failed');
  }

  return result.data;
};

export const revokeDoctor = async (doctorId: string) => {
  const result = await api.post(`/api/doctors/revoke/${doctorId}`);
  
  if (!result.ok) {
    throw new Error(result.error || 'Revoke doctor failed');
  }

  return result.data;
};

export const getMyDoctors = async () => {
  const result = await api.get('/api/doctors/my-doctors');
  
  if (!result.ok) {
    throw new Error(result.error || 'Failed to get my doctors');
  }

  return result.data;
};
