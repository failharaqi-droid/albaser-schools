import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { School, Student, Staff } from '../types';
import { localDb } from '../services/localDb';
import { 
  Users, 
  Search, 
  Edit2, 
  X,
  User,
  GraduationCap,
  Filter,
  ArrowRight,
  CheckCircle2,
  Phone,
  Calendar
} from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

interface TeacherManagerProps {
  school: School;
  students: Student[];
  staff: Staff[];
  canModify?: boolean;
}

const GRADES = [
  "الأول الابتدائي", "الثاني الابتدائي", "الثالث الابتدائي", "الرابع الابتدائي", "الخامس الابتدائي", "السادس الابتدائي",
  "الأول المتوسط", "الثاني المتوسط", "الثالث المتوسط",
  "الرابع الإعدادي", "الخامس الإعدادي", "السادس الإعدادي"
];

export default function TeacherManager({ school, students, staff, canModify = true }: TeacherManagerProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGrade, setSelectedGrade] = useState('الكل');
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    parentName: '',
    grade: '',
    phone: '',
    dob: '',
    totalAmount: '',
  });

  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesGrade = selectedGrade === 'الكل' || s.grade === selectedGrade;
      return matchesSearch && matchesGrade;
    }).sort((a, b) => a.name.localeCompare(b.name, 'ar'));
  }, [students, searchTerm, selectedGrade]);

  const handleEdit = (student: Student) => {
    setEditingStudent(student);
    setFormData({
      name: student.name,
      parentName: student.parentName || '',
      grade: student.grade,
      phone: student.phone,
      dob: student.dob || '',
      totalAmount: student.totalAmount.toString(),
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingStudent) {
      localDb.update('students', editingStudent.id, {
        ...formData,
        totalAmount: Number(formData.totalAmount),
      });
      setEditingStudent(null);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      {/* Header Section */}
      <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-full -translate-y-16 translate-x-16 blur-2xl group-hover:scale-110 transition-transform duration-700"></div>
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-6">
            <div className="bg-gradient-to-br from-indigo-600 to-blue-700 w-16 h-16 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-indigo-100">
              <GraduationCap className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-3xl font-black text-gray-900">شؤون الطلاب (للمعلمين)</h2>
              <p className="text-gray-500 font-bold">تعديل وتحديث بيانات الطلاب الدراسية والشخصية</p>
            </div>
          </div>
          
          <div className="flex bg-gray-100 p-1.5 rounded-2xl">
             <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-xl shadow-sm border border-gray-100 italic">
                <Users className="w-4 h-4 text-blue-500" />
                <span className="text-sm font-black text-gray-900">{students.length} طالب</span>
             </div>
          </div>
        </div>
      </div>

      {/* Control Bar */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 w-6 h-6" />
          <input
            type="text"
            placeholder="البحث عن طالب (الاسم أو الصف)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white border border-gray-100 rounded-[2rem] pr-12 pl-6 py-5 outline-none focus:ring-4 focus:ring-blue-100 font-bold transition-all shadow-sm text-lg"
          />
        </div>
        <div className="flex gap-3">
          <div className="relative">
            <Filter className="absolute right-4 top-1/2 -translate-y-1/2 text-blue-500 w-5 h-5 pointer-events-none" />
            <select
              value={selectedGrade}
              onChange={(e) => setSelectedGrade(e.target.value)}
              className="bg-white border border-gray-100 rounded-[2rem] pr-12 pl-8 py-5 outline-none focus:ring-4 focus:ring-blue-100 font-black text-gray-700 appearance-none shadow-sm min-w-[200px]"
            >
              <option value="الكل">جميع الصفوف</option>
              {GRADES.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Students Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredStudents.length > 0 ? (
          filteredStudents.map(student => (
            <div key={student.id} className="bg-white p-7 rounded-[2.5rem] border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all group relative overflow-hidden">
              <div className="absolute top-0 left-0 w-2 h-full bg-blue-600 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              
              <div className="flex items-center gap-5 mb-6">
                <div className="w-16 h-16 rounded-3xl bg-gray-50 flex items-center justify-center text-gray-300 overflow-hidden border-2 border-gray-100 shrink-0">
                  {student.photo ? (
                    <img src={student.photo} alt={student.name} className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-8 h-8" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-xl font-black text-gray-900 truncate mb-1">{student.name}</h3>
                  <div className="flex items-center gap-2">
                    <span className="bg-blue-50 text-blue-600 px-3 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border border-blue-100">{student.grade}</span>
                    <span className="text-[10px] font-bold text-gray-400"># {student.barcode}</span>
                  </div>
                </div>
                <button 
                  onClick={() => handleEdit(student)}
                  className="p-4 bg-gray-50 text-gray-400 hover:bg-blue-600 hover:text-white rounded-2xl transition-all shadow-sm hover:shadow-blue-100 active:scale-95"
                >
                  <Edit2 className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4 pt-4 border-t border-gray-50">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 text-gray-400 font-bold">
                    <User className="w-4 h-4" />
                    <span>ولي الأمر:</span>
                  </div>
                  <span className="text-gray-900 font-black">{student.parentName || 'غير مسجل'}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 text-gray-400 font-bold">
                    <Phone className="w-4 h-4" />
                    <span>رقم الاتصال:</span>
                  </div>
                  <span className="text-gray-900 font-black" dir="ltr">{student.phone}</span>
                </div>
                {student.dob && (
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 text-gray-400 font-bold">
                      <Calendar className="w-4 h-4" />
                      <span>تاريخ الميلاد:</span>
                    </div>
                    <span className="text-gray-900 font-black">{student.dob}</span>
                  </div>
                )}
              </div>
              
              <div className="mt-6 flex justify-end">
                <button 
                  onClick={() => handleEdit(student)}
                  className="text-blue-600 font-black text-xs flex items-center gap-2 hover:gap-3 transition-all"
                >
                  تعديل البيانات التفصيلية
                  <ArrowRight className="w-4 h-4 flip-h" />
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full py-20 text-center bg-white rounded-[3rem] border border-dashed border-gray-200">
            <Users className="w-20 h-20 text-gray-200 mx-auto mb-6" />
            <h3 className="text-2xl font-black text-gray-300">لا يوجد طلاب مطابقين للبحث</h3>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      <AnimatePresence>
        {editingStudent && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setEditingStudent(null)}
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white w-full max-w-3xl rounded-[3.5rem] shadow-2xl relative z-10 overflow-hidden border border-white/20 flex flex-col max-h-[92vh]"
            >
              <div className="p-10 border-b border-slate-100 flex items-center justify-between bg-white relative z-20">
                <div className="flex items-center gap-5">
                  <div className="theme-bg p-5 rounded-[1.8rem] text-white shadow-xl theme-shadow rotate-3 flex items-center justify-center">
                    <Edit2 className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="text-3xl font-black text-slate-900 tracking-tight">تعديل معلومات الطالب</h3>
                    <p className="text-[10px] font-black text-slate-400 mt-1 uppercase tracking-[0.2em] leading-none">Complete Student Profile Update</p>
                  </div>
                </div>
                <button 
                  onClick={() => setEditingStudent(null)}
                  className="p-4 bg-slate-50 hover:bg-slate-100 rounded-[1.5rem] transition-all text-slate-400"
                >
                  <X className="w-8 h-8" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-10 space-y-8 overflow-y-auto custom-scrollbar flex-1 bg-slate-50/20 relative z-10">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm space-y-2">
                       <label className="block text-[10px] font-black text-slate-400 px-2 uppercase tracking-widest">الاسم الكامل للطالب</label>
                       <div className="relative group">
                          <User className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 w-5 h-5 transition-colors group-focus-within:text-blue-500" />
                          <input
                            required
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="w-full bg-slate-50 border border-slate-50 rounded-[1.5rem] pr-12 pl-6 py-4 outline-none focus:ring-4 focus:ring-blue-100/30 font-black transition-all text-lg text-slate-800"
                            placeholder="اسم الطالب الرباعي..."
                          />
                       </div>
                    </div>

                    <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm space-y-2">
                       <label className="block text-[10px] font-black text-slate-400 px-2 uppercase tracking-widest">اسم ولي الأمر</label>
                       <input
                         required
                         type="text"
                         value={formData.parentName}
                         onChange={(e) => setFormData({ ...formData, parentName: e.target.value })}
                         className="w-full bg-slate-50 border border-slate-50 rounded-[1.5rem] px-6 py-4 outline-none focus:ring-4 focus:ring-blue-100/30 font-bold transition-all text-slate-700"
                       />
                    </div>

                    <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm space-y-2">
                       <label className="block text-[10px] font-black text-slate-400 px-2 uppercase tracking-widest">تاريخ الميلاد</label>
                       <div className="relative">
                          <Calendar className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 w-5 h-5" />
                          <input
                            type="date"
                            value={formData.dob}
                            onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                            className="w-full bg-slate-50 border border-slate-50 rounded-[1.5rem] pr-12 pl-6 py-4 outline-none focus:ring-4 focus:ring-blue-100/30 font-bold transition-all text-slate-700"
                          />
                       </div>
                    </div>
                  </div>
                  
                  <div className="space-y-6">
                    <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm space-y-2">
                       <label className="block text-[10px] font-black text-slate-400 px-2 uppercase tracking-widest">الصف الدراسي الحالي</label>
                       <div className="relative">
                          <Filter className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 w-5 h-5 pointer-events-none" />
                          <select
                            value={formData.grade}
                            onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
                            className="w-full bg-slate-50 border border-slate-50 rounded-[1.5rem] pr-12 pl-6 py-4 outline-none focus:ring-4 focus:ring-blue-100/30 font-black text-lg text-slate-800 appearance-none cursor-pointer"
                          >
                            {GRADES.map(g => <option key={g} value={g}>{g}</option>)}
                          </select>
                       </div>
                    </div>

                    <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm space-y-2">
                       <label className="block text-[10px] font-black text-slate-400 px-2 uppercase tracking-widest">القسط المالي السنوي</label>
                       <div className="relative">
                          <span className="absolute left-6 top-1/2 -translate-y-1/2 text-blue-500 font-black text-xs">د.ع</span>
                          <input
                            required
                            type="number"
                            value={formData.totalAmount}
                            onChange={(e) => setFormData({ ...formData, totalAmount: e.target.value })}
                            className="w-full bg-slate-50 border border-slate-50 rounded-[1.5rem] px-6 py-4 outline-none focus:ring-4 focus:ring-blue-100/30 font-black text-2xl text-blue-600 pl-16 transition-all"
                          />
                       </div>
                    </div>

                    <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm space-y-2">
                       <label className="block text-[10px] font-black text-slate-400 px-2 uppercase tracking-widest">رقم هاتف التواصل</label>
                       <div className="relative">
                          <Phone className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 w-5 h-5" />
                          <input
                            required
                            type="tel"
                            value={formData.phone}
                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                            className="w-full bg-slate-50 border border-slate-50 rounded-[1.5rem] pr-12 pl-6 py-4 outline-none focus:ring-4 focus:ring-blue-100/30 font-bold transition-all text-left text-slate-800"
                            dir="ltr"
                            placeholder="07XXXXXXXXX"
                          />
                       </div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 pt-6">
                  <button
                    type="submit"
                    className="flex-1 theme-bg text-white py-6 rounded-[2.2rem] font-black text-xl theme-shadow transition-all active:scale-[0.98] transform flex items-center justify-center gap-3"
                  >
                    <CheckCircle2 className="w-6 h-6" />
                    حفظ التغييرات النهائية
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingStudent(null)}
                    className="px-12 bg-white border border-slate-100 text-slate-500 py-6 rounded-[2.2rem] font-black text-xl hover:bg-slate-50 transition-all active:scale-95 shadow-sm"
                  >
                    إلغاء الإجراء
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <style>{`
        .flip-h { transform: scaleX(-1); }
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #E5E7EB; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #D1D5DB; }
      `}</style>
    </div>
  );
}
