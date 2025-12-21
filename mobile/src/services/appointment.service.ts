import { api } from '../utils/api-wrapper';

export interface Appointment {
  _id: string;
  userId: string;
  doctorName: string;
  doctorSpecialty: string;
  hospitalName: string;
  appointmentDate: string;
  appointmentTime: string;
  notes: string;
  reminderBefore: number;
  isCompleted: boolean;
  notificationId?: string;
  createdAt: string;
  updatedAt: string;
}

export const createAppointment = async (data: {
  doctorName: string;
  doctorSpecialty?: string;
  hospitalName?: string;
  appointmentDate: string;
  appointmentTime?: string;
  notes?: string;
  reminderBefore?: number;
  userId?: string;
}): Promise<{ appointment: Appointment }> => {
  const result = await api.post<{ appointment: Appointment }>('/api/appointments', data);
  
  if (!result.ok) {
    throw new Error(result.error || 'Create appointment failed');
  }

  return result.data;
};

export const getAppointments = async (params?: {
  upcoming?: boolean;
  completed?: boolean;
}): Promise<{ appointments: Appointment[] }> => {
  const result = await api.get<{ appointments: Appointment[] }>('/api/appointments', { params });
  
  if (!result.ok) {
    throw new Error(result.error || 'Get appointments failed');
  }

  return result.data;
};

export const updateAppointment = async (
  id: string,
  data: {
    doctorName?: string;
    doctorSpecialty?: string;
    hospitalName?: string;
    appointmentDate?: string;
    appointmentTime?: string;
    notes?: string;
    reminderBefore?: number;
    isCompleted?: boolean;
    notificationId?: string;
  }
): Promise<{ appointment: Appointment }> => {
  const result = await api.patch<{ appointment: Appointment }>(`/api/appointments/${id}`, data);
  
  if (!result.ok) {
    throw new Error(result.error || 'Update appointment failed');
  }

  return result.data;
};

export const deleteAppointment = async (id: string): Promise<void> => {
  const result = await api.delete(`/api/appointments/${id}`);
  
  if (!result.ok) {
    throw new Error(result.error || 'Delete appointment failed');
  }
};

