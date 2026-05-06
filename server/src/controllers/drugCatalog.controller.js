const DrugCatalog = require('../models/DrugCatalog');

const CATEGORY_MAP = {
  ANALGESIC:        'Giảm đau / Hạ sốt',
  ANTIBIOTIC:       'Kháng sinh',
  ANTIHYPERTENSIVE: 'Hạ huyết áp',
  ANTIDIABETIC:     'Tiểu đường',
  VITAMIN:          'Vitamin / Bổ sung',
  ANTIHISTAMINE:    'Dị ứng / Kháng Histamine',
  GASTRIC:          'Dạ dày / Tiêu hoá',
  CARDIOVASCULAR:   'Tim mạch',
  RESPIRATORY:      'Hô hấp / Hen suyễn',
  MUSCULOSKELETAL:  'Cơ xương khớp / Gout',
  NEUROLOGICAL:     'Thần kinh / Tâm thần / Giấc ngủ',
  UROLOGY:          'Thận / Tiết niệu',
  OTHER:            'Khác',
};

/**
 * GET /api/drug-catalog
 * Lấy danh sách thuốc (có hỗ trợ tìm kiếm và lọc theo category)
 */
const getDrugs = async (req, res) => {
  try {
    const { q, category, page = 1, limit = 20 } = req.query;
    const query = { isActive: true };

    if (q && q.trim()) {
      query.$or = [
        { name: { $regex: q.trim(), $options: 'i' } },
        { activeIngredient: { $regex: q.trim(), $options: 'i' } },
      ];
    }
    if (category) query.category = category;

    const skip = (Number(page) - 1) * Number(limit);
    const [drugs, total] = await Promise.all([
      DrugCatalog.find(query).sort({ name: 1 }).skip(skip).limit(Number(limit)).lean(),
      DrugCatalog.countDocuments(query),
    ]);

    res.json({ drugs, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * GET /api/drug-catalog/search?q=para
 * Autocomplete (tối đa 8 kết quả) – dùng cho Prescribe.tsx
 */
const searchDrugs = async (req, res) => {
  try {
    const { q = '' } = req.query;
    if (!q.trim()) return res.json({ drugs: [] });

    const drugs = await DrugCatalog.find({
      isActive: true,
      $or: [
        { name: { $regex: q.trim(), $options: 'i' } },
        { activeIngredient: { $regex: q.trim(), $options: 'i' } },
      ],
    }).sort({ name: 1 }).limit(8).lean();

    res.json({ drugs });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * POST /api/drug-catalog
 * Thêm thuốc mới vào danh mục
 */
const createDrug = async (req, res) => {
  try {
    const { name, activeIngredient, category, defaultDosage, defaultSessions,
            defaultMealTiming, unit, price, stock, contraindications, sideEffects, notes } = req.body;

    if (!name?.trim()) return res.status(400).json({ error: 'Tên thuốc là bắt buộc' });

    const existing = await DrugCatalog.findOne({ name: { $regex: `^${name.trim()}$`, $options: 'i' } });
    if (existing) return res.status(409).json({ error: `Thuốc "${name}" đã có trong danh mục` });

    const drug = await DrugCatalog.create({
      name: name.trim(), activeIngredient, category, defaultDosage, defaultSessions,
      defaultMealTiming, unit, price, stock, contraindications, sideEffects, notes,
      createdBy: req.user._id,
    });

    res.status(201).json({ drug });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * PATCH /api/drug-catalog/:id
 * Cập nhật thông tin thuốc
 */
const updateDrug = async (req, res) => {
  try {
    const drug = await DrugCatalog.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!drug) return res.status(404).json({ error: 'Không tìm thấy thuốc' });
    res.json({ drug });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * DELETE /api/drug-catalog/:id
 * Soft delete (đặt isActive = false)
 */
const deleteDrug = async (req, res) => {
  try {
    const drug = await DrugCatalog.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
    if (!drug) return res.status(404).json({ error: 'Không tìm thấy thuốc' });
    res.json({ message: 'Đã xoá thuốc khỏi danh mục' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * POST /api/drug-catalog/seed
 * Seed danh mục đầy đủ — UPSERT: thêm mới nếu chưa có, bỏ qua nếu đã tồn tại
 * Có thể chạy nhiều lần để cập nhật khi có thuốc mới
 */
const seedDrugs = async (req, res) => {
  try {
    const { FULL_CATALOG } = require('../seeds/drugCatalog.seed');

    // UPSERT: chỉ thêm thuốc chưa có trong danh mục
    let addedCount = 0;
    let skippedCount = 0;

    for (const drug of FULL_CATALOG) {
      const existing = await DrugCatalog.findOne({ name: { $regex: `^${drug.name}$`, $options: 'i' } });
      if (!existing) {
        await DrugCatalog.create({ ...drug, createdBy: req.user._id });
        addedCount++;
      } else {
        skippedCount++;
      }
    }

    const total = await DrugCatalog.countDocuments({ isActive: true });
    res.json({
      message: `Seed hoàn thành: đã thêm ${addedCount} thuốc mới, bỏ qua ${skippedCount} thuốc đã có.`,
      added: addedCount,
      skipped: skippedCount,
      total,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { getDrugs, searchDrugs, createDrug, updateDrug, deleteDrug, seedDrugs, CATEGORY_MAP };

