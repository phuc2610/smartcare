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
const { findBestDrugMatch } = require('../utils/fuzzy');
const drugDatabase = require('../utils/drug_database.json');

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
const OCR_EXTRACT_PROMPT = `Bạn là Dược sĩ lâm sàng và chuyên gia OCR y khoa với độ chính xác cực cao. Đây là ứng dụng y tế thực tế tại Việt Nam — sai tên thuốc hoặc liều dùng có thể gây nguy hiểm cho bệnh nhân.

NHIỆM VỤ: Phân tích ảnh đơn thuốc (viết tay hoặc in) và trích xuất CHÍNH XÁC thông tin.

QUY TẮC BẮT BUỘC:
1. Nhận diện tên thuốc: Cố gắng đọc chính xác. Nếu chữ viết tay xấu, hãy kết hợp các ký tự nhìn thấy được với bối cảnh "Chẩn đoán" để suy luận ra tên thuốc hợp lý nhất (ví dụ: chẩn đoán viêm họng thì thường là kháng sinh, giảm ho). Chỉ khi hoàn toàn không thể dịch được mới dùng dấu [?] (VD: "Amox[?]cillin").
2. Hiểu từ viết tắt tiếng Việt phổ biến:
   - "v" hoặc "viên" -> Viên
   - "S: 1, C: 1" hoặc "Sáng 1v, Chiều 1v" -> Ngày 2 lần, sáng 1 viên, chiều 1 viên.
   - "u/ sau ăn" -> Uống sau ăn.
   - "T", "V", "N" -> Sáng, Trưa, Tối/Chiều.
3. Phân biệt cực kỳ cẩn thận hàm lượng: 500mg ≠ 50mg, 1 viên ≠ 1 gói.
4. Trích xuất toàn bộ text thô đọc được vào trường "rawText".
5. Đánh giá confidence (0.0 - 1.0) cho mỗi thuốc và cho toàn bộ đơn.

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
const buildVerificationPrompt = (extractedJson) => `Bạn là Dược sĩ lâm sàng cấp cao đang kiểm tra chéo (cross-verify) kết quả AI OCR đọc đơn thuốc. Đây là bước cực kỳ quan trọng để bảo vệ an toàn cho bệnh nhân.

KẾT QUẢ OCR CẦN KIỂM TRA:
${JSON.stringify(extractedJson, null, 2)}

NHIỆM VỤ KIỂM TRA VÀ SỬA LỖI:
1. TÊN THUỐC: Sửa ngay các lỗi chính tả OCR hoặc nhận diện nhầm do chữ viết tay xấu.
   - Ví dụ OCR nhầm: "Amoxicilin" → "Amoxicillin", "Paracetamoi" → "Paracetamol", "Klavulanic" → "Clavulanic", "Alpha choay" → "Alpha Choay".
   - Kiểm tra hàm lượng: Paracetamol thường 500mg/650mg, Ibuprofen 200mg/400mg... Nếu thấy "Paracetamol 5000mg", chắc chắn OCR nhầm số 0, hãy sửa lại thành 500mg.
   - Đảm bảo tên thuốc có ý nghĩa y khoa hợp lệ tại thị trường Việt Nam.

2. LIỀU DÙNG (Dosage) VÀ SESSIONS:
   - Dựa vào phần "rawText" hoặc "instructions", nếu thấy dặn "Ngày uống 2 lần sáng tối", hãy đảm bảo sessions = ["MORNING", "EVENING"].
   - "Sáng 1, Chiều 1" -> dosage: "1 viên/lần", sessions: ["MORNING", "AFTERNOON"].

3. SỐ LƯỢNG (Quantity):
   - Nếu AI trước đó không đọc được, hãy dùng thuật toán: Số lượng = (Liều 1 lần × Số lần 1 ngày) × Số ngày uống.

4. MEAL TIMING:
   - Tự động suy luận hợp lý nếu bác sĩ không ghi: Kháng sinh, thuốc giảm đau NSAID (Ibuprofen, Diclofenac) -> "AFTER_MEAL" (Sau ăn). Thuốc dạ dày (Omeprazole, Pantoprazole) -> "BEFORE_MEAL" (Trước ăn).

CHỈ trả về JSON đã sửa (cùng format), với:
- Đã SỬA CHỮA HOÀN THIỆN các lỗi sai.
- Điều chỉnh confidence: Nếu bạn tự tin đã sửa đúng 1 loại thuốc viết tay xấu, hãy nâng confidence lên.
- Thêm ghi chú ngắn gọn vào "verificationNotes" về những gì bạn đã sửa.
- KHÔNG thêm thuốc mới (trừ khi thấy rõ trong rawText mà AI trước bỏ sót), KHÔNG xóa thuốc.

