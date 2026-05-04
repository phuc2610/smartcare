import { api } from '../utils/api-wrapper';
import { logger } from '../utils/logger';

export interface PrescriptionMedication {
  _id?: string;
  name: string;
  dosage: string;
  quantity: number;
  unit: string;
  sessions: string[];
  mealTiming: string;
  instructions: string;
  usage: string;
  isActive: boolean;
  confidence: number; // 0.0 - 1.0, độ tin cậy AI cho mỗi thuốc
}

export interface Prescription {
  _id: string;
  userId: string;
  imageUrl: string | null;
  doctorName: string;
  patientName: string;
  diagnosis: string;
  startDate: string;
  notes: string;
  medications: PrescriptionMedication[];
  status: 'draft' | 'confirmed' | 'archived';
  // ── Accuracy fields ──
  rawText: string; // Toàn bộ text thô OCR đọc được
  qualityScore: number; // 0.0 - 1.0
  verificationNotes: string; // Ghi chú từ verification pass
  createdAt: string;
  updatedAt: string;
}

export const scanPrescription = async (imageUrl: string): Promise<{ prescription: Prescription }> => {
  const result = await api.post<{ prescription: Prescription }>('/api/prescriptions/scan', { imageUrl });
  if (!result.ok) throw new Error(result.error || 'Scan prescription failed');
  logger.api('Scan prescription SUCCESS');
  return result.data;
};

export const scanPrescriptionBase64 = async (imageBase64: string): Promise<{ prescription: Prescription }> => {
  const result = await api.post<{ prescription: Prescription }>('/api/prescriptions/scan', { imageBase64 });
  if (!result.ok) throw new Error(result.error || 'Scan prescription failed');
  logger.api('Scan prescription (base64) SUCCESS');
  return result.data;
};

export const createPrescription = async (data: Partial<Prescription>): Promise<{ prescription: Prescription }> => {
  const result = await api.post<{ prescription: Prescription }>('/api/prescriptions', data);
  if (!result.ok) throw new Error(result.error || 'Create prescription failed');
  return result.data;
};

export const getPrescriptions = async (): Promise<{ prescriptions: Prescription[] }> => {
  const result = await api.get<{ prescriptions: Prescription[] }>('/api/prescriptions');
  if (!result.ok) throw new Error(result.error || 'Get prescriptions failed');
  return result.data;
};

export const getPrescription = async (id: string): Promise<{ prescription: Prescription }> => {
  const result = await api.get<{ prescription: Prescription }>(`/api/prescriptions/${id}`);
  if (!result.ok) throw new Error(result.error || 'Get prescription failed');
  return result.data;
};

export const updatePrescription = async (id: string, data: Partial<Prescription>): Promise<{ prescription: Prescription }> => {
  const result = await api.put<{ prescription: Prescription }>(`/api/prescriptions/${id}`, data);
  if (!result.ok) throw new Error(result.error || 'Update prescription failed');
  return result.data;
};

export const deletePrescription = async (id: string): Promise<void> => {
  const result = await api.delete(`/api/prescriptions/${id}`);
  if (!result.ok) throw new Error(result.error || 'Delete prescription failed');
};
