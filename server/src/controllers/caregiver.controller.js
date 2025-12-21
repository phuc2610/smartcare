/**
 * CAREGIVER CONTROLLER - Quản lý các tính năng dành cho caregiver
 * Chức năng: Liên kết patient-caregiver, quản lý patients, alerts, medications, health logs, appointments, care notes, location & safety, emergency contacts, patient tasks
 */

const Link = require('../models/Link');
const User = require('../models/User');
const Reminder = require('../models/Reminder');
const Medication = require('../models/Medication');
const HealthLog = require('../models/HealthLog');
const Appointment = require('../models/Appointment');
const CareNote = require('../models/CareNote');
const Alert = require('../models/Alert');
const EmergencyContact = require('../models/EmergencyContact');
const CaregiverRequest = require('../models/CaregiverRequest');
const { z } = require('zod');

// Schema validation cho request link: không cần body (PATIENT tự động tạo mã)
const requestLinkSchema = z.object({
  body: z.object({}),
});

// Schema validation cho accept link: code phải có đúng 6 chữ số
const acceptLinkSchema = z.object({
  body: z.object({
    code: z.string().length(6),
  }),
});

/**
 * Helper: Tạo mã liên kết 6 số duy nhất
 * Luồng: Tạo mã ngẫu nhiên 6 số -> Kiểm tra đã tồn tại chưa -> Lặp tối đa 10 lần -> Trả về mã
 */
const generateLinkCode = async () => {
  let code;
  let isUnique = false;
  let attempts = 0;
  
  while (!isUnique && attempts < 10) {
    code = Math.floor(100000 + Math.random() * 900000).toString();
    const existing = await User.findOne({ linkCode: code });
    if (!existing) {
      isUnique = true;
    }
    attempts++;
  }
  
  if (!isUnique) {
    throw new Error('Không thể tạo mã duy nhất. Vui lòng thử lại.');
  }
  
  return code;
};

/**
 * PATIENT tạo mã liên kết 6 số (mã cố định, không đổi)
 * Luồng: Kiểm tra role PATIENT -> Nếu đã có linkCode thì trả về -> Nếu chưa thì tạo mới -> Lưu vào user -> Trả về
 */
const requestLink = async (req, res) => {
  try {
    // Chỉ PATIENT mới có thể tạo mã liên kết
    if (req.user.role !== 'PATIENT') {
      return res.status(403).json({ error: 'Only patients can generate link codes' });
    }

    // Nếu user đã có mã liên kết, trả về mã đó (mã cố định, không đổi)
    if (req.user.linkCode) {
      return res.json({ code: req.user.linkCode });
    }

    // Tạo mã mới duy nhất 6 số
    const code = await generateLinkCode();
    
    // Lưu mã vào user (mã này sẽ không thay đổi)
    req.user.linkCode = code;
    await req.user.save();

    res.json({ code });
  } catch (error) {
    console.error('Request link error:', error);
    res.status(500).json({ error: error.message || 'Không thể tạo mã liên kết' });
  }
};

/**
 * CAREGIVER nhập mã 6 số để liên kết với PATIENT
 * Luồng: Kiểm tra role CAREGIVER -> Validate code 6 số -> Tìm patient có linkCode trùng -> Kiểm tra đã có request/đã liên kết -> Tạo CaregiverRequest (pending) -> Trả về
 */
const acceptLink = async (req, res) => {
  try {
    // Chỉ CAREGIVER mới có thể nhập mã để liên kết
    if (req.user.role !== 'CAREGIVER') {
      return res.status(403).json({ error: 'Only caregivers can accept links' });
    }

    const { code } = req.body;

    // Validate mã phải có đúng 6 chữ số
    if (!code || code.length !== 6) {
      return res.status(400).json({ error: 'Mã liên kết phải có 6 chữ số.' });
    }

    // Tìm PATIENT có mã liên kết trùng với code
    const patient = await User.findOne({
      role: 'PATIENT',
      linkCode: code,
    });

    if (!patient) {
      return res.status(404).json({ error: 'Mã liên kết không hợp lệ. Không tìm thấy người bệnh.' });
    }

    // Kiểm tra đã có request pending chưa (tránh duplicate)
    const existingRequest = await CaregiverRequest.findOne({
      patientId: patient._id,
      caregiverId: req.user._id,
      status: 'pending',
    });

    if (existingRequest) {
      return res.status(400).json({ 
        error: 'Bạn đã gửi yêu cầu liên kết với người bệnh này. Vui lòng chờ xác nhận.' 
      });
    }

    // Kiểm tra đã được liên kết chưa (tránh duplicate link)
    if (patient.caregiverId && patient.caregiverId.toString() === req.user._id.toString()) {
      return res.status(400).json({ 
        error: 'Bạn đã được liên kết với người bệnh này rồi.' 
      });
    }

    // Tạo yêu cầu liên kết (status: pending, chờ PATIENT xác nhận)
    const caregiverRequest = new CaregiverRequest({
      patientId: patient._id,
      caregiverId: req.user._id,
      status: 'pending',
      requestedAt: new Date(),
    });

    await caregiverRequest.save();

    res.json({
      success: true,
      message: `Đã gửi yêu cầu liên kết với ${patient.name}. Vui lòng chờ người bệnh xác nhận.`,
      patientName: patient.name,
    });
  } catch (error) {
    console.error('Accept link error:', error);
    res.status(500).json({ error: error.message || 'Không thể gửi yêu cầu liên kết' });
  }
};

