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

    // Lấy tất cả medications của user (hoặc patient)
    const medications = await Medication.find({ userId: targetUserId });
    const medicationIds = medications.map(m => m._id);

    // Tính thời gian bắt đầu và kết thúc của ngày hôm nay
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0);
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);

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
    const medications = await Medication.find({ userId: req.user._id }).sort({ createdAt: -1 });
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
const generateRemindersForMedication = async (medication) => {
  const today = new Date();
  const startDate = new Date(medication.startDate);
  
  // Dừng tạo nhắc nhở nếu ngày hiện tại đã vượt qua ngày kết thúc
  if (medication.endDate) {
    const endDate = new Date(medication.endDate);
    endDate.setHours(23, 59, 59, 999);
    if (today > endDate) {
      return; 
    }
  }

  // Xác định có nên tạo reminder hôm nay không
  let shouldSchedule = false;
  if (medication.frequency === 'DAILY') {
    // Uống hàng ngày: luôn tạo
    shouldSchedule = true;
  } else if (medication.frequency === 'EVERY_OTHER_DAY') {
    // Uống cách ngày: chỉ tạo nếu số ngày từ startDate là số chẵn
    const diffTime = Math.abs(today.getTime() - startDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    shouldSchedule = diffDays % 2 === 0;
  }

  // Xác định mảng times/sessions cuối cùng để loop
  const User = require('../models/User');
  const userObj = await User.findById(medication.userId);
  const prefs = userObj?.medicationTimes || { morning: '08:00', noon: '12:00', evening: '20:00' };

  let creationTargets = []; // Array of { timeStr, session }
  
  if (medication.sessions && medication.sessions.length > 0) {
    for (const session of medication.sessions) {
      if (session === 'MORNING') creationTargets.push({ timeStr: prefs.morning, session: 'MORNING' });
      if (session === 'NOON') creationTargets.push({ timeStr: prefs.noon, session: 'NOON' });
      if (session === 'EVENING') creationTargets.push({ timeStr: prefs.evening, session: 'EVENING' });
    }
  } else if (medication.times && medication.times.length > 0) {
    // Fallback for explicitly specified times
    for (const timeStr of medication.times) {
      creationTargets.push({ timeStr, session: 'CUSTOM' });
    }
  }

  // Nếu cần tạo reminder, duyệt qua tất cả các giờ đã map
  if (shouldSchedule && creationTargets.length > 0) {
    for (const target of creationTargets) {
      // Parse giờ và phút từ string "HH:mm"
      const [hours, minutes] = target.timeStr.split(':').map(Number);
      const scheduleDate = new Date(today);
      scheduleDate.setHours(hours, minutes, 0, 0);

      // Kiểm tra đã có reminder cho giờ này chưa (tránh duplicate)
      const existing = await Reminder.findOne({
        medicationId: medication._id,
        scheduledTime: scheduleDate,
      });

      // Nếu chưa có thì tạo reminder mới
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
          isSynced: true,
          lastUpdated: new Date(),
        });
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
  deleteReminder,
  getMissedMedications,
  createMedicationSchema,
  updateReminderSchema,
  generateRemindersForMedication,
};





