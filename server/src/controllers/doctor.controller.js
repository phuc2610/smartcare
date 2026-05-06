const User = require('../models/User');
const DoctorPatientLink = require('../models/DoctorPatientLink');
const Medication = require('../models/Medication');
const Reminder = require('../models/Reminder');
const HealthLog = require('../models/HealthLog');
const MedicalRecord = require('../models/MedicalRecord');
const crypto = require('crypto');

// Bác sĩ lấy profile của mình (bao gồm danh sách linkCode)
const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-passwordHash');
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.role !== 'DOCTOR') return res.status(403).json({ error: 'Not a doctor' });
    
    // Đảm bảo có linkCode
    if (!user.linkCode) {
      user.linkCode = crypto.randomBytes(4).toString('hex').toUpperCase();
      await user.save();
    }
    
    res.json({ user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Bệnh nhân kết nối với Bác sĩ thông qua mã (linkCode)
const linkDoctor = async (req, res) => {
  try {
    const { doctorCode } = req.body;
    if (!doctorCode) return res.status(400).json({ error: 'Mã bác sĩ là bắt buộc' });
    
    const formattedCode = doctorCode.trim().toUpperCase();
    const doctor = await User.findOne({ linkCode: formattedCode, role: 'DOCTOR' });
    if (!doctor) return res.status(404).json({ error: 'Không tìm thấy bác sĩ với mã này. Hãy chắc chắn bạn nhập đúng chữ cái và số.' });
    
    // Kiểm tra đã có link chưa
    let link = await DoctorPatientLink.findOne({ doctorId: doctor._id, patientId: req.user._id });
    if (link) {
      if (link.status === 'REVOKED') {
        link.status = 'ACTIVE';
        link.grantedAt = new Date();
        await link.save();
      }
    } else {
      link = new DoctorPatientLink({
        doctorId: doctor._id,
        patientId: req.user._id,
        status: 'ACTIVE'
      });
      await link.save();
    }
    
    res.json({ message: 'Kết nối bác sĩ thành công', doctor: { name: doctor.name, specialty: doctor.doctorProfile?.specialty } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Bác sĩ lấy danh sách bệnh nhân đang quản lý (active links)
const getPatients = async (req, res) => {
  try {
    if (req.user.role !== 'DOCTOR') return res.status(403).json({ error: 'Access denied' });
    
    const links = await DoctorPatientLink.find({ doctorId: req.user._id, status: 'ACTIVE' })
      .populate('patientId', 'name phone medicalCondition avatar createdAt');
      
    const patients = links.map(l => ({
      linkId: l._id,
      patientId: l.patientId._id,
      name: l.patientId.name,
      phone: l.patientId.phone,
      condition: l.patientId.medicalCondition,
      linkedAt: l.grantedAt
    }));
    
    res.json({ patients });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Bác sĩ lấy hồ sơ y tế bệnh nhân
const getPatientProfile = async (req, res) => {
  try {
    const { patientId } = req.params;
    
    // Check permission
    const link = await DoctorPatientLink.findOne({ doctorId: req.user._id, patientId, status: 'ACTIVE' });
    if (!link) return res.status(403).json({ error: 'Patient not linked or revoked' });

    const patient = await User.findById(patientId).select('name phone email avatar medicalCondition height weight createdAt');
    if (!patient) return res.status(404).json({ error: 'Patient not found' });

    res.json({ patient, linkedAt: link.grantedAt });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Bác sĩ lấy dữ liệu sinh tồn cơ bản của một bệnh nhân
const getPatientVitals = async (req, res) => {
  try {
    const { patientId } = req.params;
    
    // Check permission
    const link = await DoctorPatientLink.findOne({ doctorId: req.user._id, patientId, status: 'ACTIVE' });
    if (!link) return res.status(403).json({ error: 'Patient not linked or revoked' });
    
    const { startDate, endDate } = req.query;
    
    let queryStartDate = new Date();
    queryStartDate.setDate(queryStartDate.getDate() - 30);
    let queryEndDate = new Date();

    if (startDate && endDate) {
      const parsedStart = new Date(startDate);
      const parsedEnd = new Date(endDate);
      parsedEnd.setHours(23, 59, 59, 999);
      
      const diffTime = Math.abs(parsedEnd - parsedStart);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
      
      if (diffDays <= 31) { // Lấy 30-31 ngày
        queryStartDate = parsedStart;
        queryEndDate = parsedEnd;
      }
    }
    
    const vitalLogs = await HealthLog.find({
      userId: patientId,
      date: { $gte: queryStartDate, $lte: queryEndDate },
    }).sort({ date: -1 });
    
    res.json({ logs: vitalLogs });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Bác sĩ xem độ tuân thủ thuốc của bệnh nhân
const getPatientAdherence = async (req, res) => {
  try {
    const { patientId } = req.params;
    const link = await DoctorPatientLink.findOne({ doctorId: req.user._id, patientId, status: 'ACTIVE' });
    if (!link) return res.status(403).json({ error: 'Bệnh nhân chưa liên kết' });

    // Lấy danh sách medication của bệnh nhân
    const medications = await Medication.find({ userId: patientId, isActive: true }).lean();
    const medIds = medications.map(m => m._id);

    const now = new Date();
    const d7ago  = new Date(now); d7ago.setDate(now.getDate() - 7);
    const d30ago = new Date(now); d30ago.setDate(now.getDate() - 30);

    // Lấy tất cả reminders 30 ngày qua
    const reminders30 = await Reminder.find({
      medicationId: { $in: medIds },
      scheduledTime: { $gte: d30ago, $lte: now },
    }).lean();

    // Reminders 7 ngày qua
    const reminders7 = reminders30.filter(r => new Date(r.scheduledTime) >= d7ago);

    const calcRate = (arr) => {
      const past = arr.filter(r => new Date(r.scheduledTime) <= now);
      if (!past.length) return null;
      const taken = past.filter(r => r.status === 'TAKEN').length;
      return Math.round((taken / past.length) * 100);
    };

    // Thống kê theo từng thuốc
    const byMed = medications.map(med => {
      const medReminders = reminders30.filter(r => String(r.medicationId) === String(med._id));
      const past = medReminders.filter(r => new Date(r.scheduledTime) <= now);
      const taken  = past.filter(r => r.status === 'TAKEN').length;
      const skipped = past.filter(r => r.status === 'SKIPPED').length;
      const pending = past.filter(r => r.status === 'PENDING').length;
      const rate = past.length ? Math.round((taken / past.length) * 100) : null;
      return {
        medicationId: med._id,
        name: med.name,
        dosage: med.dosage,
        total: past.length,
        taken,
        skipped,
        pending,
        adherenceRate: rate,
      };
    });

    // Bỏ thuốc chưa có reminder nào
    const activeMeds = byMed.filter(m => m.total > 0);

    // Ngày bỏ thuốc (SKIPPED) trong 7 ngày
    const missedDoses = reminders7
      .filter(r => r.status === 'SKIPPED')
      .sort((a, b) => new Date(b.scheduledTime) - new Date(a.scheduledTime))
      .slice(0, 20)
      .map(r => ({
        date: r.scheduledTime,
        medicationName: r.medicationName,
        session: r.session,
      }));

    // Daily adherence cho 7 ngày (cho biểu đồ)
    const dailyData = [];
    for (let i = 6; i >= 0; i--) {
      const dayStart = new Date(now); dayStart.setDate(now.getDate() - i); dayStart.setHours(0,0,0,0);
      const dayEnd   = new Date(dayStart); dayEnd.setHours(23,59,59,999);
      const dayRems  = reminders7.filter(r => {
        const t = new Date(r.scheduledTime);
        return t >= dayStart && t <= dayEnd;
      });
      const pastDay = dayRems.filter(r => new Date(r.scheduledTime) <= now);
      const takenDay  = pastDay.filter(r => r.status === 'TAKEN').length;
      dailyData.push({
        date: dayStart.toISOString().split('T')[0],
        label: dayStart.toLocaleDateString('vi-VN', { weekday: 'short', day: 'numeric', month: 'numeric' }),
        total: pastDay.length,
        taken: takenDay,
        rate: pastDay.length ? Math.round((takenDay / pastDay.length) * 100) : null,
      });
    }

    res.json({
      adherenceRate7d:  calcRate(reminders7),
      adherenceRate30d: calcRate(reminders30),
      totalMedications: medications.length,
      activeMedications: activeMeds.length,
      byMedication: activeMeds,
      missedDoses,
      dailyData,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Bác sĩ kê đơn thuốc cho bệnh nhân
const prescribeMedication = async (req, res) => {
  try {
    const { patientId } = req.params;
    const { name, dosage, frequency, sessions, mealTiming, times, startDate, endDate, notes } = req.body;
    
    const link = await DoctorPatientLink.findOne({ doctorId: req.user._id, patientId, status: 'ACTIVE' });
    if (!link) return res.status(403).json({ error: 'Patient not linked or revoked' });
    
    const newMedication = new Medication({
      userId: patientId,
      name,
      dosage,
      frequency,
      sessions: sessions || [],
      mealTiming: mealTiming || 'NONE',
      times: times || [],
      startDate,
      endDate,
      notes,
      prescribedBy: req.user._id // Ghi nhận bác sĩ kê đơn
    });
    
    await newMedication.save();
    
    // Sync reminders logically based on current generate reminders behavior (typically via medication.controller)
    // We can call a utility or just let the client fetch. For the API, we just save the Medication.
    // In a real app we would call generateRemindersForMedication(newMedication) here.
    const { generateRemindersForMedication } = require('./medication.controller');
    await generateRemindersForMedication(newMedication);
    
    res.status(201).json({ message: 'Prescription created successfully', medication: newMedication });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Bệnh nhân bãi bỏ quyền
const revokeDoctor = async (req, res) => {
  try {
    const { doctorId } = req.params;
    const link = await DoctorPatientLink.findOne({ doctorId, patientId: req.user._id });
    if (!link) return res.status(404).json({ error: 'Link not found' });
    
    link.status = 'REVOKED';
    await link.save();
    
    res.json({ message: 'Đã ngừng chia sẻ hồ sơ với bác sĩ này' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Bệnh nhân lấy danh sách bác sĩ đang quản lý mình
const getMyDoctors = async (req, res) => {
  try {
    const links = await DoctorPatientLink.find({ patientId: req.user._id, status: 'ACTIVE' })
      .populate('doctorId', 'name phone doctorProfile');
      
    const doctors = links.map(l => ({
      doctorId: l.doctorId._id,
      name: l.doctorId.name,
      phone: l.doctorId.phone,
      specialty: l.doctorId.doctorProfile?.specialty || 'General',
      linkedAt: l.grantedAt
    }));
    
    res.json({ doctors });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Bác sĩ xem lịch sử đơn thuốc của bệnh nhân (M4)
const getPrescriptionHistory = async (req, res) => {
  try {
    const { patientId } = req.params;
    if (req.user.role !== 'DOCTOR') return res.status(403).json({ error: 'Access denied' });

    const link = await DoctorPatientLink.findOne({ doctorId: req.user._id, patientId, status: 'ACTIVE' });
    if (!link) return res.status(403).json({ error: 'Bệnh nhân chưa liên kết' });

    // Lấy tất cả MedicalRecords (chứa prescriptionIds) - nhóm đơn theo lần khám
    const records = await MedicalRecord.find({ patientId })
      .populate('doctorId', 'name doctorProfile')
      .populate({
        path: 'prescriptionIds',
        model: 'Medication',
        select: 'name dosage frequency sessions mealTiming startDate endDate notes isActive unit prescribedBy createdAt',
      })
      .sort({ createdAt: -1 })
      .lean();

    // Lấy thêm các Medication không nằm trong MedicalRecord nào (kê riêng trước đây)
    const allRecordMedIds = records.flatMap(r => (r.prescriptionIds || []).map(m => String(m._id)));
    const orphanMeds = await Medication.find({
      userId: patientId,
      _id: { $nin: allRecordMedIds },
    })
      .populate('prescribedBy', 'name doctorProfile')
      .sort({ createdAt: -1 })
      .lean();

    // Build response: grouped by visit (MedicalRecord) + orphan group
    const grouped = records.map(r => ({
      recordId: r._id,
      diagnosis: r.diagnosis,
      icdCode: r.icdCode || '',
      doctorName: r.doctorId?.name || 'N/A',
      visitDate: r.createdAt,
      followUpDate: r.followUpDate,
      symptoms: r.symptoms || [],
      vitalSigns: r.vitalSigns || {},
      note: r.note || '',
      medications: (r.prescriptionIds || []).map(med => ({
        _id: med._id,
        name: med.name,
        dosage: med.dosage,
        frequency: med.frequency,
        sessions: med.sessions,
        mealTiming: med.mealTiming,
        startDate: med.startDate,
        endDate: med.endDate,
        notes: med.notes,
        isActive: med.isActive,
        unit: med.unit,
        createdAt: med.createdAt,
      })),
    }));

    // Orphan medications (kê riêng, không có hồ sơ khám)
    const orphanGroup = orphanMeds.length > 0 ? {
      recordId: null,
      diagnosis: 'Kê đơn riêng (không có hồ sơ khám)',
      icdCode: '',
      doctorName: orphanMeds[0]?.prescribedBy?.name || 'N/A',
      visitDate: orphanMeds[0]?.createdAt,
      followUpDate: null,
      symptoms: [],
      vitalSigns: {},
      note: '',
      medications: orphanMeds.map(med => ({
        _id: med._id,
        name: med.name,
        dosage: med.dosage,
        frequency: med.frequency,
        sessions: med.sessions,
        mealTiming: med.mealTiming,
        startDate: med.startDate,
        endDate: med.endDate,
        notes: med.notes,
        isActive: med.isActive,
        unit: med.unit,
        createdAt: med.createdAt,
      })),
    } : null;

    const allGroups = orphanGroup ? [...grouped, orphanGroup] : grouped;

    res.json({
      totalVisits: allGroups.length,
      totalMedications: allGroups.reduce((sum, g) => sum + g.medications.length, 0),
      history: allGroups,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Bác sĩ xem xu hướng triệu chứng theo thời gian (M6)
const getSymptomTrend = async (req, res) => {
  try {
    const { patientId } = req.params;
    if (req.user.role !== 'DOCTOR') return res.status(403).json({ error: 'Access denied' });

    const link = await DoctorPatientLink.findOne({ doctorId: req.user._id, patientId, status: 'ACTIVE' });
    if (!link) return res.status(403).json({ error: 'Bệnh nhân chưa liên kết' });

    const days = Math.min(90, Math.max(7, Number(req.query.days) || 30));
    const since = new Date();
    since.setDate(since.getDate() - days);

    const logs = await HealthLog.find({
      userId: patientId,
      type: 'symptom',
      date: { $gte: since },
    })
      .sort({ date: 1 })
      .lean();

    // Build raw data points
    const dataPoints = logs.map(l => ({
      date: new Date(l.date).toISOString().split('T')[0],
      symptomName: l.details?.symptomName || 'Không rõ',
      severity: l.details?.severity || 0,
      note: l.details?.note || '',
    }));

    // Unique symptom names
    const symptomNames = [...new Set(dataPoints.map(d => d.symptomName))];

    // Group by date → for charting
    const dateMap = {};
    for (const dp of dataPoints) {
      if (!dateMap[dp.date]) dateMap[dp.date] = {};
      // If multiple entries same symptom same date → take max severity
      if (!dateMap[dp.date][dp.symptomName] || dp.severity > dateMap[dp.date][dp.symptomName]) {
        dateMap[dp.date][dp.symptomName] = dp.severity;
      }
    }

    // Build chart-ready series: [{date, symptom1, symptom2, ...}]
    const dates = Object.keys(dateMap).sort();
    const series = dates.map(date => {
      const entry = { date };
      for (const name of symptomNames) {
        entry[name] = dateMap[date][name] || null;
      }
      return entry;
    });

    res.json({
      days,
      totalLogs: logs.length,
      symptomNames,
      series,
      dataPoints,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  getProfile,
  linkDoctor,
  getPatients,
  getPatientVitals,
  getPatientAdherence,
  prescribeMedication,
  revokeDoctor,
  getMyDoctors,
  getPatientProfile,
  getPrescriptionHistory,
  getSymptomTrend,
};

