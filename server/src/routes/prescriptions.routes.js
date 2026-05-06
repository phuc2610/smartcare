const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const {
  scanPrescription,
  createPrescription,
  getPrescriptions,
  getPrescription,
  updatePrescription,
  deletePrescription,
} = require('../controllers/prescription.controller');

router.use(authenticate);

router.post('/scan', scanPrescription);
router.post('/', createPrescription);
router.get('/', getPrescriptions);
router.get('/:id', getPrescription);
router.put('/:id', updatePrescription);
router.delete('/:id', deletePrescription);

module.exports = router;
