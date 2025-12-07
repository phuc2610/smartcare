const Reminder = require('../models/Reminder');
const HealthLog = require('../models/HealthLog');
const WellnessLog = require('../models/WellnessLog');
const Medication = require('../models/Medication');

const getComprehensiveReport = async (req, res) => {
  try {
    const targetUserId = req.query.userId || req.user._id.toString();
    const range = req.query.range || '30d';

    let startDate = new Date();
    let endDate = new Date();
    
    if (range === 'today') {
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);
    } else if (range === 'week') {
      // Start of current week (Monday)
      const day = startDate.getDay();
      const diff = startDate.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
      startDate = new Date(startDate.getFullYear(), startDate.getMonth(), diff);
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);
    } else if (range === 'month') {
      // Start of current month
      startDate = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
      startDate.setHours(0, 0, 0, 0);
      // End of current month
      endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0);
      endDate.setHours(23, 59, 59, 999);
    } else if (range === '7d') {
      startDate.setDate(startDate.getDate() - 7);
      endDate.setHours(23, 59, 59, 999);
    } else if (range === '30d') {
      startDate.setDate(startDate.getDate() - 30);
      endDate.setHours(23, 59, 59, 999);
    } else {
      // Default to 30d
      startDate.setDate(startDate.getDate() - 30);
      endDate.setHours(23, 59, 59, 999);
    }

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
    const exercises = [];
    const meals = [];
    const symptomsByDate = {};

    healthLogs.forEach(log => {
      if (log.type === 'meal') {
        totalCaloriesIn += (log.details.calories || 0);
        const dateKey = log.date.toISOString().split('T')[0];
        meals.push({
          foodName: log.details.foodName || 'Bữa ăn',
          calories: log.details.calories || 0,
          date: dateKey,
        });
      } else if (log.type === 'exercise') {
        totalCaloriesOut += (log.details.caloriesBurned || 0);
        exercises.push({
          exerciseType: log.details.exerciseType || 'Vận động',
          durationMinutes: log.details.durationMinutes || 0,
          caloriesBurned: log.details.caloriesBurned || 0,
          date: log.date,
        });
      } else if (log.type === 'symptom') {
        const dateKey = log.date.toISOString().split('T')[0];
        if (!symptomsByDate[dateKey]) {
          symptomsByDate[dateKey] = [];
        }
        symptomsByDate[dateKey].push({
          symptomName: log.details.symptomName || 'Triệu chứng',
          severity: log.details.severity || 0,
          note: log.details.note || '',
          date: dateKey, // Use dateKey instead of log.date for consistency
        });
      }
    });

    // Wellness Logs
    const wellnessLogs = await WellnessLog.find({
      userId: targetUserId,
      date: { $gte: startDate, $lte: endDate },
    });

    const totalSeconds = wellnessLogs.reduce((acc, curr) => acc + curr.durationSeconds, 0);

    const response = {
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
      exerciseStats: {
        exercises: exercises.slice(0, 10), // Last 10 exercises
        totalCaloriesBurned: totalCaloriesOut,
        totalDurationMinutes: exercises.reduce((acc, e) => acc + (e.durationMinutes || 0), 0),
      },
      wellnessStats: {
        totalMinutes: Math.round(totalSeconds / 60),
        sessionsCount: wellnessLogs.length,
      },
      symptomsByDate: Object.keys(symptomsByDate).map(date => ({
        date,
        symptoms: symptomsByDate[date],
      })).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 30), // Last 30 days
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
    };

    // Include meals list for all ranges (grouped by date for week/month)
    response.meals = meals.sort((a, b) => new Date(b.date) - new Date(a.date));

    res.json(response);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getComprehensiveReport,
};





