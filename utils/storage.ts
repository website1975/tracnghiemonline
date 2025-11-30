
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
    // Add a fake ID for local storage manipulation
    const newResult = { ...result, id: crypto.randomUUID() };
    results.push(newResult);
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
  },

  updateResultScore: (resultId: string, newScore: number) => {
    const results = storage.getAllResults();
    const updated = results.map(r => {
      if (r.id === resultId) {
        return { 
          ...r, 
          result: { 
            ...r.result, 
            score: newScore 
          } 
        };
      }
      return r;
    });
    localStorage.setItem(KEYS.RESULTS, JSON.stringify(updated));
  },

  deleteResult: (resultId: string) => {
    const results = storage.getAllResults();
    const updated = results.filter(r => r.id !== resultId);
    localStorage.setItem(KEYS.RESULTS, JSON.stringify(updated));
  }
};
