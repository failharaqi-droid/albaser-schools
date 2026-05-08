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

  const handleDeleteEntry = (id: string) => {
    if (confirm('هل أنت متأكد من حذف هذا السجل؟')) {
      localDb.delete('manualLedgerEntries', id);
    }
  };

  return (
    <div className="space-y-6 font-cairo" dir="rtl">
      {/* Header Actions */}
      <div className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h2 className="text-2xl font-black text-gray-900">سجل الحسابات اليدوي</h2>
          <p className="text-gray-500 font-bold">قم بتخصيص السجل وإضافة القيود المحاسبية يدوياً</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setTempFields([...currentConfig.fields]);
              setShowConfig(true);
            }}
            className="bg-gray-100 text-gray-600 px-6 py-4 rounded-2xl font-black flex items-center gap-2 hover:bg-gray-200 transition-all"
          >
            <Settings className="w-5 h-5" />
            تخصيص الحقول
          </button>
          <button
            onClick={() => setShowPreview(true)}
            className="bg-emerald-50 text-emerald-600 px-6 py-4 rounded-2xl font-black flex items-center gap-2 hover:bg-emerald-100 transition-all"
          >
            <Eye className="w-5 h-5" />
            معاينة وطباعة
          </button>
          {canModify && (
            <button
              onClick={() => { setEditingEntry(null); setShowEntryForm(true); }}
              className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-black flex items-center gap-2 hover:bg-blue-700 shadow-xl shadow-blue-100 transition-all"
            >
              <Plus className="w-6 h-6" />
              إضافة قيد جديد
            </button>
          )}
        </div>
      </div>

      {/* Main Table */}
      <div className="space-y-8">
        {Object.entries(entriesByGrade).length === 0 ? (
          <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm p-20 text-center">
            <div className="flex flex-col items-center gap-4 opacity-30">
              <LayoutGrid className="w-16 h-16" />
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
                        <td className="px-6 py-4 text-sm font-bold text-gray-400">{index + 1}</td>
                        {currentConfig.fields.map(field => (
                          <td key={field.id} className="px-6 py-4 text-sm font-black text-gray-700">
                            {field.type === 'number' ? (
                              <span className={cn(
                                field.id === 'debit' ? 'text-red-600' : field.id === 'credit' ? 'text-emerald-600' : ''
                              )}>
                                {Number(entry.data[field.id] || 0).toLocaleString()}
                              </span>
                            ) : entry.data[field.id]}
                          </td>
                        ))}
                        <td className="px-6 py-4">
                          {canModify && (
                            <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => { setEditingEntry(entry); setShowEntryForm(true); }}
                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-xl transition-colors"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteEntry(entry.id)}
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
      <AnimatePresence>
        {showConfig && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white w-full max-w-2xl rounded-[40px] shadow-2xl p-10 border border-gray-100"
            >
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-3xl font-black text-gray-900">تخصيص حقول السجل</h2>
                <button onClick={() => setShowConfig(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4 mb-8 max-h-[400px] overflow-y-auto pr-2">
                {tempFields.map((field, index) => (
                  <div key={field.id} className="flex items-center gap-3 bg-gray-50 p-4 rounded-2xl border border-gray-100">
                    <div className="flex flex-col gap-1">
                      <button 
                        onClick={() => moveField(index, 'up')}
                        disabled={index === 0}
                        className="p-1 text-gray-400 hover:text-blue-600 disabled:opacity-30"
                      >
                        <ChevronUp className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => moveField(index, 'down')}
                        disabled={index === tempFields.length - 1}
                        className="p-1 text-gray-400 hover:text-blue-600 disabled:opacity-30"
                      >
                        <ChevronDown className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="flex-1 grid grid-cols-2 gap-3">
                      <input
                        type="text"
                        value={field.label}
                        onChange={(e) => {
                          const newFields = [...tempFields];
                          newFields[index] = { ...newFields[index], label: e.target.value };
                          setTempFields(newFields);
                        }}
                        className="bg-white border border-gray-200 rounded-xl px-4 py-2 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-100"
                        placeholder="اسم الحقل"
                      />
                      <select
                        value={field.type}
                        onChange={(e) => {
                          const newFields = [...tempFields];
                          newFields[index] = { ...newFields[index], type: e.target.value as any };
                          setTempFields(newFields);
                        }}
                        className="bg-white border border-gray-200 rounded-xl px-4 py-2 text-sm font-bold outline-none"
                      >
                        <option value="text">نص</option>
                        <option value="number">رقم / مبلغ</option>
                        <option value="date">تاريخ</option>
                      </select>
                    </div>
                    <button 
                      onClick={() => {
                        const newFields = tempFields.filter((_, i) => i !== index);
                        setTempFields(newFields);
                      }}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    const newField: ManualLedgerField = {
                      id: Math.random().toString(36).substring(2, 9),
                      label: 'حقل جديد',
                      type: 'text'
                    };
                    setTempFields([...tempFields, newField]);
                  }}
                  className="flex-1 bg-blue-50 text-blue-600 py-4 rounded-2xl font-black hover:bg-blue-100 transition-all flex items-center justify-center gap-2"
                >
                  <Plus className="w-5 h-5" />
                  إضافة حقل جديد
                </button>
                <button
                  onClick={() => handleSaveConfig(tempFields)}
                  className="px-10 bg-blue-600 text-white py-4 rounded-2xl font-black hover:bg-blue-700 shadow-xl shadow-blue-100"
                >
                  حفظ التغييرات
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Entry Form Modal */}
      <AnimatePresence>
        {showEntryForm && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white w-full max-w-md rounded-[40px] shadow-2xl p-10 border border-gray-100"
            >
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-3xl font-black text-gray-900">{editingEntry ? 'تعديل قيد' : 'إضافة قيد جديد'}</h2>
                <button onClick={() => setShowEntryForm(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
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
                className="space-y-5"
              >
                <div>
                  <label className="block text-sm font-black text-gray-700 mb-2">الصف الدراسي (اختياري)</label>
                  <select
                    name="grade"
                    defaultValue={editingEntry?.grade || ''}
                    className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-6 py-4 outline-none focus:ring-4 focus:ring-blue-100 font-bold"
                  >
                    <option value="">عام (بدون صف)</option>
                    {uniqueGrades.map(grade => (
                      <option key={grade} value={grade}>{grade}</option>
                    ))}
                  </select>
                </div>

                {currentConfig.fields.map(field => (
                  <div key={field.id}>
                    <label className="block text-sm font-black text-gray-700 mb-2">{field.label}</label>
                    <div className="relative">
                      {field.type === 'date' ? (
                        <div className="relative">
                          <input
                            required
                            name={field.id}
                            type="date"
                            defaultValue={editingEntry?.data[field.id] || format(new Date(), 'yyyy-MM-dd')}
                            className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-6 py-4 outline-none focus:ring-4 focus:ring-blue-100 font-bold"
                          />
                          <CalendarIcon className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none" />
                        </div>
                      ) : field.type === 'number' ? (
                        <div className="relative">
                          <input
                            required
                            name={field.id}
                            type="number"
                            step="any"
                            defaultValue={editingEntry?.data[field.id] || ''}
                            className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-6 py-4 outline-none focus:ring-4 focus:ring-blue-100 font-bold"
                            placeholder="0.00"
                          />
                          <Hash className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none" />
                        </div>
                      ) : (
                        <div className="relative">
                          <input
                            required
                            name={field.id}
                            type="text"
                            defaultValue={editingEntry?.data[field.id] || ''}
                            className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-6 py-4 outline-none focus:ring-4 focus:ring-blue-100 font-bold"
                            placeholder={`أدخل ${field.label}`}
                          />
                          <Type className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none" />
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                <div className="pt-4 flex gap-3">
                  <button
                    type="submit"
                    className="flex-1 bg-blue-600 text-white py-5 rounded-2xl font-black text-lg hover:bg-blue-700 shadow-xl shadow-blue-200 transition-all"
                  >
                    {editingEntry ? 'حفظ التعديلات' : 'إضافة القيد'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowEntryForm(false)}
                    className="px-8 bg-gray-100 text-gray-600 py-5 rounded-2xl font-black hover:bg-gray-200 transition-all"
                  >
                    إلغاء
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Print Preview Modal */}
      <AnimatePresence>
        {showPreview && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[110] flex flex-col items-center justify-center p-4 md:p-10">
            <div className="w-full max-w-5xl flex justify-between items-center mb-6 text-white">
              <div className="flex items-center gap-3">
                <div className="bg-blue-600 p-2 rounded-xl">
                  <Eye className="w-6 h-6" />
                </div>
                <h2 className="text-2xl font-black">معاينة الطباعة</h2>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => handlePrint()}
                  className="bg-blue-600 text-white px-8 py-3 rounded-xl font-black flex items-center gap-2 hover:bg-blue-700 shadow-xl shadow-blue-500/20 transition-all"
                >
                  <Printer className="w-5 h-5" />
                  تأكيد الطباعة (PDF)
                </button>
                <button 
                  onClick={() => setShowPreview(false)}
                  className="bg-white/10 hover:bg-white/20 p-3 rounded-xl transition-all"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="flex-1 w-full max-w-5xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col">
              <div className="flex-1 overflow-y-auto p-12 bg-gray-50/50">
                <div ref={printRef} className="bg-white p-12 shadow-sm min-h-[1122px] w-full mx-auto font-cairo" dir="rtl">
                  {/* Print Header */}
                  <div className="flex justify-between items-start mb-12 border-b-4 border-double border-gray-900 pb-8">
                    <div className="space-y-2">
                      <h1 className="text-4xl font-black text-gray-900">{school.name}</h1>
                      <p className="text-xl font-bold text-gray-600">سجل الحسابات اليدوي</p>
                      {school.address && <p className="text-sm font-bold text-gray-500">{school.address}</p>}
                    </div>
                    <div className="text-left space-y-1">
                      <p className="text-sm font-black">تاريخ التقرير: {format(new Date(), 'yyyy-MM-dd')}</p>
                      <p className="text-sm font-black">وقت الطباعة: {format(new Date(), 'HH:mm')}</p>
                    </div>
                  </div>

                  {/* Print Table */}
                  <div className="space-y-12">
                    {Object.entries(entriesByGrade).map(([grade, gradeEntries]) => (
                      <div key={grade} style={{ pageBreakInside: 'avoid' }}>
                        <h3 className="text-2xl font-black mb-4 border-r-8 border-blue-600 pr-4">
                          {grade === 'عام' ? 'القيود العامة' : `قيود الصف: ${grade}`}
                        </h3>
                        <table className="w-full border-2 border-gray-900 text-sm">
                          <thead>
                            <tr className="bg-gray-100">
                              <th className="border border-gray-900 p-3 w-12 text-center">ت</th>
                              {currentConfig.fields.map(field => (
                                <th key={field.id} className="border border-gray-900 p-3 text-right">
                                  {field.label}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {gradeEntries.map((entry, index) => (
                              <tr key={entry.id}>
                                <td className="border border-gray-900 p-3 text-center font-bold">{index + 1}</td>
                                {currentConfig.fields.map(field => (
                                  <td key={field.id} className="border border-gray-900 p-3 font-bold">
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
                  <div className="mt-20 grid grid-cols-2 gap-20">
                    <div className="text-center">
                      <p className="font-black text-xl mb-16">توقيع المحاسب</p>
                      <div className="w-full border-b-2 border-gray-900"></div>
                    </div>
                    <div className="text-center">
                      <p className="font-black text-xl mb-16">توقيع المدير</p>
                      <div className="w-full border-b-2 border-gray-900"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
