const Appointment = require('../models/Appointment');
const { z } = require('zod');

const createAppointmentSchema = z.object({
  body: z.object({
    doctorName: z.string().min(1),
    doctorSpecialty: z.string().optional(),
    hospitalName: z.string().optional(),
    appointmentDate: z.string().datetime(),
    appointmentTime: z.string().optional(),
    notes: z.string().optional(),
    reminderBefore: z.number().optional(),
    userId: z.string().optional(), // For caregivers to create appointment for patients
  }),
});

const createAppointment = async (req, res) => {
  try {
    const { 
      doctorName, 
      doctorSpecialty, 
      hospitalName, 
      appointmentDate, 
      appointmentTime,
      notes,
      reminderBefore = 24,
      userId // For caregivers to create appointment for patients
    } = req.body;

    // Determine target userId
    let targetUserId = req.user._id;
    
    // If userId is provided and user is a caregiver, allow creating for patient
    if (userId && req.user.role === 'CAREGIVER') {
      // Verify caregiver has access to this patient
      const User = require('../models/User');
      const patient = await User.findById(userId);
      if (!patient) {
        return res.status(404).json({ error: 'Patient not found' });
      }
      // Check if patient role is correct
      if (patient.role !== 'PATIENT') {
        return res.status(400).json({ error: 'User is not a patient' });
      }
      // Check if caregiver is linked to this patient
      if (patient.caregiverId?.toString() !== req.user._id.toString()) {
        return res.status(403).json({ error: 'Access denied. You are not linked to this patient.' });
      }
      targetUserId = userId;
    } else if (userId && req.user.role !== 'CAREGIVER') {
      // Only caregivers can create appointments for others
      return res.status(403).json({ error: 'Only caregivers can create appointments for patients' });
    }

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

const getAppointments = async (req, res) => {
  try {
    const { upcoming, completed } = req.query;
    const query = { userId: req.user._id };

    if (upcoming === 'true') {
      query.isCompleted = false;
      query.appointmentDate = { $gte: new Date() };
    } else if (completed === 'true') {
      query.isCompleted = true;
    }

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

