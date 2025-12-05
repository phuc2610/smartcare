
import { Medication, Reminder, FrequencyType, ReminderStatus, HealthLog, HealthLogType, HealthLogDetails, WeeklyStats, User, Recommendation, LinkCode, WellnessLog, ReportSummary } from '../types';
import { LocationCoords } from './locationService';

// Mimicking a MongoDB database using LocalStorage
// In React Native, this would be replaced by 'AsyncStorage' or 'SQLite'
const STORAGE_KEYS = {
  MEDICATIONS: 'smartcare_medications',
  REMINDERS: 'smartcare_reminders',
  HEALTH_LOGS: 'smartcare_health_logs',
  USERS: 'smartcare_users', 
  LINK_CODES: 'smartcare_link_codes',
  WELLNESS_LOGS: 'smartcare_wellness_logs' // New Key
};

const generateId = () => Math.random().toString(36).substring(2, 15);

// --- Logic mimicking Mongoose Models & Express Handlers ---

/**
 * POST /api/medications
 * Logic: Create medication config AND generate initial reminders
 */
export const createMedication = (userId: string, data: Omit<Medication, '_id' | 'createdAt' | 'userId'>): Medication => {
  const medicationsStr = localStorage.getItem(STORAGE_KEYS.MEDICATIONS);
  const medications: Medication[] = medicationsStr ? JSON.parse(medicationsStr) : [];

  const newMedication: Medication = {
    ...data,
    _id: generateId(),
    userId: userId, 
    createdAt: new Date().toISOString(),
  };

  medications.push(newMedication);
  localStorage.setItem(STORAGE_KEYS.MEDICATIONS, JSON.stringify(medications));

  // Trigger Reminder Generation for "Today" immediately so the user sees it
  generateRemindersForMedication(newMedication);

  return newMedication;
};

/**
 * GET /api/reminders/today
 * Logic: Fetch reminders where scheduledTime is within today's range
 * REFACTORED: Now accepts targetUserId to allow Caregivers to view Patient data
 */
export const getTodayReminders = (targetUserId: string): Reminder[] => {
  const remindersStr = localStorage.getItem(STORAGE_KEYS.REMINDERS);
  const medicationsStr = localStorage.getItem(STORAGE_KEYS.MEDICATIONS);
  
  let reminders: Reminder[] = remindersStr ? JSON.parse(remindersStr) : [];
  const medications: Medication[] = medicationsStr ? JSON.parse(medicationsStr) : [];

  // 1. Filter medications belonging to this user
  const userMedIds = medications.filter(m => m.userId === targetUserId).map(m => m._id);

  const today = new Date();
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0).getTime();
  const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59).getTime();

  // 2. Filter reminders: belong to user's meds AND are for today
  const todaysReminders = reminders.filter(r => {
    const isUserMed = userMedIds.includes(r.medicationId);
    const time = new Date(r.scheduledTime).getTime();
    return isUserMed && time >= startOfDay && time <= endOfDay;
  });

  // Sort by time
  return todaysReminders.sort((a, b) => new Date(a.scheduledTime).getTime() - new Date(b.scheduledTime).getTime());
};

/**
 * PATCH /api/reminders/:id/status
 */
export const updateReminderStatus = (id: string, status: ReminderStatus): Reminder | null => {
  const remindersStr = localStorage.getItem(STORAGE_KEYS.REMINDERS);
  let reminders: Reminder[] = remindersStr ? JSON.parse(remindersStr) : [];

  const index = reminders.findIndex(r => r._id === id);
  if (index === -1) return null;

  const isOnline = navigator.onLine; // Check network status

  reminders[index] = {
    ...reminders[index],
    status,
    takenAt: status === ReminderStatus.TAKEN ? new Date().toISOString() : undefined,
    isSynced: isOnline, // If offline, this stays false for later sync
    lastUpdated: new Date().toISOString()
  };

  localStorage.setItem(STORAGE_KEYS.REMINDERS, JSON.stringify(reminders));
  
  if (!isOnline) {
    console.log('[Offline Mode] Status saved locally. Will sync when online.');
  }

  return reminders[index];
};

