/**
 * REPORT CONTROLLER - Quản lý báo cáo sức khỏe
 * Chức năng: Tạo báo cáo tổng hợp (today/week/month/7d/30d), xuất PDF
 */

const Reminder = require('../models/Reminder');
const HealthLog = require('../models/HealthLog');
const WellnessLog = require('../models/WellnessLog');
const Medication = require('../models/Medication');
const PDFDocument = require('pdfkit');
const path = require('path');
const User = require('../models/User');

/**
 * Lấy báo cáo tổng hợp sức khỏe
 * Luồng: Tính startDate/endDate theo range -> Lấy medications/reminders/healthLogs/wellnessLogs -> Tính toán stats -> Nhóm theo ngày -> Trả về
 */
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

/**
 * Xuất báo cáo ra file PDF
 * Luồng: Kiểm tra token (có thể từ query param) -> Lấy user info -> Lấy report data -> Tạo PDF với PDFKit -> Pipe vào response
 * Lưu ý: Hỗ trợ token trong query param để có thể mở từ deep link
 */
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
    
    // Register Custom Fonts for Vietnamese Support
    try {
      const fontRegular = path.join(__dirname, '..', 'assets', 'fonts', 'Arial-Regular.ttf');
      const fontBold = path.join(__dirname, '..', 'assets', 'fonts', 'Arial-Bold.ttf');
      doc.registerFont('CustomRegular', fontRegular);
      doc.registerFont('CustomBold', fontBold);
      doc.font('CustomRegular');
    } catch (fontErr) {
      console.warn('[EXPORT PDF] Could not load custom fonts:', fontErr.message);
    }

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
    
    // Header Banner
    doc.rect(0, 0, doc.page.width, 100).fill('#1E40AF'); // Dark Blue background
    doc.fillColor('#FFFFFF').font('CustomBold').fontSize(22).text('BÁO CÁO SỨC KHỎE ĐIỆN TỬ', 0, 40, { align: 'center' });
    
    // Patient Info Box
    doc.moveDown(3);
    const boxTop = 120;
    doc.roundedRect(50, boxTop, doc.page.width - 100, 90, 8).fillAndStroke('#F3F4F6', '#E5E7EB');
    
    const infoY = boxTop + 15;
    doc.fillColor('#111827').font('CustomRegular').fontSize(12);
    doc.text(`Tên bệnh nhân:`, 70, infoY).font('CustomBold').text(user.name, 165, infoY);
    doc.font('CustomRegular').text(`Điện thoại:`, 70, infoY + 25).font('CustomBold').text(user.phone, 165, infoY + 25);
    doc.font('CustomRegular').text(`Tình trạng:`, 70, infoY + 50).font('CustomBold').text(user.medicalCondition || 'Bình thường', 165, infoY + 50);

    const rangeLabel = range === 'today' ? 'Hôm nay' : range === 'week' ? 'Tuần này' : range === 'month' ? 'Tháng này' : `${range}`;
    doc.font('CustomRegular').text(`Kỳ báo cáo:`, 320, infoY).font('CustomBold').text(rangeLabel, 410, infoY);
    doc.font('CustomRegular').text(`Từ ngày:`, 320, infoY + 25).font('CustomBold').text(formatDateStr(startDate), 410, infoY + 25);
    doc.font('CustomRegular').text(`Đến ngày:`, 320, infoY + 50).font('CustomBold').text(formatDateStr(endDate), 410, infoY + 50);

    doc.y = boxTop + 110;

    const drawSectionHeader = (title) => {
        doc.moveDown(1.5);
        doc.fillColor('#1E40AF').font('CustomBold').fontSize(14).text(title, 50, doc.y);
        doc.y += 8;
        doc.lineWidth(1).strokeColor('#E5E7EB').moveTo(50, doc.y).lineTo(doc.page.width - 50, doc.y).stroke();
        doc.moveDown(0.8);
        doc.fillColor('#374151').font('CustomRegular').fontSize(12);
        doc.x = 50;
    };

    // Medication Adherence
    drawSectionHeader('1. KẾT QUẢ TUÂN THỦ UỐNG THUỐC');
    doc.text(`• Tổng số liều cần uống: ${totalReminders}`);
    doc.moveDown(0.3);
    doc.text(`• Đã uống đúng giờ: ${takenReminders} liều `).font('CustomBold').fillColor(adherenceRate > 70 ? '#10B981' : '#EF4444').text(`(Đạt ${adherenceRate}%)`, { continued: false }).font('CustomRegular').fillColor('#374151');
    
    // Health Stats
    drawSectionHeader('2. THỐNG KÊ LƯỢNG CALO & VẬN ĐỘNG');
    doc.text(`• Tổng calo nạp vào (Ăn uống): ${totalCaloriesIn} kcal`);
    doc.moveDown(0.3);
    doc.text(`• Tổng calo tiêu thụ (Tập luyện): ${totalCaloriesOut} kcal`);
    doc.moveDown(0.3);
    const calorieBalance = totalCaloriesIn - totalCaloriesOut;
    doc.text(`• Cân bằng calo thực tế: `).font('CustomBold').fillColor('#1E40AF').text(`${calorieBalance > 0 ? '+' : ''}${calorieBalance} kcal`).font('CustomRegular').fillColor('#374151');

    // Meals 
    if (meals.length > 0) {
      drawSectionHeader('3. CHI TIẾT BỮA ĂN GẦN ĐÂY');
      const mealsByDate = {};
      meals.forEach(meal => {
        if (!mealsByDate[meal.date]) mealsByDate[meal.date] = [];
        mealsByDate[meal.date].push(meal);
      });
      
      let count = 0;
      Object.keys(mealsByDate).sort().reverse().forEach(date => {
        if (count >= 5) return;
        const [year, month, day] = date.split('-');
        doc.font('CustomBold').fillColor('#111827').text(`Ngày ${day}/${month}/${year}:`);
        doc.moveDown(0.2);
        mealsByDate[date].forEach(meal => {
          doc.font('CustomRegular').fillColor('#4B5563').text(`   - ${meal.foodName || 'Bữa ăn'}: ${meal.calories} kcal`);
        });
        doc.moveDown(0.5);
        count++;
      });
    }

    // Wellness 
    if (wellnessLogs.length > 0) {
      drawSectionHeader('4. HOẠT ĐỘNG THƯ GIÃN TINH THẦN');
      doc.text(`• Số phiên thư giãn: ${wellnessLogs.length}`);
      doc.moveDown(0.3);
      doc.text(`• Tổng thời gian: ${Math.round(totalSeconds / 60)} phút`);
    }

    // ─── Section 5: Chi tiết lịch sử uống thuốc từng loại ───
    if (reminders.length > 0) {
      drawSectionHeader('5. CHI TIẾT LỊCH SỬ UỐNG THUỐC TỪNG LOẠI');

      // Group reminders by medicationName
      const medGroups = {};
      reminders.forEach(r => {
        const key = r.medicationName || 'Không rõ';
        if (!medGroups[key]) {
          medGroups[key] = { name: key, dosage: r.dosage || '', unit: r.unit || '', taken: [], skipped: [], pending: [] };
        }
        if (r.status === 'TAKEN') medGroups[key].taken.push(r);
        else if (r.status === 'SKIPPED') medGroups[key].skipped.push(r);
        else medGroups[key].pending.push(r);
      });

      const fmtT = (date) => {
        const d = new Date(date);
        return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
      };
      const fmtD = (date) => {
        const d = new Date(date);
        return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}`;
      };

      let medIndex = 0;
      for (const [, med] of Object.entries(medGroups)) {
        medIndex++;
        const total = med.taken.length + med.skipped.length + med.pending.length;
        const rate = total > 0 ? Math.round((med.taken.length / total) * 100) : 0;
        const rateColor = rate >= 80 ? '#10B981' : rate >= 50 ? '#F59E0B' : '#EF4444';

        if (doc.y > doc.page.height - 160) { doc.addPage(); doc.x = 50; }

        doc.moveDown(0.8);
        doc.font('CustomBold').fillColor('#111827').fontSize(13)
           .text(`${medIndex}. ${med.name}  `, 50, doc.y, { continued: true });
        doc.fillColor(rateColor).fontSize(11)
           .text(`[Tuan thu: ${rate}%]`, { continued: false });
        doc.font('CustomRegular').fillColor('#6B7280').fontSize(11)
           .text(`   Lieu dung: ${med.dosage} ${med.unit}  |  Da uong: ${med.taken.length}  |  Bo qua: ${med.skipped.length}  |  Chua uong: ${med.pending.length}`, 50);
        doc.moveDown(0.4);

        // Table columns
        const c1 = 70, c2 = 160, c3 = 260, c4 = 390;

        // Table header row
        const thY = doc.y;
        doc.roundedRect(65, thY - 2, doc.page.width - 115, 17, 3).fill('#EFF6FF');
        doc.font('CustomBold').fillColor('#1E40AF').fontSize(10);
        doc.text('Ngay',            c1, thY, { width: 85 });
        doc.text('Gio len lich',    c2, thY, { width: 95 });
        doc.text('Trang thai',      c3, thY, { width: 125 });
        doc.text('Gio thuc uong',   c4, thY, { width: 95 });
        doc.moveDown(0.7);

        // Data rows: taken + skipped + first 5 pending
        const rowsToShow = [
          ...med.taken,
          ...med.skipped,
          ...med.pending.slice(0, 5),
        ].sort((a, b) => new Date(b.scheduledTime) - new Date(a.scheduledTime));

        rowsToShow.forEach((r, rIdx) => {
          if (doc.y > doc.page.height - 80) { doc.addPage(); doc.x = 50; doc.moveDown(1); }
          const sched = new Date(r.scheduledTime);
          const takenAt = r.takenAt ? new Date(r.takenAt) : null;
          const diffMin = takenAt ? Math.round((takenAt - sched) / 60000) : null;

          let statusLabel, statusColor;
          if (r.status === 'TAKEN') {
            statusLabel = (diffMin !== null && diffMin <= 15) ? 'Dung gio' : `Tre ${diffMin} phut`;
            statusColor = (diffMin !== null && diffMin <= 15) ? '#10B981' : '#F59E0B';
          } else if (r.status === 'SKIPPED') {
            statusLabel = 'Bo qua'; statusColor = '#F59E0B';
          } else {
            statusLabel = 'Chua uong'; statusColor = '#EF4444';
          }

          const rowY = doc.y;
          if (rIdx % 2 === 0) {
            doc.rect(65, rowY - 2, doc.page.width - 115, 15).fill('#F9FAFB');
          }
          doc.font('CustomRegular').fillColor('#374151').fontSize(10);
          doc.text(fmtD(sched),                  c1, rowY, { width: 85 });
          doc.text(fmtT(sched),                  c2, rowY, { width: 95 });
          doc.fillColor(statusColor)
             .text(statusLabel,                  c3, rowY, { width: 125 });
          doc.fillColor('#374151')
             .text(takenAt ? fmtT(takenAt) : '—', c4, rowY, { width: 95 });
          doc.moveDown(0.3);
        });

        if (med.pending.length > 5) {
          doc.font('CustomRegular').fillColor('#9CA3AF').fontSize(9)
             .text(`   ... va ${med.pending.length - 5} lieu chua uong khac`, 70);
        }
      }
    }

    // Footer
    const now = new Date();
    const formatTime = (date) => `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
    doc.rect(0, doc.page.height - 40, doc.page.width, 40).fill('#F3F4F6');
    doc.fillColor('#9CA3AF').fontSize(10).text(
      `Trich xuat tu dong tu he thong SmartCare luc ${formatTime(now)} ngay ${formatDateStr(now)}`,
      0, doc.page.height - 25, { align: 'center' }
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





