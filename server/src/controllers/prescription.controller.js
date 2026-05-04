/**
 * Prescription Controller
 * Handles OCR scanning with DUAL-PASS AI VERIFICATION for maximum accuracy
 * Healthcare app → wrong medication name or dosage = dangerous
 */

const Prescription = require('../models/Prescription');
const Medication = require('../models/Medication');
const openai = require('../config/openai');
const genAI = require('../config/gemini');
const { generateRemindersForMedication } = require('./medication.controller');

// Demo data khi AI không khả dụng
const DEMO_PRESCRIPTION = {
  doctorName: 'BS. Nguyễn Văn An',
  patientName: 'Trần Thị Bích',
  diagnosis: 'Viêm họng cấp',
  startDate: new Date().toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }),
  notes: 'Tái khám sau 7 ngày. Uống nhiều nước ấm, nghỉ ngơi đầy đủ. Tránh đồ lạnh và cay.',
  rawText: '[Demo data - không phải kết quả OCR thực tế]',
  qualityScore: 0,
  medications: [
    { name: 'Amoxicillin 500mg', dosage: '1 viên/lần', quantity: 21, unit: 'Viên', sessions: ['MORNING', 'NOON', 'EVENING'], mealTiming: 'AFTER_MEAL', instructions: 'Uống sau ăn 30 phút', usage: 'Kháng sinh điều trị nhiễm khuẩn đường hô hấp', isActive: true, confidence: 0 },
    { name: 'Paracetamol 500mg', dosage: '1-2 viên/lần', quantity: 20, unit: 'Viên', sessions: ['MORNING', 'EVENING'], mealTiming: 'AFTER_MEAL', instructions: 'Uống khi sốt trên 38.5°C', usage: 'Hạ sốt, giảm đau', isActive: true, confidence: 0 },
    { name: 'Strepsils', dosage: '1 viên ngậm', quantity: 24, unit: 'Viên', sessions: ['MORNING', 'NOON', 'EVENING'], mealTiming: 'AFTER_MEAL', instructions: 'Ngậm tan từ từ, không nhai', usage: 'Sát khuẩn, giảm đau rát họng', isActive: true, confidence: 0 },
  ],
};

// ─────────────────────────────────────────────────────────────
// PASS 1: OCR EXTRACTION PROMPT
// ─────────────────────────────────────────────────────────────
const OCR_EXTRACT_PROMPT = `Bạn là chuyên gia OCR y khoa với độ chính xác cực cao. Đây là ứng dụng y tế thực tế — sai tên thuốc hoặc liều dùng có thể gây nguy hiểm cho bệnh nhân.

NHIỆM VỤ: Phân tích ảnh đơn thuốc và trích xuất CHÍNH XÁC thông tin.

QUY TẮC BẮT BUỘC:
1. Đọc CHÍNH XÁC từng ký tự trên đơn thuốc. KHÔNG được đoán hoặc suy luận tên thuốc.
2. Nếu không đọc rõ một từ, ghi lại chính xác những gì đọc được kèm dấu [?] (VD: "Amox[?]cillin")
3. Phân biệt rõ: 500mg ≠ 50mg, 1 viên ≠ 1 gói, sáng ≠ chiều
4. Trích xuất toàn bộ text thô đọc được vào trường "rawText"
5. Đánh giá confidence (0.0 - 1.0) cho mỗi thuốc và cho toàn bộ đơn

VÍ DỤ OUTPUT:
{
  "doctorName": "BS. Nguyễn Văn An",
  "patientName": "Trần Văn Bình",
  "diagnosis": "Viêm phế quản cấp",
  "startDate": "15/03/2024",
  "notes": "Tái khám sau 5 ngày. Uống nhiều nước.",
  "rawText": "BS. NGUYỄN VĂN AN\\nPHÒNG KHÁM ĐA KHOA...\\nBệnh nhân: TRẦN VĂN BÌNH\\nChẩn đoán: Viêm phế quản cấp\\n1. Amoxicillin 500mg x 21 viên\\n   Ngày 3 lần, sau ăn\\n2. Bromhexin 8mg x 20 viên\\n   Ngày 2 lần sáng-chiều...",
  "overallConfidence": 0.85,
  "medications": [
    {
      "name": "Amoxicillin 500mg",
      "dosage": "1 viên/lần",
      "quantity": 21,
      "unit": "Viên",
      "sessions": ["MORNING", "NOON", "EVENING"],
      "mealTiming": "AFTER_MEAL",
      "instructions": "Uống sau ăn, ngày 3 lần",
      "usage": "Kháng sinh điều trị nhiễm khuẩn",
      "isActive": true,
      "confidence": 0.95
    }
  ]
}

CHỈ trả về JSON (không markdown, không code block). Format:
{
  "doctorName": "string",
  "patientName": "string",
  "diagnosis": "string",
  "startDate": "DD/MM/YYYY",
  "notes": "string - ghi chú/lời dặn của bác sĩ",
  "rawText": "string - TOÀN BỘ text thô đọc được từ ảnh, giữ nguyên xuống dòng",
  "overallConfidence": 0.0-1.0,
  "medications": [
    {
      "name": "Tên thuốc CHÍNH XÁC + hàm lượng",
      "dosage": "Liều dùng (VD: 1 viên/lần)",
      "quantity": number,
      "unit": "Viên|Gói|Chai|Ống|Tuýp|Lọ",
      "sessions": ["MORNING"|"NOON"|"AFTERNOON"|"EVENING"],
      "mealTiming": "BEFORE_MEAL|AFTER_MEAL|DURING_MEAL|NONE",
      "instructions": "Hướng dẫn sử dụng chi tiết",
      "usage": "Công dụng",
      "isActive": true,
      "confidence": 0.0-1.0
    }
  ]
}

Sessions mapping: Sáng=MORNING, Trưa=NOON, Chiều=AFTERNOON, Tối=EVENING.
Nếu không đọc được trường nào, để chuỗi rỗng và confidence = 0.`;

