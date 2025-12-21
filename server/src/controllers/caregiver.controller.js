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

const requestLinkSchema = z.object({
  body: z.object({}),
});

const acceptLinkSchema = z.object({
  body: z.object({
    code: z.string().length(6),
  }),
});

// Generate a unique 6-digit code
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

const requestLink = async (req, res) => {
  try {
    if (req.user.role !== 'PATIENT') {
      return res.status(403).json({ error: 'Only patients can generate link codes' });
    }

    // If user already has a link code, return it
    if (req.user.linkCode) {
      return res.json({ code: req.user.linkCode });
    }

    // Generate new unique code
    const code = await generateLinkCode();
    
    req.user.linkCode = code;
    await req.user.save();

    res.json({ code });
  } catch (error) {
    console.error('Request link error:', error);
    res.status(500).json({ error: error.message || 'Không thể tạo mã liên kết' });
  }
};

const acceptLink = async (req, res) => {
  try {
    if (req.user.role !== 'CAREGIVER') {
      return res.status(403).json({ error: 'Only caregivers can accept links' });
    }

    const { code } = req.body;

    if (!code || code.length !== 6) {
      return res.status(400).json({ error: 'Mã liên kết phải có 6 chữ số.' });
    }

    // Tìm người bệnh có mã cố định trùng với code
    const patient = await User.findOne({
      role: 'PATIENT',
      linkCode: code,
    });

    if (!patient) {
      return res.status(404).json({ error: 'Mã liên kết không hợp lệ. Không tìm thấy người bệnh.' });
    }

    // Kiểm tra xem đã có request chưa
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

    // Kiểm tra xem đã được liên kết chưa
    if (patient.caregiverId && patient.caregiverId.toString() === req.user._id.toString()) {
      return res.status(400).json({ 
        error: 'Bạn đã được liên kết với người bệnh này rồi.' 
      });
    }

    // Tạo yêu cầu liên kết
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

const getPatients = async (req, res) => {
  try {
    if (req.user.role !== 'CAREGIVER') {
      return res.status(403).json({ error: 'Only caregivers can view patients' });
    }

    const filter = req.query.filter || 'all';
    let patients = await User.find({ caregiverId: req.user._id }).select('-passwordHash -otpCode');

    // Calculate adherence rate and flags for each patient
    const patientsWithStats = await Promise.all(
      patients.map(async (patient) => {
        // Calculate adherence rate
        const medications = await Medication.find({ userId: patient._id });
        const medicationIds = medications.map(m => m._id);
        
        const today = new Date();
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - 7);
        
        const reminders = await Reminder.find({
          medicationId: { $in: medicationIds },
          scheduledTime: { $gte: startOfWeek },
        });
        
        const total = reminders.length;
        const taken = reminders.filter(r => r.status === 'TAKEN').length;
        const adherenceRate = total > 0 ? Math.round((taken / total) * 100) : 0;
        
        // Count unread alerts
        const unreadAlerts = await Alert.countDocuments({
          patientId: patient._id,
          isRead: false,
        });
        
        // Check if needs attention (low adherence or unread alerts)
        const needsAttention = adherenceRate < 70 || unreadAlerts > 0;
        
        // Get last update (from reminders or health logs)
        const lastReminder = await Reminder.findOne({
          medicationId: { $in: medicationIds },
        }).sort({ lastUpdated: -1 });
        
        const lastHealthLog = await HealthLog.findOne({
          userId: patient._id,
        }).sort({ updatedAt: -1 });
        
        let lastUpdate = patient.updatedAt;
        if (lastReminder && lastReminder.lastUpdated > lastUpdate) {
          lastUpdate = lastReminder.lastUpdated;
        }
        if (lastHealthLog && lastHealthLog.updatedAt > lastUpdate) {
          lastUpdate = lastHealthLog.updatedAt;
        }
        
        return {
          ...patient.toObject(),
          adherenceRate,
          needsAttention,
          recentAlerts: unreadAlerts,
          lastUpdate: lastUpdate || patient.createdAt,
        };
      })
    );

    // Apply filters
    let filteredPatients = patientsWithStats;
    if (filter === 'needsAttention') {
      filteredPatients = patientsWithStats.filter(p => p.needsAttention);
    } else if (filter === 'recentUpdate') {
      const oneDayAgo = new Date();
      oneDayAgo.setDate(oneDayAgo.getDate() - 1);
      filteredPatients = patientsWithStats.filter(
        p => new Date(p.lastUpdate) >= oneDayAgo
      );
    }

    res.json({ patients: filteredPatients });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getPatientDetail = async (req, res) => {
  try {
    if (req.user.role !== 'CAREGIVER') {
      return res.status(403).json({ error: 'Only caregivers can view patient details' });
    }

    const { patientId } = req.params;
    const patient = await User.findById(patientId).select('-passwordHash -otpCode');

    if (!patient) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    // Verify caregiver has access
    if (patient.caregiverId?.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Calculate stats (same as getPatients)
    const medications = await Medication.find({ userId: patientId });
    const medicationIds = medications.map(m => m._id);
    
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - 7);
    
    const reminders = await Reminder.find({
      medicationId: { $in: medicationIds },
      scheduledTime: { $gte: startOfWeek },
    });
    
    const total = reminders.length;
    const taken = reminders.filter(r => r.status === 'TAKEN').length;
    const adherenceRate = total > 0 ? Math.round((taken / total) * 100) : 0;
    
    const unreadAlerts = await Alert.countDocuments({
      patientId: patientId,
      isRead: false,
    });
    
    const needsAttention = adherenceRate < 70 || unreadAlerts > 0;
    
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

const getAlerts = async (req, res) => {
  try {
    if (req.user.role !== 'CAREGIVER') {
      return res.status(403).json({ error: 'Only caregivers can view alerts' });
    }

    const { patientId } = req.query;
    let patientIds = [];

    if (patientId) {
      // Verify caregiver has access
      const patient = await User.findById(patientId);
      if (!patient || patient.caregiverId?.toString() !== req.user._id.toString()) {
        return res.status(403).json({ error: 'Access denied' });
      }
      patientIds = [patientId];
    } else {
      // Get all patients for this caregiver
      const patients = await User.find({ caregiverId: req.user._id });
      patientIds = patients.map(p => p._id);
    }

    // Get symptoms from HealthLog (type === 'symptom')
    const symptoms = await HealthLog.find({
      userId: { $in: patientIds },
      type: 'symptom',
    })
      .populate('userId', 'name')
      .sort({ createdAt: -1 })
      .limit(100);

    // Format symptoms as alerts
    const formattedAlerts = symptoms.map(symptom => {
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
        isRead: false, // Symptoms are always unread for now
        actionUrl: null,
      };
    });

    res.json({ alerts: formattedAlerts });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const markAlertAsRead = async (req, res) => {
  try {
    if (req.user.role !== 'CAREGIVER') {
      return res.status(403).json({ error: 'Only caregivers can mark alerts as read' });
    }

    const { alertId } = req.params;
    const alert = await Alert.findById(alertId);

    if (!alert) {
      return res.status(404).json({ error: 'Alert not found' });
    }

    // Verify caregiver has access
    const patient = await User.findById(alert.patientId);
    if (!patient || patient.caregiverId?.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (!alert.readBy) {
      alert.readBy = [];
    }
    if (!alert.readBy.includes(req.user._id)) {
      alert.readBy.push(req.user._id);
    }
    alert.isRead = alert.readBy.length > 0;
    await alert.save();

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getMedicationTimeline = async (req, res) => {
  try {
    if (req.user.role !== 'CAREGIVER') {
      return res.status(403).json({ error: 'Only caregivers can view medication timeline' });
    }

    const { patientId } = req.params;
    const { date } = req.query;

    // Verify caregiver has access
    const patient = await User.findById(patientId);
    if (!patient || patient.caregiverId?.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const targetDate = date ? new Date(date) : new Date();
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    const medications = await Medication.find({ userId: patientId });
    const medicationIds = medications.map(m => m._id);

    const reminders = await Reminder.find({
      medicationId: { $in: medicationIds },
      scheduledTime: { $gte: startOfDay, $lte: endOfDay },
    }).sort({ scheduledTime: 1 });

    const getPeriod = (hour) => {
      if (hour >= 5 && hour < 11) return 'morning';
      if (hour >= 11 && hour < 14) return 'noon';
      if (hour >= 14 && hour < 19) return 'evening';
      return 'night';
    };

    const timeline = reminders.map(reminder => ({
      _id: reminder._id,
      medicationName: reminder.medicationName,
      dosage: reminder.dosage,
      unit: reminder.unit,
      scheduledTime: reminder.scheduledTime,
      status: reminder.status,
      period: getPeriod(reminder.scheduledTime.getHours()),
    }));

    res.json({ timeline });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getMedicationWeekHistory = async (req, res) => {
  try {
    if (req.user.role !== 'CAREGIVER') {
      return res.status(403).json({ error: 'Only caregivers can view medication history' });
    }

    const { patientId } = req.params;

    // Verify caregiver has access
    const patient = await User.findById(patientId);
    if (!patient || patient.caregiverId?.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const medications = await Medication.find({ userId: patientId });
    const medicationIds = medications.map(m => m._id);

    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - 7);
    startOfWeek.setHours(0, 0, 0, 0);

    const reminders = await Reminder.find({
      medicationId: { $in: medicationIds },
      scheduledTime: { $gte: startOfWeek },
    });

    // Group by date
    const historyByDate = {};
    reminders.forEach(reminder => {
      const dateStr = reminder.scheduledTime.toISOString().split('T')[0];
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

const getMedicationAdherence = async (req, res) => {
  try {
    if (req.user.role !== 'CAREGIVER') {
      return res.status(403).json({ error: 'Only caregivers can view medication adherence' });
    }

    const { patientId } = req.params;

    // Verify caregiver has access
    const patient = await User.findById(patientId);
    if (!patient || patient.caregiverId?.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const medications = await Medication.find({ userId: patientId });
    const medicationIds = medications.map(m => m._id);

    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - 7);

    const reminders = await Reminder.find({
      medicationId: { $in: medicationIds },
      scheduledTime: { $gte: startOfWeek },
    });

    const total = reminders.length;
    const taken = reminders.filter(r => r.status === 'TAKEN').length;
    const skipped = reminders.filter(r => r.status === 'SKIPPED').length;
    const rate = total > 0 ? Math.round((taken / total) * 100) : 0;

    res.json({ rate, total, taken, skipped });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getDailyHealthSummary = async (req, res) => {
  try {
    if (req.user.role !== 'CAREGIVER') {
      return res.status(403).json({ error: 'Only caregivers can view health summary' });
    }

    const { patientId } = req.params;
    const { date } = req.query;

    // Verify caregiver has access
    const patient = await User.findById(patientId);
    if (!patient || patient.caregiverId?.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const targetDate = date ? new Date(date) : new Date();
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    const healthLogs = await HealthLog.find({
      userId: patientId,
      date: { $gte: startOfDay, $lte: endOfDay },
    });

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

    const avgSymptomScore = symptomCount > 0 ? symptomScore / symptomCount : 0;

    res.json({
      date: targetDate.toISOString().split('T')[0],
      calories,
      exerciseMinutes,
      symptomScore: Math.round(avgSymptomScore * 10) / 10,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getAppointments = async (req, res) => {
  try {
    if (req.user.role !== 'CAREGIVER') {
      return res.status(403).json({ error: 'Only caregivers can view appointments' });
    }

    const { patientId } = req.params;

    // Verify caregiver has access
    const patient = await User.findById(patientId);
    if (!patient || patient.caregiverId?.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const appointments = await Appointment.find({
      userId: patientId,
      isCompleted: false,
      appointmentDate: { $gte: new Date() },
    }).sort({ appointmentDate: 1 });

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

const getCareNotes = async (req, res) => {
  try {
    if (req.user.role !== 'CAREGIVER') {
      return res.status(403).json({ error: 'Only caregivers can view care notes' });
    }

    const { patientId } = req.params;

    // Verify caregiver has access
    const patient = await User.findById(patientId);
    if (!patient || patient.caregiverId?.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const notes = await CareNote.find({
      patientId: patientId,
      caregiverId: req.user._id,
    }).sort({ createdAt: -1 });

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

const createCareNoteSchema = z.object({
  body: z.object({
    content: z.string().min(1),
    tags: z.array(z.string()).optional(),
  }),
});

const createCareNote = async (req, res) => {
  try {
    if (req.user.role !== 'CAREGIVER') {
      return res.status(403).json({ error: 'Only caregivers can create care notes' });
    }

    const { patientId } = req.params;
    const { content, tags } = req.body;

    // Verify caregiver has access
    const patient = await User.findById(patientId);
    if (!patient || patient.caregiverId?.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }

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

const getLocationStatus = async (req, res) => {
  try {
    if (req.user.role !== 'CAREGIVER') {
      return res.status(403).json({ error: 'Only caregivers can view location status' });
    }

    const { patientId } = req.params;

    // Verify caregiver has access
    const patient = await User.findById(patientId);
    if (!patient || patient.caregiverId?.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // TODO: Implement location tracking
    // For now, return default status
    res.json({
      patientId: patientId,
      safetyStatus: 'unknown',
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getEmergencyContacts = async (req, res) => {
  try {
    if (req.user.role !== 'CAREGIVER') {
      return res.status(403).json({ error: 'Only caregivers can view emergency contacts' });
    }

    const { patientId } = req.params;

    // Verify caregiver has access
    const patient = await User.findById(patientId);
    if (!patient || patient.caregiverId?.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const contacts = await EmergencyContact.find({ patientId: patientId }).sort({ isPrimary: -1 });

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

const getCaregiverRequests = async (req, res) => {
  try {
    if (req.user.role !== 'PATIENT') {
      return res.status(403).json({ error: 'Only patients can view caregiver requests' });
    }

    const requests = await CaregiverRequest.find({
      patientId: req.user._id,
      status: 'pending',
    })
      .populate('caregiverId', 'name phone avatar')
      .sort({ requestedAt: -1 });

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

const respondToRequestSchema = z.object({
  body: z.object({
    requestId: z.string(),
    action: z.enum(['accept', 'reject']),
  }),
});

const respondToRequest = async (req, res) => {
  try {
    if (req.user.role !== 'PATIENT') {
      return res.status(403).json({ error: 'Only patients can respond to requests' });
    }

    const { requestId, action } = req.body;

    const caregiverRequest = await CaregiverRequest.findOne({
      _id: requestId,
      patientId: req.user._id,
      status: 'pending',
    }).populate('caregiverId');

    if (!caregiverRequest) {
      return res.status(404).json({ error: 'Yêu cầu không tìm thấy hoặc đã được xử lý.' });
    }

    if (action === 'accept') {
      // Check if patient already has a caregiver
      if (req.user.caregiverId) {
        return res.status(400).json({ error: 'Bạn đã có người thân được liên kết.' });
      }

      // Link caregiver to patient
      req.user.caregiverId = caregiverRequest.caregiverId._id;
      await req.user.save();

      // Update request status
      caregiverRequest.status = 'accepted';
      caregiverRequest.respondedAt = new Date();
      await caregiverRequest.save();

      // Reject other pending requests
      await CaregiverRequest.updateMany(
        {
          patientId: req.user._id,
          _id: { $ne: requestId },
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

const getPatientTasks = async (req, res) => {
  try {
    if (req.user.role !== 'CAREGIVER') {
      return res.status(403).json({ error: 'Only caregivers can view patient tasks' });
    }

    const { patientId } = req.params;

    // Verify caregiver has access
    const patient = await User.findById(patientId);
    if (!patient || patient.caregiverId?.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get all pending reminders (not TAKEN or SKIPPED) - including future ones
    const medications = await Medication.find({ userId: patientId });
    const medicationIds = medications.map(m => m._id);
    
    const reminders = await Reminder.find({
      medicationId: { $in: medicationIds },
      status: { $nin: ['TAKEN', 'SKIPPED'] },
    }).sort({ scheduledTime: 1 });

    // Get all pending health logs (not completed) - including future ones
    // Exclude symptoms as they are handled in alerts
    const healthLogs = await HealthLog.find({
      userId: patientId,
      isCompleted: false,
      type: { $in: ['meal', 'exercise'] }, // Only meal and exercise, exclude symptom
      $or: [
        { scheduledDate: { $exists: true, $ne: null } },
        { date: { $exists: true, $ne: null } },
      ],
    }).sort({ scheduledTime: 1, date: 1 });

    res.json({ reminders, healthLogs });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const sendTaskNotificationSchema = z.object({
  body: z.object({
    taskType: z.enum(['medication', 'health']),
  }),
});

const sendTaskNotification = async (req, res) => {
  try {
    if (req.user.role !== 'CAREGIVER') {
      return res.status(403).json({ error: 'Only caregivers can send notifications' });
    }

    const { patientId, taskId } = req.params;
    const { taskType } = req.body;

    // Verify caregiver has access
    const patient = await User.findById(patientId);
    if (!patient || patient.caregiverId?.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }

    let task;
    let notificationTitle = '';
    let notificationBody = '';

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

    // TODO: Implement push notification to patient device
    // For now, we'll just return success
    // In production, you would use FCM, Expo Push Notifications, or similar service
    // Example:
    // await sendPushNotification(patient.deviceToken, notificationTitle, notificationBody);

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





