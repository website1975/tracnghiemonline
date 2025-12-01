
import React, { useState, useEffect, useMemo } from 'react';
import { Exam, StoredResult, StudentAccount, ExamType } from '../types';
import { db } from '../services/supabaseClient';
import { MathRenderer } from './MathRenderer';
import { Plus, Trash2, FileText, Users, Eye, ChevronRight, X, Copy, QrCode, CloudLightning, Database, Settings, Play, Lock, Edit2, Save, CheckCircle, XCircle, PenTool, History, GraduationCap, Calculator, CalendarClock, BookOpen, TrendingUp } from 'lucide-react';
interface TeacherDashboardProps {
  onCreateExam: () => void;
  onExit: () => void;
  onTestExam: (exam: Exam) => void;
  onEditExam: (exam: Exam) => void; 
}

interface ShareModalData {
  id: string;
  title: string;
  url: string;
}

export const TeacherDashboard: React.FC<TeacherDashboardProps> = ({ onCreateExam, onExit, onTestExam, onEditExam }) => {
  const [exams, setExams] = useState<Exam[]>([]);
  const [activeTab, setActiveTab] = useState<'exams' | 'results' | 'students'>('exams');
  const [selectedExamId, setSelectedExamId] = useState<string | null>(null);
  const [rawResults, setRawResults] = useState<StoredResult[]>([]);
  const [students, setStudents] = useState<StudentAccount[]>([]);
  
  // Share Modal State
  const [shareData, setShareData] = useState<ShareModalData | null>(null);
  
  // View Exam Content Modal
  const [viewingExam, setViewingExam] = useState<Exam | null>(null);

  // View Student Answer Modal
  const [viewingResult, setViewingResult] = useState<{result: StoredResult, exam: Exam} | null>(null);

  // View Student Profile (Stats) State
  const [viewingStudentProfile, setViewingStudentProfile] = useState<StudentAccount | null>(null);
  const [studentProfileHistory, setStudentProfileHistory] = useState<StoredResult[]>([]);

  // Edit Score State
  const [editingResultId, setEditingResultId] = useState<string | null>(null);
  const [editScoreValue, setEditScoreValue] = useState<string>('');
  
  // Deploy/Config Modal
  const [showDeployGuide, setShowDeployGuide] = useState(false);
  const [dbConfig, setDbConfig] = useState({
    url: localStorage.getItem('SB_URL') || '',
    key: localStorage.getItem('SB_KEY') || '',
    geminiKey: localStorage.getItem('GEMINI_API_KEY') || '',
    adminPassword: localStorage.getItem('TEACHER_PASSWORD') || '123456'
  });

  const isBlobUrl = shareData?.url.startsWith('blob:') || false;

  useEffect(() => {
    refreshData();
  }, [activeTab]);

  const refreshData = async () => {
    const data = await db.getExams();
    setExams(data);
    
    if (activeTab === 'students') {
        const studentList = await db.getAllStudents();
        setStudents(studentList);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Bạn có chắc chắn muốn xóa đề thi này không?')) {
      await db.deleteExam(id);
      refreshData();
      if (selectedExamId === id) setSelectedExamId(null);
    }
  };

  const handleDeleteStudent = async (id: string) => {
    if (confirm('CẢNH BÁO: Xóa học sinh sẽ xóa luôn toàn bộ kết quả thi của học sinh này. Bạn có chắc không?')) {
        const success = await db.deleteStudent(id);
        if (success) {
            refreshData(); // Reload student list
        } else {
            alert('Có lỗi khi xóa học sinh.');
        }
    }
  };

  const handleViewStudentProfile = async (student: StudentAccount) => {
    setViewingStudentProfile(student);
    // Fetch history
    const history = await db.getStudentHistory(student.id, student.username);
    setStudentProfileHistory(history);
  };

  const handleOpenShare = (exam: Exam) => {
    const baseUrl = window.location.href.split('?')[0];
    const url = `${baseUrl}?examId=${exam.id}`;
    setShareData({
      id: exam.id,
      title: exam.title,
      url: url
    });
  };

  const handleCopyLink = () => {
    if (shareData) {
      navigator.clipboard.writeText(shareData.url);
      alert('Đã sao chép link vào bộ nhớ tạm!');
    }
  };

  const handleViewResults = async (examId: string) => {
    setSelectedExamId(examId);
    setRawResults(await db.getResultsByExam(examId));
    setActiveTab('results');
  };

  const handleDeleteResult = async (resultId: string) => {
    if (confirm("Bạn có chắc chắn muốn xóa kết quả thi này vĩnh viễn không? Hành động này không thể hoàn tác.")) {
        const success = await db.deleteResult(resultId);
        if (success) {
            // Cập nhật state local
            setRawResults(prev => prev.filter(r => r.id !== resultId));
            // Cập nhật profile history nếu đang xem
            setStudentProfileHistory(prev => prev.filter(r => r.id !== resultId));

            // Nếu đang xem chi tiết thì đóng lại
            if (viewingResult?.result.id === resultId) {
                setViewingResult(null);
            }
        } else {
            alert("Lỗi khi xóa kết quả. Vui lòng thử lại.");
        }
    }
  };

  // Logic gộp kết quả học sinh
  const processedResults = useMemo(() => {
    const groups: Record<string, StoredResult[]> = {};
    
    // 1. Gom nhóm theo Student ID (viết thường, bỏ khoảng trắng)
    rawResults.forEach(r => {
        const key = r.studentInfo.studentId.trim().toLowerCase();
        if (!groups[key]) groups[key] = [];
        groups[key].push(r);
    });

    // 2. Chọn ra kết quả tốt nhất (Điểm cao nhất, nếu bằng thì lấy mới nhất)
    return Object.values(groups).map(group => {
        // Sắp xếp: Điểm giảm dần -> Thời gian giảm dần
        group.sort((a, b) => {
            if (b.result.score !== a.result.score) return b.result.score - a.result.score;
            return b.completedAt - a.completedAt;
        });
        
        const bestResult = group[0];
        // Gắn thêm thông tin số lần thi
        return {
            ...bestResult,
            attemptCount: group.length,
            latestAt: group[0].completedAt // Thời gian của bài tốt nhất
        };
    });
  }, [rawResults]);

  const handleViewStudentDetail = (result: StoredResult) => {
     const exam = exams.find(e => e.id === result.examId);
     if (exam) {
        setViewingResult({ result, exam });
     }
  };

  // Start Editing Score
  const handleEditScore = (result: StoredResult) => {
    if (!result.id) return;
    setEditingResultId(result.id);
    setEditScoreValue(result.result.score.toString());
  };

  // Save New Score
  const handleSaveScore = async (resultId: string) => {
    const newScore = parseFloat(editScoreValue);
    if (isNaN(newScore) || newScore < 0 || newScore > 10) {
      alert("Vui lòng nhập điểm hợp lệ (0-10)");
      return;
    }

    const success = await db.updateResultScore(resultId, newScore);
    if (success) {
      // Update local state to reflect change without reload
      setRawResults(prev => prev.map(r => 
        r.id === resultId ? { ...r, result: { ...r.result, score: newScore } } : r
      ));
      setEditingResultId(null);
    } else {
      alert("Lỗi khi cập nhật điểm. Vui lòng thử lại.");
    }
  };

  const saveConfig = () => {
    localStorage.setItem('SB_URL', dbConfig.url);
    localStorage.setItem('SB_KEY', dbConfig.key);
    if (dbConfig.geminiKey) {
        localStorage.setItem('GEMINI_API_KEY', dbConfig.geminiKey);
    } else {
        localStorage.removeItem('GEMINI_API_KEY');
    }
    if (dbConfig.adminPassword) {
        localStorage.setItem('TEACHER_PASSWORD', dbConfig.adminPassword);
    }
    
    alert('Đã lưu cấu hình! Vui lòng tải lại trang để áp dụng.');
    window.location.reload();
  };

  // Stats calculation for Student Profile
  const studentStats = useMemo(() => {
    if (studentProfileHistory.length === 0) return { avg: 0, count: 0 };
    const total = studentProfileHistory.reduce((sum, r) => sum + r.result.score, 0);
    return {
        avg: total / studentProfileHistory.length,
        count: studentProfileHistory.length
    };
  }, [studentProfileHistory]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col relative">
      <header className="bg-white border-b shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-blue-700">Trang Giáo Viên</h1>
            <span className="px-3 py-1 bg-purple-100 text-purple-700 text-xs rounded-full font-bold shadow-sm">v7.2 (Analytics)</span>
          </div>
          <div className="flex gap-3">
             <button 
                onClick={() => setShowDeployGuide(true)}
                className="text-sm bg-green-50 text-green-700 border border-green-200 px-3 py-1.5 rounded-lg font-medium hover:bg-green-100 flex items-center gap-2"
             >
                <Settings className="w-4 h-4" /> Cấu hình Hệ thống
             </button>
             <button onClick={onExit} className="text-sm text-gray-500 hover:text-red-600 border border-gray-200 px-3 py-1.5 rounded-lg">
                Đăng xuất
             </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full p-6">
        <div className="flex gap-4 mb-8 overflow-x-auto pb-2">
          <button
            onClick={() => setActiveTab('exams')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 whitespace-nowrap
              ${activeTab === 'exams' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-100'}`}
          >
            <FileText className="w-4 h-4" /> Quản lý Đề thi
          </button>
          <button
            onClick={() => { setActiveTab('results'); setSelectedExamId(null); }}
            className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 whitespace-nowrap
              ${activeTab === 'results' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-100'}`}
          >
            <Users className="w-4 h-4" /> Kết quả Học sinh
          </button>
          <button
            onClick={() => setActiveTab('students')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 whitespace-nowrap
              ${activeTab === 'students' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-100'}`}
          >
            <GraduationCap className="w-4 h-4" /> Quản lý Học sinh
          </button>
        </div>

        {activeTab === 'exams' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-800">Danh sách đề thi</h2>
              <button
                onClick={onCreateExam}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-lg shadow-blue-200"
              >
                <Plus className="w-4 h-4" /> Tạo đề mới
              </button>
            </div>

            {exams.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-xl border border-dashed border-gray-300">
                <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">Chưa có đề thi nào. Hãy tạo đề thi đầu tiên!</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {exams.map((exam) => (
                  <div key={exam.id} className="bg-white p-6 rounded-xl border shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        {exam.type === ExamType.TEST ? (
                            <span className="px-2 py-0.5 rounded text-xs font-bold bg-purple-100 text-purple-700 border border-purple-200 flex items-center gap-1">
                                <CalendarClock className="w-3 h-3" /> KIỂM TRA
                            </span>
                        ) : (
                            <span className="px-2 py-0.5 rounded text-xs font-bold bg-green-100 text-green-700 border border-green-200 flex items-center gap-1">
                                <BookOpen className="w-3 h-3" /> LUYỆN TẬP
                            </span>
                        )}
                        <h3 className="text-lg font-bold text-gray-900">{exam.title}</h3>
                      </div>
                      
                      <div className="flex flex-wrap gap-4 text-sm text-gray-500 mt-1">
                        <span>Môn: {exam.subject}</span>
                        <span>•</span>
                        <span>{exam.durationMinutes} phút</span>
                        {exam.type === ExamType.TEST && exam.scheduledAt && (
                            <>
                                <span>•</span>
                                <span className="text-purple-600 font-medium">Mở: {new Date(exam.scheduledAt).toLocaleString()}</span>
                            </>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => onEditExam(exam)}
                        className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg flex items-center gap-2 text-sm border border-orange-100 font-medium"
                        title="Sửa đề thi"
                      >
                         <PenTool className="w-4 h-4" /> Sửa đề
                      </button>
                      <button
                        onClick={() => setViewingExam(exam)}
                        className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg flex items-center gap-2 text-sm border border-indigo-100 font-medium"
                        title="Xem chi tiết Đề & Đáp án"
                      >
                         <Eye className="w-4 h-4" /> Xem đề
                      </button>
                      <button
                        onClick={() => onTestExam(exam)}
                        className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg flex items-center gap-2 text-sm border border-purple-100 font-medium"
                        title="Thi thử ngay (Dành cho Giáo viên check đề)"
                      >
                        <Play className="w-4 h-4" /> Thi thử
                      </button>
                      <button
                        onClick={() => handleViewResults(exam.id)}
                        className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg flex items-center gap-2 text-sm"
                        title="Xem kết quả"
                      >
                        <Users className="w-4 h-4" /> Kết quả
                      </button>
                      <button
                        onClick={() => handleOpenShare(exam)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg flex items-center gap-2 text-sm border border-blue-100"
                        title="Lấy link & QR Code"
                      >
                        <QrCode className="w-4 h-4" /> Chia sẻ
                      </button>
                      <button
                        onClick={() => handleDelete(exam.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                        title="Xóa đề"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* --- RESULT TAB --- */}
        {activeTab === 'results' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-800">Kết quả làm bài</h2>
            {selectedExamId ? (
              <div>
                <button 
                  onClick={() => setSelectedExamId(null)}
                  className="mb-4 text-sm text-gray-500 hover:text-blue-600 flex items-center gap-1"
                >
                  &larr; Quay lại danh sách
                </button>
                <div className="bg-white rounded-xl border overflow-hidden">
                   <div className="p-4 bg-gray-50 border-b flex justify-between items-center">
                    <h3 className="font-bold text-gray-700">
                       {exams.find(e => e.id === selectedExamId)?.title || 'Đề thi đã xóa'}
                    </h3>
                    <div className="text-xs text-gray-500 italic">
                        *Hệ thống tự động hiển thị điểm CAO NHẤT của mỗi học sinh
                    </div>
                  </div>
                  {processedResults.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">Chưa có kết quả nào.</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 text-gray-500 font-medium">
                          <tr>
                            <th className="p-4">Học sinh</th>
                            <th className="p-4">Mã SV</th>
                            <th className="p-4">Điểm số (Cao nhất)</th>
                            <th className="p-4">Chi tiết</th>
                            <th className="p-4">Lần thi cuối</th>
                            <th className="p-4">Thao tác</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {processedResults.map((r, idx) => (
                            <tr key={idx} className="hover:bg-gray-50">
                              <td className="p-4 font-medium text-gray-900">
                                {r.studentInfo.name}
                                {(r as any).attemptCount > 1 && (
                                    <span className="ml-2 px-2 py-0.5 bg-yellow-100 text-yellow-700 text-xs rounded-full font-bold flex inline-flex items-center gap-1">
                                        <History className="w-3 h-3" /> Thi {(r as any).attemptCount} lần
                                    </span>
                                )}
                              </td>
                              <td className="p-4 text-gray-500">{r.studentInfo.studentId}</td>
                              <td className="p-4">
                                {editingResultId === r.id ? (
                                   <div className="flex items-center gap-2">
                                      <input 
                                        type="number"
                                        step="0.1"
                                        min="0"
                                        max="10"
                                        className="w-20 p-1 border border-blue-400 rounded focus:outline-none"
                                        value={editScoreValue}
                                        onChange={(e) => setEditScoreValue(e.target.value)}
                                        autoFocus
                                      />
                                      <button 
                                        onClick={() => r.id && handleSaveScore(r.id)}
                                        className="p-1 text-green-600 hover:bg-green-100 rounded"
                                      >
                                         <Save className="w-4 h-4" />
                                      </button>
                                      <button 
                                        onClick={() => setEditingResultId(null)}
                                        className="p-1 text-red-600 hover:bg-red-100 rounded"
                                      >
                                         <X className="w-4 h-4" />
                                      </button>
                                   </div>
                                ) : (
                                   <div className="flex items-center gap-2">
                                      <span className={`px-2 py-1 rounded font-bold ${r.result.score >= 5 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                        {r.result.score.toFixed(2)}
                                      </span>
                                      {r.id && (
                                        <button 
                                           onClick={() => handleEditScore(r)}
                                           className="text-gray-400 hover:text-blue-600 transition-colors"
                                           title="Sửa điểm"
                                        >
                                           <Edit2 className="w-4 h-4" />
                                        </button>
                                      )}
                                   </div>
                                )}
                              </td>
                              <td className="p-4">
                                 {r.answers ? (
                                    <button 
                                      onClick={() => handleViewStudentDetail(r)}
                                      className="flex items-center gap-1 text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-200 font-medium shadow-sm"
                                    >
                                       <Eye className="w-3 h-3" /> Xem bài
                                    </button>
                                 ) : (
                                    <span className="text-gray-400 italic text-xs bg-gray-100 px-2 py-1 rounded">Dữ liệu cũ</span>
                                 )}
                              </td>
                              <td className="p-4 text-gray-500">{new Date(r.completedAt).toLocaleString()}</td>
                              <td className="p-4">
                                {r.id && (
                                    <button 
                                        onClick={() => handleDeleteResult(r.id!)}
                                        className="flex items-center gap-1 px-3 py-1.5 text-red-600 hover:bg-red-50 rounded-lg border border-red-200 font-medium text-xs shadow-sm hover:shadow-md transition-all"
                                        title="Xóa kết quả này"
                                    >
                                        <Trash2 className="w-4 h-4" /> Xóa
                                    </button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="grid gap-4">
                 <p className="text-gray-500 mb-2">Chọn một đề thi để xem danh sách điểm:</p>
                 {exams.map(exam => (
                   <button
                    key={exam.id}
                    onClick={() => handleViewResults(exam.id)}
                    className="flex items-center justify-between p-4 bg-white border rounded-xl hover:shadow-md transition-all text-left group"
                   >
                     <div>
                       <h4 className="font-bold text-gray-900 group-hover:text-blue-600">{exam.title}</h4>
                       <p className="text-sm text-gray-500">{exam.subject}</p>
                     </div>
                     <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-blue-500" />
                   </button>
                 ))}
              </div>
            )}
          </div>
        )}

        {/* --- STUDENT MANAGEMENT TAB --- */}
        {activeTab === 'students' && (
            <div className="space-y-6">
                <h2 className="text-2xl font-bold text-gray-800">Danh sách Học sinh đã đăng ký</h2>
                <div className="bg-white rounded-xl border overflow-hidden">
                    {students.length === 0 ? (
                        <div className="p-8 text-center text-gray-500">Chưa có học sinh nào đăng ký.</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-gray-50 text-gray-500 font-medium">
                                    <tr>
                                        <th className="p-4">Họ và tên</th>
                                        <th className="p-4">Tên đăng nhập</th>
                                        <th className="p-4">Lớp</th>
                                        <th className="p-4">Mật khẩu</th>
                                        <th className="p-4">Thao tác</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {students.map((s) => (
                                        <tr key={s.id} className="hover:bg-gray-50">
                                            <td className="p-4 font-bold text-gray-900">{s.full_name}</td>
                                            <td className="p-4 font-mono text-blue-600">{s.username}</td>
                                            <td className="p-4 text-gray-600">{s.class_name || '-'}</td>
                                            <td className="p-4 text-gray-400 font-mono">{s.password}</td>
                                            <td className="p-4 flex gap-2">
                                                <button 
                                                    onClick={() => handleViewStudentProfile(s)}
                                                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg border border-blue-100 flex items-center gap-1 text-xs font-bold"
                                                    title="Xem hồ sơ & lịch sử"
                                                >
                                                    <Eye className="w-4 h-4" /> Hồ sơ
                                                </button>
                                                <button 
                                                    onClick={() => handleDeleteStudent(s.id)}
                                                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg border border-red-100 flex items-center gap-1 text-xs font-bold"
                                                    title="Xóa học sinh"
                                                >
                                                    <Trash2 className="w-4 h-4" /> Xóa
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        )}

      </main>

      {/* MODAL: STUDENT PROFILE & STATS */}
      {viewingStudentProfile && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col animate-in zoom-in-95">
             <div className="p-5 border-b flex justify-between items-center bg-gray-50 rounded-t-2xl">
                <div>
                   <h2 className="text-xl font-bold text-gray-900">Hồ sơ Học sinh: {viewingStudentProfile.full_name}</h2>
                   <p className="text-sm text-gray-500">Mã SV: {viewingStudentProfile.username} - Lớp: {viewingStudentProfile.class_name || 'N/A'}</p>
                </div>
                <button onClick={() => setViewingStudentProfile(null)} className="p-2 hover:bg-gray-200 rounded-full">
                  <X className="w-6 h-6 text-gray-500" />
                </button>
             </div>
             
             <div className="p-6 flex-1 overflow-y-auto space-y-6">
                {/* Stats Cards */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 flex items-center gap-4">
                        <div className="p-3 bg-blue-100 rounded-full text-blue-600">
                            <TrendingUp className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Điểm trung bình</p>
                            <p className="text-2xl font-bold text-blue-800">
                                {studentStats.avg.toFixed(2)}
                            </p>
                        </div>
                    </div>
                    <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100 flex items-center gap-4">
                        <div className="p-3 bg-indigo-100 rounded-full text-indigo-600">
                            <FileText className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Tổng số bài thi</p>
                            <p className="text-2xl font-bold text-indigo-800">
                                {studentStats.count}
                            </p>
                        </div>
                    </div>
                </div>

                {/* History Table */}
                <div>
                    <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                        <History className="w-5 h-5 text-gray-600" /> Lịch sử chi tiết
                    </h3>
                    <div className="bg-white rounded-xl border overflow-hidden">
                        {studentProfileHistory.length === 0 ? (
                            <div className="p-6 text-center text-gray-500 italic">Chưa có bài thi nào.</div>
                        ) : (
                            <table className="w-full text-sm text-left">
                                <thead className="bg-gray-50 text-gray-500 font-medium">
                                    <tr>
                                        <th className="p-3">Đề thi</th>
                                        <th className="p-3">Điểm số</th>
                                        <th className="p-3">Ngày thi</th>
                                        <th className="p-3">Thao tác</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {studentProfileHistory.map((r) => (
                                        <tr key={r.id}>
                                            <td className="p-3 font-medium text-gray-900">{r.examTitle}</td>
                                            <td className="p-3">
                                                <span className={`px-2 py-1 rounded font-bold ${r.result.score >= 5 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                    {r.result.score.toFixed(2)}
                                                </span>
                                            </td>
                                            <td className="p-3 text-gray-500">{new Date(r.completedAt).toLocaleString()}</td>
                                            <td className="p-3">
                                                 {r.answers ? (
                                                    <button 
                                                      onClick={() => handleViewStudentDetail(r)}
                                                      className="text-blue-600 hover:underline flex items-center gap-1"
                                                    >
                                                       <Eye className="w-3 h-3" /> Xem
                                                    </button>
                                                 ) : '-'}
                                                 {r.id && (
                                                    <button 
                                                        onClick={() => handleDeleteResult(r.id!)}
                                                        className="text-red-600 hover:underline ml-3 flex inline-flex items-center gap-1"
                                                    >
                                                        <Trash2 className="w-3 h-3" /> Xóa
                                                    </button>
                                                 )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
             </div>
          </div>
        </div>
      )}

      {/* VIEW EXAM CONTENT MODAL */}
      {viewingExam && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
             <div className="p-5 border-b flex justify-between items-center bg-gray-50 rounded-t-2xl">
                <div>
                   <h2 className="text-xl font-bold text-gray-900">{viewingExam.title}</h2>
                   <p className="text-sm text-gray-500">Chế độ xem đề & đáp án (Read-only)</p>
                </div>
                <button onClick={() => setViewingExam(null)} className="p-2 hover:bg-gray-200 rounded-full">
                  <X className="w-6 h-6 text-gray-500" />
                </button>
             </div>
             
             {/* SCORE CONFIG & SCHEDULE DISPLAY */}
             <div className="px-6 py-3 bg-blue-50 border-b border-blue-100 flex gap-6 text-sm text-blue-800 flex-wrap">
                <div className="flex items-center gap-2 font-medium">
                    <Calculator className="w-4 h-4" /> Cấu hình điểm:
                </div>
                <div>Phần 1: <strong>{viewingExam.scoreConfig?.part1PerQuestion ?? 0.25}đ</strong>/câu</div>
                <div>Phần 2: Tối đa <strong>{viewingExam.scoreConfig?.part2MaxScore ?? 1.0}đ</strong>/câu</div>
                <div>Phần 3: <strong>{viewingExam.scoreConfig?.part3PerQuestion ?? 0.5}đ</strong>/câu</div>
                
                {viewingExam.type === ExamType.TEST && viewingExam.scheduledAt && (
                     <div className="flex items-center gap-1 text-purple-700 font-bold border-l pl-4 border-blue-200">
                        <CalendarClock className="w-4 h-4" /> Mở: {new Date(viewingExam.scheduledAt).toLocaleString()}
                     </div>
                )}
             </div>

             <div className="flex-1 overflow-y-auto p-6 space-y-8">
                {/* ... Content of Exam ... */}
                {/* Part 1 */}
                {viewingExam.part1.length > 0 && (
                   <section>
                      <h3 className="font-bold text-blue-700 border-b pb-2 mb-4">Phần 1: Trắc nghiệm</h3>
                      <div className="space-y-6">
                         {viewingExam.part1.map((q, idx) => (
                            <div key={q.id} className="bg-white p-4 border rounded-lg">
                               <div className="flex gap-2 mb-3">
                                  <span className="font-bold text-blue-600">Câu {idx + 1}:</span>
                                  <div><MathRenderer text={q.text} /></div>
                               </div>
                               <div className="grid grid-cols-1 md:grid-cols-2 gap-2 ml-4">
                                  {q.options.map((opt, oIdx) => (
                                     <div key={oIdx} className={`p-2 rounded text-sm border flex items-center justify-between
                                        ${oIdx === q.correctOption ? 'bg-green-50 border-green-200 text-green-800 font-medium' : 'border-gray-100 text-gray-600'}`}>
                                        <span><MathRenderer text={opt} inline /></span>
                                        {oIdx === q.correctOption && <CheckCircle className="w-4 h-4 text-green-600" />}
                                     </div>
                                  ))}
                               </div>
                            </div>
                         ))}
                      </div>
                   </section>
                )}
                 {/* Part 2 */}
                 {viewingExam.part2.length > 0 && (
                   <section>
                      <h3 className="font-bold text-indigo-700 border-b pb-2 mb-4">Phần 2: Đúng/Sai</h3>
                      <div className="space-y-6">
                         {viewingExam.part2.map((q, idx) => (
                            <div key={q.id} className="bg-gray-50 p-4 border rounded-lg">
                               <div className="flex gap-2 mb-3">
                                  <span className="font-bold text-indigo-600">Câu {idx + 1}:</span>
                                  <div><MathRenderer text={q.text} /></div>
                               </div>
                               <div className="ml-4 space-y-2">
                                  {q.subQuestions.map((sub, sIdx) => (
                                     <div key={sub.id} className="flex justify-between items-center bg-white p-2 rounded border">
                                        <span className="text-sm"><MathRenderer text={sub.text} inline /></span>
                                        <span className={`text-xs font-bold px-2 py-1 rounded ${sub.isCorrect ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                            {sub.isCorrect ? 'ĐÚNG' : 'SAI'}
                                        </span>
                                     </div>
                                  ))}
                               </div>
                            </div>
                         ))}
                      </div>
                   </section>
                )}
                 {/* Part 3 */}
                 {viewingExam.part3.length > 0 && (
                   <section>
                      <h3 className="font-bold text-emerald-700 border-b pb-2 mb-4">Phần 3: Trả lời ngắn</h3>
                      <div className="space-y-4">
                         {viewingExam.part3.map((q, idx) => (
                            <div key={q.id} className="bg-white p-4 border rounded-lg flex flex-col md:flex-row gap-4">
                               <div className="flex-1">
                                  <div className="flex gap-2">
                                     <span className="font-bold text-emerald-600">Câu {idx + 1}:</span>
                                     <div><MathRenderer text={q.text} /></div>
                                  </div>
                                </div>
                                <div className="min-w-[150px]">
                                  <span className="text-xs text-gray-500 block">Đáp án:</span>
                                  <div className="p-2 bg-green-50 border border-green-200 text-green-800 font-bold rounded">
                                     {q.correctAnswer}
                                  </div>
                               </div>
                            </div>
                         ))}
                      </div>
                   </section>
                )}
             </div>
          </div>
        </div>
      )}

      {/* VIEW RESULT MODAL */}
      {viewingResult && (
         <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
               <div className="p-5 border-b flex justify-between items-center bg-gray-50 rounded-t-2xl">
                  <div>
                     <h2 className="text-xl font-bold text-gray-900">Chi tiết bài làm: {viewingResult.result.studentInfo.name}</h2>
                     <p className="text-sm text-gray-500">Điểm số: <span className="font-bold text-blue-600">{viewingResult.result.result.score.toFixed(2)}</span></p>
                  </div>
                  <div className="flex items-center gap-2">
                      {/* DELETE BUTTON INSIDE MODAL */}
                      {viewingResult.result.id && (
                        <button 
                            onClick={() => handleDeleteResult(viewingResult.result.id!)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg border border-red-200 flex items-center gap-1 text-sm font-bold mr-2"
                        >
                            <Trash2 className="w-4 h-4" /> Xóa bài này
                        </button>
                      )}
                      <button onClick={() => setViewingResult(null)} className="p-2 hover:bg-gray-200 rounded-full">
                        <X className="w-6 h-6 text-gray-500" />
                      </button>
                  </div>
               </div>
               <div className="flex-1 overflow-y-auto p-6 space-y-8">
                  {/* ... (Code hiển thị bài làm chi tiết của học sinh - Giữ nguyên) ... */}
                  {viewingResult.result.answers ? (
                     <>
                        {/* Part 1 */}
                        {viewingResult.exam.part1.length > 0 && (
                           <section>
                              <h3 className="font-bold text-blue-700 border-b pb-2 mb-4">Phần 1: Trắc nghiệm</h3>
                              <div className="space-y-6">
                                 {viewingResult.exam.part1.map((q, idx) => {
                                    const userIdx = viewingResult.result.answers?.part1[q.id];
                                    return (
                                       <div key={q.id} className="bg-white p-4 border rounded-lg">
                                          <div className="flex gap-2 mb-3">
                                             <span className="font-bold text-blue-600">Câu {idx + 1}:</span>
                                             <div><MathRenderer text={q.text} /></div>
                                          </div>
                                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 ml-4">
                                             {q.options.map((opt, oIdx) => {
                                                const isCorrect = oIdx === q.correctOption;
                                                const isSelected = userIdx === oIdx;
                                                let style = "border-gray-100 text-gray-600";
                                                if (isCorrect) style = "bg-green-50 border-green-200 text-green-800 font-medium";
                                                else if (isSelected) style = "bg-red-50 border-red-200 text-red-800";
                                                
                                                return (
                                                   <div key={oIdx} className={`p-2 rounded text-sm border flex items-center justify-between ${style}`}>
                                                      <span><MathRenderer text={opt} inline /></span>
                                                      {isCorrect && <CheckCircle className="w-4 h-4 text-green-600" />}
                                                      {isSelected && !isCorrect && <XCircle className="w-4 h-4 text-red-600" />}
                                                   </div>
                                                );
                                             })}
                                          </div>
                                       </div>
                                    );
                                 })}
                              </div>
                           </section>
                        )}
                        {/* Part 2 */}
                        {viewingResult.exam.part2.length > 0 && (
                            <section>
                                <h3 className="font-bold text-indigo-700 border-b pb-2 mb-4">Phần 2: Đúng/Sai</h3>
                                <div className="space-y-6">
                                    {viewingResult.exam.part2.map((q, idx) => (
                                    <div key={q.id} className="bg-gray-50 p-4 border rounded-lg">
                                        <div className="flex gap-2 mb-3">
                                            <span className="font-bold text-indigo-600">Câu {idx + 1}:</span>
                                            <div><MathRenderer text={q.text} /></div>
                                        </div>
                                        <div className="ml-4 space-y-2">
                                            {q.subQuestions.map((sub, sIdx) => {
                                                const userVal = viewingResult.result.answers?.part2[q.id]?.[sub.id];
                                                const isCorrect = userVal === sub.isCorrect;
                                                return (
                                                <div key={sub.id} className={`flex justify-between items-center bg-white p-2 rounded border ${isCorrect ? 'border-green-200 bg-green-50/30' : 'border-red-200 bg-red-50/30'}`}>
                                                    <span className="text-sm"><MathRenderer text={sub.text} inline /></span>
                                                    <div className="flex gap-2 items-center">
                                                        <span className="text-xs text-gray-500">HS chọn: 
                                                            <strong className="ml-1 uppercase">{userVal === true ? 'Đúng' : userVal === false ? 'Sai' : 'Trống'}</strong>
                                                        </span>
                                                        <span className={`text-xs font-bold px-2 py-1 rounded ${sub.isCorrect ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                            ĐA: {sub.isCorrect ? 'ĐÚNG' : 'SAI'}
                                                        </span>
                                                    </div>
                                                </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                    ))}
                                </div>
                            </section>
                        )}
                        {/* Part 3 */}
                        {viewingResult.exam.part3.length > 0 && (
                           <section>
                              <h3 className="font-bold text-emerald-700 border-b pb-2 mb-4">Phần 3: Trả lời ngắn</h3>
                              <div className="space-y-4">
                                 {viewingResult.exam.part3.map((q, idx) => {
                                    const userAns = viewingResult.result.answers?.part3[q.id] || "";
                                    const isCorrect = userAns.trim().toLowerCase() === q.correctAnswer.trim().toLowerCase();
                                    return (
                                       <div key={q.id} className="bg-white p-4 border rounded-lg flex flex-col md:flex-row gap-4">
                                          <div className="flex-1">
                                             <div className="flex gap-2">
                                                <span className="font-bold text-emerald-600">Câu {idx + 1}:</span>
                                                <div><MathRenderer text={q.text} /></div>
                                             </div>
                                          </div>
                                          <div className="min-w-[200px] space-y-2">
                                             <div>
                                                <span className="text-xs text-gray-500 block">HS Trả lời:</span>
                                                <div className={`p-2 border rounded font-medium ${isCorrect ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
                                                   {userAns || "(Trống)"}
                                                </div>
                                             </div>
                                             <div>
                                                <span className="text-xs text-gray-500 block">Đáp án đúng:</span>
                                                <div className="p-2 bg-gray-100 border border-gray-200 text-gray-800 font-bold rounded">
                                                   {q.correctAnswer}
                                                </div>
                                             </div>
                                          </div>
                                       </div>
                                    );
                                 })}
                              </div>
                           </section>
                        )}
                     </>
                  ) : (
                     <div className="text-center p-10 text-gray-500">
                        <CloudLightning className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                        <p>Dữ liệu bài làm chi tiết không khả dụng cho kết quả này.</p>
                     </div>
                  )}
               </div>
            </div>
         </div>
      )}

      {/* SHARE MODAL & DEPLOY GUIDE */}
      {showDeployGuide && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full p-6 animate-in fade-in zoom-in-95 overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-xl text-gray-800 flex items-center gap-2">
                <Database className="w-6 h-6 text-green-600" /> Cấu hình Hệ thống
              </h3>
              <button onClick={() => setShowDeployGuide(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-6">
              <div className="space-y-3">
                <label className="block text-sm font-bold text-gray-700">Supabase Project URL</label>
                <input 
                  type="text" 
                  className="w-full p-3 border rounded-lg bg-gray-50 font-mono text-sm"
                  value={dbConfig.url}
                  onChange={(e) => setDbConfig({...dbConfig, url: e.target.value})}
                  placeholder="https://xyz.supabase.co"
                />
              </div>

              <div className="space-y-3">
                <label className="block text-sm font-bold text-gray-700">Supabase Anon Key</label>
                <input 
                  type="text" 
                  className="w-full p-3 border rounded-lg bg-gray-50 font-mono text-sm"
                  value={dbConfig.key}
                  onChange={(e) => setDbConfig({...dbConfig, key: e.target.value})}
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                />
              </div>

              <div className="space-y-3">
                <label className="block text-sm font-bold text-gray-700">Google Gemini API Key</label>
                <input 
                  type="password" 
                  className="w-full p-3 border rounded-lg bg-gray-50 font-mono text-sm"
                  value={dbConfig.geminiKey}
                  onChange={(e) => setDbConfig({...dbConfig, geminiKey: e.target.value})}
                  placeholder="AIzaSy..."
                />
                <p className="text-xs text-gray-500">Key này dùng để AI tạo đề thi.</p>
              </div>

              <div className="space-y-3">
                <label className="block text-sm font-bold text-gray-700">Mật khẩu Quản trị Giáo viên</label>
                <input 
                  type="text" 
                  className="w-full p-3 border rounded-lg bg-gray-50 font-mono text-sm text-red-600 font-bold"
                  value={dbConfig.adminPassword}
                  onChange={(e) => setDbConfig({...dbConfig, adminPassword: e.target.value})}
                  placeholder="123456"
                />
                <p className="text-xs text-gray-500">Dùng để đăng nhập vào trang này.</p>
              </div>

              <div className="pt-4 border-t flex justify-end gap-3">
                <button onClick={() => setShowDeployGuide(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">
                  Hủy
                </button>
                <button onClick={saveConfig} className="px-6 py-2 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700">
                  Lưu Cấu hình
                </button>
              </div>

              {/* SQL Guide Section */}
              <div className="mt-8 pt-6 border-t">
                <h4 className="font-bold text-gray-800 mb-2">Mã SQL khởi tạo Database (Chạy 1 lần)</h4>
                <div className="bg-slate-900 rounded-lg p-4 overflow-x-auto relative group">
                  <pre className="text-xs text-green-400 font-mono">
{`-- 1. TẠO BẢNG ĐỀ THI
create table exams (
  id text primary key,
  title text,
  subject text,
  duration_minutes int,
  created_at timestamptz default now(),
  content jsonb
);

-- 2. TẠO BẢNG HỌC SINH
create table if not exists students (
  id uuid default gen_random_uuid() primary key,
  full_name text not null,
  class_name text,
  username text not null unique,
  password text not null,
  created_at timestamptz default now()
);

-- 3. TẠO BẢNG KẾT QUẢ
create table results (
  id uuid default gen_random_uuid() primary key,
  exam_id text, -- Bỏ references exams(id) để tránh lỗi
  student_name text,
  student_id text,
  student_account_id uuid references students(id),
  score float,
  details jsonb,
  time_spent int,
  answers jsonb, -- Lưu bài làm chi tiết
  created_at timestamptz default now()
);

-- 4. BẬT ROW LEVEL SECURITY (Cho phép truy cập công khai)
alter table exams enable row level security;
create policy "Public Exams" on exams for all using (true);

alter table students enable row level security;
create policy "Public Students" on students for all using (true);

alter table results enable row level security;
create policy "Public Results" on results for all using (true);

-- 5. CẤU HÌNH STORAGE (Cho phép Upload ảnh)
insert into storage.buckets (id, name, public) 
values ('exam-images', 'exam-images', true) 
on conflict (id) do nothing;

drop policy if exists "Public Upload" on storage.objects;
drop policy if exists "Public Select" on storage.objects;

create policy "Public Upload" on storage.objects 
for insert with check ( bucket_id = 'exam-images' );

create policy "Public Select" on storage.objects 
for select using ( bucket_id = 'exam-images' );
`}
                  </pre>
                  <button 
                    onClick={() => navigator.clipboard.writeText(`-- SQL CODE COPIED`)} // (Simplified copy for UI)
                    className="absolute top-2 right-2 bg-white/10 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white/20"
                  >
                    Copy SQL
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SHARE MODAL */}
      {shareData && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in-95">
             <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-lg text-gray-900">Chia sẻ đề thi</h3>
                <button onClick={() => setShareData(null)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-5 h-5" />
                </button>
             </div>
             
             <div className="space-y-4">
                <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
                   <p className="font-bold text-blue-800 text-sm mb-1">Môn thi: {shareData.title}</p>
                   <p className="text-xs text-blue-600">ID: {shareData.id}</p>
                </div>

                {isBlobUrl && (
                    <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200 flex gap-2 items-start">
                        <CloudLightning className="w-5 h-5 text-yellow-600 shrink-0 mt-0.5" />
                        <p className="text-xs text-yellow-800">
                            <strong>Lưu ý:</strong> Bạn đang chạy chế độ Test (Blob URL). 
                            Link này chỉ hoạt động trên máy của bạn. 
                            Hãy Deploy lên Vercel để chia sẻ cho học sinh khác máy.
                        </p>
                    </div>
                )}

                <div>
                   <label className="block text-sm font-medium text-gray-700 mb-2">Đường dẫn làm bài:</label>
                   <div className="flex gap-2">
                      <input 
                        readOnly
                        value={shareData.url}
                        className="flex-1 p-2 border rounded-lg bg-gray-50 text-sm font-mono text-gray-600"
                      />
                      <button 
                        onClick={handleCopyLink}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-3 rounded-lg transition-colors"
                      >
                         <Copy className="w-4 h-4" />
                      </button>
                   </div>
                </div>

                <div className="flex justify-center py-4">
                    <div className="bg-white p-2 rounded-lg border shadow-sm">
                        <img 
                            src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(shareData.url)}`} 
                            alt="QR Code" 
                            className="w-32 h-32"
                        />
                    </div>
                </div>
                <p className="text-center text-xs text-gray-500">Quét mã để làm bài trên điện thoại</p>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};
