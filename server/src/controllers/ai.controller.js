/**
 * AI CONTROLLER - Xử lý các tính năng AI (OpenAI)
 * Chức năng: Chat với AI, phân tích đơn thuốc, ước tính calo, nhận diện bệnh, gợi ý sức khỏe, phân tích báo cáo
 */

const openai = require('../config/openai');
const { z } = require('zod');

// Schema validation cho chat: message (tối thiểu 1 ký tự)
const chatSchema = z.object({
  body: z.object({
    message: z.string().min(1),
  }),
});

/**
 * Chat với AI - Tư vấn sức khỏe dựa trên tình trạng bệnh lý của user
 * Luồng: Lấy medicalCondition -> Tạo context theo bệnh -> Lấy lịch sử chat (5 tin gần nhất) -> Gọi OpenAI -> Lưu vào database -> Trả về
 */
const chat = async (req, res) => {
  try {
    if (!openai) {
      return res.status(503).json({ error: 'AI service disabled: missing OPENAI_API_KEY' });
    }
    const { message } = req.body;
    const user = req.user;

    const medicalCondition = user.medicalCondition || 'None specified';
    
    // Create context-specific instructions based on medical condition
    let conditionContext = '';
    if (medicalCondition && medicalCondition !== 'Normal' && medicalCondition !== 'Bình thường' && medicalCondition !== 'None specified') {
      conditionContext = `Người dùng đang mắc bệnh hoặc có tình trạng: ${medicalCondition}. Khi trả lời, bạn cần:
      - Tư vấn chế độ ăn uống, vận động và nghỉ ngơi ĐẶC THÙ phù hợp với bệnh "${medicalCondition}".
      - Cảnh báo các thực phẩm, thói quen xấu cần tránh đối với người mắc bệnh này.
      - Nhắc nhở việc theo dõi các chỉ số sức khỏe liên quan (nếu có).
      - Áp dụng các kiến thức y khoa chuẩn xác, chi tiết về "${medicalCondition}" để đưa ra lời khuyên.`;
    } else {
      conditionContext = `Người dùng chưa có tình trạng bệnh lý cụ thể. Tư vấn về sức khỏe tổng quát và phòng ngừa bệnh.`;
    }

    const systemInstruction = `Bạn là SmartCare AI, một trợ lý sức khỏe thông minh và đồng cảm.

THÔNG TIN NGƯỜI DÙNG:
- Tên: ${user.name || 'Bạn'}
- Tình trạng bệnh lý: ${medicalCondition}

${conditionContext}

QUY TẮC TRẢ LỜI:
1. Trả lời bằng tiếng Việt, thân thiện và dễ hiểu.
2. Giữ câu trả lời ngắn gọn (dưới 100 từ) nhưng hữu ích.
3. LUÔN tư vấn dựa trên tình trạng bệnh lý "${medicalCondition}" của người dùng.
4. Nếu người dùng hỏi về triệu chứng nghiêm trọng, luôn khuyên đi khám bác sĩ.
5. KHÔNG kê đơn thuốc, chỉ đưa ra lời khuyên về lối sống và chế độ ăn uống.
6. Nếu câu hỏi không liên quan đến sức khỏe, hãy nhẹ nhàng chuyển hướng về chủ đề sức khỏe.
7. Luôn kết thúc bằng lời khuyên y tế (disclaimer).

Hãy trả lời câu hỏi của người dùng một cách chính xác và phù hợp với tình trạng bệnh lý của họ.`;

    // Get recent chat history for context (last 5 conversations)
    const ChatMessage = require('../models/ChatMessage');
    let conversationHistory = [];
    try {
      const recentMessages = await ChatMessage.find({ userId: user._id })
        .sort({ timestamp: -1 })
        .limit(5)
        .lean();
      
      // Reverse to get chronological order (oldest first)
      recentMessages.reverse();
      
      // Build conversation history
      conversationHistory = recentMessages.flatMap(msg => [
        { role: 'user', content: msg.message },
        { role: 'assistant', content: msg.response },
      ]);
    } catch (historyError) {
      console.error('Failed to load chat history:', historyError);
      // Continue without history
    }

    // Build messages array with system instruction, history, and current message
    const messages = [
      { role: 'system', content: systemInstruction },
      ...conversationHistory,
      { role: 'user', content: message },
    ];

    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: messages,
      max_tokens: 200,
    });

    const response = completion.choices[0].message.content;
    const disclaimer = '\n\n⚠️ Lưu ý: Đây chỉ là tư vấn thông tin, không thay thế chẩn đoán y tế. Vui lòng tham khảo ý kiến bác sĩ cho các vấn đề sức khỏe nghiêm trọng.';
    const fullResponse = response + disclaimer;

    // Save chat message to database
    try {
      await ChatMessage.create({
        userId: user._id,
        message: message,
        response: fullResponse,
        sender: 'user',
        timestamp: new Date(),
      });
    } catch (dbError) {
      console.error('Failed to save chat message:', dbError);
      // Continue even if save fails
    }

    res.json({ response: fullResponse });
  } catch (error) {
    console.error('OpenAI Error:', error);
    res.status(500).json({ error: 'AI service error' });
  }
};

const parseMedicationSchema = z.object({
  body: z.object({
    imageUrl: z.string().url().optional(),
    instruction: z.string().optional(),
  }),
});

const parseMedication = async (req, res) => {
  try {
    if (!openai) {
      return res.status(503).json({ error: 'AI service disabled: missing OPENAI_API_KEY' });
    }
    const { imageUrl, instruction } = req.body;

    let prompt = '';
    if (imageUrl) {
      prompt = `Analyze this medication image: ${imageUrl}. Extract medication details: name, dosage, unit, frequency (DAILY or EVERY_OTHER_DAY), times (array of "HH:mm" format), and notes. Return valid JSON only.`;
    } else if (instruction) {
      prompt = `Extract medication details from this instruction (Vietnamese or English): "${instruction}". Return valid JSON with: name, dosage, unit, frequency (DAILY or EVERY_OTHER_DAY), times (array of "HH:mm"), notes.`;
    } else {
      return res.status(400).json({ error: 'imageUrl or instruction required' });
    }

    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [
        {
          role: 'user',
          content: imageUrl
            ? [
                { type: 'text', text: prompt },
                { type: 'image_url', image_url: { url: imageUrl } },
              ]
            : prompt,
        },
      ],
      response_format: { type: 'json_object' },
      max_tokens: 300,
    });

    const result = JSON.parse(completion.choices[0].message.content);
    res.json({ medication: result });
  } catch (error) {
    console.error('Medication Parse Error:', error);
    res.status(500).json({ error: 'Failed to parse medication' });
  }
};

// Schema validation cho estimate calories: query (tên món ăn/loại vận động), type (food/exercise)
const estimateCaloriesSchema = z.object({
  body: z.object({
    query: z.string().min(1),
    type: z.enum(['food', 'exercise']),
  }),
});

/**
 * Ước tính calo cho món ăn hoặc vận động, đồng thời chuẩn hóa tên thành tiếng Việt có dấu
 * Luồng: Tạo prompt theo type -> Gọi OpenAI -> Parse JSON -> Trả về calories và tên đã chuẩn hóa
 */
const estimateCalories = async (req, res) => {
  try {
    if (!openai) {
      return res.status(503).json({ error: 'AI service disabled: missing OPENAI_API_KEY' });
    }
    const { query, type } = req.body;

    const prompt =
      type === 'food'
        ? `Bạn là chuyên gia dinh dưỡng quen thuộc với ẩm thực Việt Nam. Nhiệm vụ của bạn:
1. CHUẨN HÓA tên món ăn "${query}" thành tiếng Việt có dấu đầy đủ và chính xác
2. ƯỚC TÍNH lượng calo cho món ăn đó
Trả về JSON với:
- "foodName": tên món ăn đã được chuẩn hóa (tiếng Việt có dấu)
- "calories": số calo (số nguyên)`
        : `Bạn là chuyên gia thể dục thể thao quen thuộc với các hoạt động vận động. Nhiệm vụ của bạn:
1. CHUẨN HÓA tên loại vận động từ "${query}" thành tiếng Việt có dấu đầy đủ và chính xác (chỉ lấy tên loại vận động, bỏ phần thời gian)
2. ƯỚC TÍNH lượng calo tiêu thụ
Trả về JSON với:
- "exerciseType": tên loại vận động đã được chuẩn hóa (tiếng Việt có dấu)
- "calories": số calo tiêu thụ (số nguyên)`;

    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      max_tokens: 150,
    });

    const result = JSON.parse(completion.choices[0].message.content);
    
    if (type === 'food') {
      res.json({ 
        calories: result.calories || 0,
        foodName: result.foodName || query // Fallback to original query if AI doesn't return foodName
      });
    } else {
      res.json({ 
        calories: result.calories || 0,
        exerciseType: result.exerciseType || query // Fallback to original query if AI doesn't return exerciseType
      });
    }
  } catch (error) {
    console.error('Calories Estimate Error:', error);
    res.status(500).json({ error: 'Failed to estimate calories' });
  }
};

