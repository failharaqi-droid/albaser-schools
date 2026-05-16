import { useState, useMemo, useRef } from 'react';
import { School, ManualLedgerConfig, ManualLedgerEntry, ManualLedgerField, Student } from '../types';
import { 
  Plus, 
  Settings, 
  Printer, 
  Trash2, 
  Edit2, 
  Save, 
  X, 
  LayoutGrid,
  Type,
  Hash,
  Calendar as CalendarIcon,
  Eye,
  GripVertical,
  ChevronUp,
  ChevronDown
} from 'lucide-react';
import { localDb } from '../services/localDb';
import { useReactToPrint } from 'react-to-print';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface ManualLedgerManagerProps {
  school: School;
  students: Student[];
  configs: ManualLedgerConfig[];
  entries: ManualLedgerEntry[];
  canModify?: boolean;
}

export default function ManualLedgerManager({ school, students, configs, entries, canModify = true }: ManualLedgerManagerProps) {
  const [showConfig, setShowConfig] = useState(false);
  const [tempFields, setTempFields] = useState<ManualLedgerField[]>([]);
  const [showEntryForm, setShowEntryForm] = useState(false);
  const [editingEntry, setEditingEntry] = useState<ManualLedgerEntry | null>(null);
  const [deletingEntry, setDeletingEntry] = useState<ManualLedgerEntry | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const printRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({ 
    contentRef: printRef,
    suppressErrors: true,
    onBeforePrint: () => {
      return new Promise((resolve) => {
        setTimeout(resolve, 500);
      });
    }
  });

  const currentConfig = useMemo(() => {
    const config = configs.find(c => c.schoolId === school.id);
    if (!config) {
      return {
        id: 'default',
        schoolId: school.id,
        fields: [
          { id: 'date', label: 'التاريخ', type: 'date' as const },
          { id: 'description', label: 'البيان', type: 'text' as const },
          { id: 'debit', label: 'مدين', type: 'number' as const },
          { id: 'credit', label: 'دائن', type: 'number' as const },
          { id: 'balance', label: 'الرصيد', type: 'number' as const },
        ]
      };
    }
    return config;
  }, [configs, school.id]);

  const uniqueGrades = useMemo(() => {
    return Array.from(new Set(students.map(s => s.grade))).sort();
  }, [students]);

  const entriesByGrade = useMemo(() => {
    const filtered = entries.filter(e => e.schoolId === school.id);
    const groups: { [grade: string]: ManualLedgerEntry[] } = {};
    
    filtered.forEach(entry => {
      const grade = entry.grade || 'عام';
      if (!groups[grade]) groups[grade] = [];
      groups[grade].push(entry);
      });

    // Sort entries within each group by creation date
    Object.keys(groups).forEach(grade => {
      groups[grade].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      });

    return groups;
  }, [entries, school.id]);

  const currentEntries = useMemo(() => {
    return entries.filter(e => e.schoolId === school.id).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }, [entries, school.id]);

  const handleSaveConfig = (fields: ManualLedgerField[]) => {
    if (currentConfig.id === 'default') {
      localDb.add('manualLedgerConfigs', { schoolId: school.id, fields });
    } else {
      localDb.update('manualLedgerConfigs', currentConfig.id, { fields });
    }
    setShowConfig(false);
  };

  const moveField = (index: number, direction: 'up' | 'down') => {
    const newFields = [...tempFields];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newFields.length) return;
    
    [newFields[index], newFields[targetIndex]] = [newFields[targetIndex], newFields[index]];
    setTempFields(newFields);
  };

  const handleSaveEntry = (data: { [key: string]: any }, grade?: string) => {
    if (editingEntry) {
      localDb.update('manualLedgerEntries', editingEntry.id, { data, grade });
    } else {
      localDb.add('manualLedgerEntries', { schoolId: school.id, data, grade, createdAt: new Date().toISOString() });
    }
    setShowEntryForm(false);
    setEditingEntry(null);
  };

  const handleDeleteEntry = (entry: ManualLedgerEntry) => {
    setDeletingEntry(entry);
  };

  return (
    <div className="space-y-2 font-cairo" dir="rtl">
      {/* Header Actions */}
      <div className="bg-white p-5 rounded-[32px] border border-gray-100 shadow-sm flex flex-col md:flex-row justify-between items-center gap-2">
        <div>
          <h2 className="text-lg font-black text-gray-900">سجل الحسابات اليدوي</h2>
          <p className="text-gray-500 font-bold">قم بتخصيص السجل وإضافة القيود المحاسبية يدوياً</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setTempFields([...currentConfig.fields]);
              setShowConfig(true);
            }}
            className="bg-gray-100 text-gray-600 px-3 py-1.5 min-h-[38px] rounded-2xl font-black flex items-center gap-2 hover:bg-gray-200 transition-all"
          >
            <Settings className="w-5 h-5" />
            تخصيص الحقول
          </button>
          <button
            onClick={() => setShowPreview(true)}
            className="bg-emerald-50 text-emerald-600 px-3 py-1.5 min-h-[38px] rounded-2xl font-black flex items-center gap-2 hover:bg-emerald-100 transition-all"
          >
            <Eye className="w-5 h-5" />
            معاينة وطباعة
          </button>
          {canModify && (
            <button
              onClick={() => { setEditingEntry(null); setShowEntryForm(true); }}
              className="bg-blue-600 text-white px-8 py-2 rounded-2xl font-black flex items-center gap-2 hover:bg-blue-700 shadow-xl shadow-blue-100 transition-all"
            >
              <Plus className="w-6 h-6" />
              إضافة قيد جديد
            </button>
          )}
        </div>
      </div>

      {/* Main Table */}
      <div className="space-y-2">
        {Object.entries(entriesByGrade).length === 0 ? (
          <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm p-20 text-center">
            <div className="flex flex-col items-center gap-2 opacity-30">
              <LayoutGrid className="w-10 h-10" />
              <p className="text-xl font-black">لا توجد قيود مضافة بعد</p>
            </div>
          </div>
        ) : (
          Object.entries(entriesByGrade).map(([grade, gradeEntries]) => (
            <div key={grade} className="bg-white rounded-[32px] border border-gray-100 shadow-sm overflow-hidden">
              <div className="bg-gray-50/50 px-8 py-5 border-b border-gray-100 flex justify-between items-center">
                <h3 className="text-xl font-black text-blue-600 flex items-center gap-2">
                  <LayoutGrid className="w-5 h-5" />
                  {grade === 'عام' ? 'القيود العامة' : `قيود الصف: ${grade}`}
                </h3>
                <span className="bg-blue-100 text-blue-700 px-4 py-1 rounded-full text-sm font-black">
                  {gradeEntries.length} قيد
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-right border-collapse">
                  <thead>
                    <tr className="bg-gray-50/30 border-b border-gray-100">
                      <th className="px-6 py-5 text-sm font-black text-gray-500 w-16">ت</th>
                      {currentConfig.fields.map(field => (
                        <th key={field.id} className="px-6 py-5 text-sm font-black text-gray-900">
                          {field.label}
                        </th>
                      ))}
                      <th className="px-6 py-5 text-sm font-black text-gray-500 w-32 text-center">الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {gradeEntries.map((entry, index) => (
                      <tr key={entry.id} className="hover:bg-blue-50/30 transition-colors group">
                        <td className="px-3 py-1.5 min-h-[38px] text-sm font-bold text-gray-400">{index + 1}</td>
                        {currentConfig.fields.map(field => (
                          <td key={field.id} className="px-3 py-1.5 min-h-[38px] text-sm font-black text-gray-700">
                            {field.type === 'number' ? (
                              <span className={cn(
                                field.id === 'debit' ? 'text-red-600' : field.id === 'credit' ? 'text-emerald-600' : ''
                              )}>
                                {Number(entry.data[field.id] || 0).toLocaleString()}
                              </span>
                            ) : entry.data[field.id]}
                          </td>
                        ))}
                        <td className="px-3 py-1.5 min-h-[38px]">
                              {canModify && (
                                <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button
                                    onClick={() => { setEditingEntry(entry); setShowEntryForm(true); }}
                                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-xl transition-colors"
                                  >
                                    <Edit2 className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteEntry(entry)}
                                    className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))
            )}
          </div>
                  {/* Config Modal */}
      
        {showConfig && (
          <div className="integrated-page z-[300] no-scrollbar">
            <div
              className="w-full w-full mx-auto min-h-screen my-0  bg-white  relative z-10 shadow-sm flex flex-col no-scrollbar"
            >
              <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-white relative z-50 sticky top-0 shadow-sm px-12">
                <div className="flex items-center gap-3 text-right leading-relaxed">
                  <div className="p-5 bg-slate-900 rounded-2xl text-white shadow-xl">
                    <Settings className="w-6 h-6 animate-spin-slow" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-900 tracking-tight text-slate-900 tracking-tight leading-relaxed">تخصيص بنية السجل المحاسبي</h3>
                    <p className="text-sm font-bold text-slate-400 mt-1">تحديد الحقول والأعمدة التي تظهر في سجل المحاسبة اليدوي</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowConfig(false)} 
                  className="p-4 hover:bg-rose-50 rounded-2xl transition-all text-slate-300 hover:text-rose-500 border border-slate-50"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 lg:p-5 custom-scrollbar w-full bg-slate-50/20 custom-scrollbar">
                <div className="max-w-5xl mx-auto w-full /space-y-2">
                  <div className="bg-white p-4 lg:p-14 rounded-3xl border border-slate-100 shadow-xl space-y-2">
                    <p className="text-xs font-black text-slate-400 px-6 uppercase tracking-[0.3em] text-right mb-6">ترتيب وإعداد أعمدة السجل</p>
                    <div className="space-y-2">
                      {tempFields.map((field, index) => (
                        <div key={field.id} className="flex items-center gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-100 shadow-inner group">
                          <div className="flex flex-col gap-2">
                            <button 
                              onClick={() => moveField(index, 'up')}
                              disabled={index === 0}
                              className="p-2 text-slate-300 hover:text-indigo-600 disabled:opacity-30 transition-colors"
                            >
                              <ChevronUp className="w-6 h-6" />
                            </button>
                            <button 
                              onClick={() => moveField(index, 'down')}
                              disabled={index === tempFields.length - 1}
                              className="p-2 text-slate-300 hover:text-indigo-600 disabled:opacity-30 transition-colors"
                            >
                              <ChevronDown className="w-6 h-6" />
                            </button>
                          </div>
                          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="space-y-2">
                              <label className="block text-[10px] font-black text-slate-400 pr-4 uppercase tracking-widest">اسم العمود</label>
                              <input
                                type="text"
                                value={field.label}
                                onChange={(e) => {
                                  const newFields = [...tempFields];
                                  newFields[index] = { ...newFields[index], label: e.target.value };
                                  setTempFields(newFields);
                                }}
                                className="w-full bg-white border border-slate-200 rounded-xl px-6 py-3 font-black text-slate-800 outline-none focus:ring-4 focus:ring-indigo-100 transition-all"
                              />
                            </div>
                            <div className="space-y-2">
                              <label className="block text-[10px] font-black text-slate-400 pr-4 uppercase tracking-widest">نوع البيانات</label>
                              <select
                                value={field.type}
                                onChange={(e) => {
                                  const newFields = [...tempFields];
                                  newFields[index] = { ...newFields[index], type: e.target.value as any };
                                  setTempFields(newFields);
                                }}
                                className="w-full bg-white border border-slate-200 rounded-xl px-6 py-3 font-black text-slate-800 outline-none cursor-pointer"
                              >
                                <option value="text">نص وصفي</option>
                                <option value="number">مبلغ / رقم عددي</option>
                                <option value="date">تاريخ محدد</option>
                              </select>
                            </div>
                          </div>
                          <button 
                            onClick={() => {
                              const newFields = tempFields.filter((_, i) => i !== index);
                              setTempFields(newFields);
                            }}
                            className="p-4 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                          >
                            <Trash2 className="w-6 h-6" />
                          </button>
                        </div>
                      ))}
                    </div>

                    <button
                      onClick={() => {
                        const newField: ManualLedgerField = {
                          id: Math.random().toString(36).substring(2, 9),
                          label: 'حقل جديد',
                          type: 'text'
                        };
                        setTempFields([...tempFields, newField]);
                      }}
                      className="w-full bg-indigo-50 text-indigo-600 py-6 rounded-2xl font-black text-xl hover:bg-indigo-600 hover:text-white transition-all flex items-center justify-center gap-3 border-2 border-dashed border-indigo-200 mt-6"
                    >
                      <Plus className="w-6 h-6" />
                      إضافة عمود بيانات جديد للسجل
                    </button>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-white border-t border-slate-100 flex items-center justify-center sticky bottom-0 z-50">
                <button
                  onClick={() => handleSaveConfig(tempFields)}
                   className="w-full max-w-xl bg-slate-900 text-white py-2 px-6 rounded-2xl font-bold text-lg shadow-xl shadow-slate-900/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                >
                  حفظ إعدادات السجل المخصصة
                </button>
              </div>
            </div>
          </div>
        )}
      

      {/* Entry Form Modal */}
      
        {showEntryForm && (
          <div className="integrated-page z-[300] no-scrollbar">
            <div
              className="w-full w-full mx-auto min-h-screen my-0  bg-white  relative z-10 shadow-sm flex flex-col no-scrollbar"
            >
              <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-white relative z-50 sticky top-0 shadow-sm px-12">
                <div className="flex items-center gap-3 text-right leading-relaxed">
                  <div className="theme-bg p-4 rounded-2xl text-white shadow-xl theme-shadow rotate-3 px-10">
                    <Plus className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-900 tracking-tight text-slate-900 tracking-tight leading-relaxed">{editingEntry ? 'تحديث بيانات القيد المحاسبي' : 'تسجيل قيد محاسبي جديد بالسجل'}</h3>
                    <p className="text-sm font-bold text-slate-400 mt-1">تعبئة البيانات يدوياً حسب الحقول المخصصة سابقاً</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowEntryForm(false)} 
                  className="p-4 hover:bg-rose-50 rounded-2xl transition-all text-slate-300 hover:text-rose-500 border border-slate-50"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  const data: { [key: string]: any } = {};
                  currentConfig.fields.forEach(f => {
                    data[f.id] = formData.get(f.id);
                  });
                  handleSaveEntry(data, formData.get('grade') as string);
                }}
                className="flex-1 flex flex-col overflow-hidden"
              >
                <div className="flex-1 overflow-y-auto p-4 lg:p-5 custom-scrollbar w-full bg-slate-50/20 custom-scrollbar">
                  <div className="max-w-5xl mx-auto w-full /space-y-2">
                    <div className="bg-white p-4 lg:p-14 rounded-3xl border border-slate-100 shadow-xl space-y-2 text-right">
                      <div className="space-y-2">
                        <label className="block text-sm font-black text-indigo-600 pr-6 uppercase tracking-widest leading-relaxed">تصنيف الصف المالي (اختياري)</label>
                        <select
                          name="grade"
                          defaultValue={editingEntry?.grade || ''}
                          className="w-full bg-indigo-50 border border-indigo-100 rounded-2xl px-10 py-6 outline-none focus:ring-2 focus:ring-indigo-100 font-black text-sm shadow-inner appearance-none cursor-pointer"
                        >
                          <option value="">قيد مالي عام (بدون صف)</option>
                          {uniqueGrades.map(grade => (
                            <option key={grade} value={grade}>{grade}</option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-2 pt-6 border-t border-slate-50">
                        {currentConfig.fields.map(field => (
                          <div key={field.id} className="space-y-2">
                            <label className="block text-sm font-black text-slate-700 pr-6 uppercase tracking-widest leading-relaxed">{field.label}</label>
                            <div className="relative group">
                              {field.type === 'date' ? (
                                <>
                                  <input
                                    required
                                    name={field.id}
                                    type="date"
                                    defaultValue={editingEntry?.data[field.id] || format(new Date(), 'yyyy-MM-dd')}
                                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-10 py-6 outline-none focus:ring-2 focus:ring-slate-100 font-black text-sm shadow-inner text-left"
                                    dir="ltr"
                                  />
                                  <CalendarIcon className="absolute right-auto left-8 top-1/2 -translate-y-1/2 text-slate-300 w-6 h-6 pointer-events-none" />
                                </>
                              ) : field.type === 'number' ? (
                                <>
                                  <input
                                    required
                                    name={field.id}
                                    type="number"
                                    step="any"
                                    defaultValue={editingEntry?.data[field.id] || ''}
                                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-10 py-6 outline-none focus:ring-2 focus:ring-slate-100 font-black text-xl text-indigo-600 shadow-inner"
                                    placeholder="0.00"
                                  />
                                  <Hash className="absolute right-auto left-8 top-1/2 -translate-y-1/2 text-indigo-300 w-6 h-6 pointer-events-none" />
                                </>
                              ) : (
                                <>
                                  <input
                                    required
                                    name={field.id}
                                    type="text"
                                    defaultValue={editingEntry?.data[field.id] || ''}
                                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-10 py-6 outline-none focus:ring-2 focus:ring-slate-100 font-black text-sm text-slate-900 shadow-inner"
                                    placeholder={`أدخل ${field.label} هنا...`}
                                  />
                                  <Type className="absolute right-auto left-8 top-1/2 -translate-y-1/2 text-slate-300 w-6 h-6 pointer-events-none" />
                                </>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-white border-t border-slate-100 flex items-center justify-center sticky bottom-0 z-50 gap-3">
                  <button
                    type="submit"
                    className="w-full max-w-2xl bg-slate-900 text-white py-2 px-6 rounded-2xl font-bold text-lg shadow-xl shadow-slate-900/20 hover:scale-[1.02] transition-all active:scale-[0.98]"
                  >
                    {editingEntry ? 'تطبيق وحفظ التعديلات' : 'تثبيت القيد المالي في السجل'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      

      {/* Print Preview Modal */}
      
        {showPreview && (
          <div className="integrated-page z-[300] no-scrollbar">
            <div
              className="w-full w-full mx-auto min-h-screen my-0  bg-slate-900  shadow-sm flex flex-col relative z-10 no-scrollbar"
            >
              <div className="p-4 border-b border-white/10 flex items-center justify-between bg-slate-900 relative z-50 sticky top-0 shadow-2xl px-12">
                <div className="flex items-center gap-3 text-right leading-relaxed">
                  <div className="bg-emerald-500 p-5 rounded-2xl text-white shadow-xl shadow-emerald-500/20">
                    <Eye className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-900 tracking-tight text-white tracking-tight leading-relaxed">معاينة التقرير المالي قبل الطباعة</h3>
                    <p className="text-sm font-bold text-emerald-400 mt-1">تأكد من دقة البيانات وتنسيق الجدول قبل استخراج النسخة الورقية</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handlePrint()}
                    className="bg-emerald-500 text-white px-12 py-6 rounded-2xl font-black text-lg flex items-center gap-2 hover:bg-emerald-600 shadow-2xl shadow-emerald-500/30 transition-all hover:scale-105 active:scale-95"
                  >
                    <Printer className="w-6 h-6" />
                    بدء عملية الطباعة (PDF)
                  </button>
                  <button 
                    onClick={() => setShowPreview(false)} 
                    className="p-4 bg-white/5 hover:bg-rose-500/20 rounded-2xl transition-all text-white/30 hover:text-rose-500 border border-white/5"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 lg:p-5 custom-scrollbar w-full bg-slate-800 custom-scrollbar flex justify-center">
                <div className="w-full max-w-5xl">
                   <div ref={printRef} className="bg-white p-16 lg:p-24 shadow-2xl min-h-[1122px] w-full mx-auto font-cairo text-right" dir="rtl">
                    {/* Print Header */}
                    <div className="flex justify-between items-start mb-16 border-b-8 border-double border-slate-900 pb-6">
                      <div className="space-y-2">
                        {school.logo && (
                          <div className="mb-4">
                            <img src={school.logo} alt="شعار المدرسة" className="h-16 object-contain grayscale" />
                          </div>
                        )}
                        <h1 className="text-5xl font-black text-slate-900 tracking-tighter leading-tight">{school.name}</h1>
                        <p className="text-lg font-black text-indigo-600 bg-indigo-50 px-6 py-2 rounded-2xl inline-block">سجل الحسابات والقيود اليدوية</p>
                        {school.address && <p className="text-sm font-black text-slate-400 block mt-2">الموقع: {school.address}</p>}
                      </div>
                      <div className="text-left space-y-2 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                        <p className="text-sm font-black text-slate-600">تاريخ إصدار التقرير: {format(new Date(), 'yyyy/MM/dd')}</p>
                        <p className="text-sm font-black text-slate-600">وقت التوثيق: {format(new Date(), 'HH:mm')}</p>
                        <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mt-2">Official Financial Document</p>
                      </div>
                    </div>

                    {/* Print Table */}
                    <div className="space-y-20">
                      {Object.entries(entriesByGrade).map(([grade, gradeEntries]) => (
                        <div key={grade} style={{ pageBreakInside: 'avoid' }}>
                          <h3 className="text-lg font-black text-slate-900 tracking-tight mb-8 border-r-[12px] border-indigo-600 pr-6 py-2 bg-slate-50 rounded-l-3xl">
                            {grade === 'عام' ? 'تصنيف القيود العامة والإدارية' : `سجل المحاسبة المالي: ${grade}`}
                          </h3>
                          <table className="w-full border-4 border-slate-900 text-sm border-collapse">
                            <thead>
                              <tr className="bg-slate-900 text-white">
                                <th className="border-2 border-slate-900 p-5 w-16 text-center font-black">ت</th>
                                {currentConfig.fields.map(field => (
                                  <th key={field.id} className="border-2 border-slate-900 p-5 text-right font-black">
                                    {field.label}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody className="divide-y-2 divide-slate-200">
                              {gradeEntries.map((entry, index) => (
                                <tr key={entry.id}>
                                  <td className="border-2 border-slate-200 p-5 text-center font-black text-slate-400 bg-slate-50">{index + 1}</td>
                                  {currentConfig.fields.map(field => (
                                    <td key={field.id} className="border-2 border-slate-200 p-5 font-bold text-slate-800">
                                      {field.type === 'number' ? 
                                        Number(entry.data[field.id] || 0).toLocaleString() : 
                                        entry.data[field.id]}
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ))}
                    </div>

                    {/* Print Footer */}
                    <div className="mt-32 grid grid-cols-2 gap-32">
                      <div className="text-center space-y-2">
                        <p className="font-black text-lg text-slate-900 underline underline-offset-[16px] decoration-4 decoration-indigo-600">توقيع المحاسب المسئول</p>
                        <div className="w-full border-b-2 border-dashed border-slate-300 h-10"></div>
                      </div>
                      <div className="text-center space-y-2">
                        <p className="font-black text-lg text-slate-900 underline underline-offset-[16px] decoration-4 decoration-indigo-600">مصادقة إدارة المدرسة</p>
                        <div className="w-full border-b-2 border-dashed border-slate-300 h-10"></div>
                      </div>
                    </div>

                    <div className="mt-20 text-center border-t border-slate-100 pt-10">
                      <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.5em]">System Generated Report • Advanced School Management Platform</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        
      {deletingEntry && (
        <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8 text-center space-y-6">
              <div className="w-24 h-24 bg-rose-50 rounded-full mx-auto flex items-center justify-center text-rose-500 mb-6">
                <Trash2 className="w-12 h-12" />
              </div>
              <h3 className="text-3xl font-black text-gray-900 tracking-tight">تأكيد الحذف</h3>
              <p className="text-lg text-gray-500 font-bold leading-relaxed">
                هل أنت متأكد من حذف قيود <span className="text-rose-600">"{deletingEntry.data[currentConfig.fields[0].id] || 'هذا السجل'}"</span>؟
                <br />
                <span className="text-sm font-medium">لا يمكن التراجع عن هذا الإجراء بعد تنفيذه.</span>
              </p>
              
              <div className="flex flex-col gap-3 pt-4">
                <button 
                  onClick={() => {
                    localDb.delete('manualLedgerEntries', deletingEntry.id);
                    setDeletingEntry(null);
                  }}
                  className="w-full bg-rose-600 text-white py-4 rounded-2xl font-black text-lg shadow-xl shadow-rose-200 hover:bg-rose-700 active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  <Trash2 className="w-6 h-6" />
                  نعم، تأكيد الحذف
                </button>
                <button 
                  onClick={() => setDeletingEntry(null)}
                  className="w-full bg-gray-100 text-gray-600 py-4 rounded-2xl font-black text-lg hover:bg-gray-200 active:scale-95 transition-all"
                >
                  إلغاء الأمر
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
    </div>
    );
}
