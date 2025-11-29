import React, { useState } from 'react';
import { Exam, PartType } from '../types';
import { parseExamFromContent } from '../services/geminiService';
import { MathRenderer } from './MathRenderer';
import { Upload, Loader2, PlayCircle, Image as ImageIcon, FileType, Info, AlertCircle, Edit, Save, Trash, Plus } from 'lucide-react';

interface ExamCreatorProps {
  onExamCreated: (exam: Exam) => Promise<void> | void;
}

export const ExamCreator: React.FC<ExamCreatorProps> = ({ onExamCreated }) => {
  // Input State
  const [inputText, setInputText] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  
  // Processing State
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState<string>(''); // 'reading-pdf' | 'analyzing' | 'saving'
  const [error, setError] = useState<string | null>(null);
  
  // Review/Edit State
  const [parsedExam, setParsedExam] = useState<Exam | null>(null);
  const [isReviewMode, setIsReviewMode] = useState(false);
  const [activeTab, setActiveTab] = useState<PartType>(PartType.MULTIPLE_CHOICE);
  const [showGuide, setShowGuide] = useState(false);

  // --- Handlers ---

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        const base64 = result.split(',')[1];
        setSelectedImage(base64);
        setInputText('');
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      setError("Vui lòng chỉ chọn file PDF.");
      return;
    }

    try {
      setLoadingStep('reading-pdf');
      setIsLoading(true);
      setError(null);
      setSelectedImage(null);

      const arrayBuffer = await file.arrayBuffer();
      const pdfjsLib = (window as any).pdfjsLib;
      if (!pdfjsLib) throw new Error("Thư viện PDF chưa tải xong.");

      const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
      let fullText = "";

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map((item: any) => item.str).join(' ');
        fullText += `--- Trang ${i} ---\n${pageText}\n\n`;
      }

      setInputText(fullText);
      setIsLoading(false);
      setLoadingStep('');
    } catch (err: any) {
      console.error(err);
      setError("Không thể đọc file PDF. Vui lòng thử file khác.");
      setIsLoading(false);
      setLoadingStep('');
    }
  };

  const handleParse = async () => {
    if (!inputText && !selectedImage) return;
    setIsLoading(true);
    setLoadingStep('analyzing');
    setError(null);
    try {
      if (inputText.toLowerCase().trim() === 'demo') {
        setParsedExam(DEMO_EXAM);
        setIsReviewMode(true);
        return;
      }
      
      const exam = await parseExamFromContent(inputText, selectedImage || undefined);
      setParsedExam(exam);
      setIsReviewMode(true); // Go to review mode instead of finishing
    } catch (err: any) {
      setError(err.message || "Failed to parse exam.");
    } finally {
      setIsLoading(false);
      setLoadingStep('');
    }
  };

  const handleLoadDemo = () => {
      setParsedExam(DEMO_EXAM);
      setIsReviewMode(true);
  };

  const handleSaveFinal = async () => {
    if (parsedExam) {
      setIsLoading(true);
      setLoadingStep('saving');
      await onExamCreated(parsedExam);
      setIsLoading(false);
      setLoadingStep('');
    }
  };

  // --- Edit Handlers ---
  const updateQuestion = (part: 'part1' | 'part2' | 'part3', index: number, field: string, value: any) => {
    if (!parsedExam) return;
    const updatedExam = { ...parsedExam };
    // @ts-ignore - dynamic access
    updatedExam[part][index][field] = value;
    setParsedExam(updatedExam);
  };

  const updateOption = (qIndex: number, optIndex: number, value: string) => {
    if (!parsedExam) return;
    const updatedExam = { ...parsedExam };
    updatedExam.part1[qIndex].options[optIndex] = value;
    setParsedExam(updatedExam);
  };

  const updateSubQuestion = (qIndex: number, subIndex: number, field: string, value: any) => {
    if (!parsedExam) return;
    const updatedExam = { ...parsedExam };
    // @ts-ignore
    updatedExam.part2[qIndex].subQuestions[subIndex][field] = value;
    setParsedExam(updatedExam);
  };

  // --- Render ---

  if (isReviewMode && parsedExam) {
    return (
      <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-6">
        <div className="flex items-center justify-between bg-white p-4 rounded-xl border shadow-sm sticky top-0 z-20">
          <div>
             <h2 className="text-xl font-bold text-gray-800">Hiệu Chỉnh Đề Thi</h2>
             <p className="text-sm text-gray-500">Xem lại và chỉnh sửa nội dung trước khi xuất bản.</p>
          </div>
          <div className="flex gap-3">
             <button 
                onClick={() => setIsReviewMode(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg text-sm font-medium"
                disabled={isLoading}
             >
                Hủy bỏ
             </button>
             <button 
                onClick={handleSaveFinal}
                disabled={isLoading}
                className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg text-sm font-medium flex items-center gap-2 shadow-lg shadow-blue-200"
             >
                {isLoading && loadingStep === 'saving' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {isLoading ? 'Đang lưu...' : 'Xuất bản Đề thi'}
             </button>
          </div>
        </div>

        {/* Exam Metadata Edit */}
        <div className="bg-white p-6 rounded-xl border space-y-4">
           <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                 <label className="block text-sm font-medium text-gray-700 mb-1">Tên đề thi</label>
                 <input 
                    type="text" 
                    value={parsedExam.title} 
                    onChange={(e) => setParsedExam({...parsedExam, title: e.target.value})}
                    className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none"
                 />
              </div>
              <div>
                 <label className="block text-sm font-medium text-gray-700 mb-1">Môn học</label>
                 <input 
                    type="text" 
                    value={parsedExam.subject} 
                    onChange={(e) => setParsedExam({...parsedExam, subject: e.target.value})}
                    className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none"
                 />
              </div>
              <div>
                 <label className="block text-sm font-medium text-gray-700 mb-1">Thời gian (phút)</label>
                 <input 
                    type="number" 
                    value={parsedExam.durationMinutes} 
                    onChange={(e) => setParsedExam({...parsedExam, durationMinutes: parseInt(e.target.value) || 0})}
                    className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none"
                 />
              </div>
           </div>
        </div>

        {/* Tabs */}
        <div className="flex bg-white rounded-lg p-1 shadow-sm border">
            {[
              { id: PartType.MULTIPLE_CHOICE, label: `Phần 1 (${parsedExam.part1.length})` },
              { id: PartType.TRUE_FALSE, label: `Phần 2 (${parsedExam.part2.length})` },
              { id: PartType.SHORT_ANSWER, label: `Phần 3 (${parsedExam.part3.length})` }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as PartType)}
                className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors
                  ${activeTab === tab.id ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-50'}`}
              >
                {tab.label}
              </button>
            ))}
        </div>

        {/* Content Editor */}
        <div className="space-y-6">
           {activeTab === PartType.MULTIPLE_CHOICE && parsedExam.part1.map((q, idx) => (
              <div key={q.id} className="bg-white p-6 rounded-xl border shadow-sm group">
                 <div className="flex justify-between mb-4">
                    <span className="font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded">Câu {idx + 1}</span>
                    <button className="text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity">
                       <Trash className="w-4 h-4" />
                    </button>
                 </div>
                 
                 <div className="space-y-4">
                    <div className="flex flex-col gap-1">
                       <label className="text-xs text-gray-500 font-medium uppercase">Nội dung câu hỏi (Hỗ trợ LaTeX: $...$)</label>
                       <textarea 
                          className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-mono text-sm"
                          rows={3}
                          value={q.text}
                          onChange={(e) => updateQuestion('part1', idx, 'text', e.target.value)}
                       />
                       <div className="p-2 bg-gray-50 rounded text-sm text-gray-700">
                          <span className="text-xs text-gray-400 block mb-1">Xem trước:</span>
                          <MathRenderer text={q.text} />
                       </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                       {q.options.map((opt, oIdx) => (
                          <div key={oIdx} className="flex gap-2 items-start">
                             <input 
                                type="radio" 
                                name={`correct-${q.id}`} 
                                checked={q.correctOption === oIdx}
                                onChange={() => updateQuestion('part1', idx, 'correctOption', oIdx)}
                                className="mt-3"
                             />
                             <div className="flex-1">
                                <input 
                                   type="text" 
                                   value={opt}
                                   onChange={(e) => updateOption(idx, oIdx, e.target.value)}
                                   className={`w-full p-2 border rounded text-sm ${q.correctOption === oIdx ? 'border-green-500 bg-green-50' : ''}`}
                                />
                                {opt.includes('$') && <div className="text-xs text-gray-500 mt-1 pl-1"><MathRenderer text={opt} inline /></div>}
                             </div>
                          </div>
                       ))}
                    </div>
                 </div>
              </div>
           ))}

           {activeTab === PartType.TRUE_FALSE && parsedExam.part2.map((q, idx) => (
              <div key={q.id} className="bg-white p-6 rounded-xl border shadow-sm">
                 <div className="mb-4">
                    <span className="font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded">Câu {idx + 1}</span>
                 </div>
                 <textarea 
                    className="w-full p-3 border rounded-lg mb-2 outline-none font-mono text-sm"
                    rows={2}
                    value={q.text}
                    onChange={(e) => updateQuestion('part2', idx, 'text', e.target.value)}
                 />
                 <div className="p-2 bg-gray-50 rounded text-sm text-gray-700 mb-4">
                      <MathRenderer text={q.text} />
                 </div>

                 <div className="space-y-3 pl-4 border-l-2 border-gray-100">
                    {q.subQuestions.map((sub, sIdx) => (
                       <div key={sub.id} className="flex items-center gap-4">
                          <span className="text-sm font-bold w-4">{String.fromCharCode(97 + sIdx)})</span>
                          <div className="flex-1">
                             <input 
                                type="text" 
                                value={sub.text}
                                onChange={(e) => updateSubQuestion(idx, sIdx, 'text', e.target.value)}
                                className="w-full p-2 border rounded text-sm"
                             />
                             {sub.text.includes('$') && <div className="text-xs text-gray-500 mt-1 pl-1"><MathRenderer text={sub.text} inline /></div>}
                          </div>
                          <select 
                             value={sub.isCorrect ? 'true' : 'false'}
                             onChange={(e) => updateSubQuestion(idx, sIdx, 'isCorrect', e.target.value === 'true')}
                             className={`p-2 border rounded text-sm font-bold ${sub.isCorrect ? 'text-green-600 bg-green-50' : 'text-red-600 bg-red-50'}`}
                          >
                             <option value="true">Đúng</option>
                             <option value="false">Sai</option>
                          </select>
                       </div>
                    ))}
                 </div>
              </div>
           ))}

           {activeTab === PartType.SHORT_ANSWER && parsedExam.part3.map((q, idx) => (
              <div key={q.id} className="bg-white p-6 rounded-xl border shadow-sm">
                 <div className="mb-4">
                    <span className="font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded">Câu {idx + 1}</span>
                 </div>
                 <div className="flex gap-4">
                    <div className="flex-1">
                       <textarea 
                          className="w-full p-3 border rounded-lg outline-none font-mono text-sm"
                          rows={2}
                          value={q.text}
                          onChange={(e) => updateQuestion('part3', idx, 'text', e.target.value)}
                       />
                       <div className="p-2 bg-gray-50 rounded text-sm text-gray-700 mt-1">
                          <MathRenderer text={q.text} />
                       </div>
                    </div>
                    <div className="w-48">
                       <label className="text-xs text-gray-500 font-bold block mb-1">Đáp án đúng</label>
                       <input 
                          type="text"
                          value={q.correctAnswer}
                          onChange={(e) => updateQuestion('part3', idx, 'correctAnswer', e.target.value)}
                          className="w-full p-3 border border-green-300 bg-green-50 rounded-lg font-bold text-green-800"
                       />
                    </div>
                 </div>
              </div>
           ))}
        </div>
      </div>
    );
  }

  // --- Upload UI ---
  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold text-gray-900">Tạo Đề Thi Mới</h2>
        <p className="text-gray-500">
          Hỗ trợ đọc PDF, Ảnh và Công thức Toán (LaTeX). 
          <br/>Có bước hiệu chỉnh (Review) trước khi tạo đề.
        </p>
      </div>

      {/* Improved Guide Section */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
        <button 
          onClick={() => setShowGuide(!showGuide)}
          className="flex items-center gap-2 text-blue-800 font-bold w-full text-left"
        >
          <Info className="w-5 h-5" />
          Quy ước định dạng file để AI nhận diện chuẩn 100%
        </button>
        
        {showGuide && (
          <div className="mt-4 grid md:grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2">
             
             {/* General & Part 1 */}
             <div className="bg-white p-3 rounded border shadow-sm space-y-2">
                 <h4 className="font-bold text-gray-800 text-sm border-b pb-1">Phần 1: Trắc nghiệm</h4>
                 <p className="text-xs text-gray-600">Đánh dấu đáp án bằng dấu * hoặc Bảng đáp án cuối file.</p>
                 <div className="bg-gray-100 p-2 rounded text-xs font-mono text-gray-700">
                   Câu 1: $x^2 - 4 = 0$ có nghiệm là?<br/>
                   A. 1<br/>
                   *B. 2<br/>
                   C. 3<br/>
                   D. 4
                 </div>
             </div>

             {/* Part 2 */}
             <div className="bg-white p-3 rounded border shadow-sm space-y-2">
                 <h4 className="font-bold text-gray-800 text-sm border-b pb-1">Phần 2: Đúng/Sai</h4>
                 <p className="text-xs text-gray-600">Dùng (Đ)/(S) hoặc (D)/(S) cuối mỗi ý.</p>
                 <div className="bg-gray-100 p-2 rounded text-xs font-mono text-gray-700">
                   Câu 2: Cho hàm số f(x)...<br/>
                   a) Hàm số đồng biến. (Đ)<br/>
                   b) f(0) = 1. (S)<br/>
                   c) Max = 5. (Sai)<br/>
                   d) Min = -1. (Đúng)
                 </div>
             </div>

             {/* Part 3 */}
             <div className="bg-white p-3 rounded border shadow-sm space-y-2">
                 <h4 className="font-bold text-gray-800 text-sm border-b pb-1">Phần 3: Trả lời ngắn</h4>
                 <p className="text-xs text-gray-600">Ghi đáp án ngay sau câu hỏi hoặc cuối file.</p>
                 <div className="bg-gray-100 p-2 rounded text-xs font-mono text-gray-700">
                   Câu 1: Tính tích phân...<br/>
                   Đáp án: 5<br/><br/>
                   Câu 2: Tìm m để... [Đáp số: -1]
                 </div>
             </div>

             {/* Math */}
             <div className="bg-white p-3 rounded border shadow-sm space-y-2">
                 <h4 className="font-bold text-gray-800 text-sm border-b pb-1">Công thức Toán</h4>
                 <p className="text-xs text-gray-600">AI tự động nhận diện. Tốt nhất nên dùng MathType hoặc Equation trong Word rồi xuất PDF.</p>
             </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left Column: Text Area (Shows input or PDF content) */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <label className="block text-sm font-medium text-gray-700">Nội dung đề thi (Text/PDF)</label>
            {inputText && (
              <button 
                onClick={() => setInputText('')}
                className="text-xs text-red-500 hover:underline"
              >
                Xóa nội dung
              </button>
            )}
          </div>
          <div className="relative">
             <textarea
                className="w-full h-64 p-4 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none resize-none text-sm font-mono bg-gray-50"
                placeholder="Dán nội dung hoặc tải file PDF..."
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                readOnly={loadingStep === 'reading-pdf'}
              />
              {loadingStep === 'reading-pdf' && (
                <div className="absolute inset-0 bg-white/80 flex items-center justify-center rounded-xl">
                  <div className="flex flex-col items-center gap-2 text-blue-600">
                    <Loader2 className="w-8 h-8 animate-spin" />
                    <span className="text-sm font-medium">Đang đọc file PDF...</span>
                  </div>
                </div>
              )}
          </div>
          
          {/* PDF Upload Button */}
          <div className="relative">
             <input
               type="file"
               accept="application/pdf"
               onChange={handlePdfUpload}
               className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
               disabled={isLoading}
             />
             <button className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700 font-medium transition-colors">
               <FileType className="w-4 h-4 text-red-500" />
               Tải lên file PDF
             </button>
          </div>
        </div>

        {/* Right Column: Image Upload */}
        <div className="space-y-4">
          <label className="block text-sm font-medium text-gray-700">Hoặc tải lên ảnh chụp (JPG/PNG)</label>
          <div className={`border-2 border-dashed rounded-xl h-64 flex flex-col items-center justify-center transition-colors relative overflow-hidden
            ${selectedImage ? 'border-blue-300 bg-blue-50' : 'border-gray-300 bg-gray-50 hover:bg-gray-100'}`}>
            
            {selectedImage ? (
              <img 
                src={`data:image/jpeg;base64,${selectedImage}`} 
                alt="Preview" 
                className="absolute inset-0 w-full h-full object-contain p-2"
              />
            ) : (
              <div className="text-center p-6">
                <ImageIcon className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-500">Kéo thả hoặc click để chọn ảnh</p>
              </div>
            )}
            <input 
              type="file" 
              accept="image/*"
              className="absolute inset-0 opacity-0 cursor-pointer z-10"
              onChange={handleImageUpload}
              disabled={isLoading}
            />
          </div>
          {selectedImage && (
             <button onClick={() => setSelectedImage(null)} className="w-full text-center text-sm text-red-500 hover:underline">
               Xóa ảnh đã chọn
             </button>
          )}
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 text-red-700 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4 border-t">
        <button
          onClick={handleParse}
          disabled={isLoading || (!inputText && !selectedImage)}
          className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-200 transition-all min-w-[250px]"
        >
          {loadingStep === 'analyzing' ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
          {loadingStep === 'analyzing' ? 'Đang phân tích...' : 'Tiếp tục (Review)'}
        </button>

        <button
          onClick={handleLoadDemo}
          disabled={isLoading}
          className="flex items-center justify-center gap-2 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 px-8 py-3 rounded-xl font-semibold shadow-sm transition-all"
        >
          <PlayCircle className="w-5 h-5" />
          Dùng đề mẫu
        </button>
      </div>
    </div>
  );
};

