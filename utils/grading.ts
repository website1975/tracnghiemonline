import { Exam, GradingResult, StudentAnswers } from '../types';

export const calculateScore = (exam: Exam, answers: StudentAnswers): GradingResult => {
  let part1Score = 0;
  let part2Score = 0;
  let part3Score = 0;

  // Constants
  const SCORE_PART_1_PER_Q = 0.25;
  const SCORE_PART_3_PER_Q = 0.5;

  // 1. Grading Part 1 (Multiple Choice)
  exam.part1.forEach(q => {
    if (answers.part1[q.id] === q.correctOption) {
      part1Score += SCORE_PART_1_PER_Q;
    }
  });

  // 2. Grading Part 2 (True/False Groups)
  // Rule: 1 correct sub = 0.1, 2 = 0.25, 3 = 0.5, 4 = 1.0 point
  exam.part2.forEach(q => {
    let correctCount = 0;
    q.subQuestions.forEach(sub => {
      // Check if user has an answer and if it matches
      if (answers.part2[q.id]?.[sub.id] === sub.isCorrect) {
        correctCount++;
      }
    });

    switch (correctCount) {
      case 1: part2Score += 0.1; break;
      case 2: part2Score += 0.25; break;
      case 3: part2Score += 0.5; break;
      case 4: part2Score += 1.0; break;
      default: part2Score += 0;
    }
  });

  // 3. Grading Part 3 (Short Answer)
  exam.part3.forEach(q => {
    const userAns = (answers.part3[q.id] || "").trim().toLowerCase();
    const correctAns = q.correctAnswer.trim().toLowerCase();
    // Basic string matching. In production, might need fuzzy match or numerical tolerance.
    if (userAns === correctAns) {
      part3Score += SCORE_PART_3_PER_Q;
    }
  });

  return {
    score: Math.min(10, part1Score + part2Score + part3Score), // Cap at 10 just in case
    maxScore: 10,
    details: {
      part1Score,
      part2Score,
      part3Score
    }
  };
};