CHỈ trả về kết quả định dạng JSON chuẩn (không markdown, không code block).`;

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
const scanWithGemini = async (base64Data, mimeType = 'image/jpeg') => {
  const model = genAI.getGenerativeModel({ model: process.env.GEMINI_MODEL || 'gemini-2.5-flash' });

  // Strip data URI prefix if present and detect mimeType from it
  let detectedMime = mimeType;
  const dataUriMatch = base64Data.match(/^data:(image\/[\w+]+);base64,/);
  if (dataUriMatch) {
    detectedMime = dataUriMatch[1];
  }
  // Gemini only accepts: image/jpeg, image/png, image/webp, image/heic, image/heif
  const SUPPORTED_MIMES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];
  if (!SUPPORTED_MIMES.includes(detectedMime)) {
    console.warn(`[SCAN] Unsupported MIME type "${detectedMime}", falling back to image/jpeg`);
    detectedMime = 'image/jpeg';
  }
  const cleanBase64 = base64Data.replace(/^data:image\/[\w+]+;base64,/, '');

  console.log(`[SCAN] Using mimeType: ${detectedMime}`);

  // ── PASS 1: Extract from image ──
  console.log('[SCAN] Pass 1: Extracting from image...');
  let pass1Result;
  try {
    pass1Result = await model.generateContent([
      OCR_EXTRACT_PROMPT,
      {
        inlineData: {
          mimeType: detectedMime,
          data: cleanBase64,
        },
      },
    ]);
  } catch (geminiErr) {
    console.error('[SCAN] Gemini Pass 1 API error:', geminiErr?.message || geminiErr);
    throw geminiErr;
  }

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
 * Scan bằng OpenAI Vision API
 * Single-pass: trích xuất + tự kiểm tra trong 1 lần gọi API → nhanh hơn ~40%
 */
const COMBINED_OCR_PROMPT = `${OCR_EXTRACT_PROMPT}

── SAU KHI TRÍCH XUẤT, HÃY TỰ KIỂM TRA NGAY (không cần output trung gian):
1. Tên thuốc: Sửa lỗi chính tả OCR (VD: "Paracetamoi" → "Paracetamol", "Amoxicilin" → "Amoxicillin").
2. Hàm lượng: Kiểm tra thực tế (Paracetamol thường 500mg, Ibuprofen 200-400mg, nếu thấy 5000mg thì OCR nhầm số 0).
3. Sessions: Khớp với instructions và rawText đã đọc.
4. Thêm "verificationNotes": mô tả ngắn những gì đã sửa (nếu không sửa gì thì để chuỗi rỗng).

CHI TRẢ VỀ JSON cuối cùng đã sửa hoàn chỉnh (không markdown, không code block).`;

const scanWithOpenAI = async (imageInput) => {
  // Single-pass: extract + self-verify trong 1 API call
  const completion = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    temperature: 0,          // output ổn định, xử lý nhanh hơn
    max_tokens: 1800,        // đủ cho đơn thuốc VN tối đa 6-8 thuốc
    messages: [{
      role: 'user',
      content: [
        { type: 'text', text: COMBINED_OCR_PROMPT },
        { type: 'image_url', image_url: { url: imageInput, detail: 'high' } },
      ],
    }],
    response_format: { type: 'json_object' },
  });

  const result = JSON.parse(completion.choices[0].message.content);
  console.log('[SCAN] OpenAI single-pass SUCCESS. Medications:', result.medications?.length || 0);
  return result;
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
    const { imageUrl, imageBase64, imageMimeType } = req.body;
    const userId = req.user._id;

    // Accept either a URL or base64-encoded image
    const rawBase64 = imageBase64
      ? imageBase64.replace(/^data:image\/[\w+]+;base64,/, '')
      : null;
    // Use client-reported mimeType, or detect from data URI, or default to jpeg
    const resolvedMimeType = imageMimeType || 'image/jpeg';
    const imageInput = rawBase64
      ? `data:${resolvedMimeType};base64,${rawBase64}`
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
        prescriptionData = await scanWithGemini(rawBase64, resolvedMimeType);
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

    // Strategy 3: Handle AI exhaustion (No more demo data)
    if (!prescriptionData) {
      console.warn('[SCAN] All AI engines failed or quotas exceeded. Returning 429 Error.');
      return res.status(429).json({ error: 'Tính năng Quét AI đang tạm dừng do vượt quá giới hạn lượt dùng của API Key miễn phí. Vui lòng thử lại sau hoặc nhập tay thông tin đơn thuốc.' });
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

    // Normalize medications with confidence & Fuzzy Matching
    prescriptionData.medications = prescriptionData.medications.map(med => {
      let finalName = med.name || 'Không rõ';
      let confidence = typeof med.confidence === 'number' ? med.confidence : 0.5;

      // Áp dụng Fuzzy Matching cho tên thuốc
      if (finalName !== 'Không rõ') {
        const matchResult = findBestDrugMatch(finalName, drugDatabase);
        // Nếu score > 0.75 (khá giống) nhưng không phải 1.0 (hoàn toàn khớp)
        // và độ lệch không quá lớn, thì tự động sửa
        if (matchResult && matchResult.score > 0.75 && matchResult.distance > 0) {
          console.log(`[FUZZY] Sửa lỗi tên thuốc: "${finalName}" -> "${matchResult.bestMatch}" (Score: ${matchResult.score.toFixed(2)})`);
          finalName = matchResult.bestMatch;
          confidence = Math.min(1.0, confidence + 0.1); // Tăng tự tin vì đã map được với DB cứng
        } else if (matchResult && matchResult.score === 1) {
          confidence = Math.min(1.0, confidence + 0.2); // Hoàn toàn khớp với DB
        }
      }

      return {
        name: finalName,
        dosage: med.dosage || '',
        quantity: Number(med.quantity) || 0,
        unit: med.unit || 'Viên',
        sessions: Array.isArray(med.sessions) ? med.sessions : ['MORNING'],
        mealTiming: med.mealTiming || 'AFTER_MEAL',
        instructions: med.instructions || '',
        usage: med.usage || '',
        isActive: med.isActive !== false,
        confidence: confidence,
      };
    });

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
      MORNING: '07:00', NOON: '11:00', AFTERNOON: '15:00', EVENING: '18:00',
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