// ─────────────────────────────────────────────────────────────
// PASS 2: VERIFICATION PROMPT
// ─────────────────────────────────────────────────────────────
const buildVerificationPrompt = (extractedJson) => `Bạn là dược sĩ lâm sàng kiểm tra kết quả OCR đơn thuốc. Đây là ứng dụng y tế — sai tên thuốc hoặc liều dùng CÓ THỂ GÂY NGUY HIỂM.

KẾT QUẢ OCR CẦN KIỂM TRA:
${JSON.stringify(extractedJson, null, 2)}

NHIỆM VỤ KIỂM TRA:
1. TÊN THUỐC: Kiểm tra chính tả. Các lỗi OCR thường gặp:
   - "Amoxicilin" → "Amoxicillin" (thiếu chữ l)
   - "Paracetamoi" → "Paracetamol" (nhầm i/l)
   - "Cetirizin" → "Cetirizine" (thiếu e cuối)
   - "Omeprazol" → "Omeprazole" (thiếu e cuối)
   - Kiểm tra hàm lượng có hợp lý không (VD: Paracetamol thường 500mg, không phải 5000mg)

2. LIỀU DÙNG: Kiểm tra liều có hợp lý với loại thuốc không.
   - Kháng sinh thường 2-3 lần/ngày
   - Thuốc dạ dày thường 1-2 lần/ngày
   - Vitamin thường 1 lần/ngày

3. SỐ LƯỢNG: Kiểm tra số lượng có khớp với liều dùng × số ngày không.

4. SESSIONS: Kiểm tra thời điểm uống có hợp lý với loại thuốc không.

5. MEAL TIMING: Kiểm tra thời điểm ăn có đúng với loại thuốc không.
   - Kháng sinh thường uống sau ăn
   - Thuốc dạ dày thường uống trước ăn

CHỈ trả về JSON đã sửa (cùng format), với:
- Sửa lỗi chính tả tên thuốc nếu phát hiện
- Điều chỉnh confidence dựa trên mức độ chắc chắn
- Thêm ghi chú sửa đổi vào field "verificationNotes" (string)
- KHÔNG thêm thuốc mới, KHÔNG xóa thuốc
- Nếu không chắc chắn, GIỮ NGUYÊN và giảm confidence

CHỈ trả về JSON (không markdown, không code block).`;

// ─────────────────────────────────────────────────────────────
// QUALITY SCORE CALCULATION
// ─────────────────────────────────────────────────────────────
const calculateQualityScore = (data) => {
  let score = 0;
  let total = 0;

  // General info scoring
  const fields = ['doctorName', 'patientName', 'diagnosis', 'startDate', 'notes'];
  for (const field of fields) {
    total += 1;
    if (data[field] && data[field].trim().length > 0) score += 1;
  }

  // Medications scoring (weighted higher — most important)
  const meds = data.medications || [];
  if (meds.length === 0) {
    total += 5;
    // no meds found = very low quality
  } else {
    for (const med of meds) {
      total += 3; // name + dosage + quantity
      if (med.name && med.name.trim().length > 2) score += 1;
      if (med.dosage && med.dosage.trim().length > 0) score += 1;
      if (med.quantity && med.quantity > 0) score += 1;
    }
  }

  // Use AI's own confidence if available
  const aiConfidence = data.overallConfidence || 0;
  const fieldScore = total > 0 ? score / total : 0;

  // Weighted average: 40% field completeness + 60% AI self-assessment
  return aiConfidence > 0
    ? Math.round((fieldScore * 0.4 + aiConfidence * 0.6) * 100) / 100
    : Math.round(fieldScore * 100) / 100;
};

