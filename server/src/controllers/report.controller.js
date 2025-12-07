const Reminder = require('../models/Reminder');
const HealthLog = require('../models/HealthLog');
const WellnessLog = require('../models/WellnessLog');
const Medication = require('../models/Medication');
const PDFDocument = require('pdfkit');
const User = require('../models/User');

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

const exportPDF = async (req, res) => {
  try {
    // For PDF export, we allow token in query param (for Linking.openURL)
    // But prefer header token if available
    let userId = req.user?._id?.toString();
    
    // If no user from auth middleware, try to get from token in query
    if (!userId && req.query.token) {
      const { verifyToken } = require('../utils/jwt');
      try {
        const decoded = verifyToken(req.query.token);
        const user = await User.findById(decoded.userId);
        if (user) {
          userId = user._id.toString();
        }
      } catch (e) {
        return res.status(401).json({ error: 'Invalid token' });
      }
    }
    
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const targetUserId = req.query.userId || userId;
    const range = req.query.range || 'today';

    // Get user info
    const user = await User.findById(targetUserId).select('name phone medicalCondition');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get report data (same logic as getComprehensiveReport)
    let startDate = new Date();
    let endDate = new Date();
    
    if (range === 'today') {
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);
    } else if (range === 'week') {
      const day = startDate.getDay();
      const diff = startDate.getDate() - day + (day === 0 ? -6 : 1);
      startDate = new Date(startDate.getFullYear(), startDate.getMonth(), diff);
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);
    } else if (range === 'month') {
      startDate = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0);
      endDate.setHours(23, 59, 59, 999);
    } else if (range === '7d') {
      startDate.setDate(startDate.getDate() - 7);
      endDate.setHours(23, 59, 59, 999);
    } else if (range === '30d') {
      startDate.setDate(startDate.getDate() - 30);
      endDate.setHours(23, 59, 59, 999);
    }

    const medications = await Medication.find({ userId: targetUserId });
    const medicationIds = medications.map(m => m._id);

    const reminders = await Reminder.find({
      medicationId: { $in: medicationIds },
      scheduledTime: { $gte: startDate, $lte: endDate },
    }).sort({ scheduledTime: -1 });

    const totalReminders = reminders.length;
    const takenReminders = reminders.filter(r => r.status === 'TAKEN').length;
    const adherenceRate = totalReminders > 0 ? Math.round((takenReminders / totalReminders) * 100) : 0;

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
        });
      }
    });

    const wellnessLogs = await WellnessLog.find({
      userId: targetUserId,
      date: { $gte: startDate, $lte: endDate },
    });
    const totalSeconds = wellnessLogs.reduce((acc, curr) => acc + curr.durationSeconds, 0);

    // Create PDF
    const doc = new PDFDocument({ margin: 50 });
    
    // Set response headers
    const filename = `BaoCao_${range}_${new Date().toISOString().split('T')[0]}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    // Pipe PDF to response
    doc.pipe(res);

    // Helper function to format dates
    const formatDateStr = (date) => {
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    };
    
    // Header
    doc.fontSize(20).text('BÁO CÁO SỨC KHỎE', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(12);
    doc.text(`Người bệnh: ${user.name}`, { align: 'center' });
    doc.text(`SĐT: ${user.phone}`, { align: 'center' });
    if (user.medicalCondition && user.medicalCondition !== 'Normal') {
      doc.text(`Tình trạng: ${user.medicalCondition}`, { align: 'center' });
    }
    doc.moveDown(0.5);
    
    const rangeLabel = range === 'today' ? 'Hôm nay' : range === 'week' ? 'Tuần này' : range === 'month' ? 'Tháng này' : `${range}`;
    doc.text(`Kỳ báo cáo: ${rangeLabel}`, { align: 'center' });
    doc.text(`Từ: ${formatDateStr(startDate)} - Đến: ${formatDateStr(endDate)}`, { align: 'center' });
    doc.moveDown(1);

    // Medication Adherence
    doc.fontSize(16).text('1. TUÂN THỦ UỐNG THUỐC', { underline: true });
    doc.moveDown(0.3);
    doc.fontSize(12);
    
    // Create table for medication adherence
    const tableTop = doc.y;
    const tableLeft = 50;
    const colWidth = 120;
    const rowHeight = 20;
    
    // Table header
    doc.fontSize(12).font('Helvetica-Bold');
    doc.text('Tổng', tableLeft, tableTop);
    doc.text('Đã uống', tableLeft + colWidth, tableTop);
    doc.text('Tỷ lệ tuân thủ', tableLeft + colWidth * 2, tableTop);
    
    // Table data
    doc.font('Helvetica');
    doc.text(`${totalReminders}`, tableLeft, tableTop + rowHeight);
    doc.text(`${takenReminders}`, tableLeft + colWidth, tableTop + rowHeight);
    doc.text(`${adherenceRate}%`, tableLeft + colWidth * 2, tableTop + rowHeight);
    
    doc.y = tableTop + rowHeight * 2;
    doc.moveDown(1);

    // Health Stats
    doc.fontSize(16).text('2. THỐNG KÊ SỨC KHỎE', { underline: true });
    doc.moveDown(0.3);
    doc.fontSize(12);
    doc.text(`Tổng calo nạp vào: ${totalCaloriesIn} kcal`);
    doc.text(`Tổng calo tiêu thụ: ${totalCaloriesOut} kcal`);
    const calorieBalance = totalCaloriesIn - totalCaloriesOut;
    doc.text(`Cân bằng calo: ${calorieBalance} kcal`);
    doc.moveDown(1);

    // Meals (section 4, skip section 3)
    if (meals.length > 0) {
      doc.fontSize(16).text('4. BỮA ĂN', { underline: true });
      doc.moveDown(0.3);
      doc.fontSize(12);
      const mealsByDate = {};
      meals.forEach(meal => {
        if (!mealsByDate[meal.date]) {
          mealsByDate[meal.date] = [];
        }
        mealsByDate[meal.date].push(meal);
      });
      Object.keys(mealsByDate).sort().reverse().slice(0, 10).forEach(date => {
        // Format date as DD/MM/YYYY
        const [year, month, day] = date.split('-');
        const formattedDate = `${day}/${month}/${year}`;
        doc.text(`Ngày ${formattedDate}:`);
        mealsByDate[date].forEach(meal => {
          // Format: "-FoodName: calories kcal" (exactly like screenshot)
          const foodText = meal.foodName || 'Bữa ăn';
          doc.text(`-${foodText}: ${meal.calories} kcal`, { indent: 20 });
        });
      });
      doc.moveDown(1);
    }

    // Wellness (section 6, skip section 5 if no symptoms)
    if (wellnessLogs.length > 0) {
      doc.fontSize(16).text('6. THƯ GIÃN', { underline: true });
      doc.moveDown(0.3);
      doc.fontSize(12);
      doc.text(`Tổng thời gian: ${Math.round(totalSeconds / 60)} phút`);
      doc.text(`Số lần: ${wellnessLogs.length}`);
      doc.moveDown(1);
    }

    // Footer
    const now = new Date();
    const formatTime = (date) => {
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      const seconds = String(date.getSeconds()).padStart(2, '0');
      return `${hours}:${minutes}:${seconds}`;
    };
    doc.fontSize(10).text(
      `Xuất báo cáo ngày: ${formatTime(now)} ${formatDateStr(now)}`,
      { align: 'center' }
    );

    // Finalize PDF
    doc.end();
  } catch (error) {
    console.error('[EXPORT PDF] Error:', error);
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getComprehensiveReport,
  exportPDF,
};