// --- HEALTH TRACKING SERVICES ---

/**
 * POST /api/health-logs
 */
export const logHealthEvent = (userId: string, type: HealthLogType, details: HealthLogDetails): HealthLog => {
  const logsStr = localStorage.getItem(STORAGE_KEYS.HEALTH_LOGS);
  const logs: HealthLog[] = logsStr ? JSON.parse(logsStr) : [];

  const newLog: HealthLog = {
    _id: generateId(),
    userId: userId,
    date: new Date().toISOString(),
    type,
    details,
    createdAt: new Date().toISOString()
  };

  logs.push(newLog);
  localStorage.setItem(STORAGE_KEYS.HEALTH_LOGS, JSON.stringify(logs));
  return newLog;
};

/**
 * GET /api/health-logs/stats (Weekly)
 * REFACTORED: Accepts targetUserId
 */
export const getWeeklyStats = (targetUserId: string): WeeklyStats[] => {
  const logsStr = localStorage.getItem(STORAGE_KEYS.HEALTH_LOGS);
  const logs: HealthLog[] = logsStr ? JSON.parse(logsStr) : [];
  
  const stats: WeeklyStats[] = [];
  const today = new Date();

  // Generate last 7 days
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const dateKey = d.toISOString().split('T')[0]; // YYYY-MM-DD
    const displayDate = `${d.getDate()}/${d.getMonth() + 1}`;

    // Filter logs for this day AND this user
    const dayLogs = logs.filter(log => 
      log.userId === targetUserId && 
      log.date.startsWith(dateKey)
    );

    let caloriesIn = 0;
    let caloriesOut = 0;

    dayLogs.forEach(log => {
      if (log.type === 'meal') {
        caloriesIn += (log.details.calories || 0);
      } else if (log.type === 'exercise') {
        caloriesOut += (log.details.caloriesBurned || 0);
      }
    });

    stats.push({
      date: displayDate,
      caloriesIn,
      caloriesOut
    });
  }

  return stats;
};

/**
 * GET /api/health-logs/recent
 * REFACTORED: Accepts targetUserId
 */
export const getRecentHealthLogs = (targetUserId: string): HealthLog[] => {
  const logsStr = localStorage.getItem(STORAGE_KEYS.HEALTH_LOGS);
  const logs: HealthLog[] = logsStr ? JSON.parse(logsStr) : [];
  // Filter by user and Sort descending by date
  return logs
    .filter(l => l.userId === targetUserId)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 50);
};

// --- WELLNESS SERVICES (NEW) ---

/**
 * POST /api/wellness/log
 */
export const logWellnessSession = (userId: string, type: 'breathing' | 'music', durationSeconds: number) => {
    if (durationSeconds < 2) return; // Ignore accidental clicks

    const logsStr = localStorage.getItem(STORAGE_KEYS.WELLNESS_LOGS);
    const logs: WellnessLog[] = logsStr ? JSON.parse(logsStr) : [];

    const newLog: WellnessLog = {
        _id: generateId(),
        userId,
        type,
        durationSeconds,
        date: new Date().toISOString()
    };

    logs.push(newLog);
    localStorage.setItem(STORAGE_KEYS.WELLNESS_LOGS, JSON.stringify(logs));
    console.log(`[Wellness] Logged ${durationSeconds}s of ${type}`);
};

// --- REPORT AGGREGATION SERVICES (NEW) ---

/**
 * AGGREGATE REPORT DATA
 * Combines Reminders, HealthLogs, and WellnessLogs into a single summary.
 */
