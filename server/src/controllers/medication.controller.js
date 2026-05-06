/**
 * MEDICATION CONTROLLER - Quản lý thuốc và nhắc nhở uống thuốc
 * Chức năng: Tạo thuốc, lấy danh sách, xóa thuốc, quản lý reminders, lấy thuốc đã quên
 */

const Medication = require('../models/Medication');
const Reminder = require('../models/Reminder');
const { z } = require('zod');

// Schema validation cho tạo thuốc: name, dosage, unit, notes, frequency (DAILY/EVERY_OTHER_DAY), times (mảng giờ), startDate
const createMedicationSchema = z.object({
  body: z.object({
    name: z.string().min(1),
    dosage: z.string(),
    unit: z.string().default('mg'),
    notes: z.string().optional(),
    frequency: z.enum(['DAILY', 'EVERY_OTHER_DAY']),
    sessions: z.array(z.enum(['MORNING', 'NOON', 'EVENING'])).optional(),
    mealTiming: z.enum(['BEFORE_MEAL', 'AFTER_MEAL', 'NONE']).optional(),
    times: z.array(z.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/)).optional(), // Format HH:mm
    startDate: z.string().datetime(),
    endDate: z.string().datetime().optional().nullable(),
  }),
});

/**
 * Tạo thuốc mới
 * Luồng: Tạo medication -> Tự động tạo reminders cho hôm nay -> Trả về medication
 */
