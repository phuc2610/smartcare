const User = require('../models/User');
const DoctorPatientLink = require('../models/DoctorPatientLink');
const Medication = require('../models/Medication');
const Reminder = require('../models/Reminder');
const HealthLog = require('../models/HealthLog');
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

// Bác sĩ lấy dữ liệu sinh tồn cơ bản của một bệnh nhân
const getPatientVitals = async (req, res) => {
  try {
    const { patientId } = req.params;
    
    // Check permission
    const link = await DoctorPatientLink.findOne({ doctorId: req.user._id, patientId, status: 'ACTIVE' });
    if (!link) return res.status(403).json({ error: 'Patient not linked or revoked' });
    
    // Get last 30 days of health logs
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);
    
    const vitalLogs = await HealthLog.find({
      userId: patientId,
      date: { $gte: startDate },
      // Assuming vitals might be tracked under 'symptom' or a new type. We just return all logs for now
    }).sort({ date: -1 });
    
    res.json({ logs: vitalLogs });
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

module.exports = {
  getProfile,
  linkDoctor,
  getPatients,
  getPatientVitals,
  prescribeMedication,
  revokeDoctor,
  getMyDoctors
};
