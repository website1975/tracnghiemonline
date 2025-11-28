
import React, { useState, useEffect } from 'react';
import { Exam, StoredResult } from '../types';
import { db } from '../services/supabaseClient';
import { MathRenderer } from './MathRenderer';
import { Plus, Trash2, Link as LinkIcon, FileText, Users, Eye, ChevronRight, X, Copy, QrCode, CloudLightning, Database, Settings, ExternalLink, Key, Play, Lock, Edit2, Save, CheckCircle, XCircle } from 'lucide-react';

interface TeacherDashboardProps {
  onCreateExam: () => void;
  onExit: () => void;
  onTestExam: (exam: Exam) => void;
}

interface ShareModalData {
  id: string;
  title: string;
  url: string;
}

export const TeacherDashboard: React.FC<TeacherDashboardProps> = ({ onCreateExam, onExit, onTestExam }) => {
  const [exams, setExams] = useState<Exam[]>([]);
  const [activeTab, setActiveTab] = useState<'exams' | 'results'>('exams');
  const [selectedExamId, setSelectedExamId] = useState<string | null>(null);
  const [results, setResults] = useState<StoredResult[]>([]);
  
  // Share Modal State
  const [shareData, setShareData] = useState<ShareModalData | null>(null);
  
  // View Exam Content Modal
  const [viewingExam, setViewingExam] = useState<Exam | null>(null);

  // View Student Answer Modal
  const [viewingResult, setViewingResult] = useState<{result: StoredResult, exam: Exam} | null>(null);

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

  useEffect(() => {
    refreshData();
  }, []);

  const refreshData = async () => {
    const data = await db.getExams();
    setExams(data);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Bạn có chắc chắn muốn xóa đề thi này không?')) {
      await db.deleteExam(id);
      refreshData();
      if (selectedExamId === id) setSelectedExamId(null);
    }
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
    setResults(await db.getResultsByExam(examId));
    setActiveTab('results');
  };

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
      setResults(prev => prev.map(r => 
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

  const isBlobUrl = window.location.href.startsWith('blob:');

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col relative">
      <header className="bg-white border-b shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-blue-700">Trang Giáo Viên</h1>
            <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded-full font-medium">Admin</span>
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
        <div className="flex gap-4 mb-8">
          <button
            onClick={() => setActiveTab('exams')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2
              ${activeTab === 'exams' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-100'}`}
          >
            <FileText className="w-4 h-4" /> Quản lý Đề thi
          </button>
          <button
            onClick={() => { setActiveTab('results'); setSelectedExamId(null); }}
            className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2
              ${activeTab === 'results' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-100'}`}
          >
            <Users className="w-4 h-4" /> Kết quả Học sinh
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
                      <h3 className="text-lg font-bold text-gray-900">{exam.title}</h3>
                      <div className="flex gap-4 text-sm text-gray-500 mt-1">
                        <span>Môn: {exam.subject}</span>
                        <span>•</span>
                        <span>{exam.durationMinutes} phút</span>
                        <span>•</span>
                        <span>{new Date(exam.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
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
                    <div className="text-xs text-blue-600 flex items-center gap-1 bg-blue-50 px-2 py-1 rounded">
                       <Edit2 className="w-3 h-3" /> Chế độ sửa điểm: Bấm vào biểu tượng bút để sửa
                    </div>
                  </div>
                  {results.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">Chưa có kết quả nào.</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 text-gray-500 font-medium">
                          <tr>
                            <th className="p-4">Học sinh</th>
                            <th className="p-4">Mã SV</th>
                            <th className="p-4">Điểm số</th>
                            <th className="p-4">Chi tiết</th>
                            <th className="p-4">Ngày nộp</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {results.map((r, idx) => (
                            <tr key={idx} className="hover:bg-gray-50">
                              <td className="p-4 font-medium text-gray-900">{r.studentInfo.name}</td>
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
                                   <div className="flex items-center gap-2 group">
                                      <span className={`px-2 py-1 rounded font-bold ${r.result.score >= 5 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                        {r.result.score.toFixed(2)}
                                      </span>
                                      {r.id && (
                                        <button 
                                           onClick={() => handleEditScore(r)}
                                           className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-blue-600 transition-opacity"
                                           title="Sửa điểm"
                                        >
                                           <Edit2 className="w-3 h-3" />
                                        </button>
                                      )}
                                   </div>
                                )}
                              </td>
                              <td className="p-4">
                                 {r.answers ? (
                                    <button 
                                      onClick={() => handleViewStudentDetail(r)}
                                      className="flex items-center gap-1 text-blue-600 hover:bg-blue-50 px-2 py-1 rounded border border-blue-100 shadow-sm"
                                    >
                                       <Eye className="w-3 h-3" /> Xem bài
                                    </button>
                                 ) : (
                                    <span className="text-gray-400 italic text-xs">Không có dữ liệu</span>
                                 )}
                              </td>
                              <td className="p-4 text-gray-500">{new Date(r.completedAt).toLocaleString()}</td>
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
      </main>

      {/* Deploy Guide Modal */}
      {showDeployGuide && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
             <div className="p-6 border-b sticky top-0 bg-white z-10 flex justify-between items-center">
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                   <Settings className="w-5 h-5 text-blue-600" /> Cấu hình Hệ thống
                </h2>
                <button onClick={() => setShowDeployGuide(false)}><X className="w-5 h-5" /></button>
             </div>
             
             <div className="p-6 space-y-6">
                
                {/* 0. Security Config */}
                <div className="space-y-4 pb-6 border-b">
                   <h4 className="font-bold text-gray-800 flex items-center gap-2">
                     <Lock className="w-4 h-4 text-red-600" /> 0. Bảo mật
                   </h4>
                   <p className="text-sm text-gray-600">
                     Đặt mật khẩu để ngăn học sinh vào trang Giáo viên.
                   </p>
                   <input 
                      type="text" 
                      value={dbConfig.adminPassword}
                      onChange={(e) => setDbConfig({...dbConfig, adminPassword: e.target.value})}
                      placeholder="Mặc định: 123456"
                      className="w-full p-2 border border-red-200 rounded focus:ring-red-500"
                   />
                </div>

                {/* 1. Gemini Config */}
                <div className="space-y-4 pb-6 border-b">
                   <h4 className="font-bold text-gray-800 flex items-center gap-2">
                     <Key className="w-4 h-4 text-amber-600" /> 1. Cấu hình AI (Google Gemini)
                   </h4>
                   <p className="text-sm text-gray-600">
                     Nhập API Key để tạo đề thi. Nếu không nhập, hệ thống sẽ tìm trong biến môi trường.
                   </p>
                   <input 
                      type="password" 
                      value={dbConfig.geminiKey}
                      onChange={(e) => setDbConfig({...dbConfig, geminiKey: e.target.value})}
                      placeholder="AIzaSy..."
                      className="w-full p-2 border border-amber-200 rounded focus:ring-amber-500"
                   />
                </div>

                {/* 2. Supabase Config */}
                <div className="space-y-4">
                  <h4 className="font-bold text-gray-800 flex items-center gap-2">
                    <Database className="w-4 h-4 text-blue-600" /> 2. Cấu hình Database (Supabase)
                  </h4>
                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 text-sm">
                     <p className="font-bold text-blue-800 mb-1">Trạng thái: {dbConfig.url ? '🟢 Đã nhập' : '⚪ Chưa nhập'}</p>
                     <p>Nhập thông tin từ Dashboard Supabase để lưu trữ Online.</p>
                  </div>

                   <label className="block text-sm font-medium">Supabase Project URL</label>
                   <input 
                      type="text" 
                      value={dbConfig.url}
                      onChange={(e) => setDbConfig({...dbConfig, url: e.target.value})}
                      placeholder="https://xyz.supabase.co"
                      className="w-full p-2 border rounded"
                   />

                   <label className="block text-sm font-medium">Supabase Anon Key</label>
                   <input 
                      type="password" 
                      value={dbConfig.key}
                      onChange={(e) => setDbConfig({...dbConfig, key: e.target.value})}
                      placeholder="eyJhbGciOiJIUzI1..."
                      className="w-full p-2 border rounded"
                   />
                </div>

                <button onClick={saveConfig} className="w-full py-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 shadow-lg shadow-blue-200">
                   Lưu cấu hình
                </button>

                <div className="border-t pt-6 space-y-3">
                   <h4 className="font-bold text-gray-800 text-sm">Mã SQL tạo bảng (Chạy trên Supabase)</h4>
                   <div className="bg-gray-900 text-gray-100 p-4 rounded-lg text-xs font-mono overflow-x-auto relative group">
                      <pre>{`-- 1. Tạo bảng Exams
create table if not exists exams (
  id uuid default gen_random_uuid() primary key,
  title text not null, 
  subject text, 
  duration_minutes int,
  content jsonb not null, 
  created_at timestamptz default now()
);

-- 2. Tạo bảng Results
create table if not exists results (
  id uuid default gen_random_uuid() primary key,
  exam_id uuid references exams(id) on delete cascade, 
  student_name text, 
  student_id text,
  score numeric, 
  details jsonb,
  answers jsonb, -- MỚI: Thêm cột này để lưu chi tiết bài làm
  time_spent int, 
  created_at timestamptz default now()
);

-- 3. Mở quyền truy cập
alter table exams enable row level security;
alter table results enable row level security;
create policy "Public Exams Access" on exams for all using (true);
create policy "Public Results Access" on results for all using (true);

-- *LỆNH SỬA LỖI CHO BẢNG CŨ (Nếu đã tạo bảng results trước đó)
ALTER TABLE results ADD COLUMN IF NOT EXISTS answers jsonb;
ALTER TABLE results DROP CONSTRAINT IF EXISTS results_exam_id_fkey;`}</pre>
                   </div>
                </div>
             </div>
          </div>
        </div>
      )}

      {/* Share Modal */}
      {shareData && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-4 bg-blue-600 flex justify-between items-center text-white">
               <h3 className="font-bold text-lg">Chia sẻ đề thi</h3>
               <button onClick={() => setShareData(null)} className="hover:bg-blue-700 p-1 rounded">
                 <X className="w-5 h-5" />
               </button>
            </div>
            
            <div className="p-6 space-y-6">
               <div className="text-center">
                  <p className="font-medium text-gray-900 mb-1">{shareData.title}</p>
                  <p className="text-sm text-gray-500">Quét mã QR để vào thi ngay</p>
               </div>

               <div className="flex justify-center">
                  <div className="p-4 bg-white border-2 border-gray-100 rounded-xl shadow-inner">
                    <img 
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(shareData.url)}`}
                      alt="QR Code"
                      className="w-40 h-40"
                    />
                  </div>
               </div>

               <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase">Hoặc gửi đường dẫn</label>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      readOnly 
                      value={shareData.url}
                      className="flex-1 bg-gray-50 border rounded-lg px-3 py-2 text-sm text-gray-600 focus:outline-none"
                    />
                    <button 
                      onClick={handleCopyLink}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg flex items-center gap-2"
                    >
                       <Copy className="w-4 h-4" />
                    </button>
                  </div>
                  {isBlobUrl && (
                    <div className="bg-red-50 text-red-800 text-xs p-2 rounded border border-red-100 mt-2 flex items-center gap-2">
                       <CloudLightning className="w-4 h-4 flex-shrink-0" />
                       <span>Lưu ý: Bạn đang chạy trên môi trường Test (blob). Link này KHÔNG gửi được. Hãy dùng nút <strong>"Thi thử"</strong> bên ngoài.</span>
                    </div>
                  )}
                  <button 
                    onClick={() => window.open(shareData.url, '_blank')}
                    className="w-full text-center text-sm text-blue-600 hover:underline mt-2"
                  >
                    Mở thử link (Tab mới)
                  </button>
               </div>
            </div>
            
            <div className="p-4 bg-gray-50 text-center border-t">
              <button 
                onClick={() => setShareData(null)}
                className="text-sm text-gray-600 hover:text-gray-900 font-medium"
              >
                Đóng cửa sổ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Exam Content Modal */}
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
             
             <div className="flex-1 overflow-y-auto p-6 space-y-8">
                {/* Content similar to ResultView but Read-Only */}
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
                {/* ... (Other parts can be similarly rendered) ... */}
             </div>
          </div>
        </div>
      )}

      {/* View Student Answer Detail Modal */}
      {viewingResult && (
         <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
               <div className="p-5 border-b flex justify-between items-center bg-gray-50 rounded-t-2xl">
                  <div>
                     <h2 className="text-xl font-bold text-gray-900">Chi tiết bài làm: {viewingResult.result.studentInfo.name}</h2>
                     <p className="text-sm text-gray-500">Điểm số: <span className="font-bold text-blue-600">{viewingResult.result.result.score.toFixed(2)}</span></p>
                  </div>
                  <button onClick={() => setViewingResult(null)} className="p-2 hover:bg-gray-200 rounded-full">
                     <X className="w-6 h-6 text-gray-500" />
                  </button>
               </div>

               <div className="flex-1 overflow-y-auto p-6 space-y-8">
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

    </div>
  );
};
