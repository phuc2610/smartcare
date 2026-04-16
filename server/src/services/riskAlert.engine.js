/**
 * Risk Alert Engine — M3
 * Phân tích dữ liệu bệnh nhân và tạo cảnh báo nguy cơ tự động.
 * Gọi thủ công (on-demand) hoặc theo lịch (cron).
 *
 * Các rule hiện tại:
 *  R1. Tuân thủ thuốc thấp   < 50% trong 7 ngày → severity: error
 *  R2. Tuân thủ thuốc giảm   50-79%             → severity: warning
 *  R3. Triệu chứng nặng      severity >= 8       → severity: error
 *  R4. Bỏ nhiều liều liên tiếp ≥ 3 lần / ngày   → severity: warning
 *  R5. Tái khám sắp đến      trong 48h           → severity: info
 */

const Alert      = require('../models/Alert');
const Reminder   = require('../models/Reminder');
const Medication = require('../models/Medication');
const HealthLog  = require('../models/HealthLog');
const MedicalRecord = require('../models/MedicalRecord');
const DoctorPatientLink = require('../models/DoctorPatientLink');

// ─── Helper: tạo hoặc cập nhật alert (tránh trùng lặp trong 24h) ─────────────
const upsertAlert = async ({ patientId, type, severity, title, message, actionUrl }) => {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const existing = await Alert.findOne({ patientId, type, title, createdAt: { $gte: since } });
  if (existing) {
    // Cập nhật severity nếu leo thang
    const order = { info: 0, warning: 1, error: 2 };
    if (order[severity] > order[existing.severity]) {
      existing.severity = severity;
      existing.message  = message;
      existing.isRead   = false;
      await existing.save();
    }
    return existing;
  }
  return Alert.create({ patientId, type, severity, title, message, actionUrl });
};

// ─── Engine chính: phân tích 1 bệnh nhân ─────────────────────────────────────
const analyzePatient = async (patientId) => {
  const created = [];
  const now = new Date();

  // ── Lấy medications ──────────────────────────────────────────────────────
  const medications = await Medication.find({ userId: patientId, isActive: true }).lean();
  const medIds = medications.map(m => m._id);

  if (medIds.length > 0) {
    const d7ago = new Date(now); d7ago.setDate(now.getDate() - 7);

    // ── R1 & R2: Adherence rate ───────────────────────────────────────────
    const reminders7 = await Reminder.find({
      medicationId: { $in: medIds },
      scheduledTime: { $gte: d7ago, $lte: now },
      status: { $in: ['TAKEN', 'SKIPPED'] }, // chỉ tính đã xử lý
    }).lean();

    if (reminders7.length >= 5) { // cần ít nhất 5 nhắc để có ý nghĩa
      const taken = reminders7.filter(r => r.status === 'TAKEN').length;
      const rate  = Math.round((taken / reminders7.length) * 100);

      if (rate < 50) {
        created.push(await upsertAlert({
          patientId,
          type: 'medication',
          severity: 'error',
          title: `⚠️ Tuân thủ thuốc rất thấp: ${rate}%`,
          message: `Bệnh nhân chỉ uống đúng ${rate}% liều trong 7 ngày qua (${taken}/${reminders7.length} liều). Cần liên hệ ngay.`,
          actionUrl: 'medication',
        }));
      } else if (rate < 80) {
        created.push(await upsertAlert({
          patientId,
          type: 'medication',
          severity: 'warning',
          title: `📉 Tuân thủ thuốc giảm: ${rate}%`,
          message: `Bệnh nhân uống đúng ${rate}% liều trong 7 ngày. Nên hỏi thăm bệnh nhân.`,
          actionUrl: 'medication',
        }));
      }
    }

    // ── R4: Bỏ nhiều liều liên tiếp trong 24h ─────────────────────────────
    const d1ago = new Date(now); d1ago.setDate(now.getDate() - 1);
    const skippedToday = await Reminder.countDocuments({
      medicationId: { $in: medIds },
      scheduledTime: { $gte: d1ago, $lte: now },
      status: 'SKIPPED',
    });
    if (skippedToday >= 3) {
      created.push(await upsertAlert({
        patientId,
        type: 'medication',
        severity: 'warning',
        title: `🚫 Bỏ ${skippedToday} liều trong hôm nay`,
        message: `Bệnh nhân bỏ qua ${skippedToday} lần uống thuốc trong 24 giờ qua. Cần kiểm tra.`,
        actionUrl: 'medication',
      }));
    }
  }

  // ── R3: Triệu chứng nặng ─────────────────────────────────────────────────
  const d3ago = new Date(now); d3ago.setDate(now.getDate() - 3);
  const severeSymptoms = await HealthLog.find({
    userId: patientId,
    type: 'symptom',
    date: { $gte: d3ago },
    'details.severity': { $gte: 8 },
  }).lean();

  for (const sym of severeSymptoms) {
    const sName = sym.details?.symptomName || 'Triệu chứng';
    const sev   = sym.details?.severity;
    created.push(await upsertAlert({
      patientId,
      type: 'symptom',
      severity: sev >= 9 ? 'error' : 'warning',
      title: `🚨 Triệu chứng nghiêm trọng: ${sName}`,
      message: `Mức độ ${sev}/10 ghi nhận lúc ${new Date(sym.date).toLocaleString('vi-VN')}. ${sym.details?.note || ''}`,
      actionUrl: 'symptom',
    }));
  }

  // ── R5: Tái khám sắp đến (48h) ───────────────────────────────────────────
  const h48 = new Date(now.getTime() + 48 * 60 * 60 * 1000);
  const upcoming = await MedicalRecord.findOne({
    patientId,
    followUpDate: { $gte: now, $lte: h48 },
  }).sort({ followUpDate: 1 }).lean();

  if (upcoming) {
    const dt = new Date(upcoming.followUpDate).toLocaleDateString('vi-VN');
    created.push(await upsertAlert({
      patientId,
      type: 'appointment',
      severity: 'info',
      title: `📅 Tái khám ngày ${dt}`,
      message: `Bệnh nhân có lịch tái khám trong 48 giờ tới (${dt}). Hãy chuẩn bị hồ sơ.`,
      actionUrl: 'appointment',
    }));
  }

  return created.filter(Boolean);
};

// ─── Chạy engine cho tất cả bệnh nhân của 1 bác sĩ ──────────────────────────
const analyzeAllForDoctor = async (doctorId) => {
  const links = await DoctorPatientLink.find({ doctorId, status: 'ACTIVE' }).lean();
  const results = await Promise.allSettled(
    links.map(l => analyzePatient(l.patientId))
  );
  return results.flatMap(r => r.status === 'fulfilled' ? r.value : []);
};

module.exports = { analyzePatient, analyzeAllForDoctor };
