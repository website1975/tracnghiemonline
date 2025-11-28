
import { createClient } from '@supabase/supabase-js';
import { Exam, StoredResult } from '../types';
import { storage } from '../utils/storage';

// Lấy key từ biến môi trường hoặc localStorage (để người dùng tự nhập trong Dashboard)
const getSupabaseConfig = () => {
  // Fix ImportMeta type error by casting to any
  const env = (import.meta as any).env;

  // Ưu tiên lấy từ biến môi trường (khi deploy Vercel), sau đó mới đến LocalStorage
  const url = env?.VITE_SUPABASE_URL || localStorage.getItem('SB_URL');
  const key = env?.VITE_SUPABASE_KEY || localStorage.getItem('SB_KEY');
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
      const { error } = await supabase.from('exams').insert({
        id: exam.id,
        title: exam.title,
        subject: exam.subject,
        duration_minutes: exam.durationMinutes,
        content: exam // Lưu toàn bộ JSON
      });
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
      // FIX: Không gửi trường 'answers' vì bảng SQL chưa có cột này
      const { error } = await supabase.from('results').insert({
        exam_id: data.examId,
        student_name: data.studentInfo.name,
        student_id: data.studentInfo.studentId,
        score: data.result.score,
        details: data.result.details,
        time_spent: data.timeSpent
      });
      if (error) {
        console.error("Lỗi lưu kết quả:", error);
        alert("Không thể lưu kết quả. Vui lòng kiểm tra kết nối mạng.");
      }
    } else {
      storage.saveResult(data);
    }
  },

  // 6. Lấy kết quả của 1 đề
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
        id: row.id, // Map ID from DB
        examId: row.exam_id,
        studentInfo: { name: row.student_name, studentId: row.student_id, classId: '' },
        result: { score: row.score, details: row.details, maxScore: 10 },
        completedAt: new Date(row.created_at).getTime(),
        timeSpent: row.time_spent
      }));
    } else {
      return storage.getResultsByExamId(examId);
    }
  },

  // 7. Cập nhật điểm số (Cho giáo viên sửa điểm)
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
  }
};
