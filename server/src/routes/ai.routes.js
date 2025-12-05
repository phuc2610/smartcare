const express = require('express');
const router = express.Router();
const {
  chat,
  parseMedication,
  estimateCalories,
  identifyDisease,
  chatSchema,
  parseMedicationSchema,
  estimateCaloriesSchema,
  identifyDiseaseSchema,
} = require('../controllers/ai.controller');
const { authenticate } = require('../middleware/auth');
const validate = require('../middleware/validate');

router.post('/chat', authenticate, validate(chatSchema), chat);
router.post('/medication/parse', authenticate, validate(parseMedicationSchema), parseMedication);
router.post('/meal/estimate', authenticate, validate(estimateCaloriesSchema), estimateCalories);
router.post('/disease/identify', authenticate, validate(identifyDiseaseSchema), identifyDisease);

module.exports = router;





