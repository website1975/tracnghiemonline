
import { createClient } from '@supabase/supabase-js';
import { Exam, StoredResult, StudentAccount, StudentInfo } from '../types';
import { storage } from '../utils/storage';

// Lấy key từ biến môi trường hoặc localStorage
const getSupabaseConfig = () => {
  const url = process.env.VITE_SUPABASE_URL || localStorage.getItem('SB_URL');
  const key = process.env.VITE_SUPABASE_KEY || localStorage.getItem('SB_KEY');
  return { url, key };
};

let supabaseInstance: any = null;

export const getSupabase = () => {
  const { url, key } = getSupabaseConfig();
  if (url && key && !supabaseInstance) {
    try {
      supabaseInstance = createClient(url, key);
    } catch (e) {
      console.error("Supabase init failed:", e);
      return null;
    }
  }
  return supabaseInstance;
};

// --- API Service Wrapper ---

export const db = {
  // 1. Lưu đề thi
  saveExam: async (exam: Exam): Promise<boolean> => {
    const supabase = getSupabase();
    if (supabase) {
      const { error } = await supabase.from('exams').upsert({
        id: exam.id,
        title: exam.title,
        subject: exam.subject,
        duration_minutes: exam.durationMinutes,
        content: exam
      }, { onConflict: 'id' });
      
      if (error) {
        console.error('Lỗi lưu Supabase:', error);
        alert('Lỗi lưu đề thi lên Online. Vui lòng kiểm tra lại cấu hình Key.');
        return false;
      }
      return true;
    } else {
      storage.saveExam(exam);
      return true;
    }
  },

  // 2. Lấy danh sách đề
  getExams: async (): Promise<Exam[]> => {
    const supabase = getSupabase();
    if (supabase) {
      const { data, error } = await supabase.from('exams').select('*').order('created_at', { ascending: false });
      if (error || !data) return [];
      return data.map((row: any) => ({
        ...row.content,
        id: row.id,
        createdAt: new Date(row.created_at).getTime()
      }));
    } else {
      return storage.getExams();
    }
  },

  // 3. Lấy 1 đề thi theo ID
  getExamById: async (id: string): Promise<Exam | null> => {
    const supabase = getSupabase();
    if (supabase) {
      const { data, error } = await supabase.from('exams').select('*').eq('id', id).single();
      if (error || !data) return null;
      return {
        ...data.content,
        id: data.id
      };
    } else {
      return storage.getExamById(id) || null;
    }
  },

  // 4. Xóa đề thi
  deleteExam: async (id: string) => {
    const supabase = getSupabase();
    if (supabase) {
      await supabase.from('exams').delete().eq('id', id);
    } else {
      storage.deleteExam(id);
    }
  },

  // 5. Lưu kết quả thi
  saveResult: async (data: StoredResult) => {
    const supabase = getSupabase();
    if (supabase) {
      console.log("🔵 START SAVING...", data);
      const { error } = await supabase.from('results').insert({
        exam_id: data.examId,
        student_name: data.studentInfo.name,
        student_id: data.studentInfo.studentId,
        student_account_id: data.studentInfo.accountId, // Liên kết tài khoản
        score: data.result.score,
        details: data.result.details,
        time_spent: data.timeSpent,
        answers: data.answers 
      });
      if (error) {
        console.error("❌ SUPABASE SAVE ERROR:", error);
        alert("Không thể lưu kết quả. Lỗi DB: " + error.message);
      } else {
        console.log("✅ SUPABASE SAVE SUCCESS");
      }
    } else {
      storage.saveResult(data);
    }
  },

  // 6. Lấy kết quả của 1 đề (Cho giáo viên)
  getResultsByExam: async (examId: string): Promise<StoredResult[]> => {
    const supabase = getSupabase();
    if (supabase) {
      const { data, error } = await supabase
        .from('results')
        .select('*')
        .eq('exam_id', examId)
        .order('score', { ascending: false });
        
      if (error || !data) return [];
      
      return data.map((row: any) => ({
        id: row.id,
        examId: row.exam_id,
        studentInfo: { 
          name: row.student_name, 
          studentId: row.student_id, 
          classId: '',
          accountId: row.student_account_id 
        },
        result: { score: row.score, details: row.details, maxScore: 10 },
        completedAt: new Date(row.created_at).getTime(),
        timeSpent: row.time_spent,
        answers: row.answers
      }));
    } else {
      return storage.getResultsByExamId(examId);
    }
  },

  // 7. Cập nhật điểm số
  updateResultScore: async (resultId: string, newScore: number): Promise<boolean> => {
    const supabase = getSupabase();
    if (supabase) {
      const { error } = await supabase
        .from('results')
        .update({ score: newScore })
        .eq('id', resultId);
      
      if (error) {
        console.error("Lỗi cập nhật điểm:", error);
        return false;
      }
      return true;
    } else {
      storage.updateResultScore(resultId, newScore);
      return true;
    }
  },

  // --- STUDENT AUTH & HISTORY ---

  // 8. Đăng ký học sinh
  registerStudent: async (info: { fullName: string, className: string, username: string, password: string }): Promise<{ success: boolean, message?: string }> => {
    const supabase = getSupabase();
    if (!supabase) return { success: false, message: "Chưa kết nối Database" };

    // Check user exist
    const { data: exist } = await supabase.from('students').select('id').eq('username', info.username).single();
    if (exist) return { success: false, message: "Tên đăng nhập đã tồn tại" };

    const { error } = await supabase.from('students').insert({
      full_name: info.fullName,
      class_name: info.className,
      username: info.username,
      password: info.password
    });

    if (error) return { success: false, message: error.message };
    return { success: true };
  },

  // 9. Đăng nhập học sinh
  loginStudent: async (username: string, password: string): Promise<StudentAccount | null> => {
    const supabase = getSupabase();
    if (!supabase) return null;

    const { data, error } = await supabase
      .from('students')
      .select('*')
      .eq('username', username)
      .eq('password', password) // Lưu ý: Password plain text theo yêu cầu đơn giản
      .single();

    if (error || !data) return null;
    return data as StudentAccount;
  },

  // 10. Lấy lịch sử thi của học sinh (FIXED: MANUAL JOIN)
  getStudentHistory: async (accountId: string, studentId: string): Promise<StoredResult[]> => {
    const supabase = getSupabase();
    if (!supabase) return [];

    // BƯỚC 1: Lấy danh sách kết quả (KHÔNG join bảng exams để tránh lỗi Foreign Key)
    const { data: results, error } = await supabase
      .from('results')
      .select('*')
      .or(`student_account_id.eq.${accountId},student_id.eq.${studentId}`)
      .order('created_at', { ascending: false });

    if (error || !results || results.length === 0) return [];

    // BƯỚC 2: Lấy thông tin các đề thi tương ứng thủ công
    const examIds = [...new Set(results.map((r: any) => r.exam_id))];
    let examMap: Record<string, any> = {};

    if (examIds.length > 0) {
      const { data: examsData } = await supabase
        .from('exams')
        .select('id, title, subject')
        .in('id', examIds);
        
      if (examsData) {
        examsData.forEach((e: any) => {
          examMap[e.id] = e;
        });
      }
    }

    // BƯỚC 3: Ghép dữ liệu
    return results.map((row: any) => ({
      id: row.id,
      examId: row.exam_id,
      studentInfo: { 
        name: row.student_name, 
        studentId: row.student_id, 
        classId: '', 
        accountId: row.student_account_id 
      },
      result: { score: row.score, details: row.details, maxScore: 10 },
      completedAt: new Date(row.created_at).getTime(),
      timeSpent: row.time_spent,
      answers: row.answers,
      // Map thủ công title và subject
      examTitle: examMap[row.exam_id]?.title || "Đề thi đã xóa hoặc không tồn tại",
      examSubject: examMap[row.exam_id]?.subject || ""
    }));
  },

  // 11. (MỚI) Lấy danh sách tất cả học sinh (Cho Giáo viên)
  getAllStudents: async (): Promise<StudentAccount[]> => {
    const supabase = getSupabase();
    if (!supabase) return [];

    const { data, error } = await supabase
      .from('students')
      .select('*')
      .order('created_at', { ascending: false });

    if (error || !data) return [];
    return data as StudentAccount[];
  },

  // 12. (MỚI) Xóa học sinh
  deleteStudent: async (studentId: string): Promise<boolean> => {
    const supabase = getSupabase();
    if (!supabase) return false;
    
    await supabase.from('results').delete().eq('student_account_id', studentId);
    const { error } = await supabase.from('students').delete().eq('id', studentId);
    
    return !error;
  },

  // 13. (MỚI) Upload ảnh lên Storage
  uploadImage: async (file: File): Promise<string | null> => {
    const supabase = getSupabase();
    if (!supabase) return null;

    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `${fileName}`;

    // Upload
    const { error: uploadError } = await supabase.storage
        .from('exam-images') // Yêu cầu bucket tên là 'exam-images'
        .upload(filePath, file);

    if (uploadError) {
        console.error("Upload error:", uploadError);
        alert("Lỗi upload ảnh: " + uploadError.message);
        return null;
    }

    // Get Public URL
    const { data } = supabase.storage
        .from('exam-images')
        .getPublicUrl(filePath);

    return data.publicUrl;
  }
};