export const getComprehensiveReport = (userId: string, startDate: Date, endDate: Date): ReportSummary => {
    // 1. Fetch all raw data
    const remindersStr = localStorage.getItem(STORAGE_KEYS.REMINDERS);
    const allReminders: Reminder[] = remindersStr ? JSON.parse(remindersStr) : [];
    
    const healthLogsStr = localStorage.getItem(STORAGE_KEYS.HEALTH_LOGS);
    const allHealthLogs: HealthLog[] = healthLogsStr ? JSON.parse(healthLogsStr) : [];

    const wellnessLogsStr = localStorage.getItem(STORAGE_KEYS.WELLNESS_LOGS);
    const allWellnessLogs: WellnessLog[] = wellnessLogsStr ? JSON.parse(wellnessLogsStr) : [];

    const medicationsStr = localStorage.getItem(STORAGE_KEYS.MEDICATIONS);
    const medications: Medication[] = medicationsStr ? JSON.parse(medicationsStr) : [];
    const userMedIds = medications.filter(m => m.userId === userId).map(m => m._id);

    // Normalize dates to start/end of day
    const start = new Date(startDate); start.setHours(0,0,0,0);
    const end = new Date(endDate); end.setHours(23,59,59,999);

    // 2. Filter & Aggregate Reminders
    const filteredReminders = allReminders.filter(r => {
        const rTime = new Date(r.scheduledTime).getTime();
        return userMedIds.includes(r.medicationId) && rTime >= start.getTime() && rTime <= end.getTime();
    });

    const totalReminders = filteredReminders.length;
    const takenReminders = filteredReminders.filter(r => r.status === ReminderStatus.TAKEN).length;
    const skippedReminders = filteredReminders.filter(r => r.status === ReminderStatus.SKIPPED).length;

    // 3. Filter & Aggregate Health Logs
    const filteredHealth = allHealthLogs.filter(l => {
        const lTime = new Date(l.date).getTime();
        return l.userId === userId && lTime >= start.getTime() && lTime <= end.getTime();
    });

    let totalCaloriesIn = 0;
    let totalCaloriesOut = 0;

    filteredHealth.forEach(l => {
        if (l.type === 'meal') totalCaloriesIn += (l.details.calories || 0);
        if (l.type === 'exercise') totalCaloriesOut += (l.details.caloriesBurned || 0);
    });

    // 4. Filter & Aggregate Wellness Logs
    const filteredWellness = allWellnessLogs.filter(w => {
        const wTime = new Date(w.date).getTime();
        return w.userId === userId && wTime >= start.getTime() && wTime <= end.getTime();
    });

    const totalSeconds = filteredWellness.reduce((acc, curr) => acc + curr.durationSeconds, 0);

    return {
        startDate: start.toLocaleDateString('vi-VN'),
        endDate: end.toLocaleDateString('vi-VN'),
        medicationAdherence: {
            total: totalReminders,
            taken: takenReminders,
            skipped: skippedReminders,
            rate: totalReminders > 0 ? Math.round((takenReminders / totalReminders) * 100) : 0
        },
        healthStats: {
            totalCaloriesIn,
            totalCaloriesOut
        },
        wellnessStats: {
            totalMinutes: Math.round(totalSeconds / 60),
            sessionsCount: filteredWellness.length
        },
        reminders: filteredReminders.sort((a, b) => new Date(b.scheduledTime).getTime() - new Date(a.scheduledTime).getTime())
    };
};

/**
 * Helper to get weekly report (last 7 days)
 */
export const getWeeklyAdherenceReport = (userId: string): ReportSummary => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - 7);
    return getComprehensiveReport(userId, start, end);
};

// --- UC06: EMERGENCY SOS SERVICE ---

