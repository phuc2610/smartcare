const User = require('../models/User');
const { authenticate } = require('../middleware/auth');

const getNotificationSettings = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const settings = user.notificationSettings || {
      medicationReminderBefore: 15,
      mealReminderBefore: 15,
      exerciseReminderBefore: 15,
      medicationEnabled: true,
      mealEnabled: true,
      exerciseEnabled: true,
    };

    res.json({ settings });
  } catch (error) {
    console.error('[Settings] Get notification settings error:', error);
    res.status(500).json({ error: 'Failed to get notification settings' });
  }
};

const updateNotificationSettings = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      medicationReminderBefore,
      mealReminderBefore,
      exerciseReminderBefore,
      medicationEnabled,
      mealEnabled,
      exerciseEnabled,
    } = req.body;

    // Validate
    if (medicationReminderBefore !== undefined && (medicationReminderBefore < 0 || medicationReminderBefore > 60)) {
      return res.status(400).json({ error: 'medicationReminderBefore must be between 0 and 60' });
    }
    if (mealReminderBefore !== undefined && (mealReminderBefore < 0 || mealReminderBefore > 60)) {
      return res.status(400).json({ error: 'mealReminderBefore must be between 0 and 60' });
    }
    if (exerciseReminderBefore !== undefined && (exerciseReminderBefore < 0 || exerciseReminderBefore > 60)) {
      return res.status(400).json({ error: 'exerciseReminderBefore must be between 0 and 60' });
    }

    const updateData = {};
    if (medicationReminderBefore !== undefined) {
      updateData['notificationSettings.medicationReminderBefore'] = medicationReminderBefore;
    }
    if (mealReminderBefore !== undefined) {
      updateData['notificationSettings.mealReminderBefore'] = mealReminderBefore;
    }
    if (exerciseReminderBefore !== undefined) {
      updateData['notificationSettings.exerciseReminderBefore'] = exerciseReminderBefore;
    }
    if (medicationEnabled !== undefined) {
      updateData['notificationSettings.medicationEnabled'] = medicationEnabled;
    }
    if (mealEnabled !== undefined) {
      updateData['notificationSettings.mealEnabled'] = mealEnabled;
    }
    if (exerciseEnabled !== undefined) {
      updateData['notificationSettings.exerciseEnabled'] = exerciseEnabled;
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { $set: updateData },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const settings = user.notificationSettings || {
      medicationReminderBefore: 15,
      mealReminderBefore: 15,
      exerciseReminderBefore: 15,
      medicationEnabled: true,
      mealEnabled: true,
      exerciseEnabled: true,
    };

    res.json({ settings });
  } catch (error) {
    console.error('[Settings] Update notification settings error:', error);
    res.status(500).json({ error: 'Failed to update notification settings' });
  }
};

module.exports = {
  getNotificationSettings: [authenticate, getNotificationSettings],
  updateNotificationSettings: [authenticate, updateNotificationSettings],
};

