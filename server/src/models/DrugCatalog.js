const mongoose = require('mongoose');

/**
 * DrugCatalog – Danh mục thuốc nội bộ của phòng khám
 * Được quản lý bởi Bác sĩ (DOCTOR role), dùng để kê đơn nhanh và đề xuất AI
 */
const drugCatalogSchema = new mongoose.Schema({
  // Thông tin cơ bản
  name: { type: String, required: true, trim: true },           // Tên biệt dược
  activeIngredient: { type: String, default: '', trim: true },  // Hoạt chất
  category: {                                                    // Nhóm thuốc
    type: String,
    enum: [
      'ANALGESIC',        // Giảm đau / Hạ sốt
      'ANTIBIOTIC',       // Kháng sinh
      'ANTIHYPERTENSIVE', // Hạ huyết áp
      'ANTIDIABETIC',     // Tiểu đường
      'VITAMIN',          // Vitamin / Bổ sung
      'ANTIHISTAMINE',    // Dị ứng / Kháng Histamine
      'GASTRIC',          // Dạ dày / Tiêu hoá
      'CARDIOVASCULAR',   // Tim mạch
      'RESPIRATORY',      // Hô hấp / Hen suyễn
      'MUSCULOSKELETAL',  // Cơ xương khớp / Gout
      'NEUROLOGICAL',     // Thần kinh / Tâm thần / Giấc ngủ
      'UROLOGY',          // Thận / Tiết niệu
      'OTHER',            // Khác
    ],
    default: 'OTHER',
  },

  // Liều dùng mặc định (bác sĩ vẫn có thể chỉnh khi kê đơn)
  defaultDosage: { type: String, default: '1 viên/lần' },
  defaultSessions: [{ type: String, enum: ['MORNING', 'NOON', 'EVENING'] }],
  defaultMealTiming: { type: String, enum: ['BEFORE_MEAL', 'AFTER_MEAL'], default: 'AFTER_MEAL' },
  unit: { type: String, default: 'viên' },

  // Quản lý kho
  price: { type: Number, default: 0 },                          // Giá/viên (VNĐ)
  stock: { type: Number, default: 0 },                          // Số lượng tồn kho

  // Thông tin bổ sung
  contraindications: { type: String, default: '' },             // Chống chỉ định
  sideEffects: { type: String, default: '' },                   // Tác dụng phụ thường gặp
  notes: { type: String, default: '' },

  // Quản lý
  isActive: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

// Index tìm kiếm nhanh theo tên
drugCatalogSchema.index({ name: 'text', activeIngredient: 'text' });

module.exports = mongoose.model('DrugCatalog', drugCatalogSchema);