export const triggerEmergencySOS = async (user: User, coords: LocationCoords) => {
  // Simulate API Network Delay
  await new Promise(resolve => setTimeout(resolve, 1500));

  const mapsLink = `https://www.google.com/maps?q=${coords.latitude},${coords.longitude}`;
  
  // Find Caregiver Phone if linked
  let recipientPhone = "0912345678 (Mặc định)";
  if (user.caregiverId) {
    const usersStr = localStorage.getItem(STORAGE_KEYS.USERS);
    const users: User[] = usersStr ? JSON.parse(usersStr) : [];
    const caregiver = users.find(u => u._id === user.caregiverId);
    if (caregiver) recipientPhone = caregiver.phone;
  } else if (user.caregiverPhone) {
    recipientPhone = user.caregiverPhone;
  }

  const message = `🚨 KHẨN CẤP! ${user.name} đang gặp nguy hiểm.\nVị trí: ${mapsLink}`;
  console.log(`%c [SMS Gateway] Sending to ${recipientPhone}:`, 'background: #222; color: #bada55', message);
  
  return { success: true, recipient: recipientPhone };
};


// --- UC07: RECOMMENDATION ENGINE ---

const RECOMMMENDATION_DB: Record<string, Recommendation[]> = {
  'Diabetes': [
    {
      id: 'd1', type: 'DIET', title: 'Hạn chế tinh bột',
      description: 'Giảm cơm trắng, thay bằng gạo lứt hoặc yến mạch.',
      iconName: 'Utensils', color: 'bg-green-100 text-green-600'
    },
    {
      id: 'd2', type: 'EXERCISE', title: 'Đi bộ sau ăn',
      description: 'Đi bộ nhẹ 15p sau bữa tối giúp ổn định đường huyết.',
      iconName: 'Footprints', color: 'bg-orange-100 text-orange-600'
    }
  ],
  'Hypertension': [
    {
      id: 'h1', type: 'DIET', title: 'Ăn nhạt',
      description: 'Giảm muối trong khẩu phần ăn (< 5g/ngày).',
      iconName: 'Soup', color: 'bg-blue-100 text-blue-600'
    },
    {
      id: 'h2', type: 'LIFESTYLE', title: 'Thư giãn',
      description: 'Nghe nhạc nhẹ hoặc thiền 10p mỗi ngày.',
      iconName: 'Headphones', color: 'bg-purple-100 text-purple-600'
    }
  ],
  'Normal': [
    {
      id: 'n1', type: 'LIFESTYLE', title: 'Uống đủ nước',
      description: 'Cố gắng uống đủ 2 lít nước mỗi ngày.',
      iconName: 'GlassWater', color: 'bg-blue-50 text-blue-500'
    }
  ]
};

export const getRecommendations = (condition: string = 'Normal'): Recommendation[] => {
  return RECOMMMENDATION_DB[condition] || RECOMMMENDATION_DB['Normal'];
};

// --- LINKING ACCOUNTS SERVICES ---

/**
 * PATIENT: Generate a temporary link code
 */
export const generateLinkCode = async (patientId: string): Promise<string> => {
  await new Promise(resolve => setTimeout(resolve, 500));
  
  const code = Math.floor(100000 + Math.random() * 900000).toString(); // 6 digits
  const codesStr = localStorage.getItem(STORAGE_KEYS.LINK_CODES);
  const codes: LinkCode[] = codesStr ? JSON.parse(codesStr) : [];

  // Remove old codes for this user
  const cleanCodes = codes.filter(c => c.patientId !== patientId);
  
  cleanCodes.push({
    code,
    patientId,
    expiresAt: Date.now() + 5 * 60 * 1000 // 5 minutes
  });

  localStorage.setItem(STORAGE_KEYS.LINK_CODES, JSON.stringify(cleanCodes));
  return code;
};

/**
 * CAREGIVER: Submit code to link
 */
