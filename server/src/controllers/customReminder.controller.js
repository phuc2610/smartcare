const CustomReminder = require('../models/CustomReminder');
const { z } = require('zod');

const createCustomReminderSchema = z.object({
  body: z.object({
    title: z.string().min(1),
    description: z.string().optional(),
    reminderTime: z.string().datetime(),
    repeatType: z.enum(['NONE', 'DAILY', 'WEEKLY', 'MONTHLY']).optional(),
    repeatDays: z.array(z.number().min(0).max(6)).optional(),
  }),
});

const createCustomReminder = async (req, res) => {
  try {
    const { title, description, reminderTime, repeatType = 'NONE', repeatDays = [] } = req.body;

    const reminder = new CustomReminder({
      userId: req.user._id,
      title,
      description: description || '',
      reminderTime: new Date(reminderTime),
      repeatType,
      repeatDays,
      isActive: true,
    });

    await reminder.save();

    res.json({ reminder });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getCustomReminders = async (req, res) => {
  try {
    const reminders = await CustomReminder.find({ 
      userId: req.user._id,
      isActive: true,
    }).sort({ reminderTime: 1 });

    res.json({ reminders });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const updateCustomReminder = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, reminderTime, repeatType, repeatDays, isActive } = req.body;

    const reminder = await CustomReminder.findOne({ 
      _id: id, 
      userId: req.user._id 
    });

    if (!reminder) {
      return res.status(404).json({ error: 'Reminder not found' });
    }

    if (title !== undefined) reminder.title = title;
    if (description !== undefined) reminder.description = description;
    if (reminderTime !== undefined) reminder.reminderTime = new Date(reminderTime);
    if (repeatType !== undefined) reminder.repeatType = repeatType;
    if (repeatDays !== undefined) reminder.repeatDays = repeatDays;
    if (isActive !== undefined) reminder.isActive = isActive;

    await reminder.save();

    res.json({ reminder });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const deleteCustomReminder = async (req, res) => {
  try {
    const { id } = req.params;

    const reminder = await CustomReminder.findOneAndDelete({ 
      _id: id, 
      userId: req.user._id 
    });

    if (!reminder) {
      return res.status(404).json({ error: 'Reminder not found' });
    }

    res.json({ message: 'Reminder deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  createCustomReminder,
  getCustomReminders,
  updateCustomReminder,
  deleteCustomReminder,
  createCustomReminderSchema,
};

