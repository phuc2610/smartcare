const HealthLog = require('../models/HealthLog');
const { z } = require('zod');

const createHealthLogSchema = z.object({
  body: z.object({
    type: z.enum(['meal', 'exercise', 'symptom']),
    date: z.string().datetime().optional(),
    scheduledDate: z.string().optional(), // Format: "YYYY-MM-DD"
    scheduledTime: z.string().optional(), // Format: "HH:mm"
    details: z.object({
      foodName: z.string().optional(),
      calories: z.number().optional(),
      exerciseType: z.string().optional(),
      durationMinutes: z.number().optional(),
      caloriesBurned: z.number().optional(),
      symptomName: z.string().optional(),
      severity: z.number().optional(),
      note: z.string().optional(),
    }),
  }),
});

const createHealthLog = async (req, res) => {
  try {
    const { type, date, scheduledDate, scheduledTime, details } = req.body;

    const healthLog = await HealthLog.create({
      userId: req.user._id,
      type,
      date: date ? new Date(date) : new Date(),
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

const getTodayHealthLogs = async (req, res) => {
  try {
    const targetUserId = req.query.userId || req.user._id.toString();
    const today = new Date();
    const startOfDay = new Date(today);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(today);
    endOfDay.setHours(23, 59, 59, 999);

    // Get health logs for today (meal and exercise only, not symptom)
    const healthLogs = await HealthLog.find({
      userId: targetUserId,
      type: { $in: ['meal', 'exercise'] },
      $or: [
        { date: { $gte: startOfDay, $lte: endOfDay } },
        { scheduledDate: { $gte: startOfDay, $lte: endOfDay } },
      ],
    }).sort({ scheduledTime: 1, date: 1 });

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
    date: z.string().datetime().optional(),
    scheduledDate: z.string().optional(),
    scheduledTime: z.string().optional(),
    details: z.object({
      foodName: z.string().optional(),
      calories: z.number().optional(),
      exerciseType: z.string().optional(),
      durationMinutes: z.number().optional(),
      caloriesBurned: z.number().optional(),
      symptomName: z.string().optional(),
      severity: z.number().optional(),
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


