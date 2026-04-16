const express = require('express');
const router = express.Router();
const {
  chat,
  parseMedication,
  estimateCalories,
  identifyDisease,
  getHealthRecommendations,
  analyzeReport,
  getChatHistory,
  suggestMedications,
  checkDrugInteractions,
  chatSchema,
  parseMedicationSchema,
  estimateCaloriesSchema,
  identifyDiseaseSchema,
  getHealthRecommendationsSchema,
  analyzeReportSchema,
} = require('../controllers/ai.controller');
const { authenticate } = require('../middleware/auth');
const validate = require('../middleware/validate');

router.post('/chat', authenticate, validate(chatSchema), chat);
router.get('/chat/history', authenticate, getChatHistory);
router.post('/medication/parse', authenticate, validate(parseMedicationSchema), parseMedication);
router.post('/meal/estimate', authenticate, validate(estimateCaloriesSchema), estimateCalories);
router.post('/disease/identify', authenticate, validate(identifyDiseaseSchema), identifyDisease);
router.post('/health/recommendations', authenticate, validate(getHealthRecommendationsSchema), getHealthRecommendations);
router.post('/report/analyze', authenticate, validate(analyzeReportSchema), analyzeReport);

// A – Gợi ý thuốc cho bác sĩ
router.post('/medication/suggest', authenticate, suggestMedications);
// B – Kiểm tra tương tác thuốc
router.post('/medication/interactions', authenticate, checkDrugInteractions);

module.exports = router;