const DEMO_EXAM: Exam = {
  id: "demo-1",
  title: "Đề thi thử Toán - Chương trình 2025",
  subject: "Toán học",
  durationMinutes: 45,
  createdAt: Date.now(),
  part1: [
    {
      id: "p1-1",
      text: "Hàm số $y = x^3 - 3x^2 + 2$ nghịch biến trên khoảng nào?",
      options: ["$(0; 2)$", "$(-\\infty; 0)$", "$(2; +\\infty)$", "$(0; +\\infty)$"],
      correctOption: 0,
      explanation: "Tính đạo hàm $y' = 3x^2 - 6x$. Cho $y' < 0 \\Leftrightarrow 0 < x < 2$."
    },
    {
        id: "p1-2",
        text: "Cho $\\int_{0}^{1} f(x) dx = 2$ và $\\int_{1}^{2} f(x) dx = 3$. Tính $\\int_{0}^{2} f(x) dx$.",
        options: ["5", "1", "-1", "6"],
        correctOption: 0,
        explanation: "Cộng hai tích phân lại."
    }
  ],
  part2: [
    {
      id: "p2-1",
      text: "Cho hàm số $y = f(x)$ liên tục trên $\\mathbb{R}$ và có bảng biến thiên.",
      subQuestions: [
        { id: "sq-1", text: "Hàm số đồng biến trên khoảng $(-1; 1)$.", isCorrect: true },
        { id: "sq-2", text: "Giá trị cực đại của hàm số bằng 5.", isCorrect: false },
        { id: "sq-3", text: "Phương trình $f(x)=0$ có 3 nghiệm.", isCorrect: true },
        { id: "sq-4", text: "Đồ thị hàm số có tiệm cận đứng.", isCorrect: false }
      ],
      explanation: "Dựa vào bảng biến thiên để kết luận."
    }
  ],
  part3: [
    {
      id: "p3-1",
      text: "Tìm giá trị lớn nhất của hàm số $y = -x^2 + 4x$ trên đoạn $[0; 3]$.",
      correctAnswer: "4",
      explanation: "$y' = -2x + 4$. $y'=0 \\Leftrightarrow x=2$. $y(0)=0, y(2)=4, y(3)=3$. Max = 4."
    }
  ]
};
