const MedicalRecord   = require('../models/MedicalRecord');
const Medication       = require('../models/Medication');
const Reminder         = require('../models/Reminder');
const DoctorPatientLink = require('../models/DoctorPatientLink');
const { generateRemindersForMedication } = require('./medication.controller');

// ─── Helper: kiểm tra quyền bác sĩ – bệnh nhân ─────────────────────────────
const checkLink = async (doctorId, patientId) => {
  const link = await DoctorPatientLink.findOne({ doctorId, patientId, status: 'ACTIVE' });
  return !!link;
};

// ─── POST /api/medical-records/:patientId ────────────────────────────────────
/**
 * Tạo hồ sơ khám + kê đơn thuốc trong 1 request duy nhất.
 * Body:
 *   diagnosis      (required)
 *   icdCode        (optional)
 *   note
 *   symptoms       [{ name, severity, notes }]
 *   vitalSigns     { bloodPressure, heartRate, temperature, weight, height, spO2, bloodSugar }
 *   appointmentId  (optional)
 *   followUpDate   (optional ISO string)
 *   prescriptions  [{ name, dosage, frequency, sessions, mealTiming, startDate, endDate, notes }]
 */
const createRecord = async (req, res) => {
  try {
    const { patientId } = req.params;
    const doctorId = req.user._id;

    if (req.user.role !== 'DOCTOR') return res.status(403).json({ error: 'Chỉ bác sĩ mới tạo được hồ sơ khám' });
    if (!await checkLink(doctorId, patientId)) return res.status(403).json({ error: 'Bệnh nhân chưa liên kết với bác sĩ này' });

    const {
      diagnosis, icdCode = '', note = '',
      symptoms = [], vitalSigns = {},
      appointmentId = null, followUpDate = null,
      prescriptions = [],
    } = req.body;

    if (!diagnosis?.trim()) return res.status(400).json({ error: 'Chẩn đoán là bắt buộc' });

    // 1. Tạo các đơn thuốc (Medication) và reminder
    const prescriptionIds = [];
    for (const p of prescriptions) {
      if (!p.name?.trim()) continue;
      const med = await Medication.create({
        userId:       patientId,
        name:         p.name.trim(),
        dosage:       p.dosage || '1 viên/lần',
        frequency:    p.frequency || 'DAILY',
        sessions:     p.sessions || [],
        mealTiming:   p.mealTiming || 'NONE',
        times:        p.times || [],
        startDate:    p.startDate || new Date(),
        endDate:      p.endDate || null,
        notes:        p.notes || '',
        prescribedBy: doctorId,
        unit:         p.unit || 'viên',
      });
      prescriptionIds.push(med._id);
      try { await generateRemindersForMedication(med); } catch (_) { /* silent */ }
    }

    // 2. Tạo MedicalRecord
    const record = await MedicalRecord.create({
      patientId,
      doctorId,
      appointmentId,
      symptoms,
      vitalSigns,
      diagnosis: diagnosis.trim(),
      icdCode,
      note,
      prescriptionIds,
      followUpDate: followUpDate ? new Date(followUpDate) : null,
      status: 'COMPLETED',
    });

    // 3. Populate để trả về đầy đủ
    const populated = await MedicalRecord.findById(record._id)
      .populate('doctorId', 'name doctorProfile')
      .populate('prescriptionIds', 'name dosage frequency sessions mealTiming startDate endDate');

    res.status(201).json({ record: populated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ─── GET /api/medical-records/:patientId ─────────────────────────────────────
/**
 * Lịch sử khám bệnh của 1 bệnh nhân (Doctor view)
 * Query: page, limit
 */
const getRecords = async (req, res) => {
  try {
    const { patientId } = req.params;
    const doctorId = req.user._id;

    if (req.user.role !== 'DOCTOR') return res.status(403).json({ error: 'Access denied' });
    if (!await checkLink(doctorId, patientId)) return res.status(403).json({ error: 'Bệnh nhân chưa liên kết' });

    const page  = Math.max(1, Number(req.query.page)  || 1);
    const limit = Math.min(50, Number(req.query.limit) || 10);
    const skip  = (page - 1) * limit;

    const [records, total] = await Promise.all([
      MedicalRecord.find({ patientId })
        .populate('doctorId', 'name doctorProfile')
        .populate('prescriptionIds', 'name dosage sessions mealTiming')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      MedicalRecord.countDocuments({ patientId }),
    ]);

    res.json({ records, total, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ─── GET /api/medical-records/:patientId/:recordId ───────────────────────────
const getRecordById = async (req, res) => {
  try {
    const { patientId, recordId } = req.params;
    const doctorId = req.user._id;

    if (req.user.role !== 'DOCTOR') return res.status(403).json({ error: 'Access denied' });
    if (!await checkLink(doctorId, patientId)) return res.status(403).json({ error: 'Bệnh nhân chưa liên kết' });

    const record = await MedicalRecord.findOne({ _id: recordId, patientId })
      .populate('doctorId', 'name doctorProfile')
      .populate('prescriptionIds');

    if (!record) return res.status(404).json({ error: 'Không tìm thấy hồ sơ khám' });
    res.json({ record });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ─── PATCH /api/medical-records/:patientId/:recordId ────────────────────────
/**
 * Cập nhật hồ sơ khám (chỉ bác sĩ tạo ra mới sửa được)
 */
const updateRecord = async (req, res) => {
  try {
    const { patientId, recordId } = req.params;
    const doctorId = req.user._id;

    const record = await MedicalRecord.findOne({ _id: recordId, patientId, doctorId });
    if (!record) return res.status(404).json({ error: 'Không tìm thấy hoặc không có quyền sửa hồ sơ này' });

    const allowed = ['diagnosis', 'icdCode', 'note', 'symptoms', 'vitalSigns', 'followUpDate', 'status'];
    allowed.forEach(key => { if (req.body[key] !== undefined) record[key] = req.body[key]; });

    await record.save();
    res.json({ record });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ─── GET /api/medical-records/patient/my-records ────────────────────────────
/**
 * Bệnh nhân xem lịch sử khám của mình (Patient view)
 */
const getMyRecords = async (req, res) => {
  try {
    const patientId = req.user._id;
    const page  = Math.max(1, Number(req.query.page)  || 1);
    const limit = Math.min(50, Number(req.query.limit) || 10);

    const [records, total] = await Promise.all([
      MedicalRecord.find({ patientId })
        .populate('doctorId', 'name doctorProfile')
        .populate('prescriptionIds', 'name dosage sessions mealTiming')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      MedicalRecord.countDocuments({ patientId }),
    ]);

    res.json({ records, total, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { createRecord, getRecords, getRecordById, updateRecord, getMyRecords };