// Schema validation cho identify disease: input (mô tả tình trạng bệnh)
const identifyDiseaseSchema = z.object({
  body: z.object({
    input: z.string().min(1),
  }),
});

/**
 * Nhận diện tình trạng bệnh lý từ mô tả của user, chuẩn hóa thành tiếng Việt có dấu
 * Luồng: Kiểm tra input rỗng -> Tạo prompt với quy tắc mapping -> Gọi OpenAI -> Parse JSON -> Normalize condition -> Trả về
 */
const identifyDisease = async (req, res) => {
  try {
    if (!openai) {
      return res.status(503).json({ error: 'AI service disabled: missing OPENAI_API_KEY' });
    }
    const { input } = req.body;

    if (!input || !input.trim()) {
      return res.json({ condition: 'Bình thường' });
    }

    const prompt = `Bạn là chuyên gia y tế và chuyên gia ngôn ngữ tiếng Việt. Nhiệm vụ của bạn là:

1. PHÂN TÍCH và CHUẨN HÓA input về tình trạng bệnh lý của người dùng
2. KIỂM TRA CHÍNH TẢ tiếng Việt và thêm dấu đầy đủ nếu thiếu
3. NHẬN DIỆN tên bệnh/tình trạng và trả về bằng TIẾNG VIỆT CÓ DẤU CHUẨN

Input người dùng: "${input}"

QUY TẮC:
- Có khả năng nhận diện TẤT CẢ các loại bệnh từ phổ biến đến hiếm gặp (Tiểu đường, Gút, Xương khớp, Tim mạch, Dạ dày, Ung thư, Hô hấp, Tâm lý...).
- Chuẩn hóa các từ lóng/mô tả thành TÊN BỆNH CHÍNH THỨC y khoa (ví dụ: "đau bao tử" -> "Viêm dạ dày", "đường cao" -> "Tiểu đường").
- Nếu người dùng kể nhiều bệnh, hãy liệt kê chúng ngăn cách bằng dấu phẩy (ví dụ: "Tiểu đường, Bệnh Gút, Tăng huyết áp").
- Trả về danh sách bệnh bằng TIẾNG VIỆT CÓ DẤU CHUẨN (tối đa 50 ký tự).
- Nếu input rỗng, không rõ ràng, hoặc chỉ là chào hỏi → trả về: "Bình thường".

QUAN TRỌNG:
- LUÔN trả về bằng TIẾNG VIỆT CÓ DẤU ĐẦY ĐỦ
- KIỂM TRA và SỬA chính tả tiếng Việt nếu sai
- KHÔNG trả về tiếng Anh (Diabetes, Hypertension, etc.)
- KHÔNG trả về "Other" hoặc "Khác"
- Nếu là tên bệnh cụ thể, trả về tên bệnh tiếng Việt chuẩn
- Nếu là mô tả tình trạng, chuẩn hóa thành câu ngắn gọn, có dấu đầy đủ

Trả về JSON với format: {"condition": "Tên bệnh/tình trạng bằng tiếng Việt có dấu chuẩn"}`;

    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      max_tokens: 100,
      temperature: 0.3, // Lower temperature for more consistent spelling correction
    });

    const result = JSON.parse(completion.choices[0].message.content);
    const condition = result.condition || input.trim();
    
    // Fallback: if AI returns English or "Other", try to normalize
    const normalizedCondition = normalizeCondition(condition);
    
    res.json({ condition: normalizedCondition });
  } catch (error) {
    console.error('Disease Identify Error:', error);
    // Fallback: return normalized input
    const normalizedInput = normalizeCondition(req.body?.input);
    res.json({ condition: normalizedInput });
  }
};

// Helper function to normalize condition (fallback)
const normalizeCondition = (condition) => {
  if (!condition || typeof condition !== 'string') {
    return 'Bình thường';
  }

  const normalized = condition.trim();
  
  // Map common English terms to Vietnamese
  const englishToVietnamese = {
    'diabetes': 'Tiểu đường',
    'hypertension': 'Tăng huyết áp',
    'high blood pressure': 'Tăng huyết áp',
    'obesity': 'Béo phì',
    'gastritis': 'Viêm dạ dày',
    'normal': 'Bình thường',
    'other': normalized, // Keep original if it's "other"
  };

  const lowerNormalized = normalized.toLowerCase();
  if (englishToVietnamese[lowerNormalized]) {
    return englishToVietnamese[lowerNormalized];
  }

  // If it's "Other" or empty, return "Bình thường"
  if (lowerNormalized === 'other' || lowerNormalized === 'khác' || normalized === '') {
    return 'Bình thường';
  }

  // Return normalized input (should already be Vietnamese from AI)
  return normalized;
};

const getHealthRecommendationsSchema = z.object({
  body: z.object({
    medicalCondition: z.string().optional(),
  }),
});

