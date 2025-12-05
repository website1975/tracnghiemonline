
import React, { useState, useEffect, useCallback } from 'react';
import { Exam, StudentAnswers, StudentInfo, PartType, ExamType } from '../types';
import { MathRenderer } from './MathRenderer';
import { Clock, Save } from 'lucide-react'; // <--- Wait, checking user's input
interface ExamTakerProps {
  exam: Exam;
  studentInfo: StudentInfo;
  onSubmit: (answers: StudentAnswers, timeSpent: number) => void;
  onExit: () => void;
}

export const ExamTaker: React.FC<ExamTakerProps> = ({ exam, studentInfo, onSubmit, onExit }) => {
  // --- LOGIC TÍNH THỜI GIAN (QUAN TRỌNG) ---
  const calculateInitialTime = () => {
    // 1. Nếu là bài Luyện tập (Tự do): Đếm đủ thời lượng
    if (exam.type !== ExamType.TEST || !exam.scheduledAt) {
        return exam.durationMinutes * 60;
    }

    // 2. Nếu là bài Kiểm tra (Hẹn giờ): Tính theo giờ kết thúc cứng (Hard Stop)
    const now = Date.now();
    const startTime = exam.scheduledAt;
    const endTime = startTime + (exam.durationMinutes * 60 * 1000); // Giờ kết thúc (ms)
    
    // Số giây còn lại tính đến giờ kết thúc
    const secondsRemaining = Math.floor((endTime - now) / 1000);

    // Nếu đã quá giờ, trả về 0 (để kích hoạt nộp bài ngay)
    if (secondsRemaining <= 0) return 0;

    // Nếu chưa quá giờ, trả về số giây thực tế còn lại
    return secondsRemaining;
  };

  const [timeLeft, setTimeLeft] = useState(calculateInitialTime());
  const [answers, setAnswers] = useState<StudentAnswers>({
    part1: {},
    part2: {},
    part3: {},
  });
  const [activePart, setActivePart] = useState<PartType>(PartType.MULTIPLE_CHOICE);
  const [confirmSubmit, setConfirmSubmit] = useState(false);

  // Scores for display
  const p1Score = exam.scoreConfig?.part1PerQuestion ?? 0.25;
  const p3Score = exam.scoreConfig?.part3PerQuestion ?? 0.5;

  const handleSubmit = useCallback(() => {
    // Tính thời gian thực tế đã làm
    // Lưu ý: Với bài kiểm tra vào muộn, timeSpent vẫn nên tính là (Tổng thời lượng - Thời gian còn lại trên đồng hồ)
    // hoặc đơn giản là (Duration gốc - timeLeft hiện tại)
    const timeSpent = (exam.durationMinutes * 60) - timeLeft;
    // Đảm bảo không âm (trường hợp edge case)
    const finalTime = timeSpent > 0 ? timeSpent : exam.durationMinutes * 60;
    
    onSubmit(answers, finalTime);
  }, [answers, exam.durationMinutes, timeLeft, onSubmit]);

  // Timer
  useEffect(() => {
    // Kiểm tra ngay khi vào: Nếu hết giờ thì nộp luôn
    if (timeLeft <= 0) {
        handleSubmit();
        return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [handleSubmit]); // Thêm handleSubmit vào dep để đảm bảo closure mới nhất

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handlePart1Change = (qId: string, optionIdx: number) => {
    setAnswers(prev => ({ ...prev, part1: { ...prev.part1, [qId]: optionIdx } }));
  };

  const handlePart2Change = (qId: string, subId: string, val: boolean) => {
    setAnswers(prev => ({
      ...prev,
      part2: {
        ...prev.part2,
        [qId]: { ...(prev.part2[qId] || {}), [subId]: val }
      }
    }));
  };

  const handlePart3Change = (qId: string, val: string) => {
    setAnswers(prev => ({ ...prev, part3: { ...prev.part3, [qId]: val } }));
  };

  const progress = () => {
    const totalQ = exam.part1.length + exam.part2.length * 4 + exam.part3.length;
    let answered = Object.keys(answers.part1).length + Object.keys(answers.part3).length;
    
    // Count part 2 sub-questions
    Object.values(answers.part2).forEach(qAns => {
      answered += Object.keys(qAns).length;
    });

    return Math.round((answered / totalQ) * 100);
  };

  if (confirmSubmit) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full">
          <h3 className="text-xl font-bold mb-4 text-gray-900">Xác nhận nộp bài?</h3>
          <p className="text-gray-600 mb-6">
            Bạn còn {formatTime(timeLeft)} và đã hoàn thành {progress()}% bài thi. 
            Bạn có chắc chắn muốn nộp bài không?
          </p>
          <div className="flex gap-4 justify-end">
            <button 
              onClick={() => setConfirmSubmit(false)}
              className="px-4 py-2 rounded-lg text-gray-600 hover:bg-gray-100 font-medium"
            >
              Làm tiếp
            </button>
            <button 
              onClick={handleSubmit}
              className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 font-medium"
            >
              Nộp bài
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b shadow-sm sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={onExit} className="text-gray-500 hover:text-gray-700 text-sm">Thoát</button>
            <div className="h-6 w-px bg-gray-200"></div>
            <div>
              <h1 className="font-bold text-gray-800 hidden sm:block">{exam.title}</h1>
              <p className="text-xs text-gray-500">{studentInfo.name} - {studentInfo.studentId}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full font-mono font-medium ${timeLeft < 300 ? 'bg-red-50 text-red-600 animate-pulse' : 'bg-blue-50 text-blue-600'}`}>
              <Clock className="w-4 h-4" />
              {formatTime(timeLeft)}
            </div>
            <button 
              onClick={() => setConfirmSubmit(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2"
            >
              <Save className="w-4 h-4" /> Nộp bài
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-5xl mx-auto w-full p-4 md:p-6 grid grid-cols-1 md:grid-cols-4 gap-6">
        
        {/* Navigation Sidebar */}
        <aside className="hidden md:block col-span-1 space-y-6">
          <div className="bg-white rounded-xl shadow-sm p-4 border sticky top-24">
            <h3 className="font-semibold text-gray-700 mb-4">Mục lục câu hỏi</h3>
            
            <div className="space-y-4">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase mb-2">Phần 1: Trắc nghiệm</p>
                <div className="grid grid-cols-4 gap-2">
                  {exam.part1.map((q, idx) => (
                    <button
                      key={q.id}
                      onClick={() => setActivePart(PartType.MULTIPLE_CHOICE)}
                      className={`w-full aspect-square rounded text-xs font-medium border flex items-center justify-center
                        ${answers.part1[q.id] !== undefined ? 'bg-blue-100 border-blue-200 text-blue-700' : 'hover:bg-gray-50'}`}
                    >
                      {idx + 1}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs font-medium text-gray-500 uppercase mb-2">Phần 2: Đúng/Sai</p>
                <div className="grid grid-cols-4 gap-2">
                  {exam.part2.map((q, idx) => {
                     const answeredCount = Object.keys(answers.part2[q.id] || {}).length;
                     return (
                      <button
                        key={q.id}
                        onClick={() => setActivePart(PartType.TRUE_FALSE)}
                        className={`w-full aspect-square rounded text-xs font-medium border flex items-center justify-center
                          ${answeredCount === 4 ? 'bg-blue-100 border-blue-200 text-blue-700' : answeredCount > 0 ? 'bg-blue-50 border-blue-100 text-blue-600' : 'hover:bg-gray-50'}`}
                      >
                        {idx + 1}
                      </button>
                     );
                  })}
                </div>
              </div>

               <div>
                <p className="text-xs font-medium text-gray-500 uppercase mb-2">Phần 3: Trả lời ngắn</p>
                <div className="grid grid-cols-4 gap-2">
                  {exam.part3.map((q, idx) => (
                    <button
                      key={q.id}
                      onClick={() => setActivePart(PartType.SHORT_ANSWER)}
                      className={`w-full aspect-square rounded text-xs font-medium border flex items-center justify-center
                        ${answers.part3[q.id] ? 'bg-blue-100 border-blue-200 text-blue-700' : 'hover:bg-gray-50'}`}
                    >
                      {idx + 1}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* Questions Area */}
        <div className="col-span-1 md:col-span-3 space-y-6">
          
          {/* Tabs for Mobile/Tablet */}
          <div className="flex bg-white rounded-lg p-1 shadow-sm border mb-4 sticky top-20 z-20 md:static">
            {[
              { id: PartType.MULTIPLE_CHOICE, label: 'Phần 1' },
              { id: PartType.TRUE_FALSE, label: 'Phần 2' },
              { id: PartType.SHORT_ANSWER, label: 'Phần 3' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActivePart(tab.id as PartType)}
                className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors
                  ${activePart === tab.id ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-50'}`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="bg-white rounded-xl shadow-sm border p-6 min-h-[500px]">
            {activePart === PartType.MULTIPLE_CHOICE && (
              <div className="space-y-8">
                <div className="border-b pb-4 mb-4">
                  <h2 className="text-lg font-bold text-gray-900">Phần 1: Trắc nghiệm nhiều lựa chọn</h2>
                  <p className="text-gray-500 text-sm">Chọn 1 phương án đúng nhất cho mỗi câu hỏi. ({p1Score} điểm/câu)</p>
                </div>
                {exam.part1.map((q, idx) => (
                  <div key={q.id} className="scroll-mt-24" id={`p1-q${idx}`}>
                    <div className="flex gap-3 mb-3">
                      <span className="flex-none bg-blue-100 text-blue-700 font-bold rounded w-8 h-8 flex items-center justify-center text-sm">
                        {idx + 1}
                      </span>
                      <div className="text-gray-800 font-medium pt-1">
                        <MathRenderer text={q.text} />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 ml-11">
                      {q.options.map((opt, optIdx) => (
                        <label 
                          key={optIdx} 
                          className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all
                            ${answers.part1[q.id] === optIdx 
                              ? 'bg-blue-50 border-blue-300 ring-1 ring-blue-300' 
                              : 'hover:bg-gray-50 border-gray-200'}`}
                        >
                          <input
                            type="radio"
                            name={`p1-${q.id}`}
                            className="mt-1 w-4 h-4 text-blue-600"
                            checked={answers.part1[q.id] === optIdx}
                            onChange={() => handlePart1Change(q.id, optIdx)}
                          />
                          <span className="text-sm text-gray-700"><MathRenderer text={opt} inline /></span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activePart === PartType.TRUE_FALSE && (
              <div className="space-y-8">
                <div className="border-b pb-4 mb-4">
                  <h2 className="text-lg font-bold text-gray-900">Phần 2: Trắc nghiệm Đúng/Sai</h2>
                  <p className="text-gray-500 text-sm">Trong mỗi ý a), b), c), d) ở mỗi câu, chọn Đúng hoặc Sai.</p>
                </div>
                {exam.part2.map((q, idx) => (
                  <div key={q.id} className="scroll-mt-24 border border-gray-100 rounded-xl p-4 bg-gray-50/50">
                    <div className="flex gap-3 mb-4">
                      <span className="flex-none bg-indigo-100 text-indigo-700 font-bold rounded w-8 h-8 flex items-center justify-center text-sm">
                        {idx + 1}
                      </span>
                      <div className="text-gray-800 font-medium pt-1">
                         <MathRenderer text={q.text} />
                      </div>
                    </div>
                    <div className="space-y-3 ml-2 md:ml-11">
                      {q.subQuestions.map((sub) => {
                         const currentAns = answers.part2[q.id]?.[sub.id];
                         return (
                          <div key={sub.id} className="flex items-center justify-between bg-white p-3 rounded-lg border shadow-sm">
                            <span className="text-sm text-gray-700 flex-1 mr-4">
                               <MathRenderer text={sub.text} inline />
                            </span>
                            <div className="flex gap-2 bg-gray-100 p-1 rounded-md">
                              <button
                                onClick={() => handlePart2Change(q.id, sub.id, true)}
                                className={`px-4 py-1.5 rounded text-xs font-bold transition-all
                                  ${currentAns === true 
                                    ? 'bg-green-500 text-white shadow-sm' 
                                    : 'text-gray-500 hover:bg-gray-200'}`}
                              >
                                ĐÚNG
                              </button>
                              <button
                                onClick={() => handlePart2Change(q.id, sub.id, false)}
                                className={`px-4 py-1.5 rounded text-xs font-bold transition-all
                                  ${currentAns === false 
                                    ? 'bg-red-500 text-white shadow-sm' 
                                    : 'text-gray-500 hover:bg-gray-200'}`}
                              >
                                SAI
                              </button>
                            </div>
                          </div>
                         );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activePart === PartType.SHORT_ANSWER && (
              <div className="space-y-8">
                <div className="border-b pb-4 mb-4">
                  <h2 className="text-lg font-bold text-gray-900">Phần 3: Trả lời ngắn</h2>
                  <p className="text-gray-500 text-sm">Viết kết quả vào ô trống ({p3Score} điểm/câu).</p>
                </div>
                {exam.part3.map((q, idx) => (
                  <div key={q.id} className="scroll-mt-24">
                    <div className="flex gap-3 mb-3">
                      <span className="flex-none bg-emerald-100 text-emerald-700 font-bold rounded w-8 h-8 flex items-center justify-center text-sm">
                        {idx + 1}
                      </span>
                      <div className="text-gray-800 font-medium pt-1">
                        <MathRenderer text={q.text} />
                      </div>
                    </div>
                    <div className="ml-11">
                      <input 
                        type="text" 
                        placeholder="Nhập kết quả..."
                        className="w-full max-w-md p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                        value={answers.part3[q.id] || ''}
                        onChange={(e) => handlePart3Change(q.id, e.target.value)}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};