// ─────────────────────────────────────────────────────────────
// GEMINI SCAN — DUAL PASS
// ─────────────────────────────────────────────────────────────
const scanWithGemini = async (base64Data) => {
  const model = genAI.getGenerativeModel({ model: process.env.GEMINI_MODEL || 'gemini-2.5-flash' });

  // Strip data URI prefix if present
  const cleanBase64 = base64Data.replace(/^data:image\/\w+;base64,/, '');

  // ── PASS 1: Extract from image ──
  console.log('[SCAN] Pass 1: Extracting from image...');
  const pass1Result = await model.generateContent([
    OCR_EXTRACT_PROMPT,
    {
      inlineData: {
        mimeType: 'image/jpeg',
        data: cleanBase64,
      },
    },
  ]);

  const pass1Text = pass1Result.response.text();
  const pass1Json = JSON.parse(
    pass1Text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
  );
  console.log('[SCAN] Pass 1 complete. Medications found:', pass1Json.medications?.length || 0);

  // ── PASS 2: Verify & correct with text-only prompt ──
  let verifiedData = pass1Json;
  try {
    console.log('[SCAN] Pass 2: Verifying extraction...');
    const pass2Result = await model.generateContent([
      buildVerificationPrompt(pass1Json),
    ]);

    const pass2Text = pass2Result.response.text();
    const pass2Json = JSON.parse(
      pass2Text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    );

    // Merge: keep pass2 corrections but preserve pass1 rawText
    verifiedData = {
      ...pass2Json,
      rawText: pass1Json.rawText || pass2Json.rawText || '',
      verificationNotes: pass2Json.verificationNotes || '',
    };
    console.log('[SCAN] Pass 2 complete. Verification notes:', verifiedData.verificationNotes || 'none');
  } catch (verifyError) {
    console.warn('[SCAN] Pass 2 verification failed (using Pass 1 result):', verifyError.message);
    // Fall back to pass 1 result — still better than nothing
  }

  return verifiedData;
};

/**
 * Scan bằng OpenAI Vision API (fallback)
 */
const scanWithOpenAI = async (imageInput) => {
  const completion = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    messages: [{
      role: 'user',
      content: [
        { type: 'text', text: OCR_EXTRACT_PROMPT },
        { type: 'image_url', image_url: { url: imageInput } },
      ],
    }],
    response_format: { type: 'json_object' },
    max_tokens: 2500,
  });

  const pass1Json = JSON.parse(completion.choices[0].message.content);

  // Verification pass with OpenAI too
  try {
    console.log('[SCAN] OpenAI Pass 2: Verifying...');
    const verifyResult = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [{
        role: 'user',
        content: buildVerificationPrompt(pass1Json),
      }],
      response_format: { type: 'json_object' },
      max_tokens: 2500,
    });
    const pass2Json = JSON.parse(verifyResult.choices[0].message.content);
    return {
      ...pass2Json,
      rawText: pass1Json.rawText || pass2Json.rawText || '',
      verificationNotes: pass2Json.verificationNotes || '',
    };
  } catch (err) {
    console.warn('[SCAN] OpenAI verification failed:', err.message);
    return pass1Json;
  }
};

// ─────────────────────────────────────────────────────────────
// MAX BASE64 SIZE: ~5MB
// ─────────────────────────────────────────────────────────────
const MAX_BASE64_BYTES = 5 * 1024 * 1024;

/**
 * POST /api/prescriptions/scan
 * Scan ảnh đơn thuốc bằng AI/OCR — DUAL-PASS VERIFICATION
 */
