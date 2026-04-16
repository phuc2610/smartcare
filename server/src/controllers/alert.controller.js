const Alert = require('../models/Alert');
const DoctorPatientLink = require('../models/DoctorPatientLink');
const { analyzePatient, analyzeAllForDoctor } = require('../services/riskAlert.engine');

// ─── POST /api/alerts/analyze/:patientId — Chạy engine cho 1 bệnh nhân ──────
const analyzeOne = async (req, res) => {
  try {
    const { patientId } = req.params;
    if (req.user.role !== 'DOCTOR') return res.status(403).json({ error: 'Access denied' });

    const link = await DoctorPatientLink.findOne({ doctorId: req.user._id, patientId, status: 'ACTIVE' });
    if (!link) return res.status(403).json({ error: 'Bệnh nhân chưa liên kết' });

    const alerts = await analyzePatient(patientId);
    res.json({ analyzed: 1, alertsCreated: alerts.length, alerts });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ─── POST /api/alerts/analyze-all — Chạy engine cho tất cả bệnh nhân của bác sĩ
const analyzeAll = async (req, res) => {
  try {
    if (req.user.role !== 'DOCTOR') return res.status(403).json({ error: 'Access denied' });
    const alerts = await analyzeAllForDoctor(req.user._id);
    res.json({ alertsCreated: alerts.length, alerts });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ─── GET /api/alerts/patient/:patientId — Lấy alerts của 1 bệnh nhân (doctor) ─
const getPatientAlerts = async (req, res) => {
  try {
    const { patientId } = req.params;
    if (req.user.role !== 'DOCTOR') return res.status(403).json({ error: 'Access denied' });

    const link = await DoctorPatientLink.findOne({ doctorId: req.user._id, patientId, status: 'ACTIVE' });
    if (!link) return res.status(403).json({ error: 'Bệnh nhân chưa liên kết' });

    const alerts = await Alert.find({ patientId })
      .sort({ createdAt: -1 })
      .limit(30)
      .lean();

    res.json({ alerts });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ─── GET /api/alerts/doctor/summary — Tổng hợp alerts của TẤT CẢ bệnh nhân ──
// Dùng ở Dashboard bác sĩ để hiển thị "bệnh nhân cần chú ý"
const getDoctorAlertSummary = async (req, res) => {
  try {
    if (req.user.role !== 'DOCTOR') return res.status(403).json({ error: 'Access denied' });

    const links = await DoctorPatientLink.find({ doctorId: req.user._id, status: 'ACTIVE' })
      .populate('patientId', 'name phone')
      .lean();

    const patientIds = links.map(l => l.patientId?._id || l.patientId);

    // Lấy alerts chưa đọc trong 7 ngày
    const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const rawAlerts = await Alert.find({
      patientId: { $in: patientIds },
      createdAt: { $gte: since7d },
    }).sort({ createdAt: -1 }).lean();

    // Group by patient
    const byPatient = {};
    for (const link of links) {
      const pid = String(link.patientId?._id || link.patientId);
      byPatient[pid] = {
        patientId: pid,
        patientName: link.patientId?.name || 'N/A',
        patientPhone: link.patientId?.phone || '',
        alerts: [],
        unread: 0,
        maxSeverity: 'info',
      };
    }

    const severityOrder = { info: 0, warning: 1, error: 2 };
    for (const alert of rawAlerts) {
      const pid = String(alert.patientId);
      if (!byPatient[pid]) continue;
      byPatient[pid].alerts.push(alert);
      if (!alert.isRead) byPatient[pid].unread++;
      if (severityOrder[alert.severity] > severityOrder[byPatient[pid].maxSeverity]) {
        byPatient[pid].maxSeverity = alert.severity;
      }
    }

    // Chỉ trả bệnh nhân có alert
    const result = Object.values(byPatient)
      .filter(p => p.alerts.length > 0)
      .sort((a, b) => severityOrder[b.maxSeverity] - severityOrder[a.maxSeverity]);

    res.json({
      totalPatients: result.length,
      criticalCount: result.filter(p => p.maxSeverity === 'error').length,
      warningCount:  result.filter(p => p.maxSeverity === 'warning').length,
      patients: result,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ─── PATCH /api/alerts/:alertId/read — Đánh dấu đã đọc ─────────────────────
const markRead = async (req, res) => {
  try {
    const { alertId } = req.params;
    const alert = await Alert.findByIdAndUpdate(alertId, { isRead: true }, { new: true });
    if (!alert) return res.status(404).json({ error: 'Alert not found' });
    res.json({ alert });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ─── PATCH /api/alerts/patient/:patientId/read-all ───────────────────────────
const markAllRead = async (req, res) => {
  try {
    const { patientId } = req.params;
    await Alert.updateMany({ patientId, isRead: false }, { isRead: true });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { analyzeOne, analyzeAll, getPatientAlerts, getDoctorAlertSummary, markRead, markAllRead };
