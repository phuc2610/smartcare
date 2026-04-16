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
    const FULL_CATALOG = [
      // ─── GIẢM ĐAU / HẠ SỐT ──────────────────────────────────────────────
      { name: 'Paracetamol 500mg',         activeIngredient: 'Paracetamol',              category: 'ANALGESIC',        defaultDosage: '1-2 viên/lần',  defaultSessions: ['MORNING','EVENING'],        defaultMealTiming: 'AFTER_MEAL',  unit: 'viên', price: 500,   stock: 500, notes: 'Không dùng quá 4g/ngày', sideEffects: 'Hiếm gặp khi dùng đúng liều' },
      { name: 'Ibuprofen 400mg',            activeIngredient: 'Ibuprofen',                category: 'ANALGESIC',        defaultDosage: '1 viên/lần',    defaultSessions: ['MORNING','NOON','EVENING'], defaultMealTiming: 'AFTER_MEAL',  unit: 'viên', price: 1500,  stock: 300, contraindications: 'Loét dạ dày, suy thận, phụ nữ có thai 3 tháng cuối', sideEffects: 'Kích ứng dạ dày' },
      { name: 'Diclofenac 50mg',            activeIngredient: 'Diclofenac',               category: 'ANALGESIC',        defaultDosage: '1 viên/lần',    defaultSessions: ['MORNING','EVENING'],        defaultMealTiming: 'AFTER_MEAL',  unit: 'viên', price: 2000,  stock: 200, contraindications: 'Bệnh tim mạch nặng, loét dạ dày' },
      { name: 'Indomethacin 25mg',          activeIngredient: 'Indomethacin',             category: 'ANALGESIC',        defaultDosage: '1 viên/lần',    defaultSessions: ['MORNING','NOON','EVENING'], defaultMealTiming: 'AFTER_MEAL',  unit: 'viên', price: 1800,  stock: 150, contraindications: 'Suy thận, loét dạ dày, hen suyễn', notes: 'NSAID mạnh, dùng ngắn ngày' },
      { name: 'Tramadol 50mg',              activeIngredient: 'Tramadol',                 category: 'ANALGESIC',        defaultDosage: '1 viên/lần',    defaultSessions: ['MORNING','EVENING'],        defaultMealTiming: 'AFTER_MEAL',  unit: 'viên', price: 5000,  stock: 100, contraindications: 'Đang dùng MAOI, động kinh không kiểm soát', notes: 'Opioid nhẹ, nguy cơ phụ thuộc' },
      { name: 'Methocarbamol 750mg',        activeIngredient: 'Methocarbamol',            category: 'ANALGESIC',        defaultDosage: '1 viên/lần',    defaultSessions: ['MORNING','NOON','EVENING'], defaultMealTiming: 'AFTER_MEAL',  unit: 'viên', price: 3500,  stock: 120, sideEffects: 'Buồn ngủ, chóng mặt, không lái xe' },

      // ─── KHÁNG SINH ───────────────────────────────────────────────────────
      { name: 'Amoxicillin 500mg',          activeIngredient: 'Amoxicillin',              category: 'ANTIBIOTIC',       defaultDosage: '1 viên/lần',    defaultSessions: ['MORNING','NOON','EVENING'], defaultMealTiming: 'AFTER_MEAL',  unit: 'viên', price: 3000,  stock: 200, contraindications: 'Dị ứng Penicillin', notes: 'Uống đủ 7-10 ngày' },
      { name: 'Amoxicillin-Clavulanate 875/125mg', activeIngredient: 'Amoxicillin + Clavulanic acid', category: 'ANTIBIOTIC', defaultDosage: '1 viên/lần', defaultSessions: ['MORNING','EVENING'], defaultMealTiming: 'AFTER_MEAL', unit: 'viên', price: 12000, stock: 120, contraindications: 'Dị ứng Penicillin', notes: 'Uống đủ 10-14 ngày' },
      { name: 'Clarithromycin 500mg',       activeIngredient: 'Clarithromycin',           category: 'ANTIBIOTIC',       defaultDosage: '1 viên/lần',    defaultSessions: ['MORNING','EVENING'],        defaultMealTiming: 'AFTER_MEAL',  unit: 'viên', price: 15000, stock: 100, notes: 'Uống đủ 14 ngày trong phác đồ diệt H. pylori' },
      { name: 'Azithromycin 500mg',         activeIngredient: 'Azithromycin',             category: 'ANTIBIOTIC',       defaultDosage: '1 viên/lần',    defaultSessions: ['MORNING'],                  defaultMealTiming: 'BEFORE_MEAL', unit: 'viên', price: 18000, stock: 90,  notes: 'Uống 3-5 ngày, uống lúc đói' },
      { name: 'Metronidazole 500mg',        activeIngredient: 'Metronidazole',            category: 'ANTIBIOTIC',       defaultDosage: '1 viên/lần',    defaultSessions: ['MORNING','EVENING'],        defaultMealTiming: 'AFTER_MEAL',  unit: 'viên', price: 2500,  stock: 180, contraindications: 'Tháng đầu thai kỳ', notes: 'Kiêng rượu trong và 48h sau điều trị' },
      { name: 'Ciprofloxacin 500mg',        activeIngredient: 'Ciprofloxacin',            category: 'ANTIBIOTIC',       defaultDosage: '1 viên/lần',    defaultSessions: ['MORNING','EVENING'],        defaultMealTiming: 'AFTER_MEAL',  unit: 'viên', price: 8000,  stock: 100, contraindications: 'Trẻ em dưới 18 tuổi, phụ nữ có thai', notes: 'Uống nhiều nước, tránh ánh nắng' },
      { name: 'Nitrofurantoin 100mg',       activeIngredient: 'Nitrofurantoin',           category: 'ANTIBIOTIC',       defaultDosage: '1 viên/lần',    defaultSessions: ['MORNING','NOON','EVENING'], defaultMealTiming: 'AFTER_MEAL',  unit: 'viên', price: 6000,  stock: 120, contraindications: 'Suy thận nặng (GFR<30)', notes: 'Điều trị UTI không biến chứng, 5-7 ngày' },

      // ─── HẠ HUYẾT ÁP ─────────────────────────────────────────────────────
      { name: 'Amlodipine 5mg',             activeIngredient: 'Amlodipine',               category: 'ANTIHYPERTENSIVE', defaultDosage: '1 viên/lần',    defaultSessions: ['MORNING'],                  defaultMealTiming: 'AFTER_MEAL',  unit: 'viên', price: 5000,  stock: 150, notes: 'Uống cùng giờ mỗi ngày' },
      { name: 'Amlodipine 10mg',            activeIngredient: 'Amlodipine',               category: 'ANTIHYPERTENSIVE', defaultDosage: '1 viên/lần',    defaultSessions: ['MORNING'],                  defaultMealTiming: 'AFTER_MEAL',  unit: 'viên', price: 8000,  stock: 100 },
      { name: 'Losartan 50mg',              activeIngredient: 'Losartan',                 category: 'ANTIHYPERTENSIVE', defaultDosage: '1 viên/lần',    defaultSessions: ['MORNING'],                  defaultMealTiming: 'AFTER_MEAL',  unit: 'viên', price: 7000,  stock: 120, notes: 'Bảo vệ thận, giảm protein niệu' },
      { name: 'Perindopril 5mg',            activeIngredient: 'Perindopril',              category: 'ANTIHYPERTENSIVE', defaultDosage: '1 viên/lần',    defaultSessions: ['MORNING'],                  defaultMealTiming: 'BEFORE_MEAL', unit: 'viên', price: 9000,  stock: 100, sideEffects: 'Ho khan (5-10% bệnh nhân)', notes: 'ACEi, uống trước ăn sáng' },
      { name: 'Bisoprolol 5mg',             activeIngredient: 'Bisoprolol',               category: 'ANTIHYPERTENSIVE', defaultDosage: '1 viên/lần',    defaultSessions: ['MORNING'],                  defaultMealTiming: 'AFTER_MEAL',  unit: 'viên', price: 6000,  stock: 130, contraindications: 'Hen suyễn nặng, nhịp chậm <60', notes: 'Không ngừng đột ngột' },
      { name: 'Hydrochlorothiazide 25mg',   activeIngredient: 'Hydrochlorothiazide',      category: 'ANTIHYPERTENSIVE', defaultDosage: '1 viên/lần',    defaultSessions: ['MORNING'],                  defaultMealTiming: 'AFTER_MEAL',  unit: 'viên', price: 2000,  stock: 200, sideEffects: 'Hạ Kali máu', notes: 'Theo dõi điện giải định kỳ' },
      { name: 'Furosemide 40mg',            activeIngredient: 'Furosemide',               category: 'ANTIHYPERTENSIVE', defaultDosage: '1 viên/lần',    defaultSessions: ['MORNING'],                  defaultMealTiming: 'AFTER_MEAL',  unit: 'viên', price: 1500,  stock: 200, notes: 'Uống buổi sáng để tránh tiểu đêm' },

      // ─── TIỂU ĐƯỜNG ───────────────────────────────────────────────────────
      { name: 'Metformin 500mg',            activeIngredient: 'Metformin',                category: 'ANTIDIABETIC',     defaultDosage: '1 viên/lần',    defaultSessions: ['MORNING','EVENING'],        defaultMealTiming: 'AFTER_MEAL',  unit: 'viên', price: 2000,  stock: 200, contraindications: 'Suy thận nặng (GFR<30), suy gan nặng', notes: 'Uống cùng bữa ăn' },
      { name: 'Metformin 1000mg',           activeIngredient: 'Metformin',                category: 'ANTIDIABETIC',     defaultDosage: '1 viên/lần',    defaultSessions: ['MORNING','EVENING'],        defaultMealTiming: 'AFTER_MEAL',  unit: 'viên', price: 3500,  stock: 150, notes: 'Uống cùng bữa ăn' },
      { name: 'Glipizide 5mg',              activeIngredient: 'Glipizide',                category: 'ANTIDIABETIC',     defaultDosage: '1 viên/lần',    defaultSessions: ['MORNING'],                  defaultMealTiming: 'BEFORE_MEAL', unit: 'viên', price: 4000,  stock: 150, notes: 'Uống 30 phút trước bữa sáng', sideEffects: 'Hạ đường huyết nếu bỏ bữa' },
      { name: 'Sitagliptin 100mg',          activeIngredient: 'Sitagliptin',              category: 'ANTIDIABETIC',     defaultDosage: '1 viên/lần',    defaultSessions: ['MORNING'],                  defaultMealTiming: 'AFTER_MEAL',  unit: 'viên', price: 35000, stock: 80,  notes: 'Ức chế DPP-4, ít hạ đường huyết' },
      { name: 'Empagliflozin 10mg',         activeIngredient: 'Empagliflozin',            category: 'ANTIDIABETIC',     defaultDosage: '1 viên/lần',    defaultSessions: ['MORNING'],                  defaultMealTiming: 'AFTER_MEAL',  unit: 'viên', price: 45000, stock: 60,  sideEffects: 'Nhiễm trùng sinh dục, tiểu nhiều', notes: 'SGLT2i — bảo vệ tim mạch và thận' },
      { name: 'Insulin Glargine (Lantus)',  activeIngredient: 'Insulin glargine',         category: 'ANTIDIABETIC',     defaultDosage: '10-20 đv/lần',  defaultSessions: ['EVENING'],                  defaultMealTiming: 'AFTER_MEAL',  unit: 'đv',   price: 8000,  stock: 50,  notes: 'Tiêm dưới da vào cùng giờ mỗi tối', sideEffects: 'Hạ đường huyết' },

      // ─── TIM MẠCH ─────────────────────────────────────────────────────────
      { name: 'Aspirin 81mg',               activeIngredient: 'Acetylsalicylic acid',     category: 'CARDIOVASCULAR',   defaultDosage: '1 viên/lần',    defaultSessions: ['MORNING'],                  defaultMealTiming: 'AFTER_MEAL',  unit: 'viên', price: 800,   stock: 300, contraindications: 'Loét dạ dày hoạt động, dị ứng aspirin', notes: 'Dùng kèm thuốc bảo vệ dạ dày nếu cần' },
      { name: 'Atorvastatin 20mg',          activeIngredient: 'Atorvastatin',             category: 'CARDIOVASCULAR',   defaultDosage: '1 viên/lần',    defaultSessions: ['EVENING'],                  defaultMealTiming: 'AFTER_MEAL',  unit: 'viên', price: 8000,  stock: 150, sideEffects: 'Đau cơ, tăng men gan hiếm gặp', notes: 'Uống buổi tối, kiểm tra men gan 3 tháng đầu' },
      { name: 'Atorvastatin 40mg',          activeIngredient: 'Atorvastatin',             category: 'CARDIOVASCULAR',   defaultDosage: '1 viên/lần',    defaultSessions: ['EVENING'],                  defaultMealTiming: 'AFTER_MEAL',  unit: 'viên', price: 14000, stock: 100 },
      { name: 'Clopidogrel 75mg',           activeIngredient: 'Clopidogrel',              category: 'CARDIOVASCULAR',   defaultDosage: '1 viên/lần',    defaultSessions: ['MORNING'],                  defaultMealTiming: 'AFTER_MEAL',  unit: 'viên', price: 12000, stock: 100, notes: 'Không tự ý ngừng thuốc sau đặt stent' },
      { name: 'Digoxin 0.25mg',             activeIngredient: 'Digoxin',                  category: 'CARDIOVASCULAR',   defaultDosage: '1 viên/lần',    defaultSessions: ['MORNING'],                  defaultMealTiming: 'AFTER_MEAL',  unit: 'viên', price: 3000,  stock: 80,  notes: 'Theo dõi nồng độ thuốc và điện tim', sideEffects: 'Ngộ độc digitalis: buồn nôn, rối loạn nhịp' },
      { name: 'Warfarin 2.5mg',             activeIngredient: 'Warfarin',                 category: 'CARDIOVASCULAR',   defaultDosage: '1-2 viên/lần',  defaultSessions: ['EVENING'],                  defaultMealTiming: 'AFTER_MEAL',  unit: 'viên', price: 5000,  stock: 80,  notes: 'Theo dõi INR định kỳ, tránh thực phẩm nhiều Vitamin K', sideEffects: 'Chảy máu' },

      // ─── DẠ DÀY / TIÊU HOÁ ──────────────────────────────────────────────
      { name: 'Omeprazole 20mg',            activeIngredient: 'Omeprazole',               category: 'GASTRIC',          defaultDosage: '1 viên/lần',    defaultSessions: ['MORNING'],                  defaultMealTiming: 'BEFORE_MEAL', unit: 'viên', price: 4000,  stock: 250, notes: 'Uống 30 phút trước bữa sáng' },
      { name: 'Pantoprazole 40mg',          activeIngredient: 'Pantoprazole',             category: 'GASTRIC',          defaultDosage: '1 viên/lần',    defaultSessions: ['MORNING'],                  defaultMealTiming: 'BEFORE_MEAL', unit: 'viên', price: 6000,  stock: 200, notes: 'PPI ít tương tác hơn Omeprazole' },
      { name: 'Esomeprazole 40mg',          activeIngredient: 'Esomeprazole',             category: 'GASTRIC',          defaultDosage: '1 viên/lần',    defaultSessions: ['MORNING'],                  defaultMealTiming: 'BEFORE_MEAL', unit: 'viên', price: 12000, stock: 150, notes: 'PPI thế hệ mới, hiệu quả cao' },
      { name: 'Domperidone 10mg',           activeIngredient: 'Domperidone',              category: 'GASTRIC',          defaultDosage: '1 viên/lần',    defaultSessions: ['MORNING','NOON','EVENING'], defaultMealTiming: 'BEFORE_MEAL', unit: 'viên', price: 2000,  stock: 200, notes: 'Uống 30 phút trước bữa ăn, chống nôn' },
      { name: 'Sucralfate 1g',              activeIngredient: 'Sucralfate',               category: 'GASTRIC',          defaultDosage: '1 gói/lần',     defaultSessions: ['MORNING','NOON','EVENING'], defaultMealTiming: 'BEFORE_MEAL', unit: 'gói', price: 3500,  stock: 150, notes: 'Uống 1 giờ trước bữa ăn, bảo vệ ổ loét' },
      { name: 'Macrogol (PEG) 3350',        activeIngredient: 'Macrogol 3350',            category: 'GASTRIC',          defaultDosage: '1 gói/lần',     defaultSessions: ['MORNING'],                  defaultMealTiming: 'AFTER_MEAL',  unit: 'gói', price: 10000, stock: 100, notes: 'Pha với 250ml nước, táo bón' },
      { name: 'Bisacodyl 5mg',              activeIngredient: 'Bisacodyl',                category: 'GASTRIC',          defaultDosage: '1-2 viên/lần',  defaultSessions: ['EVENING'],                  defaultMealTiming: 'AFTER_MEAL',  unit: 'viên', price: 1500,  stock: 200, notes: 'Không nhai/bẻ viên, uống tối tác dụng sáng hôm sau' },
      { name: 'Loperamide 2mg',             activeIngredient: 'Loperamide',               category: 'GASTRIC',          defaultDosage: '2 viên đầu, 1 viên/lần sau', defaultSessions: ['MORNING','NOON','EVENING'], defaultMealTiming: 'AFTER_MEAL', unit: 'viên', price: 2000, stock: 150, notes: 'Không dùng quá 16mg/ngày, cầm tiêu chảy' },
      { name: 'Smecta 3g',                  activeIngredient: 'Diosmectite',              category: 'GASTRIC',          defaultDosage: '1 gói/lần',     defaultSessions: ['MORNING','NOON','EVENING'], defaultMealTiming: 'BEFORE_MEAL', unit: 'gói', price: 5000,  stock: 120, notes: 'Pha với 100ml nước, uống trước ăn' },
      { name: 'Oresol (ORS)',               activeIngredient: 'Natri clorid + Kali clorid + Glucose', category: 'GASTRIC', defaultDosage: '1 gói/200ml', defaultSessions: ['MORNING','NOON','EVENING'], defaultMealTiming: 'AFTER_MEAL', unit: 'gói', price: 3000, stock: 300, notes: 'Bù nước điện giải khi tiêu chảy, nôn, sốt cao' },

      // ─── VITAMIN / BỔ SUNG ────────────────────────────────────────────────
      { name: 'Vitamin C 500mg',            activeIngredient: 'Ascorbic acid',            category: 'VITAMIN',          defaultDosage: '1 viên/lần',    defaultSessions: ['MORNING'],                  defaultMealTiming: 'AFTER_MEAL',  unit: 'viên', price: 800,   stock: 400 },
      { name: 'Vitamin B1 (Thiamine) 100mg',activeIngredient: 'Thiamine',                 category: 'VITAMIN',          defaultDosage: '1 viên/lần',    defaultSessions: ['MORNING'],                  defaultMealTiming: 'AFTER_MEAL',  unit: 'viên', price: 1500,  stock: 300, notes: 'Phòng biến chứng thần kinh ở bệnh nhân ĐTĐ và nghiện rượu' },
      { name: 'Vitamin B-complex',          activeIngredient: 'B1 + B2 + B6 + B12',      category: 'VITAMIN',          defaultDosage: '1 viên/lần',    defaultSessions: ['MORNING'],                  defaultMealTiming: 'AFTER_MEAL',  unit: 'viên', price: 2000,  stock: 300 },
      { name: 'Vitamin D3 1000 IU',         activeIngredient: 'Cholecalciferol',          category: 'VITAMIN',          defaultDosage: '1 viên/lần',    defaultSessions: ['MORNING'],                  defaultMealTiming: 'AFTER_MEAL',  unit: 'viên', price: 5000,  stock: 200, notes: 'Uống cùng bữa ăn có chất béo để hấp thu tốt hơn' },
      { name: 'Calcium carbonate 500mg',    activeIngredient: 'Calcium carbonate',        category: 'VITAMIN',          defaultDosage: '1 viên/lần',    defaultSessions: ['MORNING','EVENING'],        defaultMealTiming: 'AFTER_MEAL',  unit: 'viên', price: 3000,  stock: 250, notes: 'Nhai hoặc nuốt với nước' },
      { name: 'Folic acid 5mg',             activeIngredient: 'Folic acid',               category: 'VITAMIN',          defaultDosage: '1 viên/lần',    defaultSessions: ['MORNING'],                  defaultMealTiming: 'AFTER_MEAL',  unit: 'viên', price: 1500,  stock: 200 },
      { name: 'Zinc 10mg',                  activeIngredient: 'Zinc sulfate',             category: 'VITAMIN',          defaultDosage: '1 viên/lần',    defaultSessions: ['MORNING'],                  defaultMealTiming: 'AFTER_MEAL',  unit: 'viên', price: 3000,  stock: 200, notes: 'Hỗ trợ miễn dịch và chữa lành vết thương' },

      // ─── DỊ ỨNG / KHÁNG HISTAMINE ────────────────────────────────────────
      { name: 'Loratadine 10mg',            activeIngredient: 'Loratadine',               category: 'ANTIHISTAMINE',    defaultDosage: '1 viên/lần',    defaultSessions: ['MORNING'],                  defaultMealTiming: 'AFTER_MEAL',  unit: 'viên', price: 2500,  stock: 180, notes: 'Không gây buồn ngủ' },
      { name: 'Cetirizine 10mg',            activeIngredient: 'Cetirizine',               category: 'ANTIHISTAMINE',    defaultDosage: '1 viên/lần',    defaultSessions: ['EVENING'],                  defaultMealTiming: 'AFTER_MEAL',  unit: 'viên', price: 3000,  stock: 200, sideEffects: 'Buồn ngủ nhẹ' },
      { name: 'Fexofenadine 180mg',         activeIngredient: 'Fexofenadine',             category: 'ANTIHISTAMINE',    defaultDosage: '1 viên/lần',    defaultSessions: ['MORNING'],                  defaultMealTiming: 'AFTER_MEAL',  unit: 'viên', price: 8000,  stock: 120, notes: 'Kháng H1 thế hệ 3, không gây buồn ngủ' },
      { name: 'Hydroxyzine 25mg',           activeIngredient: 'Hydroxyzine',              category: 'ANTIHISTAMINE',    defaultDosage: '1 viên/lần',    defaultSessions: ['EVENING'],                  defaultMealTiming: 'AFTER_MEAL',  unit: 'viên', price: 5000,  stock: 100, sideEffects: 'An thần nhẹ', notes: 'Hỗ trợ giấc ngủ, chống lo âu nhẹ, không gây nghiện' },
      { name: 'Prednisolone 5mg',           activeIngredient: 'Prednisolone',             category: 'ANTIHISTAMINE',    defaultDosage: '1-2 viên/lần', defaultSessions: ['MORNING'],                  defaultMealTiming: 'AFTER_MEAL',  unit: 'viên', price: 2000,  stock: 200, contraindications: 'Nhiễm trùng nặng chưa kiểm soát', notes: 'Không ngừng đột ngột', sideEffects: 'Tăng đường huyết, giữ nước' },
      { name: 'Methylprednisolone 4mg',     activeIngredient: 'Methylprednisolone',       category: 'ANTIHISTAMINE',    defaultDosage: '1-2 viên/lần', defaultSessions: ['MORNING'],                  defaultMealTiming: 'AFTER_MEAL',  unit: 'viên', price: 5000,  stock: 150, notes: 'Dùng ngắn ngày cho dị ứng nặng' },

      // ─── HÔ HẤP / HEN SUYỄN ─────────────────────────────────────────────
      { name: 'Salbutamol 4mg',             activeIngredient: 'Salbutamol',               category: 'RESPIRATORY',      defaultDosage: '1 viên/lần',    defaultSessions: ['MORNING','EVENING'],        defaultMealTiming: 'AFTER_MEAL',  unit: 'viên', price: 2000,  stock: 200, sideEffects: 'Run tay, tim đập nhanh', notes: 'Beta2-agonist, giãn phế quản' },
      { name: 'Montelukast 10mg',           activeIngredient: 'Montelukast',              category: 'RESPIRATORY',      defaultDosage: '1 viên/lần',    defaultSessions: ['EVENING'],                  defaultMealTiming: 'AFTER_MEAL',  unit: 'viên', price: 15000, stock: 100, notes: 'Uống tối trước ngủ, kiểm soát hen lâu dài' },
      { name: 'Bromhexine 8mg',             activeIngredient: 'Bromhexine',               category: 'RESPIRATORY',      defaultDosage: '1 viên/lần',    defaultSessions: ['MORNING','NOON','EVENING'], defaultMealTiming: 'AFTER_MEAL',  unit: 'viên', price: 2000,  stock: 200, notes: 'Tiêu nhầy, làm loãng đờm' },
      { name: 'Acetylcysteine 200mg',       activeIngredient: 'N-Acetylcysteine',         category: 'RESPIRATORY',      defaultDosage: '1 gói/lần',     defaultSessions: ['MORNING','NOON','EVENING'], defaultMealTiming: 'AFTER_MEAL',  unit: 'gói', price: 8000,  stock: 120, notes: 'Pha với nước ấm, tiêu nhầy mạnh' },
      { name: 'Codeine 10mg',               activeIngredient: 'Codeine phosphate',        category: 'RESPIRATORY',      defaultDosage: '1 viên/lần',    defaultSessions: ['MORNING','EVENING'],        defaultMealTiming: 'AFTER_MEAL',  unit: 'viên', price: 4000,  stock: 80,  contraindications: 'Trẻ em <12 tuổi, COPD nặng', notes: 'Ho khan mạn, nguy cơ phụ thuộc' },
      { name: 'Xylometazoline 0.1% xịt mũi', activeIngredient: 'Xylometazoline',         category: 'RESPIRATORY',      defaultDosage: '2-3 nhát/mũi',  defaultSessions: ['MORNING','EVENING'],        defaultMealTiming: 'BEFORE_MEAL', unit: 'lọ',  price: 25000, stock: 80,  notes: 'Không dùng quá 5 ngày liên tiếp, thông mũi' },
      { name: 'Fluticasone xịt mũi 50mcg', activeIngredient: 'Fluticasone propionate',   category: 'RESPIRATORY',      defaultDosage: '2 nhát/mũi',    defaultSessions: ['MORNING'],                  defaultMealTiming: 'BEFORE_MEAL', unit: 'lọ',  price: 65000, stock: 60,  notes: 'Xịt đúng kỹ thuật, hướng về phía má' },

      // ─── CƠ XƯƠNG KHỚP / GOUT ────────────────────────────────────────────
      { name: 'Allopurinol 300mg',          activeIngredient: 'Allopurinol',              category: 'MUSCULOSKELETAL',  defaultDosage: '1 viên/lần',    defaultSessions: ['MORNING'],                  defaultMealTiming: 'AFTER_MEAL',  unit: 'viên', price: 3000,  stock: 150, contraindications: 'Cơn gout cấp đang xảy ra', notes: 'Bắt đầu 2-4 tuần sau cơn cấp' },
      { name: 'Colchicine 0.6mg',           activeIngredient: 'Colchicine',               category: 'MUSCULOSKELETAL',  defaultDosage: '1 viên/lần',    defaultSessions: ['MORNING','EVENING'],        defaultMealTiming: 'AFTER_MEAL',  unit: 'viên', price: 6000,  stock: 100, contraindications: 'Suy thận nặng', notes: 'Chống viêm đặc hiệu gout' },
      { name: 'Potassium Citrate 1080mg',   activeIngredient: 'Potassium citrate',        category: 'MUSCULOSKELETAL',  defaultDosage: '1 viên/lần',    defaultSessions: ['MORNING','NOON','EVENING'], defaultMealTiming: 'AFTER_MEAL',  unit: 'viên', price: 8000,  stock: 80,  notes: 'Uống nhiều nước, kiềm hoá nước tiểu' },
      { name: 'Hydroxychloroquine 200mg',   activeIngredient: 'Hydroxychloroquine',       category: 'MUSCULOSKELETAL',  defaultDosage: '1 viên/lần',    defaultSessions: ['MORNING'],                  defaultMealTiming: 'AFTER_MEAL',  unit: 'viên', price: 20000, stock: 60,  notes: 'DMARD cho viêm khớp dạng thấp, kiểm tra mắt 6 tháng/lần' },
      { name: 'Diclofenac gel 1% (50g)',    activeIngredient: 'Diclofenac sodium',        category: 'MUSCULOSKELETAL',  defaultDosage: '3-4cm gel/lần', defaultSessions: ['MORNING','NOON','EVENING'], defaultMealTiming: 'AFTER_MEAL',  unit: 'tuýp', price: 45000, stock: 80,  notes: 'Bôi nhẹ nhàng ngoài da, không dùng trên vết thương hở' },

      // ─── THẦN KINH / TÂM THẦN / GIẤC NGỦ ───────────────────────────────
      { name: 'Melatonin 3mg',              activeIngredient: 'Melatonin',                category: 'NEUROLOGICAL',     defaultDosage: '1 viên/lần',    defaultSessions: ['EVENING'],                  defaultMealTiming: 'AFTER_MEAL',  unit: 'viên', price: 8000,  stock: 100, notes: 'Uống 30-60 phút trước ngủ, không gây nghiện' },
      { name: 'Amitriptyline 25mg',         activeIngredient: 'Amitriptyline',            category: 'NEUROLOGICAL',     defaultDosage: '1 viên/lần',    defaultSessions: ['EVENING'],                  defaultMealTiming: 'AFTER_MEAL',  unit: 'viên', price: 4000,  stock: 80,  sideEffects: 'Buồn ngủ, khô miệng, táo bón', notes: 'Phòng ngừa đau đầu mạn tính, uống tối' },
      { name: 'Sertraline 50mg',            activeIngredient: 'Sertraline',               category: 'NEUROLOGICAL',     defaultDosage: '1 viên/lần',    defaultSessions: ['MORNING'],                  defaultMealTiming: 'AFTER_MEAL',  unit: 'viên', price: 12000, stock: 80,  notes: 'SSRI, tác dụng sau 2-4 tuần, không bỏ thuốc đột ngột', sideEffects: 'Buồn nôn tuần đầu' },
      { name: 'Escitalopram 10mg',          activeIngredient: 'Escitalopram',             category: 'NEUROLOGICAL',     defaultDosage: '1 viên/lần',    defaultSessions: ['MORNING'],                  defaultMealTiming: 'AFTER_MEAL',  unit: 'viên', price: 18000, stock: 70,  notes: 'SSRI chọn lọc nhất, ít tương tác thuốc' },
      { name: 'Sumatriptan 50mg',           activeIngredient: 'Sumatriptan',              category: 'NEUROLOGICAL',     defaultDosage: '1 viên/lần',    defaultSessions: ['MORNING'],                  defaultMealTiming: 'AFTER_MEAL',  unit: 'viên', price: 25000, stock: 60,  contraindications: 'Tim mạch không ổn định, cao huyết áp không kiểm soát', notes: 'Chỉ dùng khi cơn migraine bắt đầu' },
      { name: 'Gabapentin 300mg',           activeIngredient: 'Gabapentin',               category: 'NEUROLOGICAL',     defaultDosage: '1 viên/lần',    defaultSessions: ['MORNING','NOON','EVENING'], defaultMealTiming: 'AFTER_MEAL',  unit: 'viên', price: 8000,  stock: 80,  sideEffects: 'Buồn ngủ, chóng mặt', notes: 'Đau thần kinh, giảm liều dần khi ngừng' },

      // ─── THẬN / TIẾT NIỆU ────────────────────────────────────────────────
      { name: 'Tamsulosin 0.4mg',           activeIngredient: 'Tamsulosin',               category: 'UROLOGY',          defaultDosage: '1 viên/lần',    defaultSessions: ['EVENING'],                  defaultMealTiming: 'AFTER_MEAL',  unit: 'viên', price: 12000, stock: 80,  sideEffects: 'Tụt huyết áp tư thế', notes: 'Alpha-blocker, giãn niệu quản hỗ trợ tống sỏi' },
      { name: 'Trimethoprim-Sulfamethoxazole 800/160mg', activeIngredient: 'Trimethoprim + Sulfamethoxazole', category: 'UROLOGY', defaultDosage: '1 viên/lần', defaultSessions: ['MORNING','EVENING'], defaultMealTiming: 'AFTER_MEAL', unit: 'viên', price: 5000, stock: 100, notes: 'Uống nhiều nước, điều trị UTI' },
    ];

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

