
/**
 * Data Models mimicking the requested Mongoose Schemas
 */

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
  phone: string; // Used for login
  passwordHash?: string; // Mocking security
  role: UserRole;
  caregiverId?: string; // Link to caregiver if user is patient
  caregiverPhone?: string; // Mock phone for SMS
  email?: string;
  isVerified: boolean;
  // Expanded for AI Disease Identification
  medicalCondition?: 'Diabetes' | 'Hypertension' | 'Obesity' | 'Gastritis' | 'Normal' | 'Other' | string; 
  
  // New Profile Fields
  height?: number; // cm
  weight?: number; // kg
}

export interface LinkCode {
  code: string;
  patientId: string;
  expiresAt: number; // Timestamp
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface Medication {
  _id: string;
  userId: string;
  name: string;
  dosage: string;
  unit: string; // e.g., 'mg', 'ml', 'tablet'
  notes?: string;
  frequency: FrequencyType;
  times: string[]; // Array of "HH:mm" strings
  startDate: string; // ISO Date string
  createdAt: string;
}

export interface Reminder {
  _id: string;
  medicationId: string;
  medicationName: string; // Denormalized for easier UI rendering
  dosage: string;
  unit: string;
  scheduledTime: string; // ISO Date string
  status: ReminderStatus;
  takenAt?: string; // ISO Date string
  
  // Offline Sync Flags
  isSynced: boolean; // True if data has been pushed to server
  lastUpdated: string; // ISO timestamp
}

// --- HEALTH TRACKING MODELS ---

export type HealthLogType = 'meal' | 'exercise' | 'symptom';

export interface HealthLogDetails {
  // Meal
  foodName?: string;
  calories?: number;
  
  // Exercise
  exerciseType?: string;
  durationMinutes?: number;
  caloriesBurned?: number;

  // Symptom
  symptomName?: string;
  severity?: number; // 1-10
  note?: string;
}

export interface HealthLog {
  _id: string;
  userId: string;
  date: string; // ISO Date string
  type: HealthLogType;
  details: HealthLogDetails;
  createdAt: string;
}

export interface WeeklyStats {
  date: string; // "DD/MM"
  caloriesIn: number;
  caloriesOut: number;
}

// --- WELLNESS MODELS (NEW) ---
export interface WellnessLog {
  _id: string;
  userId: string;
  type: 'breathing' | 'music';
  durationSeconds: number;
  date: string; // ISO Date string
}

// --- REPORT AGGREGATION MODELS (NEW) ---
export interface ReportSummary {
  startDate: string;
  endDate: string;
  medicationAdherence: {
    total: number;
    taken: number;
    skipped: number;
    rate: number; // percentage
  };
  healthStats: {
    totalCaloriesIn: number;
    totalCaloriesOut: number;
    avgSeverity?: number;
  };
  wellnessStats: {
    totalMinutes: number;
    sessionsCount: number;
  };
  reminders: Reminder[]; // Detailed list
}

// --- RECOMMENDATION MODELS (UC07) ---
export interface Recommendation {
  id: string;
  type: 'DIET' | 'EXERCISE' | 'LIFESTYLE';
  title: string;
  description: string;
  iconName: string; // Lucide icon name mapping
  color: string; // Tailwind color class
}

// Helper type for AI extraction
export interface MedicationDraft {
  name: string;
  dosage: string;
  unit: string;
  frequency: FrequencyType;
  times: string[];
  notes: string;
}

// --- CHAT AI MODELS (NEW) ---
export interface ChatMessage {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: number;
  isError?: boolean;
}

// --- MAP & LOCATION MODELS (NEW) ---
export interface Place {
  id: string;
  name: string;
  address: string;
  type: 'PHARMACY' | 'HOSPITAL';
  latitude: number;
  longitude: number;
  distanceKm: number; // Calculated distance from user
}
