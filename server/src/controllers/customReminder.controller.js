/**
 * CUSTOM REMINDER CONTROLLER - Quản lý nhắc nhở tùy chỉnh
 * Chức năng: Tạo, lấy, cập nhật, xóa nhắc nhở tùy chỉnh (có thể lặp lại)
 */

const CustomReminder = require('../models/CustomReminder');
const { z } = require('zod');

// Schema validation cho tạo custom reminder: title, description, reminderTime, repeatType, repeatDays
const createCustomReminderSchema = z.object({
  body: z.object({
    title: z.string().min(1),
    description: z.string().optional(),
    reminderTime: z.string().datetime(),
    repeatType: z.enum(['NONE', 'DAILY', 'WEEKLY', 'MONTHLY']).optional(),
    repeatDays: z.array(z.number().min(0).max(6)).optional(), // 0=Chủ nhật, 1-6=Thứ 2-7
  }),
});

/**
 * Tạo nhắc nhở tùy chỉnh mới
 * Luồng: Parse reminderTime -> Tạo CustomReminder -> Lưu vào database -> Trả về
 */
const createCustomReminder = async (req, res) => {
  try {
    const { title, description, reminderTime, repeatType = 'NONE', repeatDays = [] } = req.body;

    // Tạo custom reminder với userId từ JWT token
    const reminder = new CustomReminder({
      userId: req.user._id,
      title,
      description: description || '',
      reminderTime: new Date(reminderTime), // Parse datetime string
      repeatType, // NONE/DAILY/WEEKLY/MONTHLY
      repeatDays, // Mảng các ngày trong tuần (0-6)
      isActive: true, // Mặc định là active
    });

    await reminder.save();

    res.json({ reminder });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Lấy danh sách nhắc nhở tùy chỉnh (chỉ những cái đang active)
 * Luồng: Tìm reminders của user và isActive=true -> Sắp xếp theo reminderTime tăng dần -> Trả về
 */
const getCustomReminders = async (req, res) => {
  try {
    // Chỉ lấy reminders đang active, sắp xếp theo thời gian tăng dần
    const reminders = await CustomReminder.find({ 
      userId: req.user._id,
      isActive: true,
    }).sort({ reminderTime: 1 });

    res.json({ reminders });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Cập nhật nhắc nhở tùy chỉnh
 * Luồng: Tìm reminder (kiểm tra thuộc về user) -> Cập nhật các field được gửi lên -> Lưu -> Trả về
 */
const updateCustomReminder = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, reminderTime, repeatType, repeatDays, isActive } = req.body;

    // Tìm reminder và kiểm tra thuộc về user hiện tại
    const reminder = await CustomReminder.findOne({ 
      _id: id, 
      userId: req.user._id 
    });

    if (!reminder) {
      return res.status(404).json({ error: 'Reminder not found' });
    }

    // Cập nhật các field nếu có trong request body
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

/**
 * Xóa nhắc nhở tùy chỉnh
 * Luồng: Tìm và xóa reminder (kiểm tra thuộc về user) -> Trả về message
 */
const deleteCustomReminder = async (req, res) => {
  try {
    const { id } = req.params;

    // Tìm và xóa reminder, chỉ xóa được reminder của chính user
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