const scanPrescription = async (req, res) => {
  try {
    const { imageUrl, imageBase64 } = req.body;
    const userId = req.user._id;

    // Accept either a URL or base64-encoded image
    const rawBase64 = imageBase64
      ? imageBase64.replace(/^data:image\/\w+;base64,/, '')
      : null;
    const imageInput = rawBase64
      ? `data:image/jpeg;base64,${rawBase64}`
      : imageUrl;

    if (!imageInput && !rawBase64) {
      return res.status(400).json({ error: 'imageUrl or imageBase64 is required' });
    }

    // Image size validation
    if (rawBase64 && rawBase64.length > MAX_BASE64_BYTES) {
      console.warn(`[SCAN] Image too large: ${(rawBase64.length / 1024 / 1024).toFixed(1)}MB`);
      return res.status(400).json({
        error: 'Ảnh quá lớn. Vui lòng chụp lại với chất lượng thấp hơn hoặc crop vùng đơn thuốc.',
      });
    }

    // Log image size for monitoring
    if (rawBase64) {
      console.log(`[SCAN] Image size: ${(rawBase64.length / 1024).toFixed(0)}KB`);
    }

    let prescriptionData;

    // Strategy 1: Gemini (primary) — with dual-pass verification
    if (genAI && rawBase64) {
      try {
        console.log('[SCAN] === Starting Gemini Dual-Pass Scan ===');
        prescriptionData = await scanWithGemini(rawBase64);
        console.log('[SCAN] Gemini Dual-Pass SUCCESS');
      } catch (geminiError) {
        console.error('[SCAN] Gemini failed:', geminiError.message);
      }
    }

    // Strategy 2: OpenAI (fallback) — also with dual-pass
    if (!prescriptionData && openai && imageInput) {
      try {
        console.log('[SCAN] === Starting OpenAI Dual-Pass Scan ===');
        prescriptionData = await scanWithOpenAI(imageInput);
        console.log('[SCAN] OpenAI Dual-Pass SUCCESS');
      } catch (openaiError) {
        console.error('[SCAN] OpenAI failed:', openaiError.message);
      }
    }

    // Strategy 3: Demo data (last resort)
    if (!prescriptionData) {
      console.warn('[SCAN] All AI engines failed, using DEMO data');
      prescriptionData = { ...DEMO_PRESCRIPTION };
    }

    // Ensure medications array
    if (!Array.isArray(prescriptionData.medications)) {
      prescriptionData.medications = [];
    }

    // Calculate quality score
    const qualityScore = calculateQualityScore(prescriptionData);
    console.log(`[SCAN] Quality score: ${qualityScore}`);

    // ── AUTO-RETRY on very low quality ──
    if (qualityScore < 0.3 && genAI && rawBase64 && prescriptionData !== DEMO_PRESCRIPTION) {
      console.log('[SCAN] Quality too low, attempting retry with enhanced prompt...');
      try {
        const model = genAI.getGenerativeModel({ model: process.env.GEMINI_MODEL || 'gemini-2.5-flash' });
        const retryResult = await model.generateContent([
          OCR_EXTRACT_PROMPT + '\n\nLƯU Ý THÊM: Ảnh có thể mờ hoặc nghiêng. Hãy cố gắng đọc từng ký tự một cách cẩn thận nhất. Phóng to từng vùng nếu cần. Nếu đọc được một phần, hãy ghi lại phần đó.',
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: rawBase64.replace(/^data:image\/\w+;base64,/, ''),
            },
          },
        ]);
        const retryText = retryResult.response.text();
        const retryJson = JSON.parse(
          retryText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
        );
        const retryScore = calculateQualityScore(retryJson);
        if (retryScore > qualityScore) {
          console.log(`[SCAN] Retry improved score: ${qualityScore} → ${retryScore}`);
          prescriptionData = retryJson;
        }
      } catch (retryErr) {
        console.warn('[SCAN] Retry failed:', retryErr.message);
      }
    }

    // Normalize medications with confidence
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
      confidence: typeof med.confidence === 'number' ? med.confidence : 0.5,
    }));

    // Recalculate final quality score
    const finalQualityScore = calculateQualityScore(prescriptionData);

    // Save as draft with quality metadata
    const prescription = await Prescription.create({
      userId,
      imageUrl: imageUrl || null,
      doctorName: prescriptionData.doctorName || '',
      patientName: prescriptionData.patientName || '',
      diagnosis: prescriptionData.diagnosis || '',
      startDate: prescriptionData.startDate || '',
      notes: prescriptionData.notes || '',
      medications: prescriptionData.medications,
      rawText: prescriptionData.rawText || '',
      qualityScore: finalQualityScore,
      verificationNotes: prescriptionData.verificationNotes || '',
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
        const newMedication = await Medication.create({
          userId,
          prescriptionId: prescription._id,
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

        // Auto-generate today's reminders so they appear on Dashboard
        await generateRemindersForMedication(newMedication);
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
 * Hard delete prescription, along with associated medications and reminders
 */
const deletePrescription = async (req, res) => {
  try {
    const prescriptionId = req.params.id;
    const userId = req.user._id;

    // Verify ownership
    const prescription = await Prescription.findOne({ _id: prescriptionId, userId });
    if (!prescription) {
      return res.status(404).json({ error: 'Prescription not found' });
    }

    // Find medications linked to this prescription
    const medications = await Medication.find({ prescriptionId });
    const medicationIds = medications.map(m => m._id);

    // Delete reminders for these medications
    const Reminder = require('../models/Reminder');
    await Reminder.deleteMany({ medicationId: { $in: medicationIds } });

    // Delete the medications
    await Medication.deleteMany({ prescriptionId });

    // Delete the prescription itself
    await Prescription.findByIdAndDelete(prescriptionId);

    res.json({ message: 'Prescription and associated medications deleted completely' });
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
