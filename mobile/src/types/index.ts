export enum FrequencyType {
  DAILY = 'DAILY',
  EVERY_OTHER_DAY = 'EVERY_OTHER_DAY',
}

export enum ReminderStatus {
  PENDING = 'PENDING',
  TAKEN = 'TAKEN',
  SKIPPED = 'SKIPPED',
}

export enum UserRole {
  PATIENT = 'PATIENT',
  CAREGIVER = 'CAREGIVER',
}

export interface User {
  _id: string;
  name: string;
  phone: string;
  role: UserRole;
  caregiverId?: string;
  caregiverPhone?: string;
  email?: string;
  isVerified: boolean;
  medicalCondition?: string;
  height?: number;
  weight?: number;
  dateOfBirth?: string;
  avatar?: string;
}

export interface Medication {
  _id: string;
  userId: string;
  name: string;
  dosage: string;
  unit: string;
  notes?: string;
  frequency: FrequencyType;
  times: string[];
  startDate: string;
  createdAt: string;
}

export interface Reminder {
  _id: string;
  medicationId: string;
  medicationName: string;
  dosage: string;
  unit: string;
  scheduledTime: string;
  status: ReminderStatus;
  takenAt?: string;
  isSynced: boolean;
  lastUpdated: string;
  notificationIds?: string[]; // Array of notification IDs for multiple reminders
  session?: 'MORNING' | 'NOON' | 'EVENING' | 'CUSTOM';
}

export type HealthLogType = 'meal' | 'exercise' | 'symptom';

export interface HealthLogDetails {
  foodName?: string;
  calories?: number;
  exerciseType?: string;
  durationMinutes?: number;
  caloriesBurned?: number;
  symptomName?: string;
  severity?: number;
  note?: string;
}

export interface HealthLog {
  _id: string;
  userId: string;
  date: string;
  type: HealthLogType;
  scheduledDate?: string; // Format: "YYYY-MM-DD"
  scheduledTime?: string; // Format: "HH:mm"
  isCompleted?: boolean; // Đã hoàn thành hay chưa
  notificationIds?: string[]; // Array of notification IDs for multiple reminders
  details: HealthLogDetails;
  createdAt: string;
}

export interface WeeklyStats {
  date: string;
  caloriesIn: number;
  caloriesOut: number;
}

export interface WellnessLog {
  _id: string;
  userId: string;
  type: 'breathing' | 'music';
  durationSeconds: number;
  date: string;
}

export interface ReportSummary {
  startDate: string;
  endDate: string;
  medicationAdherence: {
    total: number;
    taken: number;
    skipped: number;
    rate: number;
  };
  healthStats: {
    totalCaloriesIn: number;
    totalCaloriesOut: number;
    avgSeverity?: number;
  };
  meals?: Array<{
    foodName: string;
    calories: number;
    date: string;
  }>;
  exerciseStats?: {
    exercises: Array<{
      exerciseType: string;
      durationMinutes: number;
      caloriesBurned: number;
      date: string;
    }>;
    totalCaloriesBurned: number;
    totalDurationMinutes: number;
  };
  wellnessStats: {
    totalMinutes: number;
    sessionsCount: number;
  };
  symptomsByDate?: Array<{
    date: string;
    symptoms: Array<{
      symptomName: string;
      severity: number;
      note: string;
      date: string;
    }>;
  }>;
  reminders: Reminder[];
  aiNotes?: string;
}

export interface Recommendation {
  id: string;
  type: 'DIET' | 'EXERCISE' | 'LIFESTYLE';
  title: string;
  description: string;
  iconName: string;
  color: string;
}

export interface ChatMessage {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: number;
  isError?: boolean;
}

export interface Place {
  id: string;
  name: string;
  address: string;
  type: 'PHARMACY' | 'HOSPITAL';
  latitude: number;
  longitude: number;
  distanceKm: number;
}

export interface LocationCoords {
  latitude: number;
  longitude: number;
}

// ============================================
// CaregiverPlus Types
// ============================================

export interface PatientSummary {
  _id: string;
  name: string;
  phone?: string;
  avatar?: string;
  age?: number;
  medicalCondition?: string;
  lastUpdate?: string;
  adherenceRate?: number;
  needsAttention?: boolean;
  recentAlerts?: number;
}

export type PatientFilter = 'all' | 'needsAttention' | 'recentUpdate';

export interface Alert {
  _id: string;
  patientId: string;
  patientName: string;
  type: 'medication' | 'symptom' | 'appointment' | 'sos' | 'fall';
  severity: 'warning' | 'error' | 'info';
  title: string;
  message: string;
  timestamp: string;
  isRead: boolean;
  actionUrl?: string;
}

export interface MedicationTimelineItem {
  _id: string;
  medicationName: string;
  dosage: string;
  unit: string;
  scheduledTime: string;
  status: ReminderStatus;
  period: 'morning' | 'noon' | 'evening' | 'night';
}

export interface MedicationWeekHistory {
  date: string;
  total: number;
  taken: number;
  skipped: number;
  adherenceRate: number;
}

export interface DailyHealthSummary {
  date: string;
  calories: number;
  exerciseMinutes: number;
  symptomScore: number;
  mood?: 'good' | 'neutral' | 'bad';
}

export interface Appointment {
  _id: string;
  patientId?: string;
  userId?: string;
  title?: string;
  // Legacy fields (for backward compatibility)
  doctor?: string;
  location?: string;
  date?: string;
  time?: string;
  // New fields
  doctorName?: string;
  doctorSpecialty?: string;
  hospitalName?: string;
  appointmentDate?: string;
  appointmentTime?: string;
  notes?: string;
  status?: 'upcoming' | 'completed' | 'cancelled';
  reminderMinutes?: number;
  reminderBefore?: number;
  isCompleted?: boolean;
  notificationId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CareNote {
  _id: string;
  patientId: string;
  content: string;
  tags: string[];
  createdAt: string;
  createdBy: string;
}

export interface LocationStatus {
  patientId: string;
  lastKnownLocation?: LocationCoords;
  lastUpdateTime?: string;
  safetyStatus: 'safe' | 'warning' | 'unknown';
  geofenceActive?: boolean;
}

export interface EmergencyContact {
  _id: string;
  name: string;
  phone: string;
  relationship: string;
  isPrimary: boolean;
}





