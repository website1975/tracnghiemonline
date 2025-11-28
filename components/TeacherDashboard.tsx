import React, { useState, useEffect } from 'react';
import { Exam, StoredResult } from '../types';
import { db } from '../services/supabaseClient';
import { Plus, Trash2, Link as LinkIcon, FileText, Users, Eye, ChevronRight, X, Copy, QrCode, CloudLightning, Database, Settings, ExternalLink, Key, Play } from 'lucide-react';

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
  
  // Deploy/Config Modal
  const [showDeployGuide, setShowDeployGuide] = useState(false);
  const [dbConfig, setDbConfig] = useState({
    url: localStorage.getItem('SB_URL') || '',
    key: localStorage.getItem('SB_KEY') || '',
    geminiKey: localStorage.getItem('GEMINI_API_KEY') || ''
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
    // Construct URL based on current location, stripping query params
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

  const saveConfig = () => {
    localStorage.setItem('SB_URL', dbConfig.url);
    localStorage.setItem('SB_KEY', dbConfig.key);
    // Lưu Gemini Key riêng
    if (dbConfig.geminiKey) {
        localStorage.setItem('GEMINI_API_KEY', dbConfig.geminiKey);
    } else {
        localStorage.removeItem('GEMINI_API_KEY');
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
                        <Eye className="w-4 h-4" /> Kết quả
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
                  <div className="p-4 bg-gray-50 border-b">
                    <h3 className="font-bold text-gray-700">
                       {exams.find(e => e.id === selectedExamId)?.title || 'Đề thi đã xóa'}
                    </h3>
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
                            <th className="p-4">Thời gian làm</th>
                            <th className="p-4">Ngày nộp</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {results.map((r, idx) => (
                            <tr key={idx} className="hover:bg-gray-50">
                              <td className="p-4 font-medium text-gray-900">{r.studentInfo.name}</td>
                              <td className="p-4 text-gray-500">{r.studentInfo.studentId}</td>
                              <td className="p-4">
                                <span className={`px-2 py-1 rounded font-bold ${r.result.score >= 5 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                  {r.result.score.toFixed(2)}
                                </span>
                              </td>
                              <td className="p-4 text-gray-500">{Math.round(r.timeSpent / 60)} phút</td>
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
  time_spent int, 
  created_at timestamptz default now()
);

-- 3. Mở quyền truy cập
alter table exams enable row level security;
alter table results enable row level security;
create policy "Public Exams Access" on exams for all using (true);
create policy "Public Results Access" on results for all using (true);`}</pre>
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
    </div>
  );
};
