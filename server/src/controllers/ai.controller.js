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
    if (!openai) {
      return res.status(503).json({ error: 'AI service disabled: missing OPENAI_API_KEY' });
    }
    
    const medicalCondition = req.body.medicalCondition || req.user?.medicalCondition || 'Normal';

    if (medicalCondition === 'Normal' || !medicalCondition) {
      // Return default recommendations for normal health
      return res.json({
        recommendations: [
          {
            id: 'n1',
            type: 'LIFESTYLE',
            title: 'Uống đủ nước',
            description: 'Cố gắng uống đủ 2 lít nước mỗi ngày.',
            iconName: 'GlassWater',
            color: 'bg-blue-50 text-blue-500',
          },
        ],
      });
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
    
    // Try to return cached data if available
    try {
      const AIReport = require('../models/AIReport');
      const existingReport = await AIReport.findOne({
        userId: req.user._id,
        range: req.body.range,
        medicalCondition: req.body.medicalCondition || 'none',
        dateKey: new Date().toISOString().split('T')[0],
      });
      
      if (existingReport) {
        return res.json({ notes: existingReport.notes });
      }
    } catch (cacheError) {
      console.error('Failed to load cached report:', cacheError);
    }
    
    res.status(500).json({ error: 'Failed to analyze report' });
  }
};

const getChatHistory = async (req, res) => {
  try {
    const ChatMessage = require('../models/ChatMessage');
    const userId = req.user._id;
    
    // Get last 50 messages, sorted by timestamp descending
    const messages = await ChatMessage.find({ userId })
      .sort({ timestamp: -1 })
      .limit(50)
      .select('message response sender timestamp')
      .lean();

    // Reverse to get chronological order (oldest first)
    messages.reverse();

    res.json({ messages });
  } catch (error) {
    console.error('Get Chat History Error:', error);
    res.status(500).json({ error: 'Failed to get chat history' });
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
  chatSchema,
  parseMedicationSchema,
  estimateCaloriesSchema,
  identifyDiseaseSchema,
  getHealthRecommendationsSchema,
  analyzeReportSchema,
};

