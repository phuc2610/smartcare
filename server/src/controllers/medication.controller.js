const Medication = require('../models/Medication');
const Reminder = require('../models/Reminder');
const { z } = require('zod');

const createMedicationSchema = z.object({
  body: z.object({
    name: z.string().min(1),
    dosage: z.string(),
    unit: z.string().default('mg'),
    notes: z.string().optional(),
    frequency: z.enum(['DAILY', 'EVERY_OTHER_DAY']),
    times: z.array(z.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/)),
    startDate: z.string().datetime(),
  }),
});

const createMedication = async (req, res) => {
  try {
    const { name, dosage, unit, notes, frequency, times, startDate } = req.body;

    const medication = await Medication.create({
      userId: req.user._id,
      name,
      dosage,
      unit: unit || 'mg',
      notes: notes || '',
      frequency,
      times,
      startDate: new Date(startDate),
    });

    // Generate reminders for today
    await generateRemindersForMedication(medication);

    res.status(201).json({ medication });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getTodayReminders = async (req, res) => {
  try {
    const targetUserId = req.query.userId || req.user._id.toString();

    const medications = await Medication.find({ userId: targetUserId });
    const medicationIds = medications.map(m => m._id);

    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0);
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);

    const reminders = await Reminder.find({
      medicationId: { $in: medicationIds },
      scheduledTime: { $gte: startOfDay, $lte: endOfDay },
    }).sort({ scheduledTime: 1 });

    res.json({ reminders });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const updateReminderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const reminder = await Reminder.findById(id);
    if (!reminder) {
      return res.status(404).json({ error: 'Reminder not found' });
    }

    reminder.status = status;
    if (status === 'TAKEN') {
      reminder.takenAt = new Date();
    }
    reminder.lastUpdated = new Date();
    await reminder.save();

    res.json({ reminder });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const updateReminderSchema = z.object({
  body: z.object({
    scheduledTime: z.string().datetime().optional(),
    dosage: z.string().optional(),
    unit: z.string().optional(),
  }),
});

const updateReminder = async (req, res) => {
  try {
    const { id } = req.params;
    const { scheduledTime, dosage, unit } = req.body;

    const reminder = await Reminder.findById(id);
    if (!reminder) {
      return res.status(404).json({ error: 'Reminder not found' });
    }

    if (scheduledTime) {
      reminder.scheduledTime = new Date(scheduledTime);
    }
    if (dosage !== undefined) {
      reminder.dosage = dosage;
    }
    if (unit !== undefined) {
      reminder.unit = unit;
    }
    reminder.lastUpdated = new Date();
    await reminder.save();

    res.json({ reminder });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getMedications = async (req, res) => {
  try {
    const medications = await Medication.find({ userId: req.user._id }).sort({ createdAt: -1 });
    res.json({ medications });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const deleteMedication = async (req, res) => {
  try {
    const { id } = req.params;
    await Medication.findByIdAndDelete(id);
    await Reminder.deleteMany({ medicationId: id });
    res.json({ message: 'Medication deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const deleteReminder = async (req, res) => {
  try {
    const { id } = req.params;
    
    const reminder = await Reminder.findById(id);
    if (!reminder) {
      return res.status(404).json({ error: 'Reminder not found' });
    }
    
    // Verify the reminder belongs to the user's medication
    const medication = await Medication.findById(reminder.medicationId);
    if (!medication || medication.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    await Reminder.findByIdAndDelete(id);
    res.json({ message: 'Reminder deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Helper: Generate reminders
const generateRemindersForMedication = async (medication) => {
  const today = new Date();
  const startDate = new Date(medication.startDate);

  let shouldSchedule = false;
  if (medication.frequency === 'DAILY') {
    shouldSchedule = true;
  } else if (medication.frequency === 'EVERY_OTHER_DAY') {
    const diffTime = Math.abs(today.getTime() - startDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    shouldSchedule = diffDays % 2 === 0;
  }

  if (shouldSchedule) {
    for (const timeStr of medication.times) {
      const [hours, minutes] = timeStr.split(':').map(Number);
      const scheduleDate = new Date(today);
      scheduleDate.setHours(hours, minutes, 0, 0);

      const existing = await Reminder.findOne({
        medicationId: medication._id,
        scheduledTime: scheduleDate,
      });

      if (!existing) {
        await Reminder.create({
          medicationId: medication._id,
          medicationName: medication.name,
          dosage: medication.dosage,
          unit: medication.unit,
          scheduledTime: scheduleDate,
          status: 'PENDING',
          isSynced: true,
          lastUpdated: new Date(),
        });
      }
    }
  }
};

const getMissedMedications = async (req, res) => {
  try {
    const targetUserId = req.query.userId || req.user._id.toString();
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000); // 1 hour ago

    const medications = await Medication.find({ userId: targetUserId });
    const medicationIds = medications.map(m => m._id);

    // Find reminders that are past due (more than 1 hour ago) and still PENDING
    const missedReminders = await Reminder.find({
      medicationId: { $in: medicationIds },
      scheduledTime: { $lte: oneHourAgo },
      status: 'PENDING',
    }).sort({ scheduledTime: -1 }).limit(50);

    res.json({ missedReminders });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  createMedication,
  getTodayReminders,
  updateReminderStatus,
  updateReminder,
  getMedications,
  deleteMedication,
  deleteReminder,
  getMissedMedications,
  createMedicationSchema,
  updateReminderSchema,
};