export const submitLinkCode = async (caregiverId: string, code: string): Promise<{ success: boolean, patientName?: string }> => {
  await new Promise(resolve => setTimeout(resolve, 800));

  const codesStr = localStorage.getItem(STORAGE_KEYS.LINK_CODES);
  const codes: LinkCode[] = codesStr ? JSON.parse(codesStr) : [];
  
  const validLink = codes.find(c => c.code === code && c.expiresAt > Date.now());

  if (!validLink) {
    throw new Error("Mã liên kết không hợp lệ hoặc đã hết hạn.");
  }

  // Find Patient User and Update caregiverId
  const usersStr = localStorage.getItem(STORAGE_KEYS.USERS);
  const users: User[] = usersStr ? JSON.parse(usersStr) : [];
  
  const patientIndex = users.findIndex(u => u._id === validLink.patientId);
  if (patientIndex === -1) throw new Error("Không tìm thấy người bệnh.");

  users[patientIndex].caregiverId = caregiverId;
  localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));

  return { success: true, patientName: users[patientIndex].name };
};

/**
 * CAREGIVER: Get linked patient info
 */
export const getLinkedPatient = (caregiverId: string): User | undefined => {
  const usersStr = localStorage.getItem(STORAGE_KEYS.USERS);
  const users: User[] = usersStr ? JSON.parse(usersStr) : [];
  
  // Find user who has this caregiverId
  return users.find(u => u.caregiverId === caregiverId);
};

// --- USER PROFILE SERVICES (NEW) ---

/**
 * PUT /api/users/profile
 */
export const updateUserProfile = async (userId: string, data: { height?: number, weight?: number, medicalCondition?: string }): Promise<User> => {
  await new Promise(resolve => setTimeout(resolve, 600));

  const usersStr = localStorage.getItem(STORAGE_KEYS.USERS);
  const users: User[] = usersStr ? JSON.parse(usersStr) : [];

  const index = users.findIndex(u => u._id === userId);
  if (index === -1) throw new Error("User not found");

  users[index] = { ...users[index], ...data };
  localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));

  return users[index];
};


// --- Helper: Reminder Generation Engine ---

const generateRemindersForMedication = (med: Medication) => {
  const remindersStr = localStorage.getItem(STORAGE_KEYS.REMINDERS);
  const reminders: Reminder[] = remindersStr ? JSON.parse(remindersStr) : [];

  const today = new Date();
  const startDate = new Date(med.startDate);

  let shouldSchedule = false;
  if (med.frequency === FrequencyType.DAILY) {
    shouldSchedule = true;
  } else if (med.frequency === FrequencyType.EVERY_OTHER_DAY) {
    const diffTime = Math.abs(today.getTime() - startDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
    shouldSchedule = diffDays % 2 === 0;
  }

  if (shouldSchedule) {
    med.times.forEach(timeStr => {
      const [hours, minutes] = timeStr.split(':').map(Number);
      const scheduleDate = new Date(today);
      scheduleDate.setHours(hours, minutes, 0, 0);

      // Unique check including medication ID
      const exists = reminders.some(r => 
        r.medicationId === med._id && 
        new Date(r.scheduledTime).getTime() === scheduleDate.getTime()
      );

      if (!exists) {
        const newReminder: Reminder = {
          _id: generateId(),
          medicationId: med._id,
          medicationName: med.name,
          dosage: med.dosage,
          unit: med.unit,
          scheduledTime: scheduleDate.toISOString(),
          status: ReminderStatus.PENDING,
          isSynced: true,
          lastUpdated: new Date().toISOString()
        };
        reminders.push(newReminder);
      }
    });
  }

  localStorage.setItem(STORAGE_KEYS.REMINDERS, JSON.stringify(reminders));
};

// Initial Seed helper
export const initializeMockData = () => {
  if (!localStorage.getItem(STORAGE_KEYS.MEDICATIONS)) {
    localStorage.setItem(STORAGE_KEYS.MEDICATIONS, '[]');
    localStorage.setItem(STORAGE_KEYS.REMINDERS, '[]');
    localStorage.setItem(STORAGE_KEYS.HEALTH_LOGS, '[]');
    localStorage.setItem(STORAGE_KEYS.WELLNESS_LOGS, '[]');
  }
};
    