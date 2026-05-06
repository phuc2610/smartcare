import { api } from '../utils/api-wrapper';

interface SOSLocation {
  latitude: number;
  longitude: number;
}

interface SOSResponse {
  ok: boolean;
  message: string;
  alert: any;
}

/**
 * Gửi tín hiệu SOS khẩn cấp đến tất cả bác sĩ đang theo dõi (M10)
 */
export const sendSOS = async (location?: SOSLocation, message?: string) => {
  return api.post<SOSResponse>('/api/alerts/sos', {
    body: {
      location,
      message,
    },
  });
};
