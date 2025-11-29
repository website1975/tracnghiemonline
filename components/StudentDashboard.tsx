
import React, { useEffect, useState } from 'react';
import { db } from '../services/supabaseClient';
import { StoredResult, StudentAccount, Exam } from '../types';
import { History, Eye, ChevronRight, LogOut, BookOpen, User } from 'lucide-react';

interface StudentDashboardProps {
  account: StudentAccount;
  onLogout: () => void;
  onReviewResult: (result: StoredResult) => void;
  onTakeExam: (examId: string) => void;
}

export const StudentDashboard: React.FC<StudentDashboardProps> = ({ account, onLogout, onReviewResult, onTakeExam }) => {
  const [history, setHistory] = useState<StoredResult[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Available Exams (Optional: Show recent public exams)
  const [availableExams, setAvailableExams] = useState<Exam[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      // 1. Get History (truyền thêm username để tìm lại bài thi cũ trùng tên)
      const hist = await db.getStudentHistory(account.id, account.username);
      setHistory(hist);
      
      // 2. Get Available Exams (Last 5)
      const exams = await db.getExams();
      setAvailableExams(exams.slice(0, 5));
      
      setLoading(false);
    };
    fetchData();
  }, [account.id, account.username]);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b shadow-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-blue-100 p-2 rounded-full">
               <User className="w-5 h-5 text-blue-600" />
            </div>
            <div>
               <h1 className="font-bold text-gray-800">{account.full_name}</h1>
               <p className="text-xs text-gray-500">@{account.username}</p>
            </div>
          </div>
          <button onClick={onLogout} className="text-sm text-gray-500 hover:text-red-600 border px-3 py-1.5 rounded-lg flex items-center gap-2">
             <LogOut className="w-4 h-4" /> Đăng xuất
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-4 md:p-6 space-y-8">
        
        {/* Section 1: History */}
        <section>
           <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              <History className="w-6 h-6 text-blue-600" /> Lịch sử làm bài
           </h2>
           
           <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
             {loading ? (
                <div className="p-8 text-center text-gray-500">Đang tải dữ liệu...</div>
             ) : history.length === 0 ? (
                <div className="p-12 text-center text-gray-500">
                   Bạn chưa làm bài thi nào. Hãy chọn đề thi bên dưới để bắt đầu!
                </div>
             ) : (
                <div className="overflow-x-auto">
                   <table className="w-full text-sm text-left">
                      <thead className="bg-gray-50 text-gray-500 font-medium border-b">
                         <tr>
                            <th className="p-4">Đề thi</th>
                            <th className="p-4">Môn</th>
                            <th className="p-4">Điểm</th>
                            <th className="p-4">Ngày thi</th>
                            <th className="p-4">Thao tác</th>
                         </tr>
                      </thead>
                      <tbody className="divide-y">
                         {history.map((item, idx) => (
                            <tr key={idx} className="hover:bg-gray-50">
                               <td className="p-4 font-medium text-gray-900">{item.examTitle}</td>
                               <td className="p-4 text-gray-500">{item.examSubject}</td>
                               <td className="p-4">
                                  <span className={`px-2 py-1 rounded font-bold ${item.result.score >= 5 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                     {item.result.score.toFixed(2)}
                                  </span>
                               </td>
                               <td className="p-4 text-gray-500">{new Date(item.completedAt).toLocaleDateString()}</td>
                               <td className="p-4">
                                  {item.answers ? (
                                    <button 
                                      onClick={() => onReviewResult(item)}
                                      className="flex items-center gap-1 text-blue-600 hover:underline font-medium"
                                    >
                                       <Eye className="w-4 h-4" /> Xem lại
                                    </button>
                                  ) : <span className="text-gray-400 italic">Dữ liệu cũ</span>}
                               </td>
                            </tr>
                         ))}
                      </tbody>
                   </table>
                </div>
             )}
           </div>
        </section>

        {/* Section 2: Available Exams */}
        <section>
           <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              <BookOpen className="w-6 h-6 text-green-600" /> Đề thi mới nhất
           </h2>
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {availableExams.map(exam => (
                 <div key={exam.id} className="bg-white p-5 rounded-xl border shadow-sm hover:shadow-md transition-shadow">
                    <h3 className="font-bold text-gray-900 mb-2 line-clamp-1">{exam.title}</h3>
                    <div className="flex justify-between text-sm text-gray-500 mb-4">
                       <span>{exam.subject}</span>
                       <span>{exam.durationMinutes} phút</span>
                    </div>
                    <button 
                       onClick={() => onTakeExam(exam.id)}
                       className="w-full py-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg font-medium flex items-center justify-center gap-2"
                    >
                       Vào thi <ChevronRight className="w-4 h-4" />
                    </button>
                 </div>
              ))}
           </div>
        </section>

      </main>
    </div>
  );
};
