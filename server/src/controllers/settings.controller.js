/**
 * SETTINGS CONTROLLER - Quản lý cài đặt thông báo
 * Chức năng: Lấy và cập nhật cài đặt thông báo (thời gian nhắc trước, bật/tắt từng loại)
 */

const User = require('../models/User');
const { authenticate } = require('../middleware/auth');

/**
 * Lấy cài đặt thông báo của user
 * Luồng: Tìm user -> Lấy notificationSettings hoặc dùng giá trị mặc định -> Trả về
 */
const getNotificationSettings = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Lấy settings từ user hoặc dùng giá trị mặc định
    const settings = user.notificationSettings || {
      medicationReminderBefore: 15, // Nhắc trước 15 phút
      mealReminderBefore: 15,
      exerciseReminderBefore: 15,
      medicationEnabled: true, // Bật thông báo thuốc
      mealEnabled: true,
      exerciseEnabled: true,
    };

    res.json({ settings });
  } catch (error) {
    console.error('[Settings] Get notification settings error:', error);
    res.status(500).json({ error: 'Failed to get notification settings' });
  }
};

/**
 * Cập nhật cài đặt thông báo
 * Luồng: Validate các giá trị (0-60 phút) -> Xây dựng updateData -> Cập nhật vào database -> Trả về settings mới
 */
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

    // Validate: thời gian nhắc trước phải từ 0-60 phút
    if (medicationReminderBefore !== undefined && (medicationReminderBefore < 0 || medicationReminderBefore > 60)) {
      return res.status(400).json({ error: 'medicationReminderBefore must be between 0 and 60' });
    }
    if (mealReminderBefore !== undefined && (mealReminderBefore < 0 || mealReminderBefore > 60)) {
      return res.status(400).json({ error: 'mealReminderBefore must be between 0 and 60' });
    }
    if (exerciseReminderBefore !== undefined && (exerciseReminderBefore < 0 || exerciseReminderBefore > 60)) {
      return res.status(400).json({ error: 'exerciseReminderBefore must be between 0 and 60' });
    }

    // Xây dựng object update cho nested field notificationSettings
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

    // Cập nhật vào database (dùng $set để update nested field)
    const user = await User.findByIdAndUpdate(
      userId,
      { $set: updateData },
      { new: true } // Trả về document sau khi update
    );

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Trả về settings (có thể là giá trị mới hoặc mặc định)
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

/**
 * Lấy cấu hình giờ uống thuốc theo buổi của bệnh nhân
 */
const getMedicationTimes = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const medicationTimes = user.medicationTimes || {
      morning: '08:00',
      noon: '12:00',
      evening: '20:00',
    };

    res.json({ medicationTimes });
  } catch (error) {
    console.error('[Settings] Get medication times error:', error);
    res.status(500).json({ error: 'Failed to get medication times' });
  }
};

/**
 * Cập nhật cấu hình giờ uống thuốc theo buổi
 */
const updateMedicationTimes = async (req, res) => {
  try {
    const { morning, noon, evening } = req.body;
    const updateData = {};

    // Validate HH:mm format
    const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;
    if (morning && !timeRegex.test(morning)) return res.status(400).json({ error: 'Giờ sáng không hợp lệ (HH:mm)' });
    if (noon && !timeRegex.test(noon)) return res.status(400).json({ error: 'Giờ trưa không hợp lệ (HH:mm)' });
    if (evening && !timeRegex.test(evening)) return res.status(400).json({ error: 'Giờ tối không hợp lệ (HH:mm)' });

    if (morning) updateData['medicationTimes.morning'] = morning;
    if (noon) updateData['medicationTimes.noon'] = noon;
    if (evening) updateData['medicationTimes.evening'] = evening;

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $set: updateData },
      { new: true }
    );

    if (!user) return res.status(404).json({ error: 'User not found' });

    res.json({ medicationTimes: user.medicationTimes });
  } catch (error) {
    console.error('[Settings] Update medication times error:', error);
    res.status(500).json({ error: 'Failed to update medication times' });
  }
};

module.exports = {
  getNotificationSettings: [authenticate, getNotificationSettings],
  updateNotificationSettings: [authenticate, updateNotificationSettings],
  getMedicationTimes: [authenticate, getMedicationTimes],
  updateMedicationTimes: [authenticate, updateMedicationTimes],
};