const getHealthRecommendations = async (req, res) => {
  try {
    const medicalCondition = req.body.medicalCondition || req.user?.medicalCondition || 'Normal';

    // ─── DEMO RECOMMENDATIONS by condition ───
    const demoRecommendations = {
      'tiểu đường': [
        { id: 'd1', type: 'DIET', title: 'Kiểm soát carb', description: 'Thay cơm trắng bằng gạo lứt, yến mạch. Chia nhỏ bữa ăn (5-6 bữa/ngày) để ổn định đường huyết.', iconName: 'Utensils', color: 'bg-green-100 text-green-600' },
        { id: 'd2', type: 'EXERCISE', title: 'Đi bộ sau ăn 30 phút', description: 'Đi bộ nhẹ 15-20 phút sau bữa ăn giúp giảm đường huyết sau ăn hiệu quả hơn thuốc.', iconName: 'Footprints', color: 'bg-orange-100 text-orange-600' },
        { id: 'd3', type: 'LIFESTYLE', title: 'Theo dõi đường huyết', description: 'Đo đường huyết lúc đói (trước ăn sáng) và sau ăn 2h. Mục tiêu: 4.4-7.2 mmol/L lúc đói.', iconName: 'Activity', color: 'bg-blue-100 text-blue-600' },
      ],
      'huyết áp': [
        { id: 'h1', type: 'DIET', title: 'Giảm muối', description: 'Hạn chế dưới 5g muối/ngày. Tránh mì gói, đồ hộp, nước mắm. Thay bằng gia vị thảo mộc.', iconName: 'Utensils', color: 'bg-green-100 text-green-600' },
        { id: 'h2', type: 'EXERCISE', title: 'Vận động đều đặn', description: 'Đi bộ nhanh hoặc bơi 150 phút/tuần. Tránh nâng tạ nặng vì tăng huyết áp đột ngột.', iconName: 'Heart', color: 'bg-red-100 text-red-600' },
        { id: 'h3', type: 'LIFESTYLE', title: 'Đo huyết áp tại nhà', description: 'Đo huyết áp 2 lần/ngày (sáng-tối). Mục tiêu: dưới 140/90 mmHg. Ghi sổ theo dõi.', iconName: 'Activity', color: 'bg-blue-100 text-blue-600' },
      ],
      'tim mạch': [
        { id: 't1', type: 'DIET', title: 'Chế độ ăn DASH', description: 'Ăn nhiều rau xanh, cá, hạt. Hạn chế mỡ động vật, đồ chiên rán. Bổ sung omega-3.', iconName: 'Utensils', color: 'bg-green-100 text-green-600' },
        { id: 't2', type: 'EXERCISE', title: 'Cardio nhẹ nhàng', description: 'Đi bộ, đạp xe, bơi 30 phút/ngày, 5 ngày/tuần. Tránh gắng sức quá mức.', iconName: 'Heart', color: 'bg-red-100 text-red-600' },
      ],
      'dạ dày': [
        { id: 'g1', type: 'DIET', title: 'Ăn chậm, nhai kỹ', description: 'Chia nhỏ 5-6 bữa/ngày. Tránh đồ cay, chua, rượu bia, cà phê. Không ăn trước ngủ 3h.', iconName: 'Utensils', color: 'bg-green-100 text-green-600' },
        { id: 'g2', type: 'LIFESTYLE', title: 'Giảm stress', description: 'Stress là nguyên nhân chính gây viêm loét. Tập thiền, yoga hoặc hít thở sâu 10 phút/ngày.', iconName: 'Brain', color: 'bg-purple-100 text-purple-600' },
      ],
      'gout': [
        { id: 'go1', type: 'DIET', title: 'Kiêng purine', description: 'Tránh nội tạng, hải sản, thịt đỏ, bia rượu. Ăn nhiều cherry, dâu tây giúp giảm acid uric.', iconName: 'Utensils', color: 'bg-green-100 text-green-600' },
        { id: 'go2', type: 'LIFESTYLE', title: 'Uống nhiều nước', description: 'Uống 2.5-3 lít nước/ngày để đào thải acid uric qua thận. Tránh nước ngọt có đường.', iconName: 'GlassWater', color: 'bg-blue-100 text-blue-600' },
      ],
    };

    const defaultRecs = [
      { id: 'n1', type: 'LIFESTYLE', title: 'Uống đủ nước', description: 'Cố gắng uống đủ 2 lít nước mỗi ngày để duy trì sức khỏe tổng thể.', iconName: 'GlassWater', color: 'bg-blue-50 text-blue-500' },
      { id: 'n2', type: 'EXERCISE', title: 'Vận động 30 phút/ngày', description: 'Đi bộ, chạy nhẹ hoặc yoga mỗi ngày giúp tăng cường hệ miễn dịch và tinh thần.', iconName: 'Footprints', color: 'bg-orange-100 text-orange-600' },
      { id: 'n3', type: 'DIET', title: 'Ăn đa dạng rau củ', description: 'Bổ sung ít nhất 5 loại rau củ quả khác màu mỗi ngày để đủ vitamin và khoáng chất.', iconName: 'Utensils', color: 'bg-green-100 text-green-600' },
    ];

    if (!openai) {
      // ── DEMO MODE ──
      const condLower = (medicalCondition || '').toLowerCase();
      let recs = defaultRecs;
      for (const [key, val] of Object.entries(demoRecommendations)) {
        if (condLower.includes(key)) { recs = val; break; }
      }
      return res.json({ recommendations: recs, _demo: true });
    }

    if (medicalCondition === 'Normal' || !medicalCondition) {
      return res.json({ recommendations: defaultRecs });
    }

    const prompt = `You are a health expert. Generate 2-3 personalized health recommendations for a Vietnamese patient with medical condition: "${medicalCondition}".

CRITICAL REQUIREMENTS FOR DIVERSITY:
- Provide UNIQUE, UNCOMMON, but scientifically accurate health tips.
- DO NOT repeat common cliches (like generic "drink 2L water" or "eat vegetables") unless deeply tailored to the condition in a novel way.
- Vary the categories (DIET, EXERCISE, LIFESTYLE, MENTAL_HEALTH, SLEEP).
- Ensure high diversity for every request! (Random seed: ${Math.random()})

Requirements:
- Recommendations should be specific, actionable, and suitable for Vietnamese patients
- Each recommendation should have: type (DIET, EXERCISE, or LIFESTYLE), title (short, clear), description (detailed, practical)
- Focus on practical daily habits that help manage the condition
- Use Vietnamese language
- Return JSON object with "recommendations" array containing objects with: id, type, title, description, iconName, color

Example format:
{
  "recommendations": [
    {
      "id": "rec1",
      "type": "DIET",
      "title": "Hạn chế tinh bột",
      "description": "Giảm cơm trắng, thay bằng gạo lứt hoặc yến mạch để kiểm soát đường huyết tốt hơn.",
      "iconName": "Utensils",
      "color": "bg-green-100 text-green-600"
    }
  ]
}`;

    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      max_tokens: 600,
      temperature: 0.9,
    });

    const result = JSON.parse(completion.choices[0].message.content);
    
    // Ensure result has recommendations array
    const recommendations = Array.isArray(result.recommendations) 
      ? result.recommendations 
      : (Array.isArray(result) ? result : []);
    
    res.json({ recommendations });
  } catch (error) {
    console.error('Health Recommendations Error:', error);
    // Fallback to default recommendations on error
    res.json({
      recommendations: [
        {
          id: 'default1',
          type: 'LIFESTYLE',
          title: 'Uống đủ nước',
          description: 'Cố gắng uống đủ 2 lít nước mỗi ngày.',
          iconName: 'GlassWater',
          color: 'bg-blue-50 text-blue-500',
        },
      ],
    });
  }
};

const analyzeReportSchema = z.object({
  body: z.object({
    range: z.enum(['week', 'month']),
    medicalCondition: z.string().optional(),
    reportData: z.object({
      totalCaloriesIn: z.number(),
      totalCaloriesOut: z.number(),
      meals: z.array(z.object({
        foodName: z.string(),
        calories: z.number(),
        date: z.string().optional(),
      })).optional(),
      exercises: z.array(z.object({
        exerciseType: z.string(),
        durationMinutes: z.number(),
        caloriesBurned: z.number(),
      })).optional(),
      symptoms: z.array(z.object({
        symptomName: z.string(),
        severity: z.number(),
        note: z.string().optional(),
      })).optional(),
    }),
  }),
});

const analyzeReport = async (req, res) => {
  try {
    const { range, medicalCondition, reportData } = req.body;
    const userId = req.user._id;
    
    // Check if we have a cached result in database
    const today = new Date();
    const dateKey = today.toISOString().split('T')[0]; // YYYY-MM-DD
    
    // Calculate expiresAt: 12:00 of the next day (so it expires after 12h or when new day starts)
    const expiresAt = new Date(today);
    expiresAt.setDate(expiresAt.getDate() + 1); // Tomorrow
    expiresAt.setHours(12, 0, 0, 0); // 12:00 tomorrow
    
    const AIReport = require('../models/AIReport');
    
    // Try to find existing report
    const existingReport = await AIReport.findOne({
      userId,
      range,
      medicalCondition: medicalCondition || 'none',
      dateKey,
    });
    
    // Check if existing report is still valid (not expired)
    if (existingReport && existingReport.expiresAt > today) {
      return res.json({ notes: existingReport.notes });
    }
    
    // If expired or not found, check if we need to generate new one
    if (!openai) {
      // If AI is disabled but we have expired cache, return it
      if (existingReport) {
        return res.json({ notes: existingReport.notes });
      }
      return res.status(503).json({ error: 'AI service disabled: missing OPENAI_API_KEY' });
    }

    // Group meals by date
    const mealsByDate = {};
    if (reportData.meals && reportData.meals.length > 0) {
      reportData.meals.forEach((meal) => {
        const dateKey = meal.date || new Date().toISOString().split('T')[0];
        if (!mealsByDate[dateKey]) {
          mealsByDate[dateKey] = [];
        }
        mealsByDate[dateKey].push({ foodName: meal.foodName, calories: meal.calories });
      });
    }

    const mealsByDateText = Object.keys(mealsByDate).map(date => {
      const meals = mealsByDate[date];
      return `  - ${date}: ${meals.map(m => m.foodName).join(', ')}`;
    }).join('\n');

    const exercisesText = reportData.exercises && reportData.exercises.length > 0
      ? reportData.exercises.map((e) => `  - ${e.exerciseType}: ${e.durationMinutes} phút`).join('\n')
      : '  - Chưa có vận động';

    const prompt = `Bạn là chuyên gia sức khỏe phân tích báo cáo sức khỏe của bệnh nhân cho ${range === 'week' ? 'tuần này' : 'tháng này'}.

Tình trạng bệnh lý: ${medicalCondition || 'Không xác định'}

Bữa ăn theo ngày:
${mealsByDateText || '  - Chưa có dữ liệu'}

Vận động:
${exercisesText}

${reportData.symptoms && reportData.symptoms.length > 0 ? `Triệu chứng:\n${reportData.symptoms.map((s) => `  - ${s.symptomName} (mức độ: ${s.severity}/10${s.note ? `, ghi chú: ${s.note}` : ''})`).join('\n')}` : 'Triệu chứng: Không có'}

Hãy phân tích và đưa ra lưu ý bằng tiếng Việt (200-300 từ) theo các điểm sau:
1. **Ăn uống**: Phân tích xem các món ăn có phù hợp với tình trạng bệnh "${medicalCondition || 'của bệnh nhân'}" không. Nếu có món ăn không hợp lý, hãy chỉ rõ ngày nào và món gì không nên ăn, tại sao, và nên thay thế bằng gì.
2. **Vận động**: Đánh giá xem bệnh nhân đã vận động đủ chưa (dựa vào tần suất và thời gian, KHÔNG dựa vào calories). Nếu chưa đủ, đưa ra khuyến nghị cụ thể.
3. **Triệu chứng**: Nếu có triệu chứng, đưa ra lời khuyên về cách xử lý phù hợp với tình trạng bệnh.

Trả về JSON với property "notes" chứa phân tích.`;

    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      max_tokens: 500,
    });

    const result = JSON.parse(completion.choices[0].message.content);
    const notes = result.notes || result.analysis || 'Không có lưu ý đặc biệt.';
    
    // Save or update in database
    await AIReport.findOneAndUpdate(
      {
        userId,
        range,
        medicalCondition: medicalCondition || 'none',
        dateKey,
      },
      {
        userId,
        range,
        medicalCondition: medicalCondition || 'none',
        dateKey,
        notes,
        expiresAt,
      },
      {
        upsert: true,
        new: true,
      }
    );
    
    res.json({ notes });
  } catch (error) {
    console.error('Report Analysis Error:', error);
    res.status(500).json({ error: 'Failed to analyze report' });
  }
};