const createMedication = async (req, res) => {
  try {
    const { name, dosage, unit, notes, frequency, sessions, mealTiming, times, startDate, endDate } = req.body;

    // Tạo medication mới với userId từ JWT token
    const medication = await Medication.create({
      userId: req.user._id,
      name,
      dosage,
      unit: unit || 'mg',
      notes: notes || '',
      frequency,
      sessions: sessions || [],
      mealTiming: mealTiming || 'NONE',
      times: times || [],
      startDate: new Date(startDate),
      endDate: endDate ? new Date(endDate) : null,
    });

    // Tự động tạo reminders cho hôm nay dựa trên frequency và times
    await generateRemindersForMedication(medication);

    res.status(201).json({ medication });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Lấy danh sách reminders hôm nay
 * Luồng: Lấy targetUserId (có thể là của patient nếu caregiver gọi) -> Lấy tất cả medications -> Lấy reminders trong ngày -> Sắp xếp theo giờ
 */
const getTodayReminders = async (req, res) => {
  try {
    // Cho phép caregiver xem reminders của patient (truyền userId trong query)
    const targetUserId = req.query.userId || req.user._id.toString();

    // Lấy tất cả medications đang active của user
    const medications = await Medication.find({ userId: targetUserId, isActive: true });
    const medicationIds = medications.map(m => m._id);

    // Tính thời gian bắt đầu và kết thúc của ngày hôm nay
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0);
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);

    // Auto-generate reminders cho medications chưa có reminder hôm nay
    for (const med of medications) {
      const existingCount = await Reminder.countDocuments({
        medicationId: med._id,
        scheduledTime: { $gte: startOfDay, $lte: endOfDay },
      });
      if (existingCount === 0) {
        try {
          await generateRemindersForMedication(med);
        } catch (genErr) {
          console.error('Auto-gen reminders failed for', med.name, genErr.message);
        }
      }
    }

    // Tìm tất cả reminders trong ngày, sắp xếp theo giờ tăng dần
    const reminders = await Reminder.find({
      medicationId: { $in: medicationIds },
      scheduledTime: { $gte: startOfDay, $lte: endOfDay },
    }).sort({ scheduledTime: 1 });

    res.json({ reminders });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


/**
 * Cập nhật trạng thái reminder (TAKEN/SKIPPED/PENDING)
 * Luồng: Tìm reminder -> Cập nhật status -> Nếu TAKEN thì lưu thời gian takenAt -> Cập nhật lastUpdated -> Lưu
 */
const updateReminderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    // Tìm reminder theo ID
    const reminder = await Reminder.findById(id);
    if (!reminder) {
      return res.status(404).json({ error: 'Reminder not found' });
    }

    // Cập nhật status
    reminder.status = status;
    
    // Nếu đánh dấu đã uống (TAKEN), lưu thời gian uống
    if (status === 'TAKEN') {
      reminder.takenAt = new Date();
    }
    
    // Cập nhật thời gian chỉnh sửa cuối
    reminder.lastUpdated = new Date();
    await reminder.save();

    res.json({ reminder });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Uống ngay hàng loạt - đánh dấu TAKEN cho nhiều reminders
 */
const takeAllNow = async (req, res) => {
  try {
    const { reminderIds } = req.body;
    
    if (!reminderIds || !Array.isArray(reminderIds) || reminderIds.length === 0) {
      return res.status(400).json({ error: 'reminderIds array is required' });
    }

    const now = new Date();
    
    // Validate ownership: user must own the medications of these reminders
    const reminders = await Reminder.find({ _id: { $in: reminderIds }, status: 'PENDING' });
    const validReminderIds = [];
    
    for (const reminder of reminders) {
      const medication = await Medication.findById(reminder.medicationId);
      if (medication && medication.userId.toString() === req.user._id.toString()) {
        validReminderIds.push(reminder._id);
      }
    }

    const result = await Reminder.updateMany(
      { _id: { $in: validReminderIds } },
      { status: 'TAKEN', takenAt: now, lastUpdated: now }
    );
    
    res.json({ updated: result.modifiedCount });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const updateReminderSchema = z.object({
  body: z.object({
    scheduledTime: z.string().datetime().optional(),
    dosage: z.string().optional(),
    unit: z.string().optional(),
  }),
});

const updateReminder = async (req, res) => {
  try {
    const { id } = req.params;
    const { scheduledTime, dosage, unit } = req.body;

    const reminder = await Reminder.findById(id);
    if (!reminder) {
      return res.status(404).json({ error: 'Reminder not found' });
    }

    if (scheduledTime) {
      reminder.scheduledTime = new Date(scheduledTime);
    }
    if (dosage !== undefined) {
      reminder.dosage = dosage;
    }
    if (unit !== undefined) {
      reminder.unit = unit;
    }
    reminder.lastUpdated = new Date();
    await reminder.save();

    res.json({ reminder });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getMedications = async (req, res) => {
  try {
    const filter = { userId: req.user._id };
    if (req.query.prescriptionId) {
      filter.prescriptionId = req.query.prescriptionId;
    }
    const medications = await Medication.find(filter)
      .populate('prescriptionId', 'diagnosis doctorName startDate')
      .sort({ createdAt: -1 });
    res.json({ medications });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const deleteMedication = async (req, res) => {
  try {
    const { id } = req.params;
    await Medication.findByIdAndDelete(id);
    await Reminder.deleteMany({ medicationId: id });
    res.json({ message: 'Medication deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const batchDeleteMedications = async (req, res) => {
  try {
    const { medicationIds } = req.body;
    if (!medicationIds || !Array.isArray(medicationIds) || medicationIds.length === 0) {
      return res.status(400).json({ error: 'medicationIds array is required' });
    }

    // Xóa reminders liên quan
    await Reminder.deleteMany({ medicationId: { $in: medicationIds } });
    
    // Xóa medications (ensure they belong to user)
    await Medication.deleteMany({ _id: { $in: medicationIds }, userId: req.user._id });
    
    res.json({ deleted: medicationIds.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const deleteReminder = async (req, res) => {
  try {
    const { id } = req.params;
    
    const reminder = await Reminder.findById(id);
    if (!reminder) {
      return res.status(404).json({ error: 'Reminder not found' });
    }
    
    // Verify the reminder belongs to the user's medication
    const medication = await Medication.findById(reminder.medicationId);
    if (!medication || medication.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    await Reminder.findByIdAndDelete(id);
    res.json({ message: 'Reminder deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Helper: Tự động tạo reminders cho medication
 * Logic: 
 * - Nếu frequency = DAILY: tạo reminder cho tất cả các giờ trong times
 * - Nếu frequency = EVERY_OTHER_DAY: chỉ tạo nếu số ngày từ startDate là số chẵn
 * - Chỉ tạo nếu chưa có reminder cho giờ đó
 */
// ─────────────────────────────────────────────────────────────
// THỜI GIAN NHẮC THUỐC CHUẨN (toàn app dùng chung)
// Range: sáng 06:00–09:00 | trưa 10:00–14:00 | tối 17:00–20:00
// ─────────────────────────────────────────────────────────────
const SESSION_DEFAULT_TIMES = {
  morning: '07:00',
  noon:    '11:00',
  evening: '18:00',
};

const SESSION_RANGES = {
  MORNING: { start: '06:00', end: '09:00' },
  NOON:    { start: '10:00', end: '14:00' },
  EVENING: { start: '17:00', end: '20:00' },
};

/** Helper: parse "HH:mm" → Date object hôm nay */
const buildTodayDate = (timeStr) => {
  const today = new Date();
  const [h, m] = timeStr.split(':').map(Number);
  const d = new Date(today);
  d.setHours(h, m, 0, 0);
  return d;
};

/**
 * Tạo nhắc nhở trễ (cuối range) cho một session
 * Chỉ tạo nếu chưa có, nhắc nhở khi người dùng chưa uống thuốc đúng giờ
 */
const generateLateReminderForSession = async (medication, session) => {
  const range = SESSION_RANGES[session];
  if (!range) return;

  const lateTime = buildTodayDate(range.end);

  // Chỉ tạo late reminder nếu giờ cuối range chưa qua
  if (lateTime < new Date()) return;

  const existingLate = await Reminder.findOne({
    medicationId: medication._id,
    scheduledTime: lateTime,
  });

  if (!existingLate) {
    await Reminder.create({
      medicationId: medication._id,
      medicationName: medication.name,
      dosage: medication.dosage,
      unit: medication.unit,
      scheduledTime: lateTime,
      status: 'PENDING',
      mealTiming: medication.mealTiming || 'NONE',
      session: session,
      isLateReminder: true,   // đánh dấu đây là nhắc trễ
      isSynced: true,
      lastUpdated: new Date(),
    });
  }
};

/**
 * Helper: Tự động tạo reminders cho medication
 * Logic:
 * - Nếu frequency = DAILY: tạo reminder cho tất cả các giờ trong times
 * - Nếu frequency = EVERY_OTHER_DAY: chỉ tạo nếu số ngày từ startDate là số chẵn
 * - Mỗi session tạo 2 reminders: nhắc chính (default time) + nhắc trễ (cuối range)
 */
const generateRemindersForMedication = async (medication) => {
  const today = new Date();
  const startDate = new Date(medication.startDate);

  // Dừng tạo nhắc nhở nếu ngày hiện tại đã vượt qua ngày kết thúc
  if (medication.endDate) {
    const endDate = new Date(medication.endDate);
    endDate.setHours(23, 59, 59, 999);
    if (today > endDate) return;
  }

  // Xác định có nên tạo reminder hôm nay không
  let shouldSchedule = false;
  if (medication.frequency === 'DAILY') {
    shouldSchedule = true;
  } else if (medication.frequency === 'EVERY_OTHER_DAY') {
    const diffTime = Math.abs(today.getTime() - startDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    shouldSchedule = diffDays % 2 === 0;
  }

  // Lấy user preferences (nếu user đã tự chỉnh giờ), fallback về giờ chuẩn
  const User = require('../models/User');
  const userObj = await User.findById(medication.userId);
  const prefs = {
    morning: userObj?.medicationTimes?.morning || SESSION_DEFAULT_TIMES.morning,
    noon:    userObj?.medicationTimes?.noon    || SESSION_DEFAULT_TIMES.noon,
    evening: userObj?.medicationTimes?.evening || SESSION_DEFAULT_TIMES.evening,
  };

  let creationTargets = []; // Array of { timeStr, session }

  if (medication.sessions && medication.sessions.length > 0) {
    for (const session of medication.sessions) {
      if (session === 'MORNING') creationTargets.push({ timeStr: prefs.morning, session: 'MORNING' });
      if (session === 'NOON')    creationTargets.push({ timeStr: prefs.noon,    session: 'NOON' });
      if (session === 'EVENING') creationTargets.push({ timeStr: prefs.evening, session: 'EVENING' });
    }
  } else if (medication.times && medication.times.length > 0) {
    for (const timeStr of medication.times) {
      creationTargets.push({ timeStr, session: 'CUSTOM' });
    }
  }

  if (shouldSchedule && creationTargets.length > 0) {
    for (const target of creationTargets) {
      const scheduleDate = buildTodayDate(target.timeStr);

      // Kiểm tra đã có reminder cho giờ này chưa (tránh duplicate)
      const existing = await Reminder.findOne({
        medicationId: medication._id,
        scheduledTime: scheduleDate,
      });

      if (!existing) {
        await Reminder.create({
          medicationId: medication._id,
          medicationName: medication.name,
          dosage: medication.dosage,
          unit: medication.unit,
          scheduledTime: scheduleDate,
          status: 'PENDING',
          mealTiming: medication.mealTiming || 'NONE',
          session: target.session,
          isLateReminder: false,
          isSynced: true,
          lastUpdated: new Date(),
        });
      }

      // Tạo thêm nhắc nhở trễ (cuối range) cho session chuẩn
      if (['MORNING', 'NOON', 'EVENING'].includes(target.session)) {
        await generateLateReminderForSession(medication, target.session);
      }
    }
  }
};

/**
 * Lấy danh sách thuốc đã quên (quá 1 giờ, status vẫn là PENDING)
 * Luồng: Lấy medications -> Tìm reminders quá 1 giờ và vẫn PENDING -> Sắp xếp giảm dần -> Giới hạn 50 -> Trả về
 */
const getMissedMedications = async (req, res) => {
  try {
    // Cho phép caregiver xem missed medications của patient
    const targetUserId = req.query.userId || req.user._id.toString();
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000); // 1 giờ trước

    // Lấy tất cả medications của user
    const medications = await Medication.find({ userId: targetUserId });
    const medicationIds = medications.map(m => m._id);

    // Tìm reminders đã quá 1 giờ (scheduledTime <= 1 giờ trước) và vẫn còn PENDING
    const missedReminders = await Reminder.find({
      medicationId: { $in: medicationIds },
      scheduledTime: { $lte: oneHourAgo },
      status: 'PENDING',
    }).sort({ scheduledTime: -1 }).limit(50); // Sắp xếp giảm dần, giới hạn 50

    res.json({ missedReminders });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  createMedication,
  getTodayReminders,
  updateReminderStatus,
  updateReminder,
  getMedications,
  deleteMedication,
  batchDeleteMedications,
  deleteReminder,
  getMissedMedications,
  takeAllNow,
  createMedicationSchema,
  updateReminderSchema,
  generateRemindersForMedication,
};





