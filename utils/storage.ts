
import { Exam, GradingResult, StudentInfo, StoredResult } from '../types';

const KEYS = {
  EXAMS: 'exampro_exams',
  RESULTS: 'exampro_results',
};

export const storage = {
  // --- Exams ---
  saveExam: (exam: Exam) => {
    const exams = storage.getExams();
    const updated = [...exams, exam];
    localStorage.setItem(KEYS.EXAMS, JSON.stringify(updated));
  },

  getExams: (): Exam[] => {
    try {
      const data = localStorage.getItem(KEYS.EXAMS);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  getExamById: (id: string): Exam | undefined => {
    const exams = storage.getExams();
    return exams.find(e => e.id === id);
  },

  deleteExam: (id: string) => {
    const exams = storage.getExams();
    const updated = exams.filter(e => e.id !== id);
    localStorage.setItem(KEYS.EXAMS, JSON.stringify(updated));
  },

  // --- Results ---
  saveResult: (result: StoredResult) => {
    const results = storage.getAllResults();
    results.push(result);
    localStorage.setItem(KEYS.RESULTS, JSON.stringify(results));
  },

  getAllResults: (): StoredResult[] => {
    try {
      const data = localStorage.getItem(KEYS.RESULTS);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  getResultsByExamId: (examId: string): StoredResult[] => {
    const results = storage.getAllResults();
    return results.filter(r => r.examId === examId).sort((a, b) => b.completedAt - a.completedAt);
  }
};