const getChatHistory = async (req, res) => {
  try {
    const ChatMessage = require('../models/ChatMessage');
    const userId = req.user._id;
    const messages = await ChatMessage.find({ userId })
      .sort({ timestamp: -1 })
      .limit(50)
      .select('message response sender timestamp')
      .lean();
    messages.reverse();
    res.json({ messages });
  } catch (error) {
    console.error('Get Chat History Error:', error);
    res.status(500).json({ error: 'Failed to get chat history' });
  }
};

const suggestMedications = async (req, res) => {
  try {
    const { medicalCondition, symptoms = [], partialDrugName = '' } = req.body;

    if (!openai) {
      // ===== DEMO MODE — Bộ thuốc mở rộng =====
      const demoMap = {

        // ─── ĐÁI THÁO ĐƯỜNG / TIỂU ĐƯỜNG ───────────────────────────────────
        'tiểu đường': [
          { name: 'Metformin 500mg',           dosage: '1 viên/lần', sessions: ['MORNING','EVENING'],       mealTiming: 'AFTER_MEAL',  notes: 'Uống cùng bữa ăn để giảm rối loạn tiêu hoá', reason: 'Thuốc nền hàng đầu cho ĐTĐ type 2, giảm đề kháng insulin' },
          { name: 'Glipizide 5mg',             dosage: '1 viên/lần', sessions: ['MORNING'],                 mealTiming: 'BEFORE_MEAL', notes: 'Uống 30 phút trước bữa sáng',                  reason: 'Kích thích tuỵ tụy tiết insulin, kiểm soát đường huyết sau ăn' },
          { name: 'Sitagliptin 100mg',         dosage: '1 viên/lần', sessions: ['MORNING'],                 mealTiming: 'AFTER_MEAL',  notes: 'Không cần chỉnh liều khi dùng đơn độc',         reason: 'Ức chế DPP-4, tăng GLP-1 nội sinh, ít hạ đường huyết' },
          { name: 'Empagliflozin 10mg',        dosage: '1 viên/lần', sessions: ['MORNING'],                 mealTiming: 'AFTER_MEAL',  notes: 'Uống đủ nước, theo dõi nhiễm trùng sinh dục',   reason: 'SGLT2i — giảm đường huyết + bảo vệ tim mạch & thận' },
          { name: 'Vitamin B1 (Thiamine) 100mg',dosage: '1 viên/lần',sessions: ['MORNING'],                 mealTiming: 'AFTER_MEAL',  notes: 'Bảo vệ dây thần kinh ngoại biên',               reason: 'Phòng biến chứng thần kinh do đái tháo đường' },
        ],
        'diabetes': [
          { name: 'Metformin 500mg',           dosage: '1 tab/dose', sessions: ['MORNING','EVENING'],       mealTiming: 'AFTER_MEAL',  notes: 'Take with meal',                                reason: 'First-line therapy for T2DM' },
          { name: 'Glipizide 5mg',             dosage: '1 tab/dose', sessions: ['MORNING'],                 mealTiming: 'BEFORE_MEAL', notes: '30 min before breakfast',                       reason: 'Sulfonylurea — stimulates insulin secretion' },
          { name: 'Empagliflozin 10mg',        dosage: '1 tab/dose', sessions: ['MORNING'],                 mealTiming: 'AFTER_MEAL',  notes: 'Monitor for UTI',                               reason: 'SGLT2i with cardioprotective benefit' },
        ],

        // ─── HUYẾT ÁP / TIM MẠCH ────────────────────────────────────────────
        'huyết áp': [
          { name: 'Amlodipine 5mg',            dosage: '1 viên/lần', sessions: ['MORNING'],                 mealTiming: 'AFTER_MEAL',  notes: 'Uống cùng giờ mỗi ngày',                        reason: 'CCB — giãn mạch ngoại biên, hạ huyết áp hiệu quả' },
          { name: 'Losartan 50mg',             dosage: '1 viên/lần', sessions: ['MORNING'],                 mealTiming: 'AFTER_MEAL',  notes: 'Bảo vệ thận, giảm protein niệu',               reason: 'ARB — chẹn thụ thể Angiotensin II' },
          { name: 'Perindopril 5mg',           dosage: '1 viên/lần', sessions: ['MORNING'],                 mealTiming: 'BEFORE_MEAL', notes: 'Theo dõi ho khan',                              reason: 'ACEi — bảo vệ cơ quan đích, giảm nguy cơ tim mạch' },
          { name: 'Hydrochlorothiazide 25mg',  dosage: '1 viên/lần', sessions: ['MORNING'],                 mealTiming: 'AFTER_MEAL',  notes: 'Theo dõi Kali máu định kỳ',                    reason: 'Lợi tiểu thiazid — giảm thể tích tuần hoàn' },
          { name: 'Bisoprolol 5mg',            dosage: '1 viên/lần', sessions: ['MORNING'],                 mealTiming: 'AFTER_MEAL',  notes: 'Không ngừng đột ngột',                         reason: 'Beta-blocker — giảm nhịp tim, bảo vệ tim' },
        ],
        'tim mạch': [
          { name: 'Aspirin 81mg',              dosage: '1 viên/lần', sessions: ['MORNING'],                 mealTiming: 'AFTER_MEAL',  notes: 'Dùng kèm Omeprazole bảo vệ dạ dày',           reason: 'Chống kết tập tiểu cầu, phòng NMCT và đột quỵ' },
          { name: 'Atorvastatin 20mg',         dosage: '1 viên/lần', sessions: ['EVENING'],                 mealTiming: 'AFTER_MEAL',  notes: 'Uống buổi tối, theo dõi men gan',               reason: 'Statin — hạ LDL, ổn định mảng xơ vữa' },
          { name: 'Clopidogrel 75mg',          dosage: '1 viên/lần', sessions: ['MORNING'],                 mealTiming: 'AFTER_MEAL',  notes: 'Không tự ý ngừng thuốc',                       reason: 'Chống kết tập tiểu cầu — bổ sung cùng Aspirin sau stenting' },
          { name: 'Bisoprolol 5mg',            dosage: '1 viên/lần', sessions: ['MORNING'],                 mealTiming: 'AFTER_MEAL',  notes: 'Không ngừng đột ngột',                         reason: 'Beta-blocker — kiểm soát nhịp tim, giảm gánh nặng cơ tim' },
          { name: 'Furosemide 40mg',           dosage: '1 viên/lần', sessions: ['MORNING'],                 mealTiming: 'AFTER_MEAL',  notes: 'Uống buổi sáng tránh tiểu đêm',               reason: 'Lợi tiểu quai — giảm phù, giảm tải tiền gánh' },
        ],

        // ─── HÔ HẤP ─────────────────────────────────────────────────────────
        'viêm phế quản': [
          { name: 'Amoxicillin 500mg',         dosage: '1 viên/lần', sessions: ['MORNING','NOON','EVENING'],mealTiming: 'AFTER_MEAL',  notes: 'Uống đủ 7 ngày dù hết triệu chứng',            reason: 'Kháng sinh beta-lactam cho nhiễm khuẩn hô hấp' },
          { name: 'Salbutamol 4mg',            dosage: '1 viên/lần', sessions: ['MORNING','EVENING'],       mealTiming: 'AFTER_MEAL',  notes: 'Có thể run tay, tim đập nhanh',                reason: 'Beta2-agonist — giãn phế quản, giảm khó thở' },
          { name: 'Prednisolone 5mg',          dosage: '2 viên/lần', sessions: ['MORNING'],                 mealTiming: 'AFTER_MEAL',  notes: 'Uống cùng bữa sáng, không tự dừng',           reason: 'Corticosteroid — chống viêm, giảm phù nề đường thở' },
          { name: 'Bromhexine 8mg',            dosage: '1 viên/lần', sessions: ['MORNING','NOON','EVENING'],mealTiming: 'AFTER_MEAL',  notes: 'Hỗ trợ loãng đờm',                            reason: 'Tiêu nhầy — làm loãng đờm giúp tống xuất dễ hơn' },
          { name: 'Cetirizine 10mg',           dosage: '1 viên/lần', sessions: ['EVENING'],                 mealTiming: 'AFTER_MEAL',  notes: 'Có thể gây buồn ngủ',                         reason: 'Kháng Histamine — giảm tiết dịch mũi họng' },
        ],
        'hen suyễn': [
          { name: 'Salbutamol (Ventolin) 4mg', dosage: '1 viên/lần', sessions: ['MORNING','EVENING'],       mealTiming: 'AFTER_MEAL',  notes: 'Thuốc cắt cơn khẩn cấp',                      reason: 'Beta2-agonist tác dụng nhanh, giãn phế quản' },
          { name: 'Budesonide/Formoterol',     dosage: '1 hít/lần',  sessions: ['MORNING','EVENING'],       mealTiming: 'BEFORE_MEAL', notes: 'Súc miệng sau khi hít',                       reason: 'ICS+LABA — kiểm soát hen lâu dài' },
          { name: 'Montelukast 10mg',          dosage: '1 viên/lần', sessions: ['EVENING'],                 mealTiming: 'AFTER_MEAL',  notes: 'Uống tối trước khi ngủ',                      reason: 'Đối kháng Leukotriene — giảm viêm, phòng co thắt phế quản' },
          { name: 'Prednisolone 5mg',          dosage: '2 viên/lần', sessions: ['MORNING'],                 mealTiming: 'AFTER_MEAL',  notes: 'Dùng ngắn ngày khi cơn bùng phát',            reason: 'Corticosteroid uống — kiểm soát đợt cấp hen' },
        ],

        // ─── TIÊU HOÁ ────────────────────────────────────────────────────────
        'dạ dày': [
          { name: 'Omeprazole 20mg',           dosage: '1 viên/lần', sessions: ['MORNING'],                 mealTiming: 'BEFORE_MEAL', notes: 'Uống 30 phút trước bữa sáng',                  reason: 'PPI — ức chế bơm proton, giảm acid dạ dày mạnh nhất' },
          { name: 'Sucralfate 1g',             dosage: '1 gói/lần',  sessions: ['MORNING','NOON','EVENING'],mealTiming: 'BEFORE_MEAL', notes: 'Uống 1 giờ trước bữa ăn',                     reason: 'Băng niêm mạc — bảo vệ ổ loét khỏi acid' },
          { name: 'Domperidone 10mg',          dosage: '1 viên/lần', sessions: ['MORNING','NOON','EVENING'],mealTiming: 'BEFORE_MEAL', notes: 'Uống 30 phút trước ăn',                       reason: 'Chống nôn, tăng nhu động dạ dày' },
          { name: 'Metronidazole 500mg',       dosage: '1 viên/lần', sessions: ['MORNING','EVENING'],       mealTiming: 'AFTER_MEAL',  notes: 'Kiêng rượu trong và 48h sau điều trị',         reason: 'Diệt H. pylori trong phác đồ 3 thuốc' },
          { name: 'Clarithromycin 500mg',      dosage: '1 viên/lần', sessions: ['MORNING','EVENING'],       mealTiming: 'AFTER_MEAL',  notes: 'Uống đủ liệu trình 14 ngày',                  reason: 'Kháng sinh trong phác đồ diệt H. pylori' },
        ],
        'táo bón': [
          { name: 'Macrogol (PEG) 3350',       dosage: '1 gói/lần',  sessions: ['MORNING'],                 mealTiming: 'AFTER_MEAL',  notes: 'Pha với 250ml nước, uống hết',                reason: 'Nhuận tràng thẩm thấu — làm mềm phân hiệu quả' },
          { name: 'Bisacodyl 5mg',             dosage: '1-2 viên/lần',sessions: ['EVENING'],                mealTiming: 'AFTER_MEAL',  notes: 'Uống tối, không nhai/bẻ viên',                reason: 'Nhuận tràng kích thích — tác dụng sau 8-10 giờ' },
          { name: 'Lactulose 15ml',            dosage: '15ml/lần',   sessions: ['MORNING'],                 mealTiming: 'AFTER_MEAL',  notes: 'Hòa với nước hoặc nước trái cây',             reason: 'Nhuận tràng thẩm thấu cho trẻ em và người cao tuổi' },
        ],
        'tiêu chảy': [
          { name: 'Loperamide 2mg',            dosage: '2 viên đầu, 1 viên/lần sau',sessions:['MORNING','NOON','EVENING'],mealTiming:'AFTER_MEAL',notes:'Không dùng quá 16mg/ngày',reason:'Giảm nhu động ruột, cầm tiêu chảy' },
          { name: 'Oresol (ORS)',              dosage: '1 gói/200ml', sessions: ['MORNING','NOON','EVENING'],mealTiming: 'AFTER_MEAL',  notes: 'Pha đúng lượng nước, không thêm đường',       reason: 'Bù điện giải — phòng mất nước do tiêu chảy' },
          { name: 'Smecta 3g',                dosage: '1 gói/lần',  sessions: ['MORNING','NOON','EVENING'],mealTiming: 'BEFORE_MEAL', notes: 'Pha với 100ml nước, uống trước ăn',            reason: 'Hấp phụ độc tố, bảo vệ niêm mạc ruột' },
        ],

        // ─── THẦN KINH / ĐAU ────────────────────────────────────────────────
        'đau đầu': [
          { name: 'Paracetamol 500mg',         dosage: '1-2 viên/lần',sessions: ['MORNING','NOON','EVENING'],mealTiming:'AFTER_MEAL', notes: 'Uống khi đau, không quá 8 viên/ngày',         reason: 'Giảm đau an toàn, ít tác dụng phụ' },
          { name: 'Ibuprofen 400mg',           dosage: '1 viên/lần', sessions: ['MORNING','NOON','EVENING'],mealTiming: 'AFTER_MEAL',  notes: 'Dùng kèm thức ăn tránh kích thích dạ dày',    reason: 'NSAID chống viêm, giảm đau migraine hiệu quả' },
          { name: 'Sumatriptan 50mg',          dosage: '1 viên/lần', sessions: ['MORNING'],                 mealTiming: 'AFTER_MEAL',  notes: 'Chỉ dùng khi cơn migraine bắt đầu',           reason: 'Triptan — đặc hiệu cho migraine, co mạch não' },
          { name: 'Amitriptyline 25mg',        dosage: '1 viên/lần', sessions: ['EVENING'],                 mealTiming: 'AFTER_MEAL',  notes: 'Dùng tối vì gây buồn ngủ, phòng ngừa migraine',reason: 'Chống trầm cảm 3 vòng — phòng ngừa đau đầu mạn' },
        ],
        'đau lưng': [
          { name: 'Ibuprofen 400mg',           dosage: '1 viên/lần', sessions: ['MORNING','NOON','EVENING'],mealTiming: 'AFTER_MEAL',  notes: 'Dùng kèm bữa ăn để giảm kích ứng dạ dày',    reason: 'NSAID — chống viêm, giảm đau cơ xương hiệu quả' },
          { name: 'Diclofenac 50mg',           dosage: '1 viên/lần', sessions: ['MORNING','EVENING'],       mealTiming: 'AFTER_MEAL',  notes: 'Không dùng khi có bệnh tim mạch nặng',        reason: 'NSAID mạnh — giảm đau, chống viêm khớp' },
          { name: 'Methocarbamol 750mg',       dosage: '1 viên/lần', sessions: ['MORNING','NOON','EVENING'],mealTiming: 'AFTER_MEAL',  notes: 'Có thể gây buồn ngủ, chóng mặt',             reason: 'Giãn cơ — giảm co thắt cơ lưng' },
          { name: 'Omeprazole 20mg',           dosage: '1 viên/lần', sessions: ['MORNING'],                 mealTiming: 'BEFORE_MEAL', notes: 'Bảo vệ dạ dày khi dùng NSAIDs',              reason: 'PPI — phòng loét dạ dày khi dùng thuốc chống viêm dài ngày' },
        ],

        // ─── NHIỄM TRÙNG / SỐT ──────────────────────────────────────────────
        'viêm họng': [
          { name: 'Amoxicillin 500mg',         dosage: '1 viên/lần', sessions: ['MORNING','NOON','EVENING'],mealTiming: 'AFTER_MEAL',  notes: 'Uống đủ 7-10 ngày',                           reason: 'Kháng sinh beta-lactam điều trị viêm họng do liên cầu' },
          { name: 'Paracetamol 500mg',         dosage: '1-2 viên/lần',sessions:['MORNING','NOON','EVENING'],mealTiming:'AFTER_MEAL',  notes: 'Hạ sốt, giảm đau họng',                      reason: 'Giảm đau hạ sốt an toàn' },
          { name: 'Strepsils Đỏ',              dosage: '1 viên ngậm', sessions: ['MORNING','NOON','EVENING'],mealTiming: 'AFTER_MEAL', notes: 'Ngậm tan từ từ, không nhai',                  reason: 'Sát khuẩn tại chỗ, giảm đau rát họng' },
          { name: 'Cetirizine 10mg',           dosage: '1 viên/lần', sessions: ['EVENING'],                 mealTiming: 'AFTER_MEAL',  notes: 'Dùng tối để tránh buồn ngủ ban ngày',         reason: 'Kháng Histamine giảm viêm, kháng nhầy' },
        ],
        'sốt': [
          { name: 'Paracetamol 500mg',         dosage: '1-2 viên/lần',sessions:['MORNING','NOON','EVENING'],mealTiming:'AFTER_MEAL',  notes: 'Uống cách nhau ít nhất 4 giờ',               reason: 'Hạ sốt an toàn, hiệu quả nhanh' },
          { name: 'Ibuprofen 400mg',           dosage: '1 viên/lần', sessions: ['MORNING','NOON','EVENING'],mealTiming: 'AFTER_MEAL',  notes: 'Luân phiên với Paracetamol nếu sốt cao',     reason: 'NSAID hạ sốt và chống viêm, dùng xen kẽ Paracetamol' },
          { name: 'Vitamin C 500mg',           dosage: '1 viên/lần', sessions: ['MORNING'],                 mealTiming: 'AFTER_MEAL',  notes: 'Tăng cường hệ miễn dịch',                    reason: 'Hỗ trợ miễn dịch khi sốt, rút ngắn thời gian mắc bệnh' },
          { name: 'Oresol (ORS)',              dosage: '1 gói/200ml', sessions: ['MORNING','NOON','EVENING'],mealTiming: 'AFTER_MEAL',  notes: 'Bù nước mất do sốt cao',                    reason: 'Bù điện giải, dự phòng mất nước khi sốt' },
        ],

        // ─── CƠ XƯƠNG KHỚP ───────────────────────────────────────────────────
        'gout': [
          { name: 'Allopurinol 300mg',         dosage: '1 viên/lần', sessions: ['MORNING'],                 mealTiming: 'AFTER_MEAL',  notes: 'Bắt đầu 2-4 tuần sau cơn cấp',               reason: 'Ức chế Xanthine oxidase — giảm acid uric máu lâu dài' },
          { name: 'Colchicine 0.6mg',          dosage: '1 viên/lần', sessions: ['MORNING','EVENING'],       mealTiming: 'AFTER_MEAL',  notes: 'Giảm liều nếu có suy thận',                  reason: 'Chống viêm đặc hiệu cho gout — giảm cơn cấp' },
          { name: 'Indomethacin 25mg',         dosage: '1 viên/lần', sessions: ['MORNING','NOON','EVENING'],mealTiming: 'AFTER_MEAL',  notes: 'Tránh dùng khi suy thận, loét dạ dày',       reason: 'NSAID mạnh — điều trị cơn gout cấp nhanh' },
          { name: 'Omeprazole 20mg',           dosage: '1 viên/lần', sessions: ['MORNING'],                 mealTiming: 'BEFORE_MEAL', notes: 'Bảo vệ dạ dày khi dùng NSAIDs',              reason: 'PPI bảo vệ dạ dày khi dùng Indomethacin' },
        ],
        'viêm khớp': [
          { name: 'Diclofenac 50mg',           dosage: '1 viên/lần', sessions: ['MORNING','EVENING'],       mealTiming: 'AFTER_MEAL',  notes: 'Dùng liều thấp nhất đạt hiệu quả',           reason: 'NSAID — chống viêm, giảm đau khớp' },
          { name: 'Prednisolone 5mg',          dosage: '1-2 viên/lần',sessions:['MORNING'],                 mealTiming: 'AFTER_MEAL',  notes: 'Không ngừng đột ngột',                       reason: 'Corticosteroid — kiểm soát viêm khớp đợt cấp' },
          { name: 'Hydroxychloroquine 200mg',  dosage: '1 viên/lần', sessions: ['MORNING'],                 mealTiming: 'AFTER_MEAL',  notes: 'Kiểm tra mắt mỗi 6 tháng',                   reason: 'DMARD — điều trị nền viêm khớp dạng thấp' },
          { name: 'Calcium carbonate 500mg',   dosage: '1 viên/lần', sessions: ['MORNING','EVENING'],       mealTiming: 'AFTER_MEAL',  notes: 'Nhai hoặc nuốt với nước',                    reason: 'Bổ sung canxi phòng loãng xương khi dùng corticosteroid' },
        ],

        // ─── DỊ ỨNG / DA LIỄU ────────────────────────────────────────────────
        'dị ứng': [
          { name: 'Loratadine 10mg',           dosage: '1 viên/lần', sessions: ['MORNING'],                 mealTiming: 'AFTER_MEAL',  notes: 'Không gây buồn ngủ',                         reason: 'Kháng Histamine thế hệ 2 — an toàn, ít tác dụng phụ' },
          { name: 'Cetirizine 10mg',           dosage: '1 viên/lần', sessions: ['EVENING'],                 mealTiming: 'AFTER_MEAL',  notes: 'Có thể gây buồn ngủ nhẹ',                    reason: 'Kháng H1 — hiệu quả cao cho dị ứng mũi, mề đay' },
          { name: 'Fexofenadine 180mg',        dosage: '1 viên/lần', sessions: ['MORNING'],                 mealTiming: 'AFTER_MEAL',  notes: 'Không gây buồn ngủ, không tương tác Grapefruit',reason: 'Kháng H1 thế hệ 3 — ít tác dụng phụ nhất' },
          { name: 'Methylprednisolone 4mg',    dosage: '1-2 viên/lần',sessions:['MORNING'],                 mealTiming: 'AFTER_MEAL',  notes: 'Dùng ngắn ngày khi dị ứng nặng',             reason: 'Corticosteroid — kiểm soát phản ứng dị ứng nặng' },
        ],

        // ─── TÂM THẦN / GIẤC NGỦ ─────────────────────────────────────────────
        'mất ngủ': [
          { name: 'Melatonin 3mg',             dosage: '1 viên/lần', sessions: ['EVENING'],                 mealTiming: 'AFTER_MEAL',  notes: 'Uống 30-60 phút trước ngủ',                  reason: 'Điều hoà đồng hồ sinh học — không gây nghiện' },
          { name: 'Zolpidem 5mg',              dosage: '1 viên/lần', sessions: ['EVENING'],                 mealTiming: 'AFTER_MEAL',  notes: 'Chỉ dùng ngắn ngày (≤2 tuần), không lái xe', reason: 'Benzodiazepine-like — gây ngủ nhanh' },
          { name: 'Hydroxyzine 25mg',          dosage: '1 viên/lần', sessions: ['EVENING'],                 mealTiming: 'AFTER_MEAL',  notes: 'Không gây nghiện, an toàn hơn Zolpidem',     reason: 'Kháng Histamine — an thần nhẹ, hỗ trợ giấc ngủ' },
        ],
        'trầm cảm': [
          { name: 'Sertraline 50mg',           dosage: '1 viên/lần', sessions: ['MORNING'],                 mealTiming: 'AFTER_MEAL',  notes: 'Tác dụng sau 2-4 tuần, không bỏ thuốc đột ngột',reason: 'SSRI — điều trị trầm cảm và lo âu, ít tác dụng phụ' },
          { name: 'Escitalopram 10mg',         dosage: '1 viên/lần', sessions: ['MORNING'],                 mealTiming: 'AFTER_MEAL',  notes: 'Dùng cùng giờ mỗi ngày',                     reason: 'SSRI thế hệ mới — SSRI chọn lọc nhất, dùng được cho lo âu' },
          { name: 'Vitamin D3 1000 IU',        dosage: '1 viên/lần', sessions: ['MORNING'],                 mealTiming: 'AFTER_MEAL',  notes: 'Hấp thu tốt hơn khi uống cùng bữa có chất béo',reason: 'Thiếu Vitamin D liên quan trầm cảm, bổ sung hỗ trợ điều trị' },
        ],

        // ─── THẬN / TIẾT NIỆU ────────────────────────────────────────────────
        'sỏi thận': [
          { name: 'Tamsulosin 0.4mg',          dosage: '1 viên/lần', sessions: ['EVENING'],                 mealTiming: 'AFTER_MEAL',  notes: 'Uống tối, giảm nguy cơ tụt áp',              reason: 'Alpha-blocker — giãn niệu quản, hỗ trợ tống sỏi nhỏ' },
          { name: 'Potassium Citrate 1080mg',  dosage: '1 viên/lần', sessions: ['MORNING','NOON','EVENING'],mealTiming: 'AFTER_MEAL',  notes: 'Uống với nhiều nước',                         reason: 'Kiềm hoá nước tiểu — phòng và điều trị sỏi acid uric' },
          { name: 'Ibuprofen 400mg',           dosage: '1 viên/lần', sessions: ['MORNING','NOON'],          mealTiming: 'AFTER_MEAL',  notes: 'Giảm đau khi cơn sỏi cấp',                   reason: 'NSAID — giảm cơn đau quặn thận' },
        ],
        'nhiễm trùng tiết niệu': [
          { name: 'Nitrofurantoin 100mg',      dosage: '1 viên/lần', sessions: ['MORNING','NOON','EVENING'],mealTiming: 'AFTER_MEAL',  notes: 'Uống đủ 5-7 ngày',                           reason: 'Kháng sinh điều trị UTI không biến chứng' },
          { name: 'Trimethoprim-Sulfamethoxazole 800/160mg',dosage:'1 viên/lần',sessions:['MORNING','EVENING'],mealTiming:'AFTER_MEAL',notes:'Uống nhiều nước',reason:'Kháng sinh phổ rộng điều trị UTI' },
          { name: 'Paracetamol 500mg',         dosage: '1-2 viên/lần',sessions:['MORNING','NOON','EVENING'],mealTiming:'AFTER_MEAL',  notes: 'Giảm đau khi tiểu buốt',                    reason: 'Giảm đau hỗ trợ khi nhiễm trùng tiết niệu' },
        ],

        // ─── MẮT / TAI MŨI HỌNG ──────────────────────────────────────────────
        'viêm xoang': [
          { name: 'Amoxicillin-Clavulanate 875/125mg',dosage:'1 viên/lần',sessions:['MORNING','EVENING'],mealTiming:'AFTER_MEAL',notes:'Uống đủ 10-14 ngày',reason:'Kháng sinh beta-lactam/enzyme ức chế cho viêm xoang vi khuẩn' },
          { name: 'Fluticasone xịt mũi 50mcg',dosage:'2 nhát/mũi/lần',sessions:['MORNING'],             mealTiming: 'BEFORE_MEAL', notes: 'Xịt đúng kỹ thuật, hướng về phía má',         reason: 'Corticosteroid tại chỗ — giảm viêm niêm mạc xoang' },
          { name: 'Xylometazoline 0.1%',       dosage: '2-3 nhát/mũi',sessions: ['MORNING','EVENING'],   mealTiming: 'BEFORE_MEAL', notes: 'Không dùng quá 5 ngày',                       reason: 'Thông mũi tức thì, giảm nghẹt xoang' },
          { name: 'Cetirizine 10mg',           dosage: '1 viên/lần', sessions: ['EVENING'],               mealTiming: 'AFTER_MEAL',  notes: 'Giảm tiết nhầy và ngứa mũi',                 reason: 'Kháng H1 — giảm viêm dị ứng trong viêm xoang' },
        ],
      };

      // ─── Gợi ý chung nếu không khớp nhóm bệnh ──────────────────────────
      const defaultSuggestions = [
        { name: 'Paracetamol 500mg',           dosage: '1-2 viên/lần',sessions:['MORNING','EVENING'],mealTiming:'AFTER_MEAL',notes:'Không quá 4g/ngày',          reason: 'Giảm đau, hạ sốt đa năng, an toàn' },
        { name: 'Vitamin C 500mg',             dosage: '1 viên/lần', sessions:['MORNING'],          mealTiming:'AFTER_MEAL',notes:'Tăng đề kháng',                reason: 'Hỗ trợ hệ miễn dịch, rút ngắn thời gian bệnh' },
        { name: 'Vitamin B-complex',           dosage: '1 viên/lần', sessions:['MORNING'],          mealTiming:'AFTER_MEAL',notes:'Uống cùng bữa sáng',           reason: 'Bồi bổ thể trạng, hỗ trợ chức năng thần kinh' },
        { name: 'Vitamin D3 1000 IU',          dosage: '1 viên/lần', sessions:['MORNING'],          mealTiming:'AFTER_MEAL',notes:'Uống cùng bữa có chất béo',    reason: 'Đa số dân số thiếu Vitamin D, cần bổ sung' },
        { name: 'Omeprazole 20mg',             dosage: '1 viên/lần', sessions:['MORNING'],          mealTiming:'BEFORE_MEAL',notes:'Trước ăn 30 phút',            reason: 'Bảo vệ dạ dày khi dùng kháng sinh hoặc NSAIDs' },
      ];

      const condLower = (medicalCondition || '').toLowerCase();
      let suggestions = defaultSuggestions;

      // Tìm match tốt nhất — check tất cả keys
      let bestMatchLen = 0;
      for (const [key, val] of Object.entries(demoMap)) {
        if (condLower.includes(key) && key.length > bestMatchLen) {
          suggestions = val;
          bestMatchLen = key.length;
        }
      }

      // Lọc thêm theo tên thuốc đang gõ
      if (partialDrugName.trim()) {
        const filtered = suggestions.filter(s => s.name.toLowerCase().includes(partialDrugName.toLowerCase()));
        if (filtered.length > 0) suggestions = filtered;
      }

      // Cũng tìm cross-category nếu gõ tên thuốc
      if (partialDrugName.trim() && suggestions === defaultSuggestions) {
        const allDrugs = Object.values(demoMap).flat();
        const crossFiltered = allDrugs.filter(s => s.name.toLowerCase().includes(partialDrugName.toLowerCase()));
        if (crossFiltered.length > 0) suggestions = crossFiltered.slice(0, 5);
      }

      return res.json({
        suggestions: suggestions.slice(0, 5),
        _demo: true,
        _note: 'Chế độ Demo — thêm OPENAI_API_KEY hợp lệ (sk-...) vào server/.env để dùng AI thật',
      });
    }

    // ===== LIVE MODE =====
    const symptomText = symptoms.length > 0
      ? `Các triệu chứng gần nhất: ${symptoms.map(s => `${s.symptomName} (mức ${s.severity}/10)`).join(', ')}.`
      : 'Không có log triệu chứng gần đây.';
    const partialHint = partialDrugName ? `Bác sĩ đang gõ: "${partialDrugName}". Ưu tiên thuốc tên tương tự.` : '';
    const prompt = `Bạn là dược sĩ lâm sàng VN. Bệnh nhân: ${medicalCondition || 'Chưa xác định'}. ${symptomText} ${partialHint} Gợi ý tối đa 5 thuốc. Trả JSON: {"suggestions":[{"name":"","dosage":"","sessions":["MORNING"],"mealTiming":"AFTER_MEAL","notes":"","reason":""}]}. Chỉ JSON.`;

    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      max_tokens: 800,
    });
    res.json(JSON.parse(completion.choices[0].message.content));
  } catch (error) {
    console.error('Suggest Medications Error:', error);
    res.status(500).json({ error: 'Không thể gợi ý thuốc: ' + error.message });
  }
};

