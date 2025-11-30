
import { Exam, GradingResult, StudentAnswers } from '../types';

export const calculateScore = (exam: Exam, answers: StudentAnswers): GradingResult => {
  let part1Score = 0;
  let part2Score = 0;
  let part3Score = 0;

  // Use config or defaults
  const SCORE_PART_1 = exam.scoreConfig?.part1PerQuestion ?? 0.25;
  const SCORE_PART_2_MAX = exam.scoreConfig?.part2MaxScore ?? 1.0;
  const SCORE_PART_3 = exam.scoreConfig?.part3PerQuestion ?? 0.5;

  // 1. Grading Part 1 (Multiple Choice)
  exam.part1.forEach(q => {
    if (answers.part1[q.id] === q.correctOption) {
      part1Score += SCORE_PART_1;
    }
  });

  // 2. Grading Part 2 (True/False Groups)
  // Scale score based on number of correct sub-questions
  // Ratio: 1->10%, 2->25%, 3->50%, 4->100% of Max Score
  exam.part2.forEach(q => {
    let correctCount = 0;
    q.subQuestions.forEach(sub => {
      // Check if user has an answer and if it matches
      if (answers.part2[q.id]?.[sub.id] === sub.isCorrect) {
        correctCount++;
      }
    });

    switch (correctCount) {
      case 1: part2Score += SCORE_PART_2_MAX * 0.1; break;
      case 2: part2Score += SCORE_PART_2_MAX * 0.25; break;
      case 3: part2Score += SCORE_PART_2_MAX * 0.5; break;
      case 4: part2Score += SCORE_PART_2_MAX * 1.0; break;
      default: part2Score += 0;
    }
  });

  // 3. Grading Part 3 (Short Answer)
  exam.part3.forEach(q => {
    const userAns = (answers.part3[q.id] || "").trim().toLowerCase();
    const correctAns = q.correctAnswer.trim().toLowerCase();
    // Basic string matching. In production, might need fuzzy match or numerical tolerance.
    if (userAns === correctAns) {
      part3Score += SCORE_PART_3;
    }
  });

  // Calculate Max Possible Score
  // Note: This might exceed 10 if teacher sets high values, but typically we cap the final result or display raw.
  // Standard format implies max is 10.
  
  const totalScore = part1Score + part2Score + part3Score;

  return {
    score: Math.min(100, totalScore), // Relax cap to 100 for custom scales, or keep logic simple. Let's not cap strictly at 10 if user wants 20 scale.
    maxScore: 10, // Just a reference
    details: {
      part1Score,
      part2Score,
      part3Score
    }
  };
};
