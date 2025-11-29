
import React, { useState, useEffect } from 'react';
import { ExamCreator } from './components/ExamCreator';
import { ExamTaker } from './components/ExamTaker';
import { ResultView } from './components/ResultView';
import { TeacherDashboard } from './components/TeacherDashboard';
import { StudentLogin } from './components/StudentLogin';
import { StudentDashboard } from './components/StudentDashboard';
import { Exam, StudentAnswers, StudentInfo, StudentAccount, StoredResult } from './types';
import { db } from './services/supabaseClient';
import { GraduationCap, BookOpen, AlertTriangle, Loader2, Lock, X } from 'lucide-react';

enum AppState {
  HOME = 'HOME',
  TEACHER_DASHBOARD = 'TEACHER_DASHBOARD',
  TEACHER_CREATE = 'TEACHER_CREATE',
  STUDENT_LOGIN = 'STUDENT_LOGIN',
  STUDENT_DASHBOARD = 'STUDENT_DASHBOARD', // NEW STATE
  STUDENT_EXAM = 'STUDENT_EXAM',
  STUDENT_RESULT = 'STUDENT_RESULT',
  STUDENT_REVIEW = 'STUDENT_REVIEW' // Xem lại bài thi từ lịch sử
}

function App() {
  const [appState, setAppState] = useState<AppState>(AppState.HOME);
  const [currentExam, setCurrentExam] = useState<Exam | null>(null);
  const [studentInfo, setStudentInfo] = useState<StudentInfo>({ name: '', classId: '', studentId: '' });
  const [studentAccount, setStudentAccount] = useState<StudentAccount | null>(null); // NEW: Logged in account
  const [studentAnswers, setStudentAnswers] = useState<StudentAnswers | null>(null);
  const [isLoadingExam, setIsLoadingExam] = useState(false);

  // Edit State
  const [examToEdit, setExamToEdit] = useState<Exam | null>(null);
  
  // Review History State
  const [reviewResult, setReviewResult] = useState<StoredResult | null>(null);

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

  // Persistence for Student Login
  useEffect(() => {
    const stored = localStorage.getItem('EXAMPRO_STUDENT');
    if (stored) {
      try {
        const { info, account } = JSON.parse(stored);
        setStudentInfo(info);
        setStudentAccount(account);
        // If not deep linking to an exam, go to dashboard
        const params = new URLSearchParams(window.location.search);
        if (!params.get('examId')) {
          setAppState(AppState.STUDENT_DASHBOARD);
        }
      } catch (e) {
        localStorage.removeItem('EXAMPRO_STUDENT');
      }
    }
  }, []);

  const handleExamCreated = async (exam: Exam) => {
    await db.saveExam(exam);
    setExamToEdit(null); // Clear edit state
    setAppState(AppState.TEACHER_DASHBOARD);
  };

  const handleLoginSuccess = (info: StudentInfo, account: StudentAccount) => {
    setStudentInfo(info);
    setStudentAccount(account);
    // Persist login
    localStorage.setItem('EXAMPRO_STUDENT', JSON.stringify({ info, account }));

    if (currentExam) {
      // Nếu có đề thi (từ link), vào thi luôn
      setAppState(AppState.STUDENT_EXAM);
    } else {
      // Nếu không, vào Dashboard
      setAppState(AppState.STUDENT_DASHBOARD);
    }
  };

  const handleTakeExamFromDashboard = async (examId: string) => {
    setIsLoadingExam(true);
    const exam = await db.getExamById(examId);
    setIsLoadingExam(false);
    if (exam) {
      setCurrentExam(exam);
      // Ensure student info has correct account ID
      if (studentAccount) {
         setStudentInfo(prev => ({ ...prev, accountId: studentAccount.id }));
      }
      setStudentAnswers(null); // Reset answers
      setAppState(AppState.STUDENT_EXAM);
    }
  };

  const handleReviewHistory = async (result: StoredResult) => {
    // Cần load nội dung đề thi gốc để hiển thị
    setIsLoadingExam(true);
    const exam = await db.getExamById(result.examId);
    setIsLoadingExam(false);

    if (exam && result.answers) {
      setCurrentExam(exam);
      setStudentAnswers(result.answers);
      setReviewResult(result); // Đánh dấu là đang review lịch sử
      setAppState(AppState.STUDENT_REVIEW);
    } else {
      alert("Không thể tải nội dung đề thi hoặc bài làm chi tiết.");
    }
  };

  const handleExamSubmit = (answers: StudentAnswers, timeSpent: number) => {
    setStudentAnswers(answers);
    setAppState(AppState.STUDENT_RESULT);
    // Saving happens in ResultView
  };

  // --- Navigation Handlers ---

  const handleGoHome = () => {
    // Clean up
    setStudentAnswers(null);
    setReviewResult(null);
    setCurrentExam(null);
    setExamToEdit(null);
    
    // Nếu đang đăng nhập học sinh -> Về Dashboard học sinh
    if (studentAccount) {
       setAppState(AppState.STUDENT_DASHBOARD);
       window.history.replaceState({}, '', window.location.pathname); // Xóa param nếu có
    } else {
       // Logout hoàn toàn
       setStudentInfo({ name: '', classId: '', studentId: '' });
       window.history.replaceState({}, '', window.location.pathname);
       setAppState(AppState.HOME);
    }
  };
  
  const handleStudentLogout = () => {
    setStudentAccount(null);
    setStudentInfo({ name: '', classId: '', studentId: '' });
    localStorage.removeItem('EXAMPRO_STUDENT');
    setAppState(AppState.HOME);
  };

  const handleRetry = () => {
    // 1. Reset dữ liệu bài làm cũ
    setStudentAnswers(null);
    setReviewResult(null);

    // 2. Kiểm tra: Nếu là thi thật (có Link) -> Reload trang
    const params = new URLSearchParams(window.location.search);
    if (params.get('examId')) {
      window.location.reload();
      return;
    }

    // 3. Nếu đang ở Dashboard (có tài khoản) -> Chuyển ngay sang màn hình thi (STUDENT_EXAM)
    // Thay vì về Dashboard như trước
    if (studentAccount) {
         setAppState(AppState.STUDENT_EXAM);
    } else {
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

            <button
              onClick={() => setAppState(AppState.STUDENT_LOGIN)}
              className="group relative flex items-center p-4 border-2 border-gray-100 rounded-2xl hover:border-green-500 hover:bg-green-50 transition-all duration-300"
            >
              <div className="bg-green-100 p-3 rounded-xl mr-4 group-hover:bg-green-600 transition-colors">
                <GraduationCap className="w-6 h-6 text-green-600 group-hover:text-white" />
              </div>
              <div className="text-left">
                <h4 className="font-bold text-gray-900 group-hover:text-green-700">Học sinh</h4>
                <p className="text-sm text-gray-500">Đăng nhập để thi & xem điểm</p>
              </div>
            </button>
            
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
          onEditExam={(exam) => {
            setExamToEdit(exam);
            setAppState(AppState.TEACHER_CREATE);
          }}
        />
      )}

      {appState === AppState.TEACHER_CREATE && (
        <div className="min-h-screen bg-gray-50">
          <header className="bg-white border-b px-6 py-4 flex items-center gap-4">
            <button onClick={() => {
              setExamToEdit(null);
              setAppState(AppState.TEACHER_DASHBOARD);
            }} className="text-gray-500 hover:text-black font-medium">
              &larr; Quay lại
            </button>
            <h1 className="font-bold text-lg">{examToEdit ? 'Chỉnh sửa đề thi' : 'Tạo đề thi mới'}</h1>
          </header>
          <ExamCreator 
            onExamCreated={handleExamCreated} 
            initialExam={examToEdit} 
          />
        </div>
      )}

      {appState === AppState.STUDENT_LOGIN && (
         <StudentLogin 
            onLoginSuccess={handleLoginSuccess} 
            targetExamTitle={currentExam?.title}
         />
      )}

      {appState === AppState.STUDENT_DASHBOARD && studentAccount && (
         <StudentDashboard
            account={studentAccount}
            onLogout={handleStudentLogout}
            onReviewResult={handleReviewHistory}
            onTakeExam={handleTakeExamFromDashboard}
         />
      )}
      
      {appState === AppState.STUDENT_EXAM && currentExam && (
        <ExamTaker
          exam={currentExam}
          studentInfo={studentInfo}
          onSubmit={handleExamSubmit}
          onExit={handleGoHome}
        />
      )}
      
      {(appState === AppState.STUDENT_RESULT || appState === AppState.STUDENT_REVIEW) && currentExam && studentAnswers && (
        <ResultView
          exam={currentExam}
          answers={studentAnswers}
          studentInfo={studentInfo}
          timeSpent={reviewResult?.timeSpent || (currentExam.durationMinutes * 60)} // Use stored time if reviewing
          onRetry={handleRetry}
          onBack={handleGoHome}
          isHistoryMode={appState === AppState.STUDENT_REVIEW}
        />
      )}
    </>
  );
}

export default App;