/**
 * Lấy danh sách patients của caregiver (có thống kê adherence rate, alerts, needsAttention)
 * Luồng: Lấy tất cả patients -> Tính stats cho mỗi patient (adherence rate, unread alerts, lastUpdate) -> Áp dụng filter -> Trả về
 */
const getPatients = async (req, res) => {
  try {
    // Chỉ CAREGIVER mới có thể xem danh sách patients
    if (req.user.role !== 'CAREGIVER') {
      return res.status(403).json({ error: 'Only caregivers can view patients' });
    }

    // Lấy filter từ query (all/needsAttention/recentUpdate)
    const filter = req.query.filter || 'all';
    
    // Lấy tất cả patients có caregiverId = user hiện tại
    let patients = await User.find({ caregiverId: req.user._id }).select('-passwordHash -otpCode');

    // Tính toán stats cho mỗi patient: adherence rate, unread alerts, needsAttention, lastUpdate
    const patientsWithStats = await Promise.all(
      patients.map(async (patient) => {
        // Tính adherence rate (tỷ lệ tuân thủ uống thuốc) trong 7 ngày qua
        const medications = await Medication.find({ userId: patient._id });
        const medicationIds = medications.map(m => m._id);
        
        const today = new Date();
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - 7); // 7 ngày qua
        
        const reminders = await Reminder.find({
          medicationId: { $in: medicationIds },
          scheduledTime: { $gte: startOfWeek },
        });
        
        const total = reminders.length;
        const taken = reminders.filter(r => r.status === 'TAKEN').length;
        const adherenceRate = total > 0 ? Math.round((taken / total) * 100) : 0;
        
        // Đếm số alerts chưa đọc
        const unreadAlerts = await Alert.countDocuments({
          patientId: patient._id,
          isRead: false,
        });
        
        // Kiểm tra cần chú ý: adherence rate < 70% hoặc có alerts chưa đọc
        const needsAttention = adherenceRate < 70 || unreadAlerts > 0;
        
        // Lấy thời gian cập nhật cuối cùng (từ reminders hoặc health logs)
        const lastReminder = await Reminder.findOne({
          medicationId: { $in: medicationIds },
        }).sort({ lastUpdated: -1 });
        
        const lastHealthLog = await HealthLog.findOne({
          userId: patient._id,
        }).sort({ updatedAt: -1 });
        
        // Tìm thời gian cập nhật mới nhất
        let lastUpdate = patient.updatedAt;
        if (lastReminder && lastReminder.lastUpdated > lastUpdate) {
          lastUpdate = lastReminder.lastUpdated;
        }
        if (lastHealthLog && lastHealthLog.updatedAt > lastUpdate) {
          lastUpdate = lastHealthLog.updatedAt;
        }
        
        // Trả về patient với các stats đã tính
        return {
          ...patient.toObject(),
          adherenceRate,
          needsAttention,
          recentAlerts: unreadAlerts,
          lastUpdate: lastUpdate || patient.createdAt,
        };
      })
    );

    // Áp dụng filter: all (tất cả), needsAttention (cần chú ý), recentUpdate (cập nhật gần đây)
    let filteredPatients = patientsWithStats;
    if (filter === 'needsAttention') {
      // Chỉ lấy patients cần chú ý (adherence < 70% hoặc có alerts)
      filteredPatients = patientsWithStats.filter(p => p.needsAttention);
    } else if (filter === 'recentUpdate') {
      // Chỉ lấy patients có cập nhật trong 24h qua
      const oneDayAgo = new Date();
      oneDayAgo.setDate(oneDayAgo.getDate() - 1);
      filteredPatients = patientsWithStats.filter(
        p => new Date(p.lastUpdate) >= oneDayAgo
      );
    }
    // filter === 'all': không filter, trả về tất cả

    res.json({ patients: filteredPatients });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Lấy chi tiết một patient cụ thể (có stats tương tự getPatients)
 * Luồng: Kiểm tra role CAREGIVER -> Tìm patient -> Kiểm tra quyền truy cập -> Tính stats -> Trả về
 */
const getPatientDetail = async (req, res) => {
  try {
    // Chỉ CAREGIVER mới có thể xem chi tiết patient
    if (req.user.role !== 'CAREGIVER') {
      return res.status(403).json({ error: 'Only caregivers can view patient details' });
    }

    const { patientId } = req.params;
    const patient = await User.findById(patientId).select('-passwordHash -otpCode');

    if (!patient) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    // Kiểm tra caregiver có quyền truy cập patient này không
    if (patient.caregiverId?.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Tính toán stats giống như getPatients: adherence rate, unread alerts, needsAttention, lastUpdate
    const medications = await Medication.find({ userId: patientId });
    const medicationIds = medications.map(m => m._id);
    
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - 7); // 7 ngày qua
    
    const reminders = await Reminder.find({
      medicationId: { $in: medicationIds },
      scheduledTime: { $gte: startOfWeek },
    });
    
    const total = reminders.length;
    const taken = reminders.filter(r => r.status === 'TAKEN').length;
    const adherenceRate = total > 0 ? Math.round((taken / total) * 100) : 0;
    
    // Đếm alerts chưa đọc
    const unreadAlerts = await Alert.countDocuments({
      patientId: patientId,
      isRead: false,
    });
    
    // Kiểm tra cần chú ý
    const needsAttention = adherenceRate < 70 || unreadAlerts > 0;
    
    // Tìm thời gian cập nhật cuối cùng
    const lastReminder = await Reminder.findOne({
      medicationId: { $in: medicationIds },
    }).sort({ lastUpdated: -1 });
    
    const lastHealthLog = await HealthLog.findOne({
      userId: patientId,
    }).sort({ updatedAt: -1 });
    
    let lastUpdate = patient.updatedAt;
    if (lastReminder && lastReminder.lastUpdated > lastUpdate) {
      lastUpdate = lastReminder.lastUpdated;
    }
    if (lastHealthLog && lastHealthLog.updatedAt > lastUpdate) {
      lastUpdate = lastHealthLog.updatedAt;
    }

    const patientWithStats = {
      ...patient.toObject(),
      adherenceRate,
      needsAttention,
      recentAlerts: unreadAlerts,
      lastUpdate: lastUpdate || patient.createdAt,
    };

    res.json({ patient: patientWithStats });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Lấy danh sách alerts (triệu chứng) của patients
 * Luồng: Kiểm tra role CAREGIVER -> Xác định patientIds (một patient hoặc tất cả) -> Kiểm tra quyền -> Lấy symptoms từ HealthLog -> Format thành alerts -> Trả về
 */
const getAlerts = async (req, res) => {
  try {
    // Chỉ CAREGIVER mới có thể xem alerts
    if (req.user.role !== 'CAREGIVER') {
      return res.status(403).json({ error: 'Only caregivers can view alerts' });
    }

    const { patientId } = req.query;
    let patientIds = [];

    // Nếu có patientId: chỉ lấy alerts của patient đó (kiểm tra quyền)
    if (patientId) {
      const patient = await User.findById(patientId);
      if (!patient || patient.caregiverId?.toString() !== req.user._id.toString()) {
        return res.status(403).json({ error: 'Access denied' });
      }
      patientIds = [patientId];
    } else {
      // Nếu không có patientId: lấy alerts của tất cả patients của caregiver
      const patients = await User.find({ caregiverId: req.user._id });
      patientIds = patients.map(p => p._id);
    }

    // Lấy symptoms từ HealthLog (type === 'symptom') của các patients
    const symptoms = await HealthLog.find({
      userId: { $in: patientIds },
      type: 'symptom',
    })
      .populate('userId', 'name') // Populate tên patient
      .sort({ createdAt: -1 }) // Sắp xếp mới nhất trước
      .limit(100); // Giới hạn 100 alerts

    // Format symptoms thành alerts với severity level (error/warning/info)
    const formattedAlerts = symptoms.map(symptom => {
      // Xác định severity level: >= 7 = error, >= 4 = warning, < 4 = info
      const severity = symptom.details?.severity >= 7 ? 'error' : symptom.details?.severity >= 4 ? 'warning' : 'info';
      const symptomName = symptom.details?.symptomName || 'Triệu chứng';
      const severityText = symptom.details?.severity || 0;
      
      return {
        _id: symptom._id,
        patientId: symptom.userId._id,
        patientName: symptom.userId.name,
        type: 'symptom',
        severity: severity,
        title: symptomName,
        message: symptom.details?.note || `Mức độ: ${severityText}/10`,
        timestamp: symptom.createdAt || symptom.date,
        isRead: false, // Symptoms luôn là unread (chưa có logic đánh dấu đã đọc)
        actionUrl: null,
      };
    });

    res.json({ alerts: formattedAlerts });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Đánh dấu alert đã đọc
 * Luồng: Kiểm tra role CAREGIVER -> Tìm alert -> Kiểm tra quyền truy cập -> Thêm caregiver vào readBy -> Cập nhật isRead -> Lưu
 */
const markAlertAsRead = async (req, res) => {
  try {
    // Chỉ CAREGIVER mới có thể đánh dấu alert đã đọc
    if (req.user.role !== 'CAREGIVER') {
      return res.status(403).json({ error: 'Only caregivers can mark alerts as read' });
    }

    const { alertId } = req.params;
    const alert = await Alert.findById(alertId);

    if (!alert) {
      return res.status(404).json({ error: 'Alert not found' });
    }

    // Kiểm tra caregiver có quyền truy cập patient của alert này không
    const patient = await User.findById(alert.patientId);
    if (!patient || patient.caregiverId?.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Thêm caregiver vào danh sách đã đọc (readBy)
    if (!alert.readBy) {
      alert.readBy = [];
    }
    if (!alert.readBy.includes(req.user._id)) {
      alert.readBy.push(req.user._id);
    }
    // Nếu có ít nhất 1 người đọc thì isRead = true
    alert.isRead = alert.readBy.length > 0;
    await alert.save();

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Lấy timeline thuốc của patient trong một ngày (nhóm theo buổi: morning/noon/evening/night)
 * Luồng: Kiểm tra role CAREGIVER -> Kiểm tra quyền -> Tính thời gian trong ngày -> Lấy reminders -> Nhóm theo period -> Trả về
 */
const getMedicationTimeline = async (req, res) => {
  try {
    // Chỉ CAREGIVER mới có thể xem medication timeline
    if (req.user.role !== 'CAREGIVER') {
      return res.status(403).json({ error: 'Only caregivers can view medication timeline' });
    }

    const { patientId } = req.params;
    const { date } = req.query;

    // Kiểm tra caregiver có quyền truy cập patient này không
    const patient = await User.findById(patientId);
    if (!patient || patient.caregiverId?.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Tính thời gian bắt đầu và kết thúc của ngày (mặc định là hôm nay)
    const targetDate = date ? new Date(date) : new Date();
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    // Lấy tất cả medications của patient
    const medications = await Medication.find({ userId: patientId });
    const medicationIds = medications.map(m => m._id);

    // Lấy reminders trong ngày, sắp xếp theo giờ tăng dần
    const reminders = await Reminder.find({
      medicationId: { $in: medicationIds },
      scheduledTime: { $gte: startOfDay, $lte: endOfDay },
    }).sort({ scheduledTime: 1 });

    // Helper: Xác định buổi trong ngày dựa vào giờ
    const getPeriod = (hour) => {
      if (hour >= 5 && hour < 11) return 'morning'; // 5h-11h: Sáng
      if (hour >= 11 && hour < 14) return 'noon'; // 11h-14h: Trưa
      if (hour >= 14 && hour < 19) return 'evening'; // 14h-19h: Chiều
      return 'night'; // Còn lại: Tối
    };

    // Format reminders thành timeline với period
    const timeline = reminders.map(reminder => ({
      _id: reminder._id,
      medicationName: reminder.medicationName,
      dosage: reminder.dosage,
      unit: reminder.unit,
      scheduledTime: reminder.scheduledTime,
      status: reminder.status,
      period: getPeriod(reminder.scheduledTime.getHours()), // Thêm period để nhóm theo buổi
    }));

    res.json({ timeline });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Lấy lịch sử uống thuốc 7 ngày qua, nhóm theo ngày
 * Luồng: Kiểm tra role CAREGIVER -> Kiểm tra quyền -> Lấy reminders 7 ngày qua -> Nhóm theo ngày -> Tính stats (total/taken/skipped/adherenceRate) -> Trả về
 */
const getMedicationWeekHistory = async (req, res) => {
  try {
    // Chỉ CAREGIVER mới có thể xem lịch sử thuốc
    if (req.user.role !== 'CAREGIVER') {
      return res.status(403).json({ error: 'Only caregivers can view medication history' });
    }

    const { patientId } = req.params;

    // Kiểm tra caregiver có quyền truy cập patient này không
    const patient = await User.findById(patientId);
    if (!patient || patient.caregiverId?.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Lấy tất cả medications của patient
    const medications = await Medication.find({ userId: patientId });
    const medicationIds = medications.map(m => m._id);

    // Tính thời gian 7 ngày qua
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - 7);
    startOfWeek.setHours(0, 0, 0, 0);

    // Lấy reminders trong 7 ngày qua
    const reminders = await Reminder.find({
      medicationId: { $in: medicationIds },
      scheduledTime: { $gte: startOfWeek },
    });

    // Nhóm reminders theo ngày và tính stats
    const historyByDate = {};
    reminders.forEach(reminder => {
      const dateStr = reminder.scheduledTime.toISOString().split('T')[0]; // Format YYYY-MM-DD
      if (!historyByDate[dateStr]) {
        historyByDate[dateStr] = { total: 0, taken: 0, skipped: 0 };
      }
      historyByDate[dateStr].total++;
      if (reminder.status === 'TAKEN') {
        historyByDate[dateStr].taken++;
      } else if (reminder.status === 'SKIPPED') {
        historyByDate[dateStr].skipped++;
      }
    });

    // Format thành array với adherenceRate, sắp xếp theo ngày tăng dần
    const history = Object.entries(historyByDate).map(([date, stats]) => ({
      date,
      total: stats.total,
      taken: stats.taken,
      skipped: stats.skipped,
      adherenceRate: stats.total > 0 ? Math.round((stats.taken / stats.total) * 100) : 0,
    })).sort((a, b) => new Date(a.date) - new Date(b.date));

    res.json({ history });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Lấy tỷ lệ tuân thủ uống thuốc (adherence rate) trong 7 ngày qua
 * Luồng: Kiểm tra role CAREGIVER -> Kiểm tra quyền -> Lấy reminders 7 ngày qua -> Tính rate/total/taken/skipped -> Trả về
 */
const getMedicationAdherence = async (req, res) => {
  try {
    // Chỉ CAREGIVER mới có thể xem adherence rate
    if (req.user.role !== 'CAREGIVER') {
      return res.status(403).json({ error: 'Only caregivers can view medication adherence' });
    }

    const { patientId } = req.params;

    // Kiểm tra caregiver có quyền truy cập patient này không
    const patient = await User.findById(patientId);
    if (!patient || patient.caregiverId?.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Lấy tất cả medications của patient
    const medications = await Medication.find({ userId: patientId });
    const medicationIds = medications.map(m => m._id);

    // Tính thời gian 7 ngày qua
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - 7);

    // Lấy reminders trong 7 ngày qua
    const reminders = await Reminder.find({
      medicationId: { $in: medicationIds },
      scheduledTime: { $gte: startOfWeek },
    });

    // Tính stats: tổng số, đã uống, đã bỏ qua, tỷ lệ tuân thủ
    const total = reminders.length;
    const taken = reminders.filter(r => r.status === 'TAKEN').length;
    const skipped = reminders.filter(r => r.status === 'SKIPPED').length;
    const rate = total > 0 ? Math.round((taken / total) * 100) : 0;

    res.json({ rate, total, taken, skipped });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Lấy tóm tắt sức khỏe trong một ngày (calories, exercise minutes, symptom score)
 * Luồng: Kiểm tra role CAREGIVER -> Kiểm tra quyền -> Tính thời gian trong ngày -> Lấy healthLogs -> Tính tổng calories/exerciseMinutes/avgSymptomScore -> Trả về
 */
const getDailyHealthSummary = async (req, res) => {
  try {
    // Chỉ CAREGIVER mới có thể xem health summary
    if (req.user.role !== 'CAREGIVER') {
      return res.status(403).json({ error: 'Only caregivers can view health summary' });
    }

    const { patientId } = req.params;
    const { date } = req.query;

    // Kiểm tra caregiver có quyền truy cập patient này không
    const patient = await User.findById(patientId);
    if (!patient || patient.caregiverId?.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Tính thời gian bắt đầu và kết thúc của ngày (mặc định là hôm nay)
    const targetDate = date ? new Date(date) : new Date();
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    // Lấy health logs trong ngày
    const healthLogs = await HealthLog.find({
      userId: patientId,
      date: { $gte: startOfDay, $lte: endOfDay },
    });

    // Tính tổng calories, exercise minutes, và symptom score
    let calories = 0;
    let exerciseMinutes = 0;
    let symptomScore = 0;
    let symptomCount = 0;

    healthLogs.forEach(log => {
      if (log.type === 'meal') {
        calories += log.details.calories || 0;
      } else if (log.type === 'exercise') {
        exerciseMinutes += log.details.durationMinutes || 0;
      } else if (log.type === 'symptom') {
        symptomScore += log.details.severity || 0;
        symptomCount++;
      }
    });

    // Tính điểm triệu chứng trung bình
    const avgSymptomScore = symptomCount > 0 ? symptomScore / symptomCount : 0;

    res.json({
      date: targetDate.toISOString().split('T')[0],
      calories,
      exerciseMinutes,
      symptomScore: Math.round(avgSymptomScore * 10) / 10, // Làm tròn 1 chữ số thập phân
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Lấy danh sách appointments sắp tới của patient (chưa hoàn thành, chưa đến ngày)
 * Luồng: Kiểm tra role CAREGIVER -> Kiểm tra quyền -> Lấy appointments upcoming -> Format -> Trả về
 */
const getAppointments = async (req, res) => {
  try {
    // Chỉ CAREGIVER mới có thể xem appointments
    if (req.user.role !== 'CAREGIVER') {
      return res.status(403).json({ error: 'Only caregivers can view appointments' });
    }

    const { patientId } = req.params;

    // Kiểm tra caregiver có quyền truy cập patient này không
    const patient = await User.findById(patientId);
    if (!patient || patient.caregiverId?.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Lấy appointments chưa hoàn thành và chưa đến ngày, sắp xếp theo ngày tăng dần
    const appointments = await Appointment.find({
      userId: patientId,
      isCompleted: false,
      appointmentDate: { $gte: new Date() }, // Chỉ lấy appointments chưa đến
    }).sort({ appointmentDate: 1 });

    // Format appointments để hiển thị
    const formattedAppointments = appointments.map(apt => ({
      _id: apt._id,
      patientId: apt.userId,
      title: `${apt.doctorName}${apt.doctorSpecialty ? ` - ${apt.doctorSpecialty}` : ''}`,
      doctor: apt.doctorName,
      location: apt.hospitalName,
      date: apt.appointmentDate.toISOString().split('T')[0],
      time: apt.appointmentTime,
      notes: apt.notes,
      status: apt.isCompleted ? 'completed' : 'upcoming',
      reminderMinutes: apt.reminderBefore,
    }));

    res.json({ appointments: formattedAppointments });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Lấy danh sách care notes (ghi chú chăm sóc) của patient
 * Luồng: Kiểm tra role CAREGIVER -> Kiểm tra quyền -> Lấy care notes -> Format -> Trả về
 */
const getCareNotes = async (req, res) => {
  try {
    // Chỉ CAREGIVER mới có thể xem care notes
    if (req.user.role !== 'CAREGIVER') {
      return res.status(403).json({ error: 'Only caregivers can view care notes' });
    }

    const { patientId } = req.params;

    // Kiểm tra caregiver có quyền truy cập patient này không
    const patient = await User.findById(patientId);
    if (!patient || patient.caregiverId?.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Lấy care notes của patient này do caregiver này tạo, sắp xếp mới nhất trước
    const notes = await CareNote.find({
      patientId: patientId,
      caregiverId: req.user._id,
    }).sort({ createdAt: -1 });

    // Format notes để trả về
    const formattedNotes = notes.map(note => ({
      _id: note._id,
      patientId: note.patientId,
      content: note.content,
      tags: note.tags || [],
      createdAt: note.createdAt,
      createdBy: note.caregiverId.toString(),
    }));

    res.json({ notes: formattedNotes });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Schema validation cho tạo care note: content (bắt buộc), tags (optional array)
const createCareNoteSchema = z.object({
  body: z.object({
    content: z.string().min(1),
    tags: z.array(z.string()).optional(),
  }),
});

/**
 * Tạo care note (ghi chú chăm sóc) mới cho patient
 * Luồng: Kiểm tra role CAREGIVER -> Kiểm tra quyền -> Tạo care note -> Trả về
 */
const createCareNote = async (req, res) => {
  try {
    // Chỉ CAREGIVER mới có thể tạo care notes
    if (req.user.role !== 'CAREGIVER') {
      return res.status(403).json({ error: 'Only caregivers can create care notes' });
    }

    const { patientId } = req.params;
    const { content, tags } = req.body;

    // Kiểm tra caregiver có quyền truy cập patient này không
    const patient = await User.findById(patientId);
    if (!patient || patient.caregiverId?.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Tạo care note mới
    const note = await CareNote.create({
      patientId: patientId,
      caregiverId: req.user._id,
      content,
      tags: tags || [],
    });

    res.status(201).json({
      _id: note._id,
      patientId: note.patientId,
      content: note.content,
      tags: note.tags || [],
      createdAt: note.createdAt,
      createdBy: note.caregiverId.toString(),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Lấy trạng thái vị trí/an toàn của patient (TODO: chưa implement)
 * Luồng: Kiểm tra role CAREGIVER -> Kiểm tra quyền -> Trả về default status
 * Lưu ý: Tính năng location tracking chưa được implement, hiện tại chỉ trả về 'unknown'
 */
const getLocationStatus = async (req, res) => {
  try {
    // Chỉ CAREGIVER mới có thể xem location status
    if (req.user.role !== 'CAREGIVER') {
      return res.status(403).json({ error: 'Only caregivers can view location status' });
    }

    const { patientId } = req.params;

    // Kiểm tra caregiver có quyền truy cập patient này không
    const patient = await User.findById(patientId);
    if (!patient || patient.caregiverId?.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // TODO: Implement location tracking thực tế
    // Hiện tại chỉ trả về status mặc định
    res.json({
      patientId: patientId,
      safetyStatus: 'unknown',
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Lấy danh sách liên hệ khẩn cấp của patient
 * Luồng: Kiểm tra role CAREGIVER -> Kiểm tra quyền -> Lấy emergency contacts -> Sắp xếp (primary trước) -> Format -> Trả về
 */
const getEmergencyContacts = async (req, res) => {
  try {
    // Chỉ CAREGIVER mới có thể xem emergency contacts
    if (req.user.role !== 'CAREGIVER') {
      return res.status(403).json({ error: 'Only caregivers can view emergency contacts' });
    }

    const { patientId } = req.params;

    // Kiểm tra caregiver có quyền truy cập patient này không
    const patient = await User.findById(patientId);
    if (!patient || patient.caregiverId?.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Lấy emergency contacts, sắp xếp primary contact trước
    const contacts = await EmergencyContact.find({ patientId: patientId }).sort({ isPrimary: -1 });

    // Format contacts để trả về
    const formattedContacts = contacts.map(contact => ({
      _id: contact._id,
      name: contact.name,
      phone: contact.phone,
      relationship: contact.relationship,
      isPrimary: contact.isPrimary,
    }));

    res.json({ contacts: formattedContacts });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * PATIENT xem danh sách yêu cầu liên kết từ caregivers (status: pending)
 * Luồng: Kiểm tra role PATIENT -> Lấy CaregiverRequests pending -> Populate thông tin caregiver -> Format -> Trả về
 */
const getCaregiverRequests = async (req, res) => {
  try {
    // Chỉ PATIENT mới có thể xem caregiver requests
    if (req.user.role !== 'PATIENT') {
      return res.status(403).json({ error: 'Only patients can view caregiver requests' });
    }

    // Lấy tất cả requests pending của patient này, populate thông tin caregiver
    const requests = await CaregiverRequest.find({
      patientId: req.user._id,
      status: 'pending',
    })
      .populate('caregiverId', 'name phone avatar')
      .sort({ requestedAt: -1 }); // Sắp xếp mới nhất trước

    // Format requests để trả về
    const formattedRequests = requests.map(req => ({
      _id: req._id,
      caregiverId: req.caregiverId._id,
      caregiverName: req.caregiverId.name,
      caregiverPhone: req.caregiverId.phone,
      caregiverAvatar: req.caregiverId.avatar,
      status: req.status,
      requestedAt: req.requestedAt,
    }));

    res.json({ requests: formattedRequests });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Schema validation cho respond to request: requestId, action (accept/reject)
const respondToRequestSchema = z.object({
  body: z.object({
    requestId: z.string(),
    action: z.enum(['accept', 'reject']),
  }),
});

/**
 * PATIENT chấp nhận hoặc từ chối yêu cầu liên kết từ caregiver
 * Luồng: Kiểm tra role PATIENT -> Tìm request -> Nếu accept: kiểm tra chưa có caregiver -> Link caregiver -> Reject các requests khác -> Cập nhật status -> Trả về
 */
const respondToRequest = async (req, res) => {
  try {
    // Chỉ PATIENT mới có thể phản hồi requests
    if (req.user.role !== 'PATIENT') {
      return res.status(403).json({ error: 'Only patients can respond to requests' });
    }

    const { requestId, action } = req.body;

    // Tìm request và kiểm tra thuộc về patient này, status phải là pending
    const caregiverRequest = await CaregiverRequest.findOne({
      _id: requestId,
      patientId: req.user._id,
      status: 'pending',
    }).populate('caregiverId');

    if (!caregiverRequest) {
      return res.status(404).json({ error: 'Yêu cầu không tìm thấy hoặc đã được xử lý.' });
    }

    if (action === 'accept') {
      // Kiểm tra patient chưa có caregiver (một patient chỉ có 1 caregiver)
      if (req.user.caregiverId) {
        return res.status(400).json({ error: 'Bạn đã có người thân được liên kết.' });
      }

      // Liên kết caregiver với patient
      req.user.caregiverId = caregiverRequest.caregiverId._id;
      await req.user.save();

      // Cập nhật request status thành accepted
      caregiverRequest.status = 'accepted';
      caregiverRequest.respondedAt = new Date();
      await caregiverRequest.save();

      // Từ chối tất cả các requests pending khác (chỉ chấp nhận 1 caregiver)
      await CaregiverRequest.updateMany(
        {
          patientId: req.user._id,
          _id: { $ne: requestId }, // Không bao gồm request vừa accept
          status: 'pending',
        },
        {
          status: 'rejected',
          respondedAt: new Date(),
        }
      );

      res.json({
        success: true,
        message: 'Đã chấp nhận yêu cầu liên kết.',
        caregiverName: caregiverRequest.caregiverId.name,
      });
    } else if (action === 'reject') {
      // Từ chối request
      caregiverRequest.status = 'rejected';
      caregiverRequest.respondedAt = new Date();
      await caregiverRequest.save();

      res.json({
        success: true,
        message: 'Đã từ chối yêu cầu liên kết.',
      });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Lấy danh sách tasks (reminders + health logs) của patient (chưa hoàn thành, bao gồm cả tương lai)
 * Luồng: Kiểm tra role CAREGIVER -> Kiểm tra quyền -> Lấy reminders pending -> Lấy health logs pending (meal/exercise) -> Trả về
 */
const getPatientTasks = async (req, res) => {
  try {
    // Chỉ CAREGIVER mới có thể xem patient tasks
    if (req.user.role !== 'CAREGIVER') {
      return res.status(403).json({ error: 'Only caregivers can view patient tasks' });
    }

    const { patientId } = req.params;

    // Kiểm tra caregiver có quyền truy cập patient này không
    const patient = await User.findById(patientId);
    if (!patient || patient.caregiverId?.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Lấy tất cả reminders chưa hoàn thành (không phải TAKEN hoặc SKIPPED), bao gồm cả tương lai
    const medications = await Medication.find({ userId: patientId });
    const medicationIds = medications.map(m => m._id);
    
    const reminders = await Reminder.find({
      medicationId: { $in: medicationIds },
      status: { $nin: ['TAKEN', 'SKIPPED'] }, // Chỉ lấy PENDING
    }).sort({ scheduledTime: 1 }); // Sắp xếp theo giờ tăng dần

    // Lấy tất cả health logs chưa hoàn thành (meal và exercise), không bao gồm symptom (symptom được xử lý trong alerts)
    const healthLogs = await HealthLog.find({
      userId: patientId,
      isCompleted: false,
      type: { $in: ['meal', 'exercise'] }, // Chỉ meal và exercise
      $or: [
        { scheduledDate: { $exists: true, $ne: null } }, // Có scheduledDate
        { date: { $exists: true, $ne: null } }, // Hoặc có date
      ],
    }).sort({ scheduledTime: 1, date: 1 }); // Sắp xếp theo scheduledTime, sau đó theo date

    res.json({ reminders, healthLogs });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Schema validation cho send task notification: taskType (medication/health)
const sendTaskNotificationSchema = z.object({
  body: z.object({
    taskType: z.enum(['medication', 'health']),
  }),
});

/**
 * Caregiver gửi thông báo nhắc nhở task cho patient (TODO: chưa implement push notification thực tế)
 * Luồng: Kiểm tra role CAREGIVER -> Kiểm tra quyền -> Tìm task (reminder hoặc healthLog) -> Tạo notification message -> TODO: gửi push -> Trả về
 */
const sendTaskNotification = async (req, res) => {
  try {
    // Chỉ CAREGIVER mới có thể gửi notifications
    if (req.user.role !== 'CAREGIVER') {
      return res.status(403).json({ error: 'Only caregivers can send notifications' });
    }

    const { patientId, taskId } = req.params;
    const { taskType } = req.body;

    // Kiểm tra caregiver có quyền truy cập patient này không
    const patient = await User.findById(patientId);
    if (!patient || patient.caregiverId?.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }

    let task;
    let notificationTitle = '';
    let notificationBody = '';

    // Xử lý theo taskType: medication hoặc health
    if (taskType === 'medication') {
      task = await Reminder.findById(taskId);
      if (!task) {
        return res.status(404).json({ error: 'Reminder not found' });
      }
      notificationTitle = 'Nhắc nhở uống thuốc';
      notificationBody = `Đã đến giờ uống ${task.medicationName} (${task.dosage} ${task.unit || ''})`;
    } else if (taskType === 'health') {
      task = await HealthLog.findById(taskId);
      if (!task) {
        return res.status(404).json({ error: 'Health log not found' });
      }
      const taskName = task.type === 'meal' ? 'Bữa ăn' : task.type === 'exercise' ? 'Tập thể dục' : 'Triệu chứng';
      notificationTitle = `Nhắc nhở ${taskName}`;
      notificationBody = `Đã đến giờ ${taskName.toLowerCase()}`;
    } else {
      return res.status(400).json({ error: 'Invalid task type' });
    }

    // TODO: Implement push notification thực tế đến device của patient
    // Hiện tại chỉ trả về success, chưa gửi push notification
    // Trong production, sử dụng FCM, Expo Push Notifications, hoặc service tương tự
    // Ví dụ: await sendPushNotification(patient.deviceToken, notificationTitle, notificationBody);

    res.json({ 
      success: true,
      message: 'Đã gửi thông báo đến bệnh nhân',
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  requestLink,
  acceptLink,
  getCaregiverRequests,
  respondToRequest,
  getPatients,
  getPatientDetail,
  getAlerts,
  markAlertAsRead,
  getMedicationTimeline,
  getMedicationWeekHistory,
  getMedicationAdherence,
  getDailyHealthSummary,
  getAppointments,
  getCareNotes,
  createCareNote,
  getLocationStatus,
  getEmergencyContacts,
  getPatientTasks,
  sendTaskNotification,
  requestLinkSchema,
  acceptLinkSchema,
  respondToRequestSchema,
  createCareNoteSchema,
  sendTaskNotificationSchema,
};





