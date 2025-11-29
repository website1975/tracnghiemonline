
import React, { useState } from 'react';
import { db } from '../services/supabaseClient';
import { StudentAccount, StudentInfo } from '../types';
import { GraduationCap, Loader2, UserPlus, LogIn } from 'lucide-react';

interface StudentLoginProps {
  onLoginSuccess: (info: StudentInfo, account: StudentAccount) => void;
  targetExamTitle?: string;
}

export const StudentLogin: React.FC<StudentLoginProps> = ({ onLoginSuccess, targetExamTitle }) => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [className, setClassName] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const account = await db.loginStudent(username, password);
    setLoading(false);

    if (account) {
      const info: StudentInfo = {
        name: account.full_name,
        classId: account.class_name,
        studentId: account.username, // Dùng username làm mã SV
        accountId: account.id
      };
      onLoginSuccess(info, account);
    } else {
      setError("Tên đăng nhập hoặc mật khẩu không đúng.");
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !username || !password) {
      setError("Vui lòng điền đầy đủ thông tin.");
      return;
    }

    setLoading(true);
    setError(null);

    const res = await db.registerStudent({ fullName, className, username, password });
    setLoading(false);

    if (res.success) {
      alert("Đăng ký thành công! Vui lòng đăng nhập.");
      setIsRegistering(false);
      setPassword(''); // Clear pass
    } else {
      setError(res.message || "Đăng ký thất bại.");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 border-t-4 border-blue-600">
        <div className="text-center mb-6">
           <div className="bg-blue-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
              <GraduationCap className="w-6 h-6 text-blue-600" />
           </div>
           <h2 className="text-2xl font-bold text-gray-900">{isRegistering ? 'Đăng ký Học sinh' : 'Đăng nhập Học sinh'}</h2>
           {targetExamTitle && (
             <p className="text-sm text-blue-600 mt-2 font-medium bg-blue-50 py-1 px-2 rounded-lg inline-block">
               Bạn đang chuẩn bị thi: {targetExamTitle}
             </p>
           )}
        </div>
        
        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100">
            {error}
          </div>
        )}

        {isRegistering ? (
          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Họ và tên</label>
              <input required type="text" className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
                value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Nguyễn Văn A" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Lớp (Tùy chọn)</label>
              <input type="text" className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
                value={className} onChange={e => setClassName(e.target.value)} placeholder="12A1" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tên đăng nhập (Mã SV)</label>
              <input required type="text" className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
                value={username} onChange={e => setUsername(e.target.value)} placeholder="HS001" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mật khẩu</label>
              <input required type="password" className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
                value={password} onChange={e => setPassword(e.target.value)} placeholder="******" />
            </div>
            <button disabled={loading} type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition-colors flex items-center justify-center gap-2">
               {loading ? <Loader2 className="animate-spin" /> : <UserPlus className="w-5 h-5" />} Đăng ký
            </button>
            <p className="text-center text-sm text-gray-600 mt-2">
              Đã có tài khoản? <button type="button" onClick={() => setIsRegistering(false)} className="text-blue-600 font-bold hover:underline">Đăng nhập ngay</button>
            </p>
          </form>
        ) : (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tên đăng nhập</label>
              <input required type="text" className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
                value={username} onChange={e => setUsername(e.target.value)} placeholder="Nhập tên đăng nhập..." />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mật khẩu</label>
              <input required type="password" className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
                value={password} onChange={e => setPassword(e.target.value)} placeholder="Nhập mật khẩu..." />
            </div>
            <button disabled={loading} type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition-colors flex items-center justify-center gap-2">
               {loading ? <Loader2 className="animate-spin" /> : <LogIn className="w-5 h-5" />} Đăng nhập
            </button>
            <p className="text-center text-sm text-gray-600 mt-2">
              Chưa có tài khoản? <button type="button" onClick={() => setIsRegistering(true)} className="text-blue-600 font-bold hover:underline">Đăng ký mới</button>
            </p>
          </form>
        )}
      </div>
    </div>
  );
};
