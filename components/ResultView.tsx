import React, { useEffect, useRef } from 'react';
import { Exam, GradingResult, StudentAnswers, StudentInfo } from '../types';
import { calculateScore } from '../utils/grading';
import { db } from '../services/supabaseClient';
import { MathRenderer } from './MathRenderer';
import { CheckCircle, XCircle, ArrowLeft, RotateCcw } from 'lucide-react';

interface ResultViewProps {
  exam: Exam;
  answers: StudentAnswers;
  studentInfo: StudentInfo;
  timeSpent: number; // in seconds
  onRetry: () => void;
  onBack: () => void;
}

export const ResultView: React.FC<ResultViewProps> = ({ exam, answers, studentInfo, timeSpent, onRetry, onBack }) => {
  const result: GradingResult = calculateScore(exam, answers);
  const hasSaved = useRef(false);

  useEffect(() => {
    // Save result to Database when component mounts
    const save = async () => {
      if (!hasSaved.current) {
          hasSaved.current = true; // Prevent double save on strict mode
          await db.saveResult({
              examId: exam.id,
              studentInfo,
              result,
              completedAt: Date.now(),
              timeSpent
          });
      }
    };
    save();
  }, [exam.id, studentInfo, result, timeSpent]);
  
  // Helpers
  const renderOptionStatus = (qId: string, optIdx: number, correctIdx: number) => {
    const userSelected = answers.part1[qId] === optIdx;
    const isCorrect = correctIdx === optIdx;

    let classes = "p-3 rounded-lg border text-sm flex justify-between items-center ";
    if (isCorrect) classes += "bg-green-50 border-green-200 text-green-800 font-medium ";
    else if (userSelected && !isCorrect) classes += "bg-red-50 border-red-200 text-red-800 ";
    else classes += "bg-white border-gray-100 text-gray-500 opacity-70 ";

    return (
      <div key={optIdx} className={classes}>
        <span><MathRenderer text={exam.part1.find(q => q.id === qId)?.options[optIdx] || ''} inline /></span>
        {isCorrect && <CheckCircle className="w-4 h-4 text-green-600" />}
        {userSelected && !isCorrect && <XCircle className="w-4 h-4 text-red-600" />}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Score Card */}
        <div className="bg-white rounded-2xl shadow-lg p-8 text-center border-t-8 border-blue-600">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Kết quả bài thi</h1>
          <p className="text-gray-500 mb-6">{exam.title} - {studentInfo.name}</p>
          
          <div className="relative inline-flex items-center justify-center">
             <svg className="w-40 h-40">
               <circle className="text-gray-100" strokeWidth="8" stroke="currentColor" fill="transparent" r="70" cx="80" cy="80" />
               <circle 
                  className="text-blue-600" 
                  strokeWidth="8" 
                  strokeDasharray={440}
                  strokeDashoffset={440 - (440 * result.score / 10)}
                  strokeLinecap="round" 
                  stroke="currentColor" 
                  fill="transparent" 
                  r="70" cx="80" cy="80" 
                  transform="rotate(-90 80 80)"
               />
             </svg>
             <div className="absolute flex flex-col items-center">
               <span className="text-4xl font-extrabold text-blue-900">{result.score.toFixed(2)}</span>
               <span className="text-xs text-gray-500 font-medium uppercase tracking-wide">Điểm / 10</span>
             </div>
          </div>

          <div className="grid grid-cols-3 gap-4 mt-8 max-w-lg mx-auto">
             <div className="bg-blue-50 p-3 rounded-lg">
                <p className="text-xs text-blue-600 font-bold uppercase">Phần 1</p>
                <p className="text-lg font-bold text-blue-900">{result.details.part1Score.toFixed(2)}</p>
             </div>
             <div className="bg-indigo-50 p-3 rounded-lg">
                <p className="text-xs text-indigo-600 font-bold uppercase">Phần 2</p>
                <p className="text-lg font-bold text-indigo-900">{result.details.part2Score.toFixed(2)}</p>
             </div>
             <div className="bg-emerald-50 p-3 rounded-lg">
                <p className="text-xs text-emerald-600 font-bold uppercase">Phần 3</p>
                <p className="text-lg font-bold text-emerald-900">{result.details.part3Score.toFixed(2)}</p>
             </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4 justify-center">
            <button onClick={onBack} className="flex items-center gap-2 px-6 py-3 bg-white border border-gray-300 rounded-lg font-medium hover:bg-gray-50">
               <ArrowLeft className="w-4 h-4" /> Về trang chủ
            </button>
            <button onClick={onRetry} className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 shadow-lg shadow-blue-200">
               <RotateCcw className="w-4 h-4" /> Làm lại
            </button>
        </div>

        {/* Detailed Review */}
        <div className="space-y-6">
          <h3 className="text-xl font-bold text-gray-800 px-2">Chi tiết đáp án & Giải thích</h3>
          
          {/* Part 1 Review */}
          <div className="bg-white rounded-xl shadow-sm border p-6">
             <h4 className="font-bold text-blue-600 mb-4 border-b pb-2">Phần 1: Trắc nghiệm</h4>
             <div className="space-y-8">
               {exam.part1.map((q, idx) => (
                 <div key={q.id}>
                    <div className="flex gap-2 mb-2">
                       <span className={`w-6 h-6 rounded flex items-center justify-center text-xs font-bold text-white
                          ${answers.part1[q.id] === q.correctOption ? 'bg-green-500' : 'bg-red-500'}`}>
                          {idx + 1}
                       </span>
                       <div className="font-medium text-gray-900"><MathRenderer text={q.text} /></div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 ml-8 mb-3">
                       {q.options.map((opt, oIdx) => renderOptionStatus(q.id, oIdx, q.correctOption))}
                    </div>
                    {q.explanation && (
                      <div className="ml-8 text-sm bg-yellow-50 p-3 rounded text-yellow-800">
                         <strong>Giải thích:</strong> <MathRenderer text={q.explanation} inline />
                      </div>
                    )}
                 </div>
               ))}
             </div>
          </div>

          {/* Part 2 Review */}
          <div className="bg-white rounded-xl shadow-sm border p-6">
             <h4 className="font-bold text-indigo-600 mb-4 border-b pb-2">Phần 2: Đúng/Sai</h4>
             <div className="space-y-8">
                {exam.part2.map((q, idx) => (
                   <div key={q.id} className="bg-gray-50/50 p-4 rounded-lg">
                      <div className="flex gap-2 mb-2">
                        <span className="w-6 h-6 rounded bg-gray-600 flex items-center justify-center text-xs font-bold text-white">
                            {idx + 1}
                        </span>
                        <div className="font-medium text-gray-900"><MathRenderer text={q.text} /></div>
                      </div>
                      <div className="ml-8 space-y-2">
                         {q.subQuestions.map(sub => {
                            const userCorrect = answers.part2[q.id]?.[sub.id] === sub.isCorrect;
                            return (
                               <div key={sub.id} className={`flex justify-between items-center p-2 rounded text-sm border 
                                  ${userCorrect ? 'bg-green-50/50 border-green-100' : 'bg-red-50/50 border-red-100'}`}>
                                  <span><MathRenderer text={sub.text} inline /></span>
                                  <div className="flex items-center gap-2">
                                     <span className="text-xs text-gray-500">Đáp án: <strong className={sub.isCorrect ? 'text-green-600' : 'text-red-600'}>{sub.isCorrect ? 'Đúng' : 'Sai'}</strong></span>
                                     {userCorrect ? <CheckCircle className="w-4 h-4 text-green-500" /> : <XCircle className="w-4 h-4 text-red-500" />}
                                  </div>
                               </div>
                            )
                         })}
                      </div>
                      {q.explanation && (
                        <div className="ml-8 mt-3 text-sm bg-yellow-50 p-3 rounded text-yellow-800">
                           <strong>Giải thích:</strong> <MathRenderer text={q.explanation} inline />
                        </div>
                      )}
                   </div>
                ))}
             </div>
          </div>

          {/* Part 3 Review */}
          <div className="bg-white rounded-xl shadow-sm border p-6">
             <h4 className="font-bold text-emerald-600 mb-4 border-b pb-2">Phần 3: Trả lời ngắn</h4>
             <div className="space-y-6">
                {exam.part3.map((q, idx) => {
                   const userAns = (answers.part3[q.id] || "").trim();
                   const isCorrect = userAns.toLowerCase() === q.correctAnswer.toLowerCase();
                   return (
                      <div key={q.id}>
                         <div className="flex gap-2 mb-2">
                            <span className={`w-6 h-6 rounded flex items-center justify-center text-xs font-bold text-white
                               ${isCorrect ? 'bg-green-500' : 'bg-red-500'}`}>
                               {idx + 1}
                            </span>
                            <div className="font-medium text-gray-900"><MathRenderer text={q.text} /></div>
                         </div>
                         <div className="ml-8 flex gap-4 items-center">
                            <div className="flex-1">
                               <p className="text-xs text-gray-500 mb-1">Câu trả lời của bạn</p>
                               <div className={`p-2 border rounded ${isCorrect ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                                  {userAns || <span className="text-gray-400 italic">Không trả lời</span>}
                               </div>
                            </div>
                            <div className="flex-1">
                               <p className="text-xs text-gray-500 mb-1">Đáp án đúng</p>
                               <div className="p-2 border border-green-200 bg-green-50 rounded font-bold text-green-900">
                                  {q.correctAnswer}
                               </div>
                            </div>
                         </div>
                         {q.explanation && (
                           <div className="ml-8 mt-2 text-sm bg-yellow-50 p-3 rounded text-yellow-800">
                              <strong>Giải thích:</strong> <MathRenderer text={q.explanation} inline />
                           </div>
                         )}
                      </div>
                   );
                })}
             </div>
          </div>

        </div>
      </div>
    </div>
  );
};