const Reminder = require('../models/Reminder');
const HealthLog = require('../models/HealthLog');
const WellnessLog = require('../models/WellnessLog');
const Medication = require('../models/Medication');

const getComprehensiveReport = async (req, res) => {
  try {
    const targetUserId = req.query.userId || req.user._id.toString();
    const range = req.query.range || '30d';

    let startDate = new Date();
    if (range === '7d') {
      startDate.setDate(startDate.getDate() - 7);
    } else if (range === '30d') {
      startDate.setDate(startDate.getDate() - 30);
    } else if (range === 'today') {
      startDate.setHours(0, 0, 0, 0);
    }

    const endDate = new Date();
    endDate.setHours(23, 59, 59, 999);

    // Medications
    const medications = await Medication.find({ userId: targetUserId });
    const medicationIds = medications.map(m => m._id);

    // Reminders
    const reminders = await Reminder.find({
      medicationId: { $in: medicationIds },
      scheduledTime: { $gte: startDate, $lte: endDate },
    }).sort({ scheduledTime: -1 });

    const totalReminders = reminders.length;
    const takenReminders = reminders.filter(r => r.status === 'TAKEN').length;
    const skippedReminders = reminders.filter(r => r.status === 'SKIPPED').length;

    // Health Logs
    const healthLogs = await HealthLog.find({
      userId: targetUserId,
      date: { $gte: startDate, $lte: endDate },
    });

    let totalCaloriesIn = 0;
    let totalCaloriesOut = 0;

    healthLogs.forEach(log => {
      if (log.type === 'meal') {
        totalCaloriesIn += (log.details.calories || 0);
      } else if (log.type === 'exercise') {
        totalCaloriesOut += (log.details.caloriesBurned || 0);
      }
    });

    // Wellness Logs
    const wellnessLogs = await WellnessLog.find({
      userId: targetUserId,
      date: { $gte: startDate, $lte: endDate },
    });

    const totalSeconds = wellnessLogs.reduce((acc, curr) => acc + curr.durationSeconds, 0);

    res.json({
      startDate: startDate.toLocaleDateString('vi-VN'),
      endDate: endDate.toLocaleDateString('vi-VN'),
      medicationAdherence: {
        total: totalReminders,
        taken: takenReminders,
        skipped: skippedReminders,
        rate: totalReminders > 0 ? Math.round((takenReminders / totalReminders) * 100) : 0,
      },
      healthStats: {
        totalCaloriesIn,
        totalCaloriesOut,
      },
      wellnessStats: {
        totalMinutes: Math.round(totalSeconds / 60),
        sessionsCount: wellnessLogs.length,
      },
      reminders: reminders.map(r => ({
        _id: r._id,
        medicationId: r.medicationId,
        medicationName: r.medicationName,
        dosage: r.dosage,
        unit: r.unit,
        scheduledTime: r.scheduledTime,
        status: r.status,
        takenAt: r.takenAt,
      })),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getComprehensiveReport,
};