const checkDrugInteractions = async (req, res) => {
  try {
    const { drugs } = req.body;
    if (!drugs || drugs.length < 2) {
      return res.json({ interactions: [], safe: true, summary: 'Cần ít nhất 2 thuốc để kiểm tra tương tác.' });
    }

    if (!openai) {
      // ===== DEMO MODE — Bộ tương tác mở rộng =====
      const knownPairs = [
        // ─── SEVERE ───────────────────────────────────────────────────────────
        { a: 'warfarin',       b: 'aspirin',          severity: 'SEVERE',   description: 'Tăng mạnh nguy cơ chảy máu nghiêm trọng — ức chế đồng thời đông máu và kết tập tiểu cầu.', recommendation: 'Chống chỉ định kết hợp; nếu bắt buộc phải có theo dõi INR chặt chẽ và ổ loét.' },
        { a: 'warfarin',       b: 'ibuprofen',        severity: 'SEVERE',   description: 'NSAIDs ức chế kết tập tiểu cầu và tăng nồng độ warfarin, nguy cơ xuất huyết cao.',         recommendation: 'Thay NSAIDs bằng Paracetamol; nếu buộc phải dùng, theo dõi INR hàng tuần.' },
        { a: 'warfarin',       b: 'clarithromycin',   severity: 'SEVERE',   description: 'Clarithromycin ức chế CYP3A4 làm tăng nồng độ warfarin, nguy cơ xuất huyết.',             recommendation: 'Theo dõi INR sát trong và sau khi dùng kháng sinh; điều chỉnh liều warfarin.' },
        { a: 'ssri',           b: 'tramadol',         severity: 'SEVERE',   description: 'Nguy cơ hội chứng Serotonin — kích động, run, tăng thân nhiệt đe doạ tính mạng.',         recommendation: 'Tránh phối hợp; nếu cần giảm đau dùng loại khác không kéo serotonin.' },
        { a: 'methotrexate',   b: 'nsaid',            severity: 'SEVERE',   description: 'NSAIDs làm giảm thải methotrexate qua thận, tăng độc tính tuỷ xương và gan nặng.',       recommendation: 'Tránh phối hợp; nếu bắt buộc giảm liều cả hai và theo dõi công thức máu thường xuyên.' },
        { a: 'simvastatin',    b: 'clarithromycin',   severity: 'SEVERE',   description: 'Clarithromycin ức chế CYP3A4 làm tăng statin → nguy cơ tiêu cơ vân cấp.',               recommendation: 'Ngừng simvastatin trong thời gian dùng clarithromycin; thay bằng pravastatin.' },

        // ─── MODERATE ─────────────────────────────────────────────────────────
        { a: 'aspirin',        b: 'ibuprofen',        severity: 'MODERATE', description: 'Cả hai ức chế COX, dùng chung giảm hiệu quả bảo vệ tim của aspirin và tăng nguy cơ loét.', recommendation: 'Dùng aspirin 2 giờ trước ibuprofen hoặc chuyển sang giảm đau khác.' },
        { a: 'metformin',      b: 'contrast',         severity: 'MODERATE', description: 'Thuốc cản quang iốt có thể gây suy thận cấp → tích luỹ metformin gây toan lactic.',       recommendation: 'Ngừng metformin 48h trước và sau chụp cản quang; kiểm tra creatinine.' },
        { a: 'digoxin',        b: 'amiodarone',       severity: 'MODERATE', description: 'Amiodarone tăng nồng độ digoxin lên 70-100%, nguy cơ ngộ độc digoxin.',                   recommendation: 'Giảm liều digoxin 50% khi thêm amiodarone; theo dõi ECG và nồng độ digoxin.' },
        { a: 'ciprofloxacin',  b: 'theophylline',     severity: 'MODERATE', description: 'Ciprofloxacin ức chế CYP1A2 làm tăng theophylline gây độc — buồn nôn, loạn nhịp.',       recommendation: 'Giảm liều theophylline 50%; theo dõi nồng độ theophylline và triệu chứng ngộ độc.' },
        { a: 'clopidogrel',    b: 'omeprazole',       severity: 'MODERATE', description: 'Omeprazole ức chế CYP2C19 làm giảm hoạt hoá clopidogrel → giảm chống kết tập tiểu cầu.', recommendation: 'Đổi sang pantoprazole hoặc esomeprazole ít ức chế CYP2C19 hơn.' },
        { a: 'amlodipine',     b: 'simvastatin',      severity: 'MODERATE', description: 'Amlodipine ức chế CYP3A4 làm tăng nồng độ simvastatin → tăng nguy cơ tiêu cơ vân.',     recommendation: 'Không dùng simvastatin >20mg khi dùng amlodipine; ưu tiên atorvastatin.' },
        { a: 'fluconazole',    b: 'glipizide',        severity: 'MODERATE', description: 'Fluconazole ức chế CYP2C9 làm tăng nồng độ sulfonylurea — nguy cơ hạ đường huyết nặng.', recommendation: 'Giảm liều glipizide, theo dõi đường huyết chặt chẽ khi dùng chung.' },
        { a: 'lisinopril',     b: 'potassium',        severity: 'MODERATE', description: 'ACEi giảm bài tiết Kali; bổ sung kali đồng thời có thể gây tăng kali máu nguy hiểm.',     recommendation: 'Theo dõi Kali máu; tránh bổ sung Kali trừ khi Kali máu thấp rõ ràng.' },

        // ─── MILD ─────────────────────────────────────────────────────────────
        { a: 'metformin',      b: 'glipizide',        severity: 'MILD',     description: 'Cả hai hạ đường huyết; phối hợp tốt nhưng nguy cơ hạ đường huyết nếu ăn ít.',            recommendation: 'Theo dõi đường huyết sau ăn; hướng dẫn BN ăn đúng giờ.' },
        { a: 'amlodipine',     b: 'losartan',         severity: 'MILD',     description: 'Cả hai hạ huyết áp; phối hợp hợp lý nhưng cần theo dõi huyết áp tụt.',                    recommendation: 'Theo dõi HA khi thay đổi tư thế; uống đủ nước.' },
        { a: 'aspirin',        b: 'clopidogrel',      severity: 'MILD',     description: 'Tăng nguy cơ chảy máu tiêu hoá khi dùng hai thuốc chống kết tập tiểu cầu.',               recommendation: 'Dùng kèm PPI (omeprazole/pantoprazole) bảo vệ dạ dày.' },
        { a: 'atorvastatin',   b: 'amlodipine',       severity: 'MILD',     description: 'Amlodipine tăng nhẹ AUC atorvastatin; không cần chỉnh liều với liều atorvastatin ≤40mg.', recommendation: 'An toàn kết hợp với liều atorvastatin ≤40mg; tránh 80mg.' },
        { a: 'cetirizine',     b: 'alcohol',          severity: 'MILD',     description: 'Tăng tác dụng ức chế thần kinh trung ương của cetirizine khi uống rượu.',                 recommendation: 'Tránh rượu trong thời gian dùng kháng histamine.' },
        { a: 'metronidazole',  b: 'alcohol',          severity: 'SEVERE',   description: 'Phản ứng Disulfiram — đỏ bừng mặt, nôn, tim đập nhanh khi uống rượu cùng metronidazole.', recommendation: 'Kiêng tuyệt đối rượu bia trong và 48h sau khi dùng metronidazole.' },
        { a: 'tetracycline',   b: 'calcium',          severity: 'MILD',     description: 'Canxi chelate hoá tetracycline, giảm hấp thụ kháng sinh 50-80%.',                         recommendation: 'Uống tetracycline trước canxi/sữa ít nhất 2 giờ.' },
        { a: 'levothyroxine',  b: 'calcium',          severity: 'MILD',     description: 'Canxi giảm hấp thụ levothyroxine, có thể gây suy giáp.',                                  recommendation: 'Uống levothyroxine trước bữa sáng 30 phút, canxi cách xa ≥4 giờ.' },
      ];

      const drugsLower = drugs.map(d => d.toLowerCase());
      const found = [];
      for (const pair of knownPairs) {
        const iA = drugsLower.findIndex(d => d.includes(pair.a));
        const iB = drugsLower.findIndex(d => d.includes(pair.b));
        if (iA >= 0 && iB >= 0) {
          found.push({ drugs: [drugs[iA], drugs[iB]], severity: pair.severity, description: pair.description, recommendation: pair.recommendation });
        }
      }
      const severityOrder = { SEVERE: 3, MODERATE: 2, MILD: 1 };
      found.sort((a, b) => (severityOrder[b.severity] || 0) - (severityOrder[a.severity] || 0));
      const safe = found.length === 0 || found.every(f => f.severity === 'MILD');
      return res.json({
        safe,
        summary: found.length === 0
          ? `Không phát hiện tương tác đáng kể giữa ${drugs.length} thuốc (demo).`
          : `Phát hiện ${found.length} tương tác${found.some(f => f.severity === 'SEVERE') ? ' — có NGHIÊM TRỌNG!' : ''} (demo).`,
        interactions: found,
        _demo: true,
        _note: 'Chế độ Demo — thêm OPENAI_API_KEY hợp lệ vào server/.env để phân tích AI thật',
      });
    }

    // ===== LIVE MODE =====
    const prompt = `Kiểm tra tương tác giữa: ${drugs.join(', ')}. Trả JSON: {"safe":true,"summary":"","interactions":[{"drugs":[],"severity":"MILD","description":"","recommendation":""}]}. Chỉ JSON.`;
    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      max_tokens: 600,
    });
    res.json(JSON.parse(completion.choices[0].message.content));
  } catch (error) {
    console.error('Check Drug Interactions Error:', error);
    res.status(500).json({ error: 'Không thể kiểm tra tương tác thuốc: ' + error.message });
  }
};






module.exports = {
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
};

