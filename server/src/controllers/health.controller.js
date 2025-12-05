const HealthLog = require('../models/HealthLog');
const { z } = require('zod');

const createHealthLogSchema = z.object({
  body: z.object({
    type: z.enum(['meal', 'exercise', 'symptom']),
    date: z.string().datetime().optional(),
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
    const { type, date, details } = req.body;

    const healthLog = await HealthLog.create({
      userId: req.user._id,
      type,
      date: date ? new Date(date) : new Date(),
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

module.exports = {
  createHealthLog,
  getHealthSummary,
  createHealthLogSchema,
};


