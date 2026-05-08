import { useRef, useMemo } from 'react';
import { School, Student, Staff, GeneralExpense, Payment, ManualLedgerConfig, ManualLedgerEntry } from '../types';
import { Printer, FileText, LayoutGrid, List, Settings, X } from 'lucide-react';
import { useReactToPrint } from 'react-to-print';
import { formatCurrency } from '../lib/utils';
import { format } from 'date-fns';
import { useState } from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import ManualLedgerManager from './ManualLedgerManager';
import { localDb } from '../services/localDb';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface LedgerManagerProps {
  school: School;
  students: Student[];
  staff: Staff[];
  expenses: GeneralExpense[];
  payments: Payment[];
  ledgerConfigs: ManualLedgerConfig[];
  ledgerEntries: ManualLedgerEntry[];
  canModify?: boolean;
}

export default function LedgerManager({ 
  school, students, staff, expenses, payments, ledgerConfigs, ledgerEntries, canModify = true 
}: LedgerManagerProps) {
  const [viewMode, setViewMode] = useState<'automated' | 'manual'>('automated');
  const [showAutoConfig, setShowAutoConfig] = useState(false);
  const [autoConfig, setAutoConfig] = useState({
    showPaidAmount: true,
    showPhone: true,
    showTotalAmount: true,
    numPaymentSlots: 8,
    showStaff: true,
    showExpenses: true,
    fontSize: 'text-sm'
  });

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

  const studentsPayments = useMemo(() => {
    const totals: { [key: string]: number } = {};
    payments.forEach(p => {
      totals[p.studentId] = (totals[p.studentId] || 0) + p.amount;
    });
    return totals;
  }, [payments]);

  const studentsByGrade = useMemo(() => {
    const groups: { [key: string]: Student[] } = {};
    students.forEach(s => {
      if (!groups[s.grade]) groups[s.grade] = [];
      groups[s.grade].push(s);
    });
    return Object.entries(groups).sort((a, b) => a[0].localeCompare(b[0]));
  }, [students]);

  const currentMonthExpenses = useMemo(() => {
    const now = new Date();
    const currentMonth = format(now, 'yyyy-MM');
    return expenses.filter(e => format(new Date(e.date), 'yyyy-MM') === currentMonth);
  }, [expenses]);

  const totalCurrentMonthExpenses = currentMonthExpenses.reduce((sum, e) => sum + e.amount, 0);

  return (
    <div className="space-y-6">
      <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h2 className="text-2xl font-black text-gray-900">سجل الحسابات المنظم</h2>
          <p className="text-gray-500 font-bold">طباعة سجل الحسابات الكامل للطلاب والموظفين</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex bg-gray-100 p-1 rounded-xl ml-4">
            <button
              onClick={() => setViewMode('automated')}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-black transition-all flex items-center gap-2",
                viewMode === 'automated' ? "bg-white theme-text shadow-sm" : "text-gray-500 hover:text-gray-700"
              )}
            >
              <List className="w-4 h-4" />
              السجل التلقائي
            </button>
            <button
              onClick={() => setViewMode('manual')}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-black transition-all flex items-center gap-2",
                viewMode === 'manual' ? "bg-white theme-text shadow-sm" : "text-gray-500 hover:text-gray-700"
              )}
            >
              <LayoutGrid className="w-4 h-4" />
              السجل اليدوي
            </button>
          </div>
          {viewMode === 'automated' && (
            <button
              onClick={() => setShowAutoConfig(true)}
              className="bg-gray-100 text-gray-600 px-6 py-4 rounded-2xl font-black flex items-center gap-2 hover:bg-gray-200 transition-all"
            >
              <Settings className="w-5 h-5" />
              تخصيص السجل
            </button>
          )}
          <button
            onClick={() => handlePrint()}
            className="theme-bg text-white px-8 py-4 rounded-2xl font-black flex items-center gap-2 theme-shadow transition-all hover:opacity-95"
          >
            <Printer className="w-6 h-6" />
            طباعة السجل الكامل
          </button>
        </div>
      </div>

      {viewMode === 'automated' ? (
        <div className="space-y-8">
          {/* Preview of Grade Sections */}
          {studentsByGrade.map(([grade, gradeStudents]) => (
            <div key={grade} className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm space-y-6">
              <div className="flex justify-between items-center border-b border-gray-50 pb-4">
                <h3 className="text-xl font-black text-gray-900">قسم: {grade}</h3>
                <span className="bg-blue-50 text-blue-600 px-4 py-1 rounded-full text-xs font-black">
                  {gradeStudents.length} طالب
                </span>
              </div>
              
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                {/* Info Table Preview */}
                <div className="space-y-3">
                  <h4 className="text-sm font-black text-gray-400 flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    معاينة جدول المعلومات
                  </h4>
                  <div className="border border-gray-100 rounded-2xl overflow-hidden">
                    <table className="w-full text-xs text-right">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="p-3 border-b border-gray-100">الاسم</th>
                          {autoConfig.showPaidAmount && <th className="p-3 border-b border-gray-100">المدفوع</th>}
                          {autoConfig.showPhone && <th className="p-3 border-b border-gray-100">الهاتف</th>}
                          {autoConfig.showTotalAmount && <th className="p-3 border-b border-gray-100">الكلي</th>}
                        </tr>
                      </thead>
                      <tbody>
                        {gradeStudents.slice(0, 3).map(s => (
                          <tr key={s.id} className="border-b border-gray-50">
                            <td className="p-3 font-bold">{s.name}</td>
                            {autoConfig.showPaidAmount && <td className="p-3 text-blue-600 font-black">{formatCurrency(studentsPayments[s.id] || 0)}</td>}
                            {autoConfig.showPhone && <td className="p-3 text-gray-500">{s.phone}</td>}
                            {autoConfig.showTotalAmount && <td className="p-3 font-black">{formatCurrency(s.totalAmount)}</td>}
                          </tr>
                        ))}
                        {gradeStudents.length > 3 && (
                          <tr>
                            <td colSpan={4} className="p-2 text-center text-[10px] text-gray-400 font-bold">... وباقي الطلاب ({gradeStudents.length - 3})</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Tracking Table Preview */}
                <div className="space-y-3">
                  <h4 className="text-sm font-black text-gray-400 flex items-center gap-2">
                    <LayoutGrid className="w-4 h-4" />
                    معاينة سجل المتابعة اليدوي ({autoConfig.numPaymentSlots} حقول)
                  </h4>
                  <div className="border border-gray-100 rounded-2xl overflow-hidden">
                    <table className="w-full text-[10px] text-right">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="p-2 border-b border-gray-100">الاسم</th>
                          {Array.from({ length: Math.min(3, autoConfig.numPaymentSlots) }).map((_, i) => (
                            <th key={i} className="p-2 border-b border-gray-100 text-center">دفعة {i+1}</th>
                          ))}
                          {autoConfig.numPaymentSlots > 3 && <th className="p-2 border-b border-gray-100 text-center">...</th>}
                        </tr>
                      </thead>
                      <tbody>
                        {gradeStudents.slice(0, 3).map(s => (
                          <tr key={s.id} className="border-b border-gray-50 h-8">
                            <td className="p-2 font-bold">{s.name}</td>
                            {Array.from({ length: Math.min(3, autoConfig.numPaymentSlots) }).map((_, i) => (
                              <td key={i} className="p-2 border-r border-gray-50"></td>
                            ))}
                            {autoConfig.numPaymentSlots > 3 && <td className="p-2 border-r border-gray-50"></td>}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {/* Summary Preview */}
          {(autoConfig.showStaff || autoConfig.showExpenses) && (
            <div className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm space-y-6">
              <h3 className="text-xl font-black text-gray-900 border-b border-gray-50 pb-4">معاينة الخلاصة المالية</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {autoConfig.showStaff && (
                  <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100">
                    <h4 className="text-sm font-black text-gray-900 mb-4">سجل رواتب الموظفين ({staff.length})</h4>
                    <div className="space-y-2">
                      {staff.slice(0, 2).map(s => (
                        <div key={s.id} className="flex justify-between text-xs font-bold">
                          <span>{s.name}</span>
                          <span className="text-blue-600">{formatCurrency(s.salary)}</span>
                        </div>
                      ))}
                      {staff.length > 2 && <p className="text-[10px] text-gray-400 text-center">...</p>}
                    </div>
                  </div>
                )}
                {autoConfig.showExpenses && (
                  <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100">
                    <h4 className="text-sm font-black text-gray-900 mb-4">المصروفات ({currentMonthExpenses.length})</h4>
                    <div className="space-y-2">
                      {currentMonthExpenses.slice(0, 2).map(e => (
                        <div key={e.id} className="flex justify-between text-xs font-bold">
                          <span>{e.description}</span>
                          <span className="text-red-600">{formatCurrency(e.amount)}</span>
                        </div>
                      ))}
                      {currentMonthExpenses.length > 2 && <p className="text-[10px] text-gray-400 text-center">...</p>}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      ) : (
        <ManualLedgerManager 
          school={school} 
          students={students}
          configs={ledgerConfigs}
          entries={ledgerEntries}
          canModify={canModify}
        />
      )}

      {/* Automated Ledger Config Modal */}
      {showAutoConfig && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-[40px] shadow-2xl p-10 border border-gray-100">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-3xl font-black text-gray-900">تخصيص السجل التلقائي</h2>
              <button onClick={() => setShowAutoConfig(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="space-y-6">
              <div className="space-y-4">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={autoConfig.showPaidAmount}
                    onChange={(e) => setAutoConfig(prev => ({ ...prev, showPaidAmount: e.target.checked }))}
                    className="w-5 h-5 rounded-lg border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm font-black text-gray-700 group-hover:text-blue-600 transition-colors">إظهار المبلغ المدفوع</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={autoConfig.showPhone}
                    onChange={(e) => setAutoConfig(prev => ({ ...prev, showPhone: e.target.checked }))}
                    className="w-5 h-5 rounded-lg border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm font-black text-gray-700 group-hover:text-blue-600 transition-colors">إظهار هاتف ولي الأمر</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={autoConfig.showTotalAmount}
                    onChange={(e) => setAutoConfig(prev => ({ ...prev, showTotalAmount: e.target.checked }))}
                    className="w-5 h-5 rounded-lg border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm font-black text-gray-700 group-hover:text-blue-600 transition-colors">إظهار المبلغ الكلي</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={autoConfig.showStaff}
                    onChange={(e) => setAutoConfig(prev => ({ ...prev, showStaff: e.target.checked }))}
                    className="w-5 h-5 rounded-lg border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm font-black text-gray-700 group-hover:text-blue-600 transition-colors">إظهار سجل الرواتب</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={autoConfig.showExpenses}
                    onChange={(e) => setAutoConfig(prev => ({ ...prev, showExpenses: e.target.checked }))}
                    className="w-5 h-5 rounded-lg border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm font-black text-gray-700 group-hover:text-blue-600 transition-colors">إظهار سجل المصروفات</span>
                </label>
              </div>

              <div className="pt-4 border-t border-gray-100">
                <label className="block text-sm font-black text-gray-700 mb-2">عدد حقول الدفع اليدوية</label>
                <input
                  type="number"
                  min="1"
                  max="12"
                  value={autoConfig.numPaymentSlots}
                  onChange={(e) => setAutoConfig(prev => ({ ...prev, numPaymentSlots: parseInt(e.target.value) || 8 }))}
                  className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-6 py-4 outline-none focus:ring-4 focus:ring-blue-100 font-bold"
                />
              </div>

              <button
                onClick={() => setShowAutoConfig(false)}
                className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black text-lg hover:bg-blue-700 shadow-xl shadow-blue-100 transition-all"
              >
                حفظ الإعدادات
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hidden Printable Content */}
      <div style={{ position: 'absolute', top: '-9999px', left: '-9999px', opacity: 0, pointerEvents: 'none' }}>
        <div ref={printRef} className="p-8 text-right font-cairo" dir="rtl">
          {/* Page 1 & 2 for each grade */}
          {studentsByGrade.map(([grade, gradeStudents]) => (
            <div key={grade} className="space-y-8">
              {/* Page 1: Information */}
              <div className="p-4" style={{ pageBreakAfter: 'always', minHeight: '100vh' }}>
                <div className="text-center mb-8 border-b-4 border-double border-gray-900 pb-4">
                  <h1 className="text-4xl font-black">{school.name}</h1>
                  <h2 className="text-2xl font-black mt-2">سجل معلومات الطلاب - {grade}</h2>
                  <p className="font-bold mt-1 text-gray-600">تاريخ الطباعة: {format(new Date(), 'yyyy-MM-dd')}</p>
                </div>
                <table className="w-full border-2 border-gray-900 text-sm">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border border-gray-900 p-2 w-12 text-center">ت</th>
                      <th className="border border-gray-900 p-2 text-right">اسم الطالب الرباعي</th>
                      {autoConfig.showPaidAmount && <th className="border border-gray-900 p-2 w-32 text-center">المبلغ المدفوع</th>}
                      {autoConfig.showPhone && <th className="border border-gray-900 p-2 w-40 text-center">هاتف ولي الأمر</th>}
                      {autoConfig.showTotalAmount && <th className="border border-gray-900 p-2 w-32 text-center">المبلغ الكلي</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {gradeStudents.map((s, index) => {
                      const paidAmount = studentsPayments[s.id] || 0;
                      return (
                        <tr key={s.id}>
                          <td className="border border-gray-900 p-2 text-center font-bold">{index + 1}</td>
                          <td className="border border-gray-900 p-2 font-bold">{s.name}</td>
                          {autoConfig.showPaidAmount && <td className="border border-gray-900 p-2 text-center font-black text-blue-700">{formatCurrency(paidAmount)}</td>}
                          {autoConfig.showPhone && <td className="border border-gray-900 p-2 text-center font-bold">{s.phone}</td>}
                          {autoConfig.showTotalAmount && <td className="border border-gray-900 p-2 text-center font-black">{formatCurrency(s.totalAmount)}</td>}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Page 2: Manual Payment Tracking */}
              <div className="p-4" style={{ pageBreakAfter: 'always', minHeight: '100vh' }}>
                <div className="text-center mb-8 border-b-4 border-double border-gray-900 pb-4">
                  <h1 className="text-4xl font-black">{school.name}</h1>
                  <h2 className="text-2xl font-black mt-2">سجل متابعة الأقساط اليدوي - {grade}</h2>
                </div>
                <table className="w-full border-2 border-gray-900 text-[10px]">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border border-gray-900 p-1 w-8 text-center">ت</th>
                      <th className="border border-gray-900 p-1 w-48 text-right">الاسم</th>
                      {Array.from({ length: autoConfig.numPaymentSlots }).map((_, i) => (
                        <th key={i} className="border border-gray-900 p-1">
                          <div className="text-center border-b border-gray-400 pb-1 mb-1">الدفعة {i + 1}</div>
                          <div className="flex justify-between px-1 text-[8px]">
                            <span>المبلغ</span>
                            <span>التاريخ</span>
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {gradeStudents.map((s, index) => (
                      <tr key={s.id} className="h-12">
                        <td className="border border-gray-900 p-1 text-center font-bold">{index + 1}</td>
                        <td className="border border-gray-900 p-1 font-bold">{s.name}</td>
                        {Array.from({ length: autoConfig.numPaymentSlots }).map((_, i) => (
                          <td key={i} className="border border-gray-900 p-1"></td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}

          {/* Summary Page: Staff & Expenses */}
          {(autoConfig.showStaff || autoConfig.showExpenses) && (
            <div className="p-4">
              <div className="text-center mb-12 border-b-4 border-double border-gray-900 pb-4">
                <h1 className="text-4xl font-black">{school.name}</h1>
                <h2 className="text-2xl font-black mt-2">خلاصة السجل المالي</h2>
              </div>

              {autoConfig.showStaff && (
                <div className="mb-12">
                  <h3 className="text-2xl font-black mb-6 border-r-8 border-blue-600 pr-4">سجل رواتب الموظفين</h3>
                  <table className="w-full border-2 border-gray-900">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="border border-gray-900 p-3 w-16 text-center">ت</th>
                        <th className="border border-gray-900 p-3 text-right">الاسم</th>
                        <th className="border border-gray-900 p-3 text-right">المنصب</th>
                        <th className="border border-gray-900 p-3 text-center">المبلغ</th>
                        <th className="border border-gray-900 p-3 w-48 text-center">التوقيع</th>
                      </tr>
                    </thead>
                    <tbody>
                      {staff.map((s, index) => (
                        <tr key={s.id} className="h-16">
                          <td className="border border-gray-900 p-3 text-center font-bold">{index + 1}</td>
                          <td className="border border-gray-900 p-3 font-bold text-lg">{s.name}</td>
                          <td className="border border-gray-900 p-3 font-bold">{s.role}</td>
                          <td className="border border-gray-900 p-3 text-center font-black text-lg">{formatCurrency(s.salary)}</td>
                          <td className="border border-gray-900 p-3"></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="grid grid-cols-2 gap-12">
                {autoConfig.showExpenses ? (
                  <div className="border-2 border-gray-900 p-8 rounded-3xl">
                    <h3 className="text-2xl font-black mb-6 border-b-2 border-gray-300 pb-4">مصروفات الشهر الحالي</h3>
                    <div className="space-y-4 min-h-[300px]">
                      {currentMonthExpenses.map(e => (
                        <div key={e.id} className="flex justify-between items-center text-lg font-bold border-b border-gray-100 pb-2">
                          <span className="text-gray-700">{e.description}</span>
                          <span className="text-red-600 font-black">{formatCurrency(e.amount)}</span>
                        </div>
                      ))}
                      {/* Empty lines for manual writing */}
                      {[1, 2, 3, 4, 5].map(i => (
                        <div key={`empty-${i}`} className="flex justify-between items-center border-b border-dashed border-gray-300 h-10">
                          <span className="w-1/2"></span>
                          <span className="w-1/4"></span>
                        </div>
                      ))}
                    </div>
                    <div className="mt-6 pt-6 border-t-4 border-gray-900 flex justify-between items-center font-black text-2xl">
                      <span>إجمالي المصروفات:</span>
                      <span className="text-red-600">{formatCurrency(totalCurrentMonthExpenses)}</span>
                    </div>
                  </div>
                ) : <div />}

                <div className="border-2 border-gray-900 p-8 rounded-3xl flex flex-col justify-between">
                  <div>
                    <h3 className="text-2xl font-black mb-6 border-b-2 border-gray-300 pb-4">ملاحظات إضافية</h3>
                    <div className="space-y-6">
                      <div className="h-0.5 bg-gray-300 w-full"></div>
                      <div className="h-0.5 bg-gray-300 w-full"></div>
                      <div className="h-0.5 bg-gray-300 w-full"></div>
                      <div className="h-0.5 bg-gray-300 w-full"></div>
                      <div className="h-0.5 bg-gray-300 w-full"></div>
                    </div>
                  </div>
                  <div className="mt-12 flex justify-between items-end">
                    <div className="text-center">
                      <p className="font-black text-xl mb-12">توقيع المحاسب</p>
                      <div className="w-48 border-b-2 border-gray-900"></div>
                    </div>
                    <div className="text-center">
                      <p className="font-black text-xl mb-12">توقيع المدير</p>
                      <div className="w-48 border-b-2 border-gray-900"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
