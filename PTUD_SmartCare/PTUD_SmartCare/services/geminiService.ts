import { GoogleGenerativeAI } from "@google/generative-ai";
import { MedicationDraft, FrequencyType, Recommendation, User, HealthLog } from '../types';

const apiKey = import.meta.env.VITE_GEMINI_API_KEY as string;

function initializeGenAI() {
  if (!apiKey) {
    console.error("VITE_GEMINI_API_KEY is not defined in your environment file. The application cannot start without it.");
    throw new Error("Gemini API Key is missing. Please check your .env file.");
  }
  return new GoogleGenerativeAI(apiKey);
}
const genAI = initializeGenAI();

// --- MOCK LOGIC FOR FALLBACK ---
const mockHealthResponse = (question: string): string => {
  const lowerQ = question.toLowerCase();
  
  if (lowerQ.includes('đau đầu') || lowerQ.includes('nhức đầu')) {
    return "Nếu bạn bị đau đầu, hãy thử nghỉ ngơi ở nơi yên tĩnh, uống đủ nước và tránh nhìn màn hình quá lâu. Nếu đau dữ dội, hãy dùng Paracetamol theo chỉ dẫn hoặc đi khám bác sĩ nhé.";
  }
  if (lowerQ.includes('sốt')) {
    return "Khi bị sốt, bạn nên chườm ấm, mặc quần áo thoáng mát và uống nhiều nước oresol. Theo dõi nhiệt độ thường xuyên, nếu trên 39 độ cần đi khám ngay.";
  }
  if (lowerQ.includes('tiểu đường') || lowerQ.includes('đường huyết')) {
    return "Người bệnh tiểu đường nên hạn chế tinh bột nhanh (cơm trắng, bánh ngọt), tăng cường rau xanh và chia nhỏ bữa ăn. Đừng quên đo đường huyết định kỳ bạn nhé.";
  }
  if (lowerQ.includes('chào') || lowerQ.includes('hi')) {
    return "Chào bạn! Tôi là trợ lý sức khỏe SmartCare AI. Tôi có thể giúp gì cho bạn hôm nay?";
  }
  
  return "Xin lỗi, tôi chưa hiểu rõ câu hỏi. Bạn có thể mô tả kỹ hơn về triệu chứng hoặc vấn đề sức khỏe đang gặp phải không?";
};

const mockCaloriesResponse = (query: string, type: 'food' | 'exercise'): number => {
  const q = query.toLowerCase();
  
  if (type === 'food') {
    if (q.includes('phở')) return 450;
    if (q.includes('cơm tấm')) return 600;
    if (q.includes('bún bò')) return 500;
    if (q.includes('bánh mì')) return 350;
    if (q.includes('trà sữa')) return 400;
    if (q.includes('salad')) return 150;
    if (q.includes('táo')) return 50;
    return 300; // Default average
  } else {
    // Exercise
    if (q.includes('chạy')) return 300;
    if (q.includes('đi bộ')) return 150;
    if (q.includes('gym') || q.includes('tạ')) return 250;
    if (q.includes('yoga')) return 180;
    if (q.includes('bơi')) return 400;
    return 200; // Default average
  }
};

const mockDiseaseIdentification = (input: string): string => {
  const i = input.toLowerCase();
  if (i.includes('đường') || i.includes('diabetes')) return 'Diabetes';
  if (i.includes('huyết áp') || i.includes('pressure')) return 'Hypertension';
  if (i.includes('béo') || i.includes('mập') || i.includes('cân')) return 'Obesity';
  if (i.includes('dạ dày') || i.includes('bao tử')) return 'Gastritis';
  return 'Normal';
};

// --- API SERVICES ---

export const parseMedicationInstruction = async (instruction: string): Promise<MedicationDraft | null> => {
  try {
    const model = genAI.getGenerativeModel({ 
      model: "gemini-pro", // gemini-pro is compatible with this SDK version
      // responseMimeType is not supported in this SDK version. The prompt must request JSON.
    });
    const prompt = `Extract medication details from this instruction (which may be in Vietnamese or English): "${instruction}". 
      Return a valid JSON object with these properties: "name", "dosage", "unit", "frequency" (DAILY or EVERY_OTHER_DAY), "times" (array of "HH:mm"), "notes".
      
      Rules:
      1. If time is vague (e.g. "morning" or "sáng"), assume 08:00. "Evening"/"tối" -> 20:00. "Lunch"/"trưa" -> 12:00.
      2. Convert all times to HH:mm 24-hour format.
      3. Translate 'notes' to Vietnamese if possible.
      `;
    const result = await model.generateContent(prompt);

    const response = result.response;
    const text = response.text();
    if (!text) return null;

    return JSON.parse(text) as MedicationDraft;
  } catch (error) {
    console.error("Error parsing medication with Gemini:", error);
    return null;
  }
};

/**
 * Extracts medication details from an image (Base64).
 * Uses Gemini Vision capabilities.
 */
export const extractMedicationFromImage = async (base64Image: string): Promise<Partial<MedicationDraft> | null> => {
  try {
    // Remove data URL prefix if present (e.g., "data:image/jpeg;base64,")
    const cleanBase64 = base64Image.split(',')[1] || base64Image;

    const model = genAI.getGenerativeModel({ 
      model: "gemini-pro-vision", // Vision model
    });

    const prompt = "Analyze this image of a medication packaging or prescription. Extract the Medication Name and Dosage. Return JSON with 'name' and 'dosage' properties.";
    const imagePart = {
      inlineData: {
        data: cleanBase64,
        mimeType: "image/jpeg"
      },
    };

    const result = await model.generateContent([prompt, imagePart]);
    const response = result.response;
    const text = response.text();
    if (!text) return null;
    
    // Clean potential markdown code block
    const jsonString = text.replace(/```json\n?/, '').replace(/```$/, '');
    return JSON.parse(jsonString);

  } catch (error) {
    console.error("Gemini Vision Error:", error);
    throw error; // Throw to let the UI handle fallback
  }
};

