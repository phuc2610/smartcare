/**
 * WELLNESS CONTROLLER - Quản lý log thư giãn
 * Chức năng: Lưu log thời gian thư giãn (breathing/music) để thống kê
 */

const WellnessLog = require('../models/WellnessLog');
const { z } = require('zod');

// Schema validation cho log wellness: type (breathing/music), durationSeconds (tối thiểu 1 giây)
const logWellnessSchema = z.object({
  body: z.object({
    type: z.enum(['breathing', 'music']),
    durationSeconds: z.number().min(1),
  }),
});

/**
 * Lưu log thư giãn (tập thở hoặc nghe nhạc)
 * Luồng: Kiểm tra durationSeconds >= 2 -> Tạo wellnessLog -> Lưu vào database -> Trả về
 */
const logWellness = async (req, res) => {
  try {
    const { type, durationSeconds } = req.body;

    // Kiểm tra thời gian tối thiểu 2 giây (tránh log nhầm)
    if (durationSeconds < 2) {
      return res.status(400).json({ error: 'Duration too short' });
    }

    // Tạo wellness log với userId từ JWT token
    const wellnessLog = await WellnessLog.create({
      userId: req.user._id,
      type, // 'breathing' hoặc 'music'
      durationSeconds, // Thời gian thư giãn (giây)
      date: new Date(), // Ngày hiện tại
    });

    res.status(201).json({ wellnessLog });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  logWellness,
  logWellnessSchema,
};





