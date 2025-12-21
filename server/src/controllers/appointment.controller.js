/**
 * APPOINTMENT CONTROLLER - Quản lý lịch hẹn
 * Chức năng: Tạo lịch hẹn (caregiver có thể tạo cho patient), lấy danh sách, cập nhật, xóa
 */

const Appointment = require('../models/Appointment');
const { z } = require('zod');

// Schema validation cho tạo appointment: doctorName, doctorSpecialty, hospitalName, appointmentDate, appointmentTime, notes, reminderBefore, userId (optional cho caregiver)
const createAppointmentSchema = z.object({
  body: z.object({
    doctorName: z.string().min(1),
    doctorSpecialty: z.string().optional(),
    hospitalName: z.string().optional(),
    appointmentDate: z.string().datetime(),
    appointmentTime: z.string().optional(),
    notes: z.string().optional(),
    reminderBefore: z.number().optional(),
    userId: z.string().optional(), // Cho phép caregiver tạo appointment cho patient
  }),
});

/**
 * Tạo lịch hẹn mới
 * Luồng: Xác định targetUserId (có thể là patient nếu caregiver tạo) -> Kiểm tra quyền truy cập -> Tạo appointment -> Trả về
 */
const createAppointment = async (req, res) => {
  try {
    const { 
      doctorName, 
      doctorSpecialty, 
      hospitalName, 
      appointmentDate, 
      appointmentTime,
      notes,
      reminderBefore = 24, // Mặc định nhắc trước 24 giờ
      userId // Cho phép caregiver tạo appointment cho patient
    } = req.body;

    // Xác định userId đích: mặc định là user hiện tại
    let targetUserId = req.user._id;
    
    // Nếu có userId và user là caregiver, cho phép tạo appointment cho patient
    if (userId && req.user.role === 'CAREGIVER') {
      // Kiểm tra caregiver có quyền truy cập patient này không
      const User = require('../models/User');
      const patient = await User.findById(userId);
      if (!patient) {
        return res.status(404).json({ error: 'Patient not found' });
      }
      // Kiểm tra patient có đúng role không
      if (patient.role !== 'PATIENT') {
        return res.status(400).json({ error: 'User is not a patient' });
      }
      // Kiểm tra caregiver có liên kết với patient này không
      if (patient.caregiverId?.toString() !== req.user._id.toString()) {
        return res.status(403).json({ error: 'Access denied. You are not linked to this patient.' });
      }
      targetUserId = userId;
    } else if (userId && req.user.role !== 'CAREGIVER') {
      // Chỉ caregiver mới có thể tạo appointment cho người khác
      return res.status(403).json({ error: 'Only caregivers can create appointments for patients' });
    }

    // Tạo appointment mới
    const appointment = new Appointment({
      userId: targetUserId,
      doctorName,
      doctorSpecialty: doctorSpecialty || '',
      hospitalName: hospitalName || '',
      appointmentDate: new Date(appointmentDate),
      appointmentTime: appointmentTime || '',
      notes: notes || '',
      reminderBefore,
      isCompleted: false,
    });

    await appointment.save();

    res.json({ appointment });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Lấy danh sách appointments
 * Luồng: Kiểm tra query params (upcoming/completed) -> Xây dựng query -> Lấy appointments -> Sắp xếp theo ngày -> Trả về
 */
const getAppointments = async (req, res) => {
  try {
    const { upcoming, completed } = req.query;
    const query = { userId: req.user._id }; // Chỉ lấy appointments của user hiện tại

    // Nếu query upcoming=true: chỉ lấy appointments chưa hoàn thành và chưa đến ngày
    if (upcoming === 'true') {
      query.isCompleted = false;
      query.appointmentDate = { $gte: new Date() };
    } 
    // Nếu query completed=true: chỉ lấy appointments đã hoàn thành
    else if (completed === 'true') {
      query.isCompleted = true;
    }
    // Nếu không có query: lấy tất cả

    // Lấy appointments và sắp xếp theo ngày tăng dần
    const appointments = await Appointment.find(query)
      .sort({ appointmentDate: 1 });

    res.json({ appointments });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const updateAppointment = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      doctorName, 
      doctorSpecialty, 
      hospitalName, 
      appointmentDate, 
      appointmentTime,
      notes,
      reminderBefore,
      isCompleted 
    } = req.body;

    const appointment = await Appointment.findOne({ 
      _id: id, 
      userId: req.user._id 
    });

    if (!appointment) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    if (doctorName !== undefined) appointment.doctorName = doctorName;
    if (doctorSpecialty !== undefined) appointment.doctorSpecialty = doctorSpecialty;
    if (hospitalName !== undefined) appointment.hospitalName = hospitalName;
    if (appointmentDate !== undefined) appointment.appointmentDate = new Date(appointmentDate);
    if (appointmentTime !== undefined) appointment.appointmentTime = appointmentTime;
    if (notes !== undefined) appointment.notes = notes;
    if (reminderBefore !== undefined) appointment.reminderBefore = reminderBefore;
    if (isCompleted !== undefined) appointment.isCompleted = isCompleted;

    await appointment.save();

    res.json({ appointment });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const deleteAppointment = async (req, res) => {
  try {
    const { id } = req.params;

    const appointment = await Appointment.findOneAndDelete({ 
      _id: id, 
      userId: req.user._id 
    });

    if (!appointment) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    res.json({ message: 'Appointment deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  createAppointment,
  getAppointments,
  updateAppointment,
  deleteAppointment,
  createAppointmentSchema,
};

