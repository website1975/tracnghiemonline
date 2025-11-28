import React, { useState, useEffect } from 'react';
import { ExamCreator } from './components/ExamCreator';
import { ExamTaker } from './components/ExamTaker';
import { ResultView } from './components/ResultView';
import { TeacherDashboard } from './components/TeacherDashboard';
import { Exam, StudentAnswers, StudentInfo } from './types';
import { db } from './services/supabaseClient';
import { GraduationCap, BookOpen, User, AlertTriangle, Loader2, Lock, X } from 'lucide-react';

enum AppState {
  HOME = 'HOME',
  TEACHER_DASHBOARD = 'TEACHER_DASHBOARD',
  TEACHER_CREATE = 'TEACHER_CREATE',
  STUDENT_LOGIN = 'STUDENT_LOGIN',
  STUDENT_EXAM = 'STUDENT_EXAM',
  STUDENT_RESULT = 'STUDENT_RESULT',
}

function App() {
  const [appState, setAppState] = useState<AppState>(AppState.HOME);
  const [currentExam, setCurrentExam] = useState<Exam | null>(null);
  const [studentInfo, setStudentInfo] = useState<StudentInfo>({ name: '', classId: '', studentId: '' });
  const [studentAnswers, setStudentAnswers] = useState<StudentAnswers | null>(null);
  const [isLoadingExam, setIsLoadingExam] = useState(false);

  // Teacher Login State
  const [showTeacherLogin, setShowTeacherLogin] = useState(false);
  const [teacherPassword, setTeacherPassword] = useState('');
  const [loginError, setLoginError] = useState(false);

  // Check URL params on load
  useEffect(() => {
    const checkUrlForExam = async () => {
      const params = new URLSearchParams(window.location.search);
      const examId = params.get('examId');

      if (examId) {
        setIsLoadingExam(true);
        // Load exam from DB (Async)
        const exam = await db.getExamById(examId);
        setIsLoadingExam(false);

        if (exam) {
          setCurrentExam(exam);
          setAppState(AppState.STUDENT_LOGIN);
        } else {
          // Fallback UI if exam not found
          alert('Không tìm thấy đề thi này. Có thể link bị sai, đề đã bị xóa, hoặc bạn chưa kết nối Database.');
          window.history.replaceState({}, '', window.location.pathname);
        }
      }
    };
    checkUrlForExam();
  }, []);

  const handleExamCreated = async (exam: Exam) => {
    await db.saveExam(exam);
    setAppState(AppState.TEACHER_DASHBOARD);
  };

  const handleStudentLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentExam && studentInfo.name) {
      setAppState(AppState.STUDENT_EXAM);
    }
  };

  const handleExamSubmit = (answers: StudentAnswers, timeSpent: number) => {
    setStudentAnswers(answers);
    setAppState(AppState.STUDENT_RESULT);
    // Saving happens in ResultView
  };

  // --- Navigation Handlers ---

  const handleGoHome = () => {
    // Reset toàn bộ trạng thái về ban đầu
    setStudentAnswers(null);
    setStudentInfo({ name: '', classId: '', studentId: '' });
    setCurrentExam(null);
    // Xóa query params trên URL nếu có
    window.history.replaceState({}, '', window.location.pathname);
    setAppState(AppState.HOME);
  };

  const handleRetry = () => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('examId')) {
      // Nếu là thi thật (có ID trên URL), reload trang để reset sạch sẽ timer và state
      window.location.reload();
    } else {
      // Nếu là thi thử (Preview), chỉ quay lại màn hình nhập tên, giữ lại đề thi trong bộ nhớ
      setStudentAnswers(null);
      setAppState(AppState.STUDENT_LOGIN);
    }
  };

  const handleTeacherLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const storedPass = localStorage.getItem('TEACHER_PASSWORD') || '123456';
    if (teacherPassword === storedPass) {
      setAppState(AppState.TEACHER_DASHBOARD);
      setShowTeacherLogin(false);
      setTeacherPassword('');
      setLoginError(false);
    } else {
      setLoginError(true);
    }
  };

  // --- Render Functions ---

  const renderHome = () => (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center p-4 relative">
      {isLoadingExam ? (
        <div className="bg-white p-8 rounded-2xl shadow-xl flex flex-col items-center">
           <Loader2 className="w-10 h-10 text-blue-600 animate-spin mb-4" />
           <p className="text-gray-600 font-medium">Đang tải đề thi...</p>
        </div>
      ) : (
        <div className="max-w-4xl w-full bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row min-h-[500px]">
          {/* Left: Branding */}
          <div className="md:w-1/2 bg-blue-600 p-12 text-white flex flex-col justify-between relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-6">
                 <GraduationCap className="w-10 h-10" />
                 <h1 className="text-3xl font-bold tracking-tight">ExamPro</h1>
              </div>
              <h2 className="text-4xl font-extrabold mb-4 leading-tight">Nền Tảng Kiểm Tra Trực Tuyến 2025</h2>
              <p className="text-blue-100 text-lg">
                Chuẩn cấu trúc Bộ GD&ĐT. Tự động hóa tạo đề và chấm điểm.
              </p>
            </div>
            <div className="text-sm text-blue-200 mt-8">
              © 2025 Education Tech. Powered by Gemini & Supabase.
            </div>
          </div>

          {/* Right: Actions */}
          <div className="md:w-1/2 p-12 flex flex-col justify-center space-y-6">
            <div className="text-center mb-4">
              <h3 className="text-2xl font-bold text-gray-800">Chọn vai trò</h3>
              <p className="text-gray-500">Giáo viên quản lý hoặc Học sinh vào thi</p>
            </div>

            <button
              onClick={() => setShowTeacherLogin(true)}
              className="group relative flex items-center p-4 border-2 border-gray-100 rounded-2xl hover:border-blue-500 hover:bg-blue-50 transition-all duration-300"
            >
              <div className="bg-blue-100 p-3 rounded-xl mr-4 group-hover:bg-blue-600 transition-colors">
                <BookOpen className="w-6 h-6 text-blue-600 group-hover:text-white" />
              </div>
              <div className="text-left">
                <h4 className="font-bold text-gray-900 group-hover:text-blue-700">Giáo Viên</h4>
                <p className="text-sm text-gray-500">Tạo đề, quản lý & lấy link</p>
              </div>
            </button>

            <div className="relative flex py-2 items-center">
              <div className="flex-grow border-t border-gray-200"></div>
              <span className="flex-shrink-0 mx-4 text-gray-400 text-xs uppercase">Hoặc</span>
              <div className="flex-grow border-t border-gray-200"></div>
            </div>

             <div className="bg-yellow-50 p-4 rounded-xl border border-yellow-100 text-sm text-yellow-800 flex gap-2">
               <AlertTriangle className="w-5 h-5 flex-shrink-0" />
               <p>Học sinh vui lòng truy cập qua <strong>đường link</strong> giáo viên gửi để vào thẳng bài thi.</p>
             </div>
          </div>
        </div>
      )}

      {/* Teacher Login Modal */}
      {showTeacherLogin && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 animate-in fade-in zoom-in-95">
             <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-lg text-gray-900 flex items-center gap-2">
                  <Lock className="w-5 h-5 text-blue-600" /> Đăng nhập Giáo viên
                </h3>
                <button onClick={() => setShowTeacherLogin(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-5 h-5" />
                </button>
             </div>
             <form onSubmit={handleTeacherLogin}>
                <p className="text-sm text-gray-600 mb-3">Vui lòng nhập mật khẩu quản trị.</p>
                <input 
                  autoFocus
                  type="password" 
                  placeholder="Mật khẩu (Mặc định: 123456)"
                  className="w-full p-3 border rounded-lg mb-2 focus:ring-2 focus:ring-blue-500 outline-none"
                  value={teacherPassword}
                  onChange={(e) => setTeacherPassword(e.target.value)}
                />
                {loginError && <p className="text-xs text-red-500 mb-3">Mật khẩu không đúng.</p>}
                <button type="submit" className="w-full bg-blue-600 text-white font-bold py-2.5 rounded-lg hover:bg-blue-700">
                  Truy cập
                </button>
             </form>
          </div>
        </div>
      )}
    </div>
  );

  const renderStudentLogin = () => (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 border-t-4 border-blue-600">
        <div className="text-center mb-6">
           <h3 className="text-sm font-bold text-blue-600 uppercase tracking-wide">Đề thi</h3>
           <h2 className="text-2xl font-bold text-gray-900 mt-1">{currentExam?.title}</h2>
           <p className="text-gray-500 mt-1 text-sm">{currentExam?.subject} - {currentExam?.durationMinutes} phút</p>
        </div>
        
        <form onSubmit={handleStudentLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Họ và tên thí sinh</label>
            <input
              required
              type="text"
              className="w-full px-4 py-3 rounded-lg border focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="Nhập họ tên của bạn..."
              value={studentInfo.name}
              onChange={(e) => setStudentInfo({ ...studentInfo, name: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Số báo danh / Mã SV</label>
            <input
              required
              type="text"
              className="w-full px-4 py-3 rounded-lg border focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="VD: HS001"
              value={studentInfo.studentId}
              onChange={(e) => setStudentInfo({ ...studentInfo, studentId: e.target.value })}
            />
          </div>
          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition-colors shadow-lg shadow-blue-200 mt-4"
          >
            Vào Làm Bài
          </button>
        </form>
      </div>
    </div>
  );

  return (
    <>
      {appState === AppState.HOME && renderHome()}
      
      {appState === AppState.TEACHER_DASHBOARD && (
        <TeacherDashboard 
          onCreateExam={() => setAppState(AppState.TEACHER_CREATE)}
          onExit={handleGoHome}
          onTestExam={(exam) => {
             setCurrentExam(exam);
             setAppState(AppState.STUDENT_LOGIN);
          }}
        />
      )}

      {appState === AppState.TEACHER_CREATE && (
        <div className="min-h-screen bg-gray-50">
          <header className="bg-white border-b px-6 py-4 flex items-center gap-4">
            <button onClick={() => setAppState(AppState.TEACHER_DASHBOARD)} className="text-gray-500 hover:text-black font-medium">
              &larr; Quay lại
            </button>
            <h1 className="font-bold text-lg">Tạo đề thi mới</h1>
          </header>
          <ExamCreator onExamCreated={handleExamCreated} />
        </div>
      )}

      {appState === AppState.STUDENT_LOGIN && renderStudentLogin()}
      
      {appState === AppState.STUDENT_EXAM && currentExam && (
        <ExamTaker
          exam={currentExam}
          studentInfo={studentInfo}
          onSubmit={handleExamSubmit}
          onExit={handleGoHome}
        />
      )}
      
      {appState === AppState.STUDENT_RESULT && currentExam && studentAnswers && (
        <ResultView
          exam={currentExam}
          answers={studentAnswers}
          studentInfo={studentInfo}
          timeSpent={(currentExam.durationMinutes * 60) /* Approximate */}
          onRetry={handleRetry}
          onBack={handleGoHome}
        />
      )}
    </>
  );
}

export default App;
