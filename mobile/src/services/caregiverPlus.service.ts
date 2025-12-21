/**
 * CaregiverPlus Service
 * API calls for enhanced caregiver features
 * 
 * Note: Some endpoints may not exist yet - methods are mocked with TODOs
 */

import { api } from '../utils/api-wrapper';
import {
  PatientSummary,
  Alert,
  MedicationTimelineItem,
  MedicationWeekHistory,
  DailyHealthSummary,
  Appointment,
  CareNote,
  LocationStatus,
  EmergencyContact,
} from '../types';
import { Reminder, HealthLog } from '../types';
import { logger } from '../utils/logger';

// ============================================
// Patient Management
// ============================================

export const getPatientList = async (filter?: 'all' | 'needsAttention' | 'recentUpdate'): Promise<{ patients: PatientSummary[] }> => {
  const filterParam = filter && filter !== 'all' ? `?filter=${filter}` : '';
  const result = await api.get<{ patients: PatientSummary[] }>(`/api/caregiver/patients${filterParam}`);
  
  if (!result.ok) {
    throw new Error(result.error || 'Get patient list failed');
  }

  return result.data;
};

export const getPatientDetail = async (patientId: string): Promise<PatientSummary> => {
  const result = await api.get<{ patient: PatientSummary }>(`/api/caregiver/patients/${patientId}`);
  
  if (!result.ok) {
    throw new Error(result.error || 'Get patient detail failed');
  }

  return result.data.patient;
};

// ============================================
// Patient Tasks
// ============================================

export const getPatientTasks = async (patientId: string): Promise<{ reminders: Reminder[]; healthLogs: HealthLog[] }> => {
  const result = await api.get<{ reminders: Reminder[]; healthLogs: HealthLog[] }>(
    `/api/caregiver/patients/${patientId}/tasks`
  );
  
  if (!result.ok) {
    throw new Error(result.error || 'Get patient tasks failed');
  }

  return result.data;
};

export const sendTaskNotification = async (patientId: string, taskId: string, taskType: 'medication' | 'health'): Promise<void> => {
  const result = await api.post<{ success: boolean }>(
    `/api/caregiver/patients/${patientId}/tasks/${taskId}/notify`,
    { taskType }
  );
  
  if (!result.ok) {
    throw new Error(result.error || 'Send task notification failed');
  }
};

// ============================================
// Alerts & Notifications
// ============================================

export const getAlerts = async (patientId?: string): Promise<{ alerts: Alert[] }> => {
  const params = new URLSearchParams();
  if (patientId) params.append('patientId', patientId);
  const query = params.toString() ? `?${params.toString()}` : '';
  
  const result = await api.get<{ alerts: Alert[] }>(`/api/caregiver/alerts${query}`);
  
  if (!result.ok) {
    throw new Error(result.error || 'Get alerts failed');
  }

  return result.data;
};

export const markAlertAsRead = async (alertId: string): Promise<void> => {
  const result = await api.patch<{ success: boolean }>(`/api/caregiver/alerts/${alertId}/read`);
  
  if (!result.ok) {
    throw new Error(result.error || 'Mark alert as read failed');
  }
};

// ============================================
// Medication Tracking
// ============================================

export const getMedicationTimeline = async (patientId: string, date: string): Promise<{ timeline: MedicationTimelineItem[] }> => {
  const result = await api.get<{ timeline: MedicationTimelineItem[] }>(
    `/api/caregiver/patients/${patientId}/medications/timeline?date=${date}`
  );
  
  if (!result.ok) {
    throw new Error(result.error || 'Get medication timeline failed');
  }

  return result.data;
};

export const getMedicationWeekHistory = async (patientId: string): Promise<{ history: MedicationWeekHistory[] }> => {
  const result = await api.get<{ history: MedicationWeekHistory[] }>(
    `/api/caregiver/patients/${patientId}/medications/week-history`
  );
  
  if (!result.ok) {
    throw new Error(result.error || 'Get medication week history failed');
  }

  return result.data;
};

export const getMedicationAdherence = async (patientId: string): Promise<{ rate: number; total: number; taken: number; skipped: number }> => {
  const result = await api.get<{ rate: number; total: number; taken: number; skipped: number }>(
    `/api/caregiver/patients/${patientId}/medications/adherence`
  );
  
  if (!result.ok) {
    throw new Error(result.error || 'Get medication adherence failed');
  }

  return result.data;
};

// ============================================
// Health Tracking
// ============================================

export const getDailyHealthSummary = async (patientId: string, date?: string): Promise<DailyHealthSummary> => {
  const dateParam = date ? `?date=${date}` : '';
  const result = await api.get<DailyHealthSummary>(
    `/api/caregiver/patients/${patientId}/health/daily${dateParam}`
  );
  
  if (!result.ok) {
    throw new Error(result.error || 'Get daily health summary failed');
  }

  return result.data;
};

// ============================================
// Appointments
// ============================================

export const getPatientAppointments = async (patientId: string): Promise<{ appointments: Appointment[] }> => {
  const result = await api.get<{ appointments: Appointment[] }>(
    `/api/caregiver/patients/${patientId}/appointments`
  );
  
  if (!result.ok) {
    throw new Error(result.error || 'Get patient appointments failed');
  }

  return result.data;
};

// ============================================
// Care Notes
// ============================================

export const getCareNotes = async (patientId: string): Promise<{ notes: CareNote[] }> => {
  const result = await api.get<{ notes: CareNote[] }>(
    `/api/caregiver/patients/${patientId}/notes`
  );
  
  if (!result.ok) {
    throw new Error(result.error || 'Get care notes failed');
  }

  return result.data;
};

export const createCareNote = async (patientId: string, content: string, tags?: string[]): Promise<{ note: CareNote }> => {
  const result = await api.post<{ note: CareNote }>(
    `/api/caregiver/patients/${patientId}/notes`,
    { content, tags }
  );
  
  if (!result.ok) {
    throw new Error(result.error || 'Create care note failed');
  }

  return result.data;
};

// ============================================
// Location & Safety
// ============================================

export const getLocationStatus = async (patientId: string): Promise<LocationStatus> => {
  const result = await api.get<LocationStatus>(
    `/api/caregiver/patients/${patientId}/location`
  );
  
  if (!result.ok) {
    throw new Error(result.error || 'Get location status failed');
  }

  return result.data;
};

// ============================================
// Emergency Contacts
// ============================================

export const getEmergencyContacts = async (patientId: string): Promise<{ contacts: EmergencyContact[] }> => {
  const result = await api.get<{ contacts: EmergencyContact[] }>(
    `/api/caregiver/patients/${patientId}/emergency-contacts`
  );
  
  if (!result.ok) {
    throw new Error(result.error || 'Get emergency contacts failed');
  }

  return result.data;
};
