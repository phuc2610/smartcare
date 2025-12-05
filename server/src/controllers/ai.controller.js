const openai = require('../config/openai');
const { z } = require('zod');

const chatSchema = z.object({
  body: z.object({
    message: z.string().min(1),
  }),
});

const chat = async (req, res) => {
  try {
    const { message } = req.body;
    const user = req.user;

    const systemInstruction = `You are SmartCare AI, a helpful and empathetic health assistant.
    User Name: ${user.name || 'Friend'}.
    Medical Condition: ${user.medicalCondition || 'None specified'}.
    
    Rules:
    1. Answer in Vietnamese.
    2. Keep answers concise (under 100 words) but helpful.
    3. If the user asks about serious symptoms, always advise seeing a doctor.
    4. Do not prescribe medicines, only give general lifestyle/dietary advice.
    5. Always include a medical disclaimer at the end.
    `;

    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemInstruction },
        { role: 'user', content: message },
      ],
      max_tokens: 200,
    });

    const response = completion.choices[0].message.content;
    const disclaimer = '\n\n⚠️ Lưu ý: Đây chỉ là tư vấn thông tin, không thay thế chẩn đoán y tế. Vui lòng tham khảo ý kiến bác sĩ cho các vấn đề sức khỏe nghiêm trọng.';

    res.json({ response: response + disclaimer });
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

const estimateCaloriesSchema = z.object({
  body: z.object({
    query: z.string().min(1),
    type: z.enum(['food', 'exercise']),
  }),
});

const estimateCalories = async (req, res) => {
  try {
    const { query, type } = req.body;

    const prompt =
      type === 'food'
        ? `You are a nutritionist familiar with Vietnamese cuisine. Estimate calories for: "${query}". Return JSON with "calories" (integer).`
        : `You are a fitness expert. Estimate calories burned for: "${query}". Return JSON with "calories" (integer).`;

    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      max_tokens: 100,
    });

    const result = JSON.parse(completion.choices[0].message.content);
    res.json({ calories: result.calories || 0 });
  } catch (error) {
    console.error('Calories Estimate Error:', error);
    res.status(500).json({ error: 'Failed to estimate calories' });
  }
};

const identifyDiseaseSchema = z.object({
  body: z.object({
    input: z.string().min(1),
  }),
});

const identifyDisease = async (req, res) => {
  try {
    const { input } = req.body;

    const prompt = `Input: '${input}'. Classify this medical condition into one: ['Diabetes', 'Hypertension', 'Obesity', 'Gastritis', 'Normal', 'Other']. Return JSON with "condition" property.`;

    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      max_tokens: 50,
    });

    const result = JSON.parse(completion.choices[0].message.content);
    res.json({ condition: result.condition || 'Normal' });
  } catch (error) {
    console.error('Disease Identify Error:', error);
    res.status(500).json({ error: 'Failed to identify disease' });
  }
};

module.exports = {
  chat,
  parseMedication,
  estimateCalories,
  identifyDisease,
  chatSchema,
  parseMedicationSchema,
  estimateCaloriesSchema,
  identifyDiseaseSchema,
};

