/**
 * Prescription Controller
 * Handles OCR scanning, CRUD, and auto-creation of medications/reminders
 */

const Prescription = require('../models/Prescription');
const Medication = require('../models/Medication');
const openai = require('../config/openai');

// Demo data khi OpenAI không khả dụng
const DEMO_PRESCRIPTION = {
  doctorName: 'BS. Nguyễn Văn An',
  patientName: 'Trần Thị Bích',
  diagnosis: 'Viêm họng cấp',
  startDate: new Date().toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }),
  notes: 'Tái khám sau 7 ngày. Uống nhiều nước ấm, nghỉ ngơi đầy đủ. Tránh đồ lạnh và cay.',
  medications: [
    { name: 'Amoxicillin 500mg', dosage: '1 viên/lần', quantity: 21, unit: 'Viên', sessions: ['MORNING', 'NOON', 'EVENING'], mealTiming: 'AFTER_MEAL', instructions: 'Uống sau ăn 30 phút', usage: 'Kháng sinh điều trị nhiễm khuẩn đường hô hấp', isActive: true },
    { name: 'Paracetamol 500mg', dosage: '1-2 viên/lần', quantity: 20, unit: 'Viên', sessions: ['MORNING', 'EVENING'], mealTiming: 'AFTER_MEAL', instructions: 'Uống khi sốt trên 38.5°C', usage: 'Hạ sốt, giảm đau', isActive: true },
    { name: 'Strepsils', dosage: '1 viên ngậm', quantity: 24, unit: 'Viên', sessions: ['MORNING', 'NOON', 'EVENING'], mealTiming: 'AFTER_MEAL', instructions: 'Ngậm tan từ từ, không nhai', usage: 'Sát khuẩn, giảm đau rát họng', isActive: true },
  ],
};

/**
 * POST /api/prescriptions/scan
 * Scan ảnh đơn thuốc bằng AI/OCR
 */
const scanPrescription = async (req, res) => {
  try {
    const { imageUrl } = req.body;
    const userId = req.user._id;

    if (!imageUrl) {
      return res.status(400).json({ error: 'imageUrl is required' });
    }

    let prescriptionData;

    if (!openai) {
      // Demo mode
      prescriptionData = { ...DEMO_PRESCRIPTION };
    } else {
      // AI OCR mode
      const prompt = `Bạn là chuyên gia OCR y khoa. Phân tích ảnh đơn thuốc sau và trích xuất thông tin theo cấu trúc JSON.

YÊU CẦU:
1. Trích xuất thông tin chung: tên bác sĩ, tên bệnh nhân, chẩn đoán, ngày khám, ghi chú/lời dặn
2. Trích xuất danh sách thuốc: tên thuốc, hàm lượng/liều dùng, số lượng, đơn vị, thời điểm uống, thời điểm so với bữa ăn, hướng dẫn sử dụng, công dụng tham khảo

Trả về JSON với format:
{
  "doctorName": "Tên BS",
  "patientName": "Tên BN",
  "diagnosis": "Chẩn đoán",
  "startDate": "DD/MM/YYYY",
  "notes": "Ghi chú/lời dặn",
  "medications": [
    {
      "name": "Tên thuốc + hàm lượng",
      "dosage": "Liều dùng (VD: 1 viên/lần)",
      "quantity": 20,
      "unit": "Viên|Gói|Chai|Ống",
      "sessions": ["MORNING","NOON","AFTERNOON","EVENING"],
      "mealTiming": "BEFORE_MEAL|AFTER_MEAL|DURING_MEAL|NONE",
      "instructions": "Hướng dẫn chi tiết",
      "usage": "Công dụng tham khảo",
      "isActive": true
    }
  ]
}

Nếu không đọc được trường nào, để chuỗi rỗng hoặc giá trị mặc định.
Sessions mapping: Sáng=MORNING, Trưa=NOON, Chiều=AFTERNOON, Tối=EVENING.`;

      try {
        const completion = await openai.chat.completions.create({
          model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
          messages: [{
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              { type: 'image_url', image_url: { url: imageUrl } },
            ],
          }],
          response_format: { type: 'json_object' },
          max_tokens: 1500,
        });

        prescriptionData = JSON.parse(completion.choices[0].message.content);
      } catch (aiError) {
        console.error('AI OCR failed, using demo:', aiError.message);
        prescriptionData = { ...DEMO_PRESCRIPTION };
      }
    }

    // Ensure medications array
    if (!Array.isArray(prescriptionData.medications)) {
      prescriptionData.medications = [];
    }

    // Normalize medications
    prescriptionData.medications = prescriptionData.medications.map(med => ({
      name: med.name || 'Không rõ',
      dosage: med.dosage || '',
      quantity: Number(med.quantity) || 0,
      unit: med.unit || 'Viên',
      sessions: Array.isArray(med.sessions) ? med.sessions : ['MORNING'],
      mealTiming: med.mealTiming || 'AFTER_MEAL',
      instructions: med.instructions || '',
      usage: med.usage || '',
      isActive: med.isActive !== false,
    }));

    // Save as draft
    const prescription = await Prescription.create({
      userId,
      imageUrl,
      ...prescriptionData,
      status: 'draft',
    });

    res.json({ prescription });
  } catch (error) {
    console.error('Scan Prescription Error:', error);
    res.status(500).json({ error: 'Failed to scan prescription' });
  }
};

/**
 * POST /api/prescriptions
 */
const createPrescription = async (req, res) => {
  try {
    const userId = req.user._id;
    const prescription = await Prescription.create({ userId, ...req.body, status: 'confirmed' });
    res.status(201).json({ prescription });
  } catch (error) {
    console.error('Create Prescription Error:', error);
    res.status(500).json({ error: 'Failed to create prescription' });
  }
};

/**
 * GET /api/prescriptions
 */
const getPrescriptions = async (req, res) => {
  try {
    const userId = req.user._id;
    const prescriptions = await Prescription.find({ userId, status: { $ne: 'archived' } })
      .sort({ createdAt: -1 }).lean();
    res.json({ prescriptions });
  } catch (error) {
    console.error('Get Prescriptions Error:', error);
    res.status(500).json({ error: 'Failed to get prescriptions' });
  }
};

/**
 * GET /api/prescriptions/:id
 */
const getPrescription = async (req, res) => {
  try {
    const prescription = await Prescription.findOne({
      _id: req.params.id, userId: req.user._id,
    }).lean();
    if (!prescription) return res.status(404).json({ error: 'Prescription not found' });
    res.json({ prescription });
  } catch (error) {
    console.error('Get Prescription Error:', error);
    res.status(500).json({ error: 'Failed to get prescription' });
  }
};

/**
 * PUT /api/prescriptions/:id
 * Cập nhật + auto-tạo Medications/Reminders
 */
const updatePrescription = async (req, res) => {
  try {
    const userId = req.user._id;
    const { medications, ...generalInfo } = req.body;

    const prescription = await Prescription.findOneAndUpdate(
      { _id: req.params.id, userId },
      { ...generalInfo, medications, status: 'confirmed' },
      { new: true }
    );

    if (!prescription) return res.status(404).json({ error: 'Prescription not found' });

    // Auto-create Medication records for active medications
    const sessionToTime = {
      MORNING: '07:00', NOON: '12:00', AFTERNOON: '15:00', EVENING: '20:00',
    };

    for (const med of (medications || [])) {
      if (!med.isActive) continue;

      const times = (med.sessions || ['MORNING']).map(s => sessionToTime[s] || '08:00');

      try {
        await Medication.create({
          userId,
          name: med.name,
          dosage: med.dosage || '1 viên/lần',
          unit: med.unit || 'Viên',
          notes: med.instructions || '',
          frequency: 'DAILY',
          sessions: med.sessions?.filter(s => ['MORNING', 'NOON', 'EVENING'].includes(s)) || [],
          mealTiming: med.mealTiming || 'AFTER_MEAL',
          times,
          startDate: prescription.startDate ? new Date(prescription.startDate.split('/').reverse().join('-')) : new Date(),
          prescribedBy: null,
          isActive: true,
        });
      } catch (medErr) {
        console.error('Auto-create medication failed:', med.name, medErr.message);
      }
    }

    res.json({ prescription });
  } catch (error) {
    console.error('Update Prescription Error:', error);
    res.status(500).json({ error: 'Failed to update prescription' });
  }
};

/**
 * DELETE /api/prescriptions/:id
 */
const deletePrescription = async (req, res) => {
  try {
    const result = await Prescription.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { status: 'archived' },
      { new: true }
    );
    if (!result) return res.status(404).json({ error: 'Prescription not found' });
    res.json({ message: 'Prescription archived' });
  } catch (error) {
    console.error('Delete Prescription Error:', error);
    res.status(500).json({ error: 'Failed to delete prescription' });
  }
};

module.exports = {
  scanPrescription,
  createPrescription,
  getPrescriptions,
  getPrescription,
  updatePrescription,
  deletePrescription,
};
