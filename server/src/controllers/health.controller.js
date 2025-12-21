/**
 * HEALTH CONTROLLER - Quản lý nhật ký sức khỏe
 * Chức năng: Tạo log bữa ăn/vận động/triệu chứng, thống kê calo, lấy logs hôm nay, cập nhật/xóa log
 */

const HealthLog = require('../models/HealthLog');
const { z } = require('zod');

// Schema validation cho tạo health log: type (meal/exercise/symptom), date, scheduledDate, scheduledTime, details
const createHealthLogSchema = z.object({
  body: z.object({
    type: z.enum(['meal', 'exercise', 'symptom']),
    // Chấp nhận date string, backend sẽ convert sang Date
    date: z.string().optional(),
    scheduledDate: z.string().optional(), // Format: "YYYY-MM-DD"
    scheduledTime: z.string().optional(), // Format: "HH:mm"
    details: z.object({
      foodName: z.string().optional(),
      calories: z.coerce.number().optional(),
      exerciseType: z.string().optional(),
      durationMinutes: z.coerce.number().optional(),
      caloriesBurned: z.coerce.number().optional(),
      symptomName: z.string().optional(),
      severity: z.coerce.number().optional(),
      note: z.string().optional(),
    }),
  }),
});

/**
 * Tạo health log mới (bữa ăn/vận động/triệu chứng)
 * Luồng: Parse date/scheduledDate -> Tạo healthLog -> Trả về
 */
const createHealthLog = async (req, res) => {
  try {
    const { type, date, scheduledDate, scheduledTime, details } = req.body;

    // Tạo health log với userId từ JWT token
    const healthLog = await HealthLog.create({
      userId: req.user._id,
      type,
      date: date ? new Date(date) : new Date(), // Nếu không có date thì dùng hôm nay
      scheduledDate: scheduledDate ? new Date(scheduledDate) : undefined,
      scheduledTime: scheduledTime || undefined,
      details,
    });

    res.status(201).json({ healthLog });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getHealthSummary = async (req, res) => {
  try {
    const targetUserId = req.query.userId || req.user._id.toString();
    const range = req.query.range || '7d';

    let startDate = new Date();
    if (range === '7d') {
      startDate.setDate(startDate.getDate() - 7);
    } else if (range === '30d') {
      startDate.setDate(startDate.getDate() - 30);
    }

    const logs = await HealthLog.find({
      userId: targetUserId,
      date: { $gte: startDate },
    }).sort({ date: -1 });

    // Calculate weekly stats
    const weeklyStats = [];
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dateKey = d.toISOString().split('T')[0];

      const dayLogs = logs.filter(log => log.date.toISOString().startsWith(dateKey));

      let caloriesIn = 0;
      let caloriesOut = 0;

      dayLogs.forEach(log => {
        if (log.type === 'meal') {
          caloriesIn += (log.details.calories || 0);
        } else if (log.type === 'exercise') {
          caloriesOut += (log.details.caloriesBurned || 0);
        }
      });

      weeklyStats.push({
        date: `${d.getDate()}/${d.getMonth() + 1}`,
        caloriesIn,
        caloriesOut,
      });
    }

    res.json({
      logs: logs.slice(0, 50),
      weeklyStats,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getScheduledTasks = async (req, res) => {
  try {
    const targetDate = req.query.date ? new Date(req.query.date) : new Date();
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    // Get scheduled health logs
    const scheduledHealthLogs = await HealthLog.find({
      userId: req.user._id,
      scheduledDate: {
        $gte: startOfDay,
        $lte: endOfDay,
      },
    }).sort({ scheduledTime: 1 });

    res.json({
      healthLogs: scheduledHealthLogs,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Lấy health logs hôm nay (chỉ meal và exercise, không có symptom)
 * Luồng: Kiểm tra quyền truy cập (caregiver có thể xem của patient) -> Tính thời gian trong ngày -> Lấy logs -> Sắp xếp
 */
const getTodayHealthLogs = async (req, res) => {
  try {
    // Cho phép caregiver xem logs của patient (truyền userId trong query)
    const targetUserId = req.query.userId || req.user._id.toString();
    
    // Nếu request dữ liệu của user khác, kiểm tra quyền truy cập
    if (targetUserId !== req.user._id.toString()) {
      const User = require('../models/User');
      const targetUser = await User.findById(targetUserId);
      
      if (!targetUser) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      // Nếu người request là caregiver, kiểm tra có liên kết với patient không
      if (req.user.role === 'CAREGIVER') {
        if (targetUser.role !== 'PATIENT' || targetUser.caregiverId?.toString() !== req.user._id.toString()) {
          return res.status(403).json({ error: 'Access denied' });
        }
      } else if (req.user.role === 'PATIENT') {
        // Patient chỉ có thể xem dữ liệu của chính mình
        return res.status(403).json({ error: 'Access denied' });
      }
    }
    
    // Tính thời gian bắt đầu và kết thúc của ngày hôm nay
    const today = new Date();
    const startOfDay = new Date(today);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(today);
    endOfDay.setHours(23, 59, 59, 999);

    // Lấy health logs hôm nay (chỉ meal và exercise, không có symptom)
    // Có thể là log đã thực hiện (date) hoặc đã lên lịch (scheduledDate)
    const healthLogs = await HealthLog.find({
      userId: targetUserId,
      type: { $in: ['meal', 'exercise'] },
      $or: [
        { date: { $gte: startOfDay, $lte: endOfDay } },
        { scheduledDate: { $gte: startOfDay, $lte: endOfDay } },
      ],
    }).sort({ scheduledTime: 1, date: 1 }); // Sắp xếp theo scheduledTime, sau đó theo date

    res.json({
      healthLogs,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const updateHealthLogSchema = z.object({
  body: z.object({
    type: z.enum(['meal', 'exercise', 'symptom']).optional(),
    date: z.string().optional(),
    scheduledDate: z.string().optional(),
    scheduledTime: z.string().optional(),
    details: z.object({
      foodName: z.string().optional(),
      calories: z.coerce.number().optional(),
      exerciseType: z.string().optional(),
      durationMinutes: z.coerce.number().optional(),
      caloriesBurned: z.coerce.number().optional(),
      symptomName: z.string().optional(),
      severity: z.coerce.number().optional(),
      note: z.string().optional(),
    }).optional(),
    isCompleted: z.boolean().optional(),
  }),
});

const updateHealthLog = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const healthLog = await HealthLog.findOne({ _id: id, userId: req.user._id });
    if (!healthLog) {
      return res.status(404).json({ error: 'Health log not found' });
    }

    if (updateData.date) {
      updateData.date = new Date(updateData.date);
    }
    if (updateData.scheduledDate) {
      updateData.scheduledDate = new Date(updateData.scheduledDate);
    }
    if (updateData.details) {
      updateData.details = { ...healthLog.details, ...updateData.details };
    }

    Object.assign(healthLog, updateData);
    await healthLog.save();

    res.json({ healthLog });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const deleteHealthLog = async (req, res) => {
  try {
    const { id } = req.params;

    const healthLog = await HealthLog.findOne({ _id: id, userId: req.user._id });
    if (!healthLog) {
      return res.status(404).json({ error: 'Health log not found' });
    }

    await HealthLog.deleteOne({ _id: id });

    res.json({ message: 'Health log deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  createHealthLog,
  getHealthSummary,
  getScheduledTasks,
  getTodayHealthLogs,
  updateHealthLog,
  deleteHealthLog,
  createHealthLogSchema,
  updateHealthLogSchema,
};


