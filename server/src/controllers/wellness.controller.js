const WellnessLog = require('../models/WellnessLog');
const { z } = require('zod');

const logWellnessSchema = z.object({
  body: z.object({
    type: z.enum(['breathing', 'music']),
    durationSeconds: z.number().min(1),
  }),
});

const logWellness = async (req, res) => {
  try {
    const { type, durationSeconds } = req.body;

    if (durationSeconds < 2) {
      return res.status(400).json({ error: 'Duration too short' });
    }

    const wellnessLog = await WellnessLog.create({
      userId: req.user._id,
      type,
      durationSeconds,
      date: new Date(),
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





