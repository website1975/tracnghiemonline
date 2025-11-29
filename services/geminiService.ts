
import { GoogleGenAI, Type, Schema } from "@google/genai";
import { Exam } from "../types";

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
          correctOption: { type: Type.NUMBER, description: "Index of correct option (0-3)" },
          explanation: { type: Type.STRING, description: "Explanation for the answer" }
        },
        required: ["id", "text", "options", "correctOption"]
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
                isCorrect: { type: Type.BOOLEAN, description: "True if statement is correct, False otherwise" }
              },
              required: ["id", "text", "isCorrect"]
            }
          },
          explanation: { type: Type.STRING }
        },
        required: ["id", "text", "subQuestions"]
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
          correctAnswer: { type: Type.STRING, description: "The exact short answer result" },
          explanation: { type: Type.STRING }
        },
        required: ["id", "text", "correctAnswer"]
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
    text: `You are an expert educational AI assistant for the Vietnamese High School Graduation Exam (2025/2018 Program).
    
    TASK: Analyze the provided content (text or image) and extract the exam into JSON.
    
    IMPORTANT - MATH & LaTeX:
    - If the content contains Math formulas, preserve them in LaTeX format wrapped in single dollar signs. Example: $x^2 + 2x + 1 = 0$.
    - **CRITICAL FOR JSON:** When outputting LaTeX backslashes inside JSON strings, you MUST double-escape them. 
      - Incorrect: "$\frac{1}{2}$" (Invalid JSON string)
      - Correct: "$\\frac{1}{2}$" (Valid JSON string that parses to \frac)
      - Incorrect: "Delta = b^2 - 4ac"
      - Correct: "$\\Delta = b^2 - 4ac$"
    
    IMPORTANT - HOW TO FIND CORRECT ANSWERS:
    1. **Priority 1 (Answer Key/Table):** Look for an Answer Key at the end (e.g., "1.A, 2.B" or a grid).
    2. **Priority 2 (Visual Markers):** 
       - Part 1: "*A", "A (x)", or underlined/bold options.
       - Part 2 (True/False): Look for "(Đ)"/ "(D)" for True, "(S)" for False at the end of statements. Or a table ticking D/S.
       - Part 3 (Short Answer): Look for "Đáp án: [Result]" or just the result written next to the question.
    3. **Priority 3 (AI Solver):** ONLY if NO key/markers are found, SOLVE the questions yourself.

    STRUCTURE:
    The exam MUST have 3 parts:
    1. Part 1 (Phần I): Multiple choice (4 options: A, B, C, D).
    2. Part 2 (Phần II): True/False group questions. Each has 4 sub-statements (a, b, c, d).
    3. Part 3 (Phần III): Short answer questions.

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
      systemInstruction: "You are a precise data extractor. Output valid JSON. Double-escape LaTeX backslashes."
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
      durationMinutes: data.durationMinutes || 45
    };
  } catch (e) {
    console.error("Failed to parse Gemini JSON", e);
    throw new Error("Không thể đọc dữ liệu từ AI. Hãy thử lại với ảnh/file rõ nét hơn.");
  }
};
