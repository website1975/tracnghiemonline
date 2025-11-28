
export enum PartType {
  MULTIPLE_CHOICE = 'PART_1',
  TRUE_FALSE = 'PART_2',
  SHORT_ANSWER = 'PART_3',
}

// Part 1: Multiple Choice (4 options, 1 correct)
export interface QuestionPart1 {
  id: string;
  text: string;
  options: string[]; // ["A. ...", "B. ...", "C. ...", "D. ..."]
  correctOption: number; // 0, 1, 2, or 3
  explanation?: string;
}

// Part 2: True/False Group (Question stem + 4 sub-statements)
export interface SubQuestion {
  id: string;
  text: string;
  isCorrect: boolean;
}

export interface QuestionPart2 {
  id: string;
  text: string; // The main context/stem
  subQuestions: SubQuestion[]; // Should be exactly 4 for standard compliance
  explanation?: string;
}

// Part 3: Short Answer (Numeric or Text result)
export interface QuestionPart3 {
  id: string;
  text: string;
  correctAnswer: string;
  explanation?: string;
}

export interface Exam {
  id: string;
  title: string;
  subject: string;
  durationMinutes: number;
  part1: QuestionPart1[];
  part2: QuestionPart2[];
  part3: QuestionPart3[];
  createdAt: number;
}

export interface StudentInfo {
  name: string;
  classId: string;
  studentId: string;
}

export interface StudentAnswers {
  part1: Record<string, number>; // questionId -> optionIndex
  part2: Record<string, Record<string, boolean>>; // questionId -> subQuestionId -> boolean (True/False)
  part3: Record<string, string>; // questionId -> text answer
}

export interface GradingResult {
  score: number;
  maxScore: number;
  details: {
    part1Score: number;
    part2Score: number;
    part3Score: number;
  };
}

export interface StoredResult {
  id?: string; // Optional ID from Database for updating
  examId: string;
  studentInfo: StudentInfo;
  result: GradingResult;
  answers?: StudentAnswers; // Added: Store detailed answers
  completedAt: number;
  timeSpent: number;
}
