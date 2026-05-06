const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const {
  getDrugs, searchDrugs, createDrug, updateDrug, deleteDrug, seedDrugs,
} = require('../controllers/drugCatalog.controller');

// Tất cả routes yêu cầu xác thực
router.use(authenticate);

router.get('/', getDrugs);              // Danh sách + tìm kiếm toàn văn
router.get('/search', searchDrugs);     // Autocomplete nhanh
router.post('/', createDrug);           // Thêm thuốc mới
router.patch('/:id', updateDrug);       // Cập nhật
router.delete('/:id', deleteDrug);      // Soft delete
router.post('/seed', seedDrugs);        // Seed dữ liệu mẫu

module.exports = router;
