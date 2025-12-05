import { User, UserRole, Medication, Reminder, ReminderStatus, HealthLog, WeeklyStats, ReportSummary } from '../types';

// Mock data for offline/backend unavailable scenarios
export const mockData = {
  user: {
    _id: 'mock_user_1',
    name: 'Nguyễn Văn A',
    phone: '0123456789',
    role: UserRole.PATIENT,
    isVerified: true,
    email: 'user@example.com',
    medicalCondition: 'Tiểu đường type 2',
    height: 170,
    weight: 70,
  } as User,

  medications: [
    {
      _id: 'mock_med_1',
      userId: 'mock_user_1',
      name: 'Metformin',
      dosage: '500',
      unit: 'mg',
      notes: 'Uống sau bữa ăn',
      frequency: 'DAILY' as const,
      times: ['08:00', '20:00'],
      startDate: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    },
    {
      _id: 'mock_med_2',
      userId: 'mock_user_1',
      name: 'Aspirin',
      dosage: '100',
      unit: 'mg',
      frequency: 'DAILY' as const,
      times: ['08:00'],
      startDate: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    },
  ] as Medication[],

  reminders: [
    {
      _id: 'mock_reminder_1',
      medicationId: 'mock_med_1',
      medicationName: 'Metformin',
      dosage: '500',
      unit: 'mg',
      scheduledTime: new Date().toISOString(),
      status: ReminderStatus.PENDING,
      isSynced: false,
      lastUpdated: new Date().toISOString(),
    },
  ] as Reminder[],

  healthLogs: [
    {
      _id: 'mock_health_1',
      userId: 'mock_user_1',
      date: new Date().toISOString(),
      type: 'meal' as const,
      details: {
        foodName: 'Cơm trắng',
        calories: 200,
      },
      createdAt: new Date().toISOString(),
    },
  ] as HealthLog[],

  weeklyStats: [
    { date: new Date().toISOString(), caloriesIn: 1800, caloriesOut: 200 },
  ] as WeeklyStats[],

  reportSummary: {
    startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    endDate: new Date().toISOString(),
    medicationAdherence: {
      total: 14,
      taken: 12,
      skipped: 2,
      rate: 85.7,
    },
    healthStats: {
      totalCaloriesIn: 12600,
      totalCaloriesOut: 1400,
      avgSeverity: 2.5,
    },
    wellnessStats: {
      totalMinutes: 60,
      sessionsCount: 5,
    },
    reminders: [],
  } as ReportSummary,
};

// Mock API responses
export const mockResponses = {
  auth: {
    login: {
      user: mockData.user,
      token: 'mock_jwt_token_12345',
    },
    register: {
      message: 'Đăng ký thành công. Vui lòng nhập OTP.',
      phone: '0123456789',
    },
    verifyOTP: {
      user: mockData.user,
      token: 'mock_jwt_token_12345',
    },
  },
  medications: {
    list: { medications: mockData.medications },
    today: { reminders: mockData.reminders },
    create: { medication: mockData.medications[0] },
  },
  health: {
    logs: { healthLog: mockData.healthLogs[0] },
    summary: {
      logs: mockData.healthLogs,
      weeklyStats: mockData.weeklyStats,
    },
  },
  reports: {
    overview: mockData.reportSummary,
  },
};