/**
 * ESTIMATE CALORIES SERVICE
 * Uses AI to estimate calories for food or exercise.
 */
export const estimateCalories = async (query: string, type: 'food' | 'exercise'): Promise<number> => {
  try {
    const model = genAI.getGenerativeModel({ 
      model: "gemini-pro",
      // responseMimeType is not supported in this SDK version. The prompt must request JSON.
    });

    const prompt = type === 'food' 
      ? `You are a nutritionist familiar with Vietnamese cuisine. Estimate the calories for: "${query}". Return JSON object with a single property "calories" (integer).`
      : `You are a fitness expert. Estimate calories burned for this activity: "${query}". Return JSON object with a single property "calories" (integer).`;

    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();
    if (!text) throw new Error("No response text");
    
    const data = JSON.parse(text);
    return data.calories || 0;

  } catch (error) {
    console.warn("AI Estimate Error, using fallback:", error);
    return mockCaloriesResponse(query, type);
  }
};

/**
 * CHAT API SERVICE
 * Connects to Gemini or falls back to Mock logic.
 */
export const sendChatToHealthAssistant = async (
    question: string, 
    userContext?: { name: string, condition?: string }
  ): Promise<string> => {
    try {
      const systemInstruction = `You are SmartCare AI, a helpful and empathetic health assistant. 
      User Name: ${userContext?.name || 'Friend'}. 
      Medical Condition: ${userContext?.condition || 'None specified'}.
      
      Rules:
      1. Answer in Vietnamese.
      2. Keep answers concise (under 100 words) but helpful.
      3. If the user asks about serious symptoms, always advise seeing a doctor.
      4. Do not prescribe medicines, only give general lifestyle/dietary advice.
      `;
      
      const model = genAI.getGenerativeModel({ model: "gemini-pro" });
      // In this SDK version, system instructions are part of the chat history.
      const chat = model.startChat({
        history: [{ role: "user", parts: systemInstruction }, { role: "model", parts: "Ok, I will follow these instructions." }]
      });
      const result = await chat.sendMessage(question);
      const response = result.response;
      const text = response.text();
  
      if (text) {
          return text;
      }
      throw new Error("Empty response");
  
    } catch (error) {
      console.warn("AI Chat Error, using fallback logic:", error);
      // Fallback on error ensures UX continuity
      return mockHealthResponse(question);
    }
  };

/**
 * DISEASE NORMALIZATION (UC07 - New)
 * Classifies user text input into standard disease keys.
 */
export const identifyDisease = async (userInput: string): Promise<string> => {
  if (!userInput) return 'Normal';

  try {
    const model = genAI.getGenerativeModel({ 
      model: "gemini-pro",
      // responseMimeType is not supported in this SDK version. The prompt must request JSON.
    });
    const result = await model.generateContent(`Input is: '${userInput}'. Classify this medical condition into one of the following groups.
      Groups: ['Diabetes', 'Hypertension', 'Obesity', 'Gastritis', 'Normal', 'Other'].
      If the input suggests being healthy, return 'Normal'.
      Return JSON object with "condition" property.`,
    );
    const response = result.response;
    const text = response.text();
    if (!text) return 'Other';
    const data = JSON.parse(text);
    return data.condition;

  } catch (error) {
    console.warn("AI Disease Identify Error:", error);
    return mockDiseaseIdentification(userInput);
  }
};

/**
 * DYNAMIC RECOMMENDATIONS (UC07 - New)
 * Generates tips based on profile and recent logs.
 */
export const generatePersonalizedAdvice = async (
  user: User, 
  recentLogs: HealthLog[]
): Promise<Recommendation[]> => {
  try {
    // 1. Prepare Context
    const logSummary = recentLogs.slice(0, 5).map(l => {
       if (l.type === 'meal') return `Ate ${l.details.foodName} (${l.details.calories}kcal)`;
       if (l.type === 'exercise') return `Did ${l.details.exerciseType} for ${l.details.durationMinutes} mins`;
       return `Symptom: ${l.details.symptomName}`;
    }).join('; ');

    const profileContext = `Age: Unknown, Weight: ${user.weight || 'N/A'}kg, Condition: ${user.medicalCondition || 'Normal'}`;
    const prompt = `
      User Profile: ${profileContext}.
      Recent Activities (Yesterday/Today): ${logSummary || 'No recent logs'}.
      
      Task: Generate 3 short, practical health tips for today in Vietnamese.
      
      Guidelines:
      1. If they have Diabetes, focus on sugar control.
      2. If they have Hypertension, focus on salt/stress.
      3. If they exercised recently, encourage recovery. If not, encourage movement.
      4. Use valid Lucide icon names like: 'Utensils', 'Footprints', 'Soup', 'Headphones', 'GlassWater', 'Sun', 'Moon', 'Apple'.
      5. Colors should be Tailwind classes like 'bg-blue-100 text-blue-600'.
      
      Return JSON Array of Recommendation objects.
    `;

    const model = genAI.getGenerativeModel({ 
      model: "gemini-pro",
      // responseMimeType is not supported in this SDK version. The prompt must request JSON.
    });
    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();
    if (!text) return [];
    
    // Add unique IDs if missing
    const rawData = JSON.parse(text) as Recommendation[];
    return rawData.map((r, idx) => ({ ...r, id: `ai-gen-${Date.now()}-${idx}` }));

  } catch (error) {
    console.error("AI Recommendation Error:", error);
    return []; // Return empty to fallback
  }
};