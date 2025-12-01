
import { GoogleGenAI, Type, Schema } from "@google/genai";
import { Exam, ExamType } from "../types";

const examSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING, description: "Title of the exam" },
    subject: { type: Type.STRING, description: "Subject of the exam" },
    durationMinutes: { type: Type.NUMBER, description: "Duration in minutes" },
    part1: {
      type: Type.ARRAY,
      description: "Part 1: Multiple choice questions (Trắc nghiệm 4 lựa chọn)",
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          text: { type: Type.STRING, description: "Question text. Keep math in LaTeX format wrapped in $" },
          options: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "Array of 4 options strings (A, B, C, D included in text). Keep math in LaTeX."
          },
          correctOption: { type: Type.NUMBER, description: "Index of correct option (0-3). IF NO KEY FOUND, YOU MUST SOLVE IT." },
          explanation: { type: Type.STRING, description: "Detailed step-by-step solution. MANDATORY." }
        },
        required: ["id", "text", "options", "correctOption", "explanation"]
      }
    },
    part2: {
      type: Type.ARRAY,
      description: "Part 2: True/False questions (Trắc nghiệm đúng sai)",
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          text: { type: Type.STRING, description: "Main question stem. Keep math in LaTeX." },
          subQuestions: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                text: { type: Type.STRING, description: "Sub-statement content. Keep math in LaTeX." },
                isCorrect: { type: Type.BOOLEAN, description: "True/False. IF NO KEY FOUND, YOU MUST SOLVE IT." }
              },
              required: ["id", "text", "isCorrect"]
            }
          },
          explanation: { type: Type.STRING, description: "Detailed reasoning for the True/False decisions. MANDATORY." }
        },
        required: ["id", "text", "subQuestions", "explanation"]
      }
    },
    part3: {
      type: Type.ARRAY,
      description: "Part 3: Short answer (Trả lời ngắn)",
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          text: { type: Type.STRING, description: "Question text. Keep math in LaTeX." },
          correctAnswer: { type: Type.STRING, description: "The exact short answer result. IF NO KEY FOUND, YOU MUST SOLVE IT." },
          explanation: { type: Type.STRING, description: "Detailed calculation steps. MANDATORY." }
        },
        required: ["id", "text", "correctAnswer", "explanation"]
      }
    }
  },
  required: ["title", "subject", "part1", "part2", "part3"]
};

export const parseExamFromContent = async (
  content: string,
  imageData?: string
): Promise<Exam> => {
  // Logic lấy Key: Ưu tiên process.env (khi deploy), nếu không có thì lấy LocalStorage (khi test tại chỗ)
  const apiKey = process.env.API_KEY || localStorage.getItem('GEMINI_API_KEY');

  if (!apiKey) {
    throw new Error("Chưa cấu hình API Key. Vui lòng vào 'Cấu hình hệ thống' để nhập Key.");
  }

  const ai = new GoogleGenAI({ apiKey: apiKey });

  const parts: any[] = [];
  
  if (imageData) {
    parts.push({
      inlineData: {
        mimeType: "image/jpeg",
        data: imageData
      }
    });
  }

  parts.push({
    text: `You are an expert Physics/Math/Chemistry Professor and Exam Creator for the Vietnamese 2025 High School Program.
    
    TASK: Analyze the provided content (text or image), EXTRACT the questions, and SOLVE them to provide correct answers and explanations.
    
    CRITICAL INSTRUCTION ON ANSWERS:
    1. **Search for Answer Key:** Check if the document contains a table of answers (e.g., 1.A, 2.B) or marked answers (bold/red/underlined).
    2. **IF NO KEY FOUND (Important):** You MUST SOLVE every single question yourself to determine:
       - 'correctOption' (Part 1)
       - 'isCorrect' (Part 2)
       - 'correctAnswer' (Part 3)
       DO NOT default to 0 or False. Use your knowledge to find the truth.
    3. **Generate Explanation:** You MUST write a "Lời giải" (explanation) in Vietnamese for every question, explaining why the answer is correct.

    IMPORTANT - MATH & LaTeX:
    - Preserve Math formulas in LaTeX format wrapped in single dollar signs $. e.g., $x^2$.
    - **JSON ESCAPING:** You must double-escape backslashes in the JSON output. Example: Use "$\\frac{1}{2}$" instead of "$\frac{1}{2}$".

    STRUCTURE:
    The exam MUST have 3 parts:
    1. Part 1 (Phần I): Multiple choice.
    2. Part 2 (Phần II): True/False.
    3. Part 3 (Phần III): Short answer.

    Input Content to Process:
    ${content}
    `
  });

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: { parts },
    config: {
      responseMimeType: "application/json",
      responseSchema: examSchema,
      systemInstruction: "You are a precise data extractor and problem solver. Output valid JSON. Always provide correct answers and explanations."
    }
  });

  const text = response.text;
  if (!text) throw new Error("AI không phản hồi. Vui lòng thử lại.");

  try {
    const data = JSON.parse(text);
    return {
      ...data,
      id: crypto.randomUUID(),
      createdAt: Date.now(),
      durationMinutes: data.durationMinutes || 45,
      type: ExamType.PRACTICE, // Default Type
      // Default standard scores
      scoreConfig: {
        part1PerQuestion: 0.25,
        part2MaxScore: 1.0,
        part3PerQuestion: 0.5
      }
    };
  } catch (e) {
    console.error("Failed to parse Gemini JSON", e);
    throw new Error("Không thể đọc dữ liệu từ AI. Hãy thử lại với ảnh/file rõ nét hơn.");
  }
};
