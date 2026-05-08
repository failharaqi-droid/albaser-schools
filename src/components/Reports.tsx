import { useState, useRef, useMemo } from 'react';
import { School, Student, Payment, Staff, StaffPayment, StaffInvoice, GeneralExpense, InvestorPayment } from '../types';
import { 
  FileText, 
  Printer, 
  TrendingUp, 
  TrendingDown, 
  Calendar,
  Download,
  Filter,
  Users,
  PieChart as PieChartIcon,
  ChevronDown,
  X,
  Eye,
  ArrowRightLeft
} from 'lucide-react';
import { formatCurrency } from '../lib/utils';
import { format, startOfMonth, endOfMonth, isWithinInterval, subMonths, startOfYear, endOfYear } from 'date-fns';
import { useReactToPrint } from 'react-to-print';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend } from 'recharts';

interface ReportsProps {
  school: School;
  students: Student[];
  payments: Payment[];
  staff: Staff[];
  staffPayments: StaffPayment[];
  staffInvoices: StaffInvoice[];
  expenses: GeneralExpense[];
  investorPayments: InvestorPayment[];
}

export default function Reports({ school, students, payments, staff, staffPayments, staffInvoices, expenses, investorPayments }: ReportsProps) {
  const [reportType, setReportType] = useState<'monthly' | 'quarterly' | 'yearly' | 'custom' | 'studentBalances' | 'financialSummary' | 'studentDebtAnalysis' | 'debtLedger'>('monthly');
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM'));
  const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<string>('all');
  const [selectedGrade, setSelectedGrade] = useState<string>('all');
  const [showPreview, setShowPreview] = useState(false);
  
  const reportRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({ 
    contentRef: reportRef,
    suppressErrors: true,
    onAfterPrint: () => setShowPreview(false)
  });

  const exportToCSV = () => {
    let dataToExport: any[] = [];
    let fileName = "";

    if (reportType === 'studentBalances') {
      fileName = `ديون_الطلاب_${format(new Date(), 'yyyy-MM-dd')}.csv`;
      dataToExport = reportData.studentBalances.map(s => ({
        'اسم الطالب': s.name,
        'الصف': s.grade,
        'المبلغ الكلي': s.totalAmount,
        'المدفوع': s.paid,
        'المتبقي': s.remaining
      }));
    } else if (reportType === 'debtLedger') {
      fileName = `سجل_الديون_الختامي_${format(new Date(), 'yyyy-MM-dd')}.csv`;
      dataToExport = reportData.studentBalances
        .filter(s => s.remaining > 0)
        .map(s => ({
          'الصف': s.grade,
          'اسم الطالب': s.name,
          'المبلغ الكلي': s.totalAmount,
          'الواصل': s.paid,
          'المتبقي': s.remaining
        }));
    } else if (reportType === 'studentDebtAnalysis') {
      fileName = `تحليل_المسقفات_حسب_الصف_${format(new Date(), 'yyyy-MM-dd')}.csv`;
      dataToExport = reportData.gradePerformance.map(g => ({
        'الصف الدراسي': g.grade,
        'إجمالي المستحقات': g.totalDue,
        'المبالغ المحصلة': g.totalPaid,
        'المبالغ المتبقية': g.totalRemaining,
        'نسبة التحصيل': `${g.percentage.toFixed(1)}%`
      }));
    } else if (reportType === 'financialSummary') {
      fileName = `ملخص_مالي_مبوب_${format(new Date(), 'yyyy-MM-dd')}.csv`;
      dataToExport = Object.entries(reportData.expenseByCategory).map(([category, amount]) => ({
        'الفئة': category,
        'النوع': 'مصروفات',
        'المبلغ': amount
      }));
      dataToExport.push({ 'الفئة': 'أقساط الطلاب', 'النوع': 'إيرادات', 'المبلغ': reportData.income });
    } else {
      fileName = `تقرير_المدفوعات_${reportType}_${format(new Date(), 'yyyy-MM-dd')}.csv`;
      const date = new Date(selectedDate);
      let start: Date, end: Date;

      if (reportType === 'monthly') {
        start = startOfMonth(date);
        end = endOfMonth(date);
      } else if (reportType === 'quarterly') {
        start = subMonths(date, 3);
        end = endOfMonth(date);
      } else if (reportType === 'yearly') {
        start = startOfYear(date);
        end = endOfYear(date);
      } else {
        start = new Date(startDate);
        end = new Date(endDate);
      }

      dataToExport = (payments || [])
        .filter(p => isWithinInterval(new Date(p.date), { start, end }))
        .filter(p => paymentMethodFilter === 'all' || (p.method || 'cash') === paymentMethodFilter)
        .map(p => {
          const student = students.find(s => s.id === p.studentId);
          const methodMap: { [key: string]: string } = {
            'cash': 'نقداً',
            'bank': 'بنك',
            'zain_cash': 'زين كاش',
            'other': 'أخرى'
          };
          return {
            'الطالب': student?.name || 'مجهول',
            'المبلغ': p.amount,
            'التاريخ': format(new Date(p.date), 'yyyy-MM-dd'),
            'الطريقة': methodMap[p.method || 'cash'] || 'نقداً',
            'ملاحظات': p.note || ''
          };
        });
    }

    if (dataToExport.length === 0) {
      alert("لا توجد بيانات لتصديرها");
      return;
    }

    const headers = Object.keys(dataToExport[0]);
    const csvContent = [
      '\uFEFF' + headers.join(','), // BOM for Arabic support
      ...dataToExport.map(row => headers.map(header => `"${row[header]}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", fileName);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const grades = useMemo(() => {
    const g = Array.from(new Set(students.map(s => s.grade)));
    return g.sort((a, b) => a.localeCompare(b, 'ar'));
  }, [students]);

  const reportData = useMemo(() => {
    const date = new Date(selectedDate);
    let start: Date, end: Date;

    if (reportType === 'monthly') {
      start = startOfMonth(date);
      end = endOfMonth(date);
    } else if (reportType === 'quarterly') {
      start = subMonths(date, 3);
      end = endOfMonth(date);
    } else if (reportType === 'yearly') {
      start = startOfYear(date);
      end = endOfYear(date);
    } else if (reportType === 'custom') {
      start = new Date(startDate);
      end = new Date(endDate);
    } else if (reportType === 'financialSummary' || reportType === 'studentDebtAnalysis') {
      start = startOfYear(date);
      end = endOfYear(date);
    } else {
      // For student balances, we take all-time or as filtered
      start = new Date(2000, 0, 1);
      end = new Date(2100, 0, 1);
    }

    const filteredStudents = students.filter(s => selectedGrade === 'all' || s.grade === selectedGrade);

    const filteredPayments = (payments || []).filter(p => {
      const isDateMatch = isWithinInterval(new Date(p.date), { start, end });
      const isMethodMatch = paymentMethodFilter === 'all' || (p.method || 'cash') === paymentMethodFilter;
      const student = students.find(s => s.id === p.studentId);
      const isGradeMatch = selectedGrade === 'all' || student?.grade === selectedGrade;
      return isDateMatch && isMethodMatch && isGradeMatch;
    });

    const filteredStaffPayments = (staffPayments || []).filter(p => 
      isWithinInterval(new Date(p.date), { start, end })
    );

    const filteredStaffInvoices = (staffInvoices || []).filter(i => 
      isWithinInterval(new Date(i.date), { start, end })
    );

    const filteredGeneralExpenses = (expenses || []).filter(e => 
      isWithinInterval(new Date(e.date), { start, end })
    );

    const filteredInvestorPayments = (investorPayments || []).filter(p => 
      isWithinInterval(new Date(p.date), { start, end })
    );

    const totalIncome = filteredPayments.reduce((sum, p) => sum + p.amount, 0);
    const totalSalaries = filteredStaffPayments.reduce((sum, p) => sum + p.amount, 0);
    const totalInvoices = filteredStaffInvoices.reduce((sum, i) => sum + i.amount, 0);
    const totalGeneralExpenses = filteredGeneralExpenses.reduce((sum, e) => sum + e.amount, 0);
    const totalInvestorRemittances = filteredInvestorPayments.reduce((sum, p) => sum + p.amount, 0);
    const totalExpenses = totalSalaries + totalInvoices + totalGeneralExpenses + totalInvestorRemittances;

    const studentBalances = filteredStudents.map(s => {
      const studentPaid = (payments || [])
        .filter(p => p.studentId === s.id)
        .reduce((sum, p) => sum + p.amount, 0);
      return {
        ...s,
        paid: studentPaid,
        remaining: s.totalAmount - studentPaid
      };
    }).sort((a, b) => b.remaining - a.remaining);

    // Categories for comprehensive report
    const expenseByCategory: { [key: string]: number } = {
      'الرواتب': totalSalaries,
      'فواتير خارجية': totalInvoices,
      'مسلم للمستثمر': totalInvestorRemittances,
    };

    filteredGeneralExpenses.forEach(e => {
      expenseByCategory[e.category] = (expenseByCategory[e.category] || 0) + e.amount;
    });

    const categoriesData = Object.entries(expenseByCategory).map(([name, value]) => ({
      name,
      value,
      color: '#'+Math.random().toString(16).substr(-6)
    })).filter(c => c.value > 0);

    // Grade Performance Data
    const gradePerformance = grades.map(grade => {
      const studentsInGrade = students.filter(s => s.grade === grade);
      const totalDue = studentsInGrade.reduce((sum, s) => sum + s.totalAmount, 0);
      const totalPaid = studentsInGrade.reduce((sum, s) => {
        return sum + (payments || []).filter(p => p.studentId === s.id).reduce((pSum, p) => pSum + p.amount, 0);
      }, 0);
      return {
        grade,
        totalDue,
        totalPaid,
        totalRemaining: totalDue - totalPaid,
        percentage: totalDue > 0 ? (totalPaid / totalDue) * 100 : 0
      };
    }).sort((a, b) => b.totalRemaining - a.totalRemaining);

    const pieData = categoriesData.length > 0 ? categoriesData : [
      { name: 'الرواتب', value: totalSalaries, color: '#2563eb' },
      { name: 'الفواتير', value: totalInvoices, color: '#dc2626' },
      { name: 'عامة', value: totalGeneralExpenses, color: '#10b981' }
    ];

    return {
      income: totalIncome,
      expenses: totalExpenses,
      salaries: totalSalaries,
      invoices: totalInvoices,
      generalExpenses: totalGeneralExpenses,
      net: totalIncome - totalExpenses,
      paymentCount: filteredPayments.length,
      staffPaymentCount: filteredStaffPayments.length,
      studentBalances,
      pieData,
      expenseByCategory,
      gradePerformance
    };
  }, [reportType, selectedDate, startDate, endDate, payments, staffPayments, staffInvoices, expenses, students, paymentMethodFilter, selectedGrade, grades]);

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm flex flex-wrap items-center justify-between gap-6">
        <div className="flex items-center gap-6">
        <div className="flex bg-gray-100 p-1 rounded-2xl overflow-x-auto max-w-full no-scrollbar shadow-inner border border-gray-200/50">
            {(['monthly', 'quarterly', 'yearly', 'custom', 'studentBalances', 'debtLedger', 'financialSummary', 'studentDebtAnalysis'] as const).map(type => (
              <button
                key={type}
                onClick={() => setReportType(type)}
                className={`px-6 py-2 rounded-xl font-black transition-all shrink-0 whitespace-nowrap ${
                  reportType === type ? 'bg-white text-blue-600 shadow-md transform scale-105' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'
                }`}
              >
                {type === 'monthly' ? 'شهري' : 
                 type === 'quarterly' ? 'فصلي' : 
                 type === 'yearly' ? 'سنوي' : 
                 type === 'studentBalances' ? 'ديون الطلاب' : 
                 type === 'debtLedger' ? 'سجل ذمم الطلاب (الختامي)' :
                 type === 'financialSummary' ? 'ملخص مالي فئوي' :
                 type === 'studentDebtAnalysis' ? 'أداء المديونيات' : 'مخصص'}
              </button>
            ))}
          </div>
          {reportType === 'custom' ? (
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 font-black text-blue-600 outline-none focus:ring-2 focus:ring-blue-100"
              />
              <span className="font-black text-gray-400">إلى</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 font-black text-blue-600 outline-none focus:ring-2 focus:ring-blue-100"
              />
            </div>
          ) : (reportType !== 'studentBalances' && reportType !== 'debtLedger' && reportType !== 'studentDebtAnalysis') && (
            <input
              type={reportType === 'yearly' ? 'number' : 'month'}
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 font-black text-blue-600 outline-none focus:ring-2 focus:ring-blue-100"
            />
          )}
        </div>
        <div className="flex items-center gap-3">
          {(reportType === 'studentBalances' || reportType === 'studentDebtAnalysis' || reportType === 'debtLedger') && (
            <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-2xl px-4 py-2 shadow-sm">
              <Users className="w-4 h-4 text-blue-600" />
              <select
                value={selectedGrade}
                onChange={(e) => setSelectedGrade(e.target.value)}
                className="bg-transparent font-black text-gray-700 outline-none text-sm"
              >
                <option value="all">كل الصفوف</option>
                {grades.map(g => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>
          )}
          {reportType !== 'studentBalances' && reportType !== 'studentDebtAnalysis' && reportType !== 'debtLedger' && (
            <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-2xl px-4 py-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <select
                value={paymentMethodFilter}
                onChange={(e) => setPaymentMethodFilter(e.target.value)}
                className="bg-transparent font-black text-gray-700 outline-none text-sm"
              >
                <option value="all">كل طرق الدفع</option>
                <option value="cash">نقداً</option>
                <option value="bank">تحويل بنكي</option>
                <option value="zain_cash">زين كاش</option>
                <option value="other">أخرى</option>
              </select>
            </div>
          )}
          <button
            onClick={exportToCSV}
            className="bg-emerald-50 text-emerald-600 px-6 py-3 rounded-2xl font-black flex items-center gap-2 hover:bg-emerald-100 border border-emerald-100 transition-all"
          >
            <Download className="w-5 h-5" />
            تصدير CSV
          </button>
          <button
            onClick={() => setShowPreview(true)}
            className="bg-blue-600 text-white px-8 py-3 rounded-2xl font-black flex items-center gap-2 hover:bg-blue-700 shadow-lg shadow-blue-100"
          >
            <Eye className="w-5 h-5" />
            معاينة وطباعة
          </button>
        </div>
      </div>

      {reportType !== 'studentBalances' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-emerald-50 p-8 rounded-3xl border border-emerald-100">
            <div className="flex items-center gap-4 mb-4">
              <div className="bg-emerald-600 p-3 rounded-2xl text-white">
                <TrendingUp className="w-6 h-6" />
              </div>
              <h4 className="font-black text-emerald-900">إجمالي الإيرادات</h4>
            </div>
            <p className="text-3xl font-black text-emerald-700">{formatCurrency(reportData.income)}</p>
            <p className="text-xs text-emerald-600 mt-2 font-bold">{reportData.paymentCount} دفعة مستلمة</p>
          </div>

          <div className="bg-red-50 p-8 rounded-3xl border border-red-100">
            <div className="flex items-center gap-4 mb-4">
              <div className="bg-red-600 p-3 rounded-2xl text-white">
                <TrendingDown className="w-6 h-6" />
              </div>
              <h4 className="font-black text-red-900">إجمالي المصاريف</h4>
            </div>
            <p className="text-3xl font-black text-red-700">{formatCurrency(reportData.expenses)}</p>
            <div className="flex flex-wrap gap-4 mt-2">
               <p className="text-xs text-red-600 font-bold">الرواتب: {formatCurrency(reportData.salaries)}</p>
               <p className="text-xs text-red-600 font-bold">الفواتير: {formatCurrency(reportData.invoices)}</p>
               <p className="text-xs text-red-600 font-bold">المسلم للمستثمر: {formatCurrency((reportData.pieData || []).find(d => d.name === 'مسلم للمستثمر')?.value || 0)}</p>
               <p className="text-xs text-red-600 font-bold">عامة: {formatCurrency(reportData.generalExpenses)}</p>
            </div>
          </div>

          <div className={`p-8 rounded-3xl border ${reportData.net >= 0 ? 'bg-blue-50 border-blue-100' : 'bg-orange-50 border-orange-100'}`}>
            <div className="flex items-center gap-4 mb-4">
              <div className={`${reportData.net >= 0 ? 'bg-blue-600' : 'bg-orange-600'} p-3 rounded-2xl text-white`}>
                <FileText className="w-6 h-6" />
              </div>
              <h4 className={`font-black ${reportData.net >= 0 ? 'text-blue-900' : 'text-orange-900'}`}>صافي الربح</h4>
            </div>
            <p className={`text-3xl font-black ${reportData.net >= 0 ? 'text-blue-700' : 'text-orange-700'}`}>{formatCurrency(reportData.net)}</p>
          </div>
        </div>
      )}

      {reportType !== 'studentBalances' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
            <h4 className="text-xl font-black mb-8 flex items-center gap-2">
              <PieChartIcon className="text-blue-600 w-6 h-6" />
              توزيع المصاريف
            </h4>
            <div className="h-[300px] w-full relative">
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                <PieChart>
                  <Pie
                    data={reportData.pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {(reportData.pieData || []).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip 
                    contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontWeight: 'bold'}}
                  />
                  <Legend verticalAlign="bottom" height={36}/>
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
             <h4 className="text-xl font-black mb-8 flex items-center gap-2">
              <TrendingUp className="text-emerald-600 w-6 h-6" />
              ملخص مالي سريع
            </h4>
            <div className="space-y-6">
               <div className="flex justify-between items-center bg-gray-50 p-4 rounded-2xl">
                 <span className="font-bold text-gray-500">إجمالي السيولة (الدخل)</span>
                 <span className="text-xl font-black text-emerald-600">{formatCurrency(reportData.income)}</span>
               </div>
               <div className="flex justify-between items-center bg-gray-50 p-4 rounded-2xl">
                 <span className="font-bold text-gray-500">إجمالي الالتزامات (المصاريف)</span>
                 <span className="text-xl font-black text-red-600">{formatCurrency(reportData.expenses)}</span>
               </div>
               <div className="flex justify-between items-center bg-blue-600 p-6 rounded-2xl text-white shadow-xl shadow-blue-100">
                 <span className="text-lg font-black italic underline-offset-8 underline decoration-blue-300">الربح الصافي للفترة</span>
                 <span className="text-2xl font-black">{formatCurrency(reportData.net)}</span>
               </div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        {/* Preview Modal */}
        {showPreview && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-5xl rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[95vh] border border-white/20">
              <div className="p-8 border-b border-gray-100 flex items-center justify-between bg-white sticky top-0 z-10">
                <div className="flex items-center gap-4">
                  <div className="bg-blue-50 p-3 rounded-2xl text-blue-600">
                    <Printer className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-gray-900">
                      {reportType === 'debtLedger' ? 'معاينة سجل الديون الختامي' : 'معاينة التقرير النهائي'}
                    </h3>
                    <p className="text-gray-500 font-bold">يمكنك المراجعة النهائية قبل بدء عملية الطباعة</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handlePrint()}
                    className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-black shadow-xl shadow-blue-900/20 hover:bg-blue-700 transition-all flex items-center gap-3"
                  >
                    <Printer className="w-5 h-5" />
                    تأكيد الطباعة
                  </button>
                  <button 
                    onClick={() => setShowPreview(false)} 
                    className="p-4 hover:bg-gray-100 rounded-2xl transition-all text-gray-400"
                  >
                    <X className="w-7 h-7" />
                  </button>
                </div>
              </div>
              
              <div className="p-12 overflow-y-auto bg-gray-50/50 flex justify-center">
                <div className="bg-white p-12 shadow-2xl rounded-sm shadow-slate-200/50 border border-gray-100" style={{ width: '210mm', minHeight: '297mm' }}>
                  <div ref={reportRef} className="p-4 text-right" dir="rtl">
                    <div className="text-center mb-12 border-b-4 border-blue-900 pb-8">
                      <h2 className="text-4xl font-black text-blue-950 mb-2">{school.name}</h2>
                      <h3 className="text-2xl font-black text-blue-700">
                      {reportType === 'studentBalances' ? 'تقرير مديونية الطلاب الإجمالي' : 
                       reportType === 'debtLedger' ? 'سجل تبرئة ذمة الطلاب (الختامي)' :
                       reportType === 'financialSummary' ? 'التقرير المالي الشامل المبوب' :
                         reportType === 'studentDebtAnalysis' ? 'تقرير تحليل أداء المديونيات حسب الصفوف' :
                         `تقرير مالي ${reportType === 'monthly' ? 'شهري' : reportType === 'quarterly' ? 'فصلي' : reportType === 'yearly' ? 'سنوي' : 'مخصص'}`}
                      </h3>
                      <p className="text-gray-400 font-bold mt-2">الفصل الدراسي الحالي • {format(new Date(), 'yyyy')}</p>
                      {selectedGrade !== 'all' && (
                        <p className="text-blue-600 font-black mt-2 bg-blue-50 inline-block px-6 py-1 rounded-full border border-blue-100">الصف: {selectedGrade}</p>
                      )}
                    </div>

                    {reportType === 'debtLedger' ? (
                      <div className="space-y-12">
                        {Object.entries(
                          reportData.studentBalances.reduce((acc, s) => {
                            if (s.remaining <= 0) return acc;
                            if (!acc[s.grade]) acc[s.grade] = [];
                            acc[s.grade].push(s);
                            return acc;
                          }, {} as { [key: string]: typeof reportData.studentBalances })
                        ).sort((a, b) => a[0].localeCompare(b[0], 'ar')).map(([grade, gradeStudents]) => (
                          <div key={grade} style={{ pageBreakAfter: 'always' }} className="mb-12">
                            <div className="flex justify-between items-end mb-6 border-b-4 border-gray-900 pb-2">
                              <h3 className="text-2xl font-black">
                                سجل ديون الصف: {grade}
                              </h3>
                              <p className="font-bold text-gray-500">عدد الطلاب المسجلين: {gradeStudents.length}</p>
                            </div>
                            <table className="w-full border-collapse border-2 border-gray-900">
                              <thead>
                                <tr className="bg-gray-100">
                                  <th className="px-2 py-4 text-sm font-black border-2 border-gray-900 text-center w-12">ت</th>
                                  <th className="px-4 py-4 text-sm font-black border-2 border-gray-900 text-center text-xs">اسم الطالب</th>
                                  <th className="px-4 py-4 text-sm font-black border-2 border-gray-900 text-center text-xs">الصف</th>
                                  <th className="px-1 py-4 text-sm font-black border-2 border-gray-900 text-center w-24">المبلغ الكلي</th>
                                  <th className="px-1 py-4 text-sm font-black border-2 border-gray-900 text-center w-24">المسدد (الواصل)</th>
                                  <th className="px-1 py-4 text-sm font-black border-2 border-gray-900 text-center w-24">المتبقي (الذمة)</th>
                                  <th className="px-4 py-4 text-sm font-black border-2 border-gray-900 text-center">التوقيع والملاحظات</th>
                                </tr>
                              </thead>
                              <tbody>
                                {gradeStudents.sort((a, b) => a.name.localeCompare(b.name, 'ar')).map((s, idx) => (
                                  <tr key={s.id} className="h-14">
                                    <td className="px-2 py-2 text-sm font-bold border-2 border-gray-900 text-center">{idx + 1}</td>
                                    <td className="px-4 py-2 text-sm font-black border-2 border-gray-900">{s.name}</td>
                                    <td className="px-4 py-2 text-sm font-bold border-2 border-gray-900 text-center">{s.grade}</td>
                                    <td className="px-1 py-2 text-[11px] font-bold border-2 border-gray-900 text-center">{formatCurrency(s.totalAmount)}</td>
                                    <td className="px-1 py-2 text-[11px] font-bold border-2 border-gray-900 text-center text-emerald-600">{formatCurrency(s.paid)}</td>
                                    <td className="px-1 py-2 text-[11px] font-black border-2 border-gray-900 text-center text-red-600">{formatCurrency(s.remaining)}</td>
                                    <td className="px-4 py-2 text-sm font-bold border-2 border-gray-900 text-right">
                                      {s.remaining > 0 ? (
                                        <div className="flex flex-col gap-1">
                                          <span className="text-[10px] text-gray-400">......................................................</span>
                                          <span className="text-[10px] text-gray-400 italic">بذمة ولي الأمر / التعهد بالسداد</span>
                                        </div>
                                      ) : (
                                        <span className="text-emerald-600 font-bold text-xs">تم التسديد كاملاً</span>
                                      )}
                                    </td>
                                  </tr>
                                ))}
                                {/* Empty rows to fill the ledger look and ensure space for manual entry if needed */}
                                {[...Array(Math.max(0, 3))].map((_, i) => (
                                  <tr key={`empty-${i}`} className="h-14">
                                    <td className="border-2 border-gray-900 text-center text-gray-300 font-bold">{gradeStudents.length + i + 1}</td>
                                    <td className="border-2 border-gray-900 space-x-2"></td>
                                    <td className="border-2 border-gray-900"></td>
                                    <td className="border-2 border-gray-900"></td>
                                    <td className="border-2 border-gray-900"></td>
                                    <td className="border-2 border-gray-900"></td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                            <div className="mt-8 flex justify-between px-12">
                               <div className="text-center">
                                  <p className="font-black text-sm mb-12">توقيع مدقق الحسابات</p>
                                  <div className="w-48 border-b-2 border-gray-900 mx-auto"></div>
                               </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : reportType === 'studentDebtAnalysis' ? (
                      <div className="space-y-12">
                        <table className="w-full border-collapse">
                          <thead>
                            <tr className="bg-gray-900 text-white">
                              <th className="px-4 py-4 text-sm font-black border text-center">الصف الدراسي</th>
                              <th className="px-4 py-4 text-sm font-black border text-center">إجمالي المستحقات</th>
                              <th className="px-4 py-4 text-sm font-black border text-center">المبالغ المحصلة</th>
                              <th className="px-4 py-4 text-sm font-black border text-center">المبالغ المتبقية</th>
                              <th className="px-4 py-4 text-sm font-black border text-center">نسبة التحصيل</th>
                            </tr>
                          </thead>
                          <tbody>
                            {reportData.gradePerformance.map((item, idx) => (
                              <tr key={idx} className="border-b hover:bg-gray-50">
                                <td className="px-4 py-4 text-sm font-black border text-center bg-gray-50">{item.grade}</td>
                                <td className="px-4 py-4 text-sm font-bold border text-center">{formatCurrency(item.totalDue)}</td>
                                <td className="px-4 py-4 text-sm font-bold border text-center text-emerald-600">{formatCurrency(item.totalPaid)}</td>
                                <td className="px-4 py-4 text-sm font-black border text-center text-red-600">{formatCurrency(item.totalRemaining)}</td>
                                <td className="px-4 py-4 text-sm font-black border text-center underline decoration-blue-300 decoration-2">
                                  {item.percentage.toFixed(1)}%
                                </td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot>
                            <tr className="bg-gray-100 font-black">
                              <td className="px-4 py-6 border text-right">الإجمالي العام</td>
                              <td className="px-4 py-6 border text-center">{formatCurrency(reportData.gradePerformance.reduce((a, b) => a + b.totalDue, 0))}</td>
                              <td className="px-4 py-6 border text-center text-emerald-600">{formatCurrency(reportData.gradePerformance.reduce((a, b) => a + b.totalPaid, 0))}</td>
                              <td className="px-4 py-6 border text-center text-red-600">{formatCurrency(reportData.gradePerformance.reduce((a, b) => a + b.totalRemaining, 0))}</td>
                              <td className="px-4 py-6 border text-center text-blue-600">
                                {((reportData.gradePerformance.reduce((a, b) => a + b.totalPaid, 0) / reportData.gradePerformance.reduce((a, b) => a + b.totalDue, 0)) * 100).toFixed(1)}%
                              </td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    ) : reportType === 'financialSummary' ? (
                      <div className="space-y-12">
                        <div className="grid grid-cols-2 gap-8">
                          <div className="space-y-4">
                            <h4 className="text-xl font-black bg-emerald-600 text-white p-3 rounded-xl flex items-center gap-2">
                              <TrendingUp className="w-5 h-5" />
                              تحليل الإيرادات
                            </h4>
                            <div className="border rounded-2xl overflow-hidden">
                              <table className="w-full">
                                <thead>
                                  <tr className="bg-gray-50 border-b">
                                    <th className="p-4 text-right">الفئة</th>
                                    <th className="p-4 text-center">المبلغ</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  <tr className="border-b">
                                    <td className="p-4 font-bold">أقساط الطلاب</td>
                                    <td className="p-4 text-center font-black text-emerald-600">{formatCurrency(reportData.income)}</td>
                                  </tr>
                                </tbody>
                                <tfoot>
                                  <tr className="bg-gray-900 text-white font-black">
                                    <td className="p-4 text-right text-lg">إجمالي الدخل</td>
                                    <td className="p-4 text-center text-xl">{formatCurrency(reportData.income)}</td>
                                  </tr>
                                </tfoot>
                              </table>
                            </div>
                          </div>

                          <div className="space-y-4">
                            <h4 className="text-xl font-black bg-red-600 text-white p-3 rounded-xl flex items-center gap-2">
                              <TrendingDown className="w-5 h-5" />
                              تحليل المصروفات فئوياً
                            </h4>
                            <div className="border rounded-2xl overflow-hidden">
                              <table className="w-full">
                                <thead>
                                  <tr className="bg-gray-50 border-b">
                                    <th className="p-4 text-right">الفئة</th>
                                    <th className="p-4 text-center">المبلغ</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {Object.entries(reportData.expenseByCategory).map(([name, value], idx) => (
                                    <tr key={idx} className="border-b">
                                      <td className="p-4 font-bold">{name}</td>
                                      <td className="p-4 text-center font-black text-red-600">{formatCurrency(value)}</td>
                                    </tr>
                                  ))}
                                </tbody>
                                <tfoot>
                                  <tr className="bg-gray-900 text-white font-black">
                                    <td className="p-4 text-right text-lg">إجمالي المصاريف</td>
                                    <td className="p-4 text-center text-xl">{formatCurrency(reportData.expenses)}</td>
                                  </tr>
                                </tfoot>
                              </table>
                            </div>
                          </div>
                        </div>

                        <div className="bg-blue-600 p-8 rounded-3xl text-white text-center shadow-2xl shadow-blue-200">
                          <p className="text-xl font-bold mb-2 opacity-80">صافي التدفق المالي للفترة</p>
                          <p className="text-5xl font-black">{formatCurrency(reportData.net)}</p>
                        </div>

                        {investorPayments && investorPayments.length > 0 && (
                          <div className="space-y-4 mt-8">
                            <h4 className="text-xl font-black bg-blue-900 text-white p-3 rounded-xl flex items-center gap-2">
                              <TrendingDown className="w-5 h-5 text-red-100" />
                              سجل المسلم للمستثمرين (حسب الموثق إلكترونياً)
                            </h4>
                            <div className="border border-gray-200 rounded-2xl overflow-hidden bg-white">
                              <table className="w-full">
                                <thead>
                                  <tr className="bg-gray-50 border-b">
                                    <th className="p-3 text-right text-xs">التاريخ</th>
                                    <th className="p-3 text-right text-xs">المستلم</th>
                                    <th className="p-3 text-right text-xs">البيان</th>
                                    <th className="p-3 text-center text-xs">المبلغ</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {investorPayments
                                    .filter(p => {
                                      const date = new Date(selectedDate);
                                      // Since we are in financialSummary mode, we show all payments by default 
                                      // OR we could respect the selectedDate month if we wanted.
                                      // The user requested "by month, term, year" so let's default to current year
                                      // or just show all but organized.
                                      const start = startOfYear(date);
                                      const end = endOfYear(date);
                                      return isWithinInterval(new Date(p.date), { start, end });
                                    })
                                    .map((p, idx) => (
                                    <tr key={idx} className="border-b">
                                      <td className="p-3 text-xs font-bold">{format(new Date(p.date), 'yyyy/MM/dd')}</td>
                                      <td className="p-3 text-xs">{p.recipientName}</td>
                                      <td className="p-3 text-xs text-gray-500">{p.notes || `دفعة شهر ${p.month}`}</td>
                                      <td className="p-3 text-center font-black text-red-600 text-xs">{formatCurrency(p.amount)}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : reportType === 'studentBalances' ? (
                      <div className="space-y-12">
                        {Object.entries(
                          reportData.studentBalances.reduce((acc, s) => {
                            if (!acc[s.grade]) acc[s.grade] = [];
                            acc[s.grade].push(s);
                            return acc;
                          }, {} as { [key: string]: typeof reportData.studentBalances })
                        ).sort((a, b) => a[0].localeCompare(b[0], 'ar')).map(([grade, gradeStudents]) => (
                          <div key={grade} style={{ pageBreakAfter: 'always' }} className="mb-12">
                            <h3 className="text-xl font-black bg-blue-600 text-white p-4 rounded-xl mb-4 border-r-8 border-blue-900 flex justify-between items-center">
                              <span>الصف: {grade}</span>
                              <span className="text-sm opacity-80">{gradeStudents.length} طالب</span>
                            </h3>
                            <table className="w-full border-collapse border border-blue-200">
                              <thead>
                                <tr className="bg-blue-50 border-b-2 border-blue-600">
                                  <th className="px-4 py-3 text-sm font-black border text-blue-900">ت</th>
                                  <th className="px-4 py-3 text-sm font-black border text-right text-blue-900">اسم الطالب</th>
                                  <th className="px-4 py-3 text-sm font-black border text-center text-blue-900">المبلغ الكلي</th>
                                  <th className="px-4 py-3 text-sm font-black border text-center text-blue-900">المدفوع</th>
                                  <th className="px-4 py-3 text-sm font-black border text-center text-blue-900">المتبقي</th>
                                </tr>
                              </thead>
                              <tbody>
                                {gradeStudents.sort((a, b) => a.name.localeCompare(b.name, 'ar')).map((s, idx) => (
                                  <tr key={s.id} className="border-b hover:bg-blue-50/30">
                                    <td className="px-4 py-3 text-sm font-bold border text-center text-gray-400">{idx + 1}</td>
                                    <td className="px-4 py-3 text-sm font-black border text-gray-700">{s.name}</td>
                                    <td className="px-4 py-3 text-sm font-bold border text-center">{formatCurrency(s.totalAmount)}</td>
                                    <td className="px-4 py-3 text-sm font-bold border text-center text-emerald-600">{formatCurrency(s.paid)}</td>
                                    <td className="px-4 py-3 text-sm font-black border text-center text-red-600 bg-red-50/20">{formatCurrency(s.remaining)}</td>
                                  </tr>
                                ))}
                              </tbody>
                              <tfoot>
                                <tr className="bg-blue-50 font-black">
                                  <td colSpan={4} className="p-3 text-left border border-blue-200 text-blue-900">مجموع ديون الصف:</td>
                                  <td className="p-3 text-center border border-blue-200 text-red-600 bg-red-50">
                                    {formatCurrency(gradeStudents.reduce((sum, s) => sum + s.remaining, 0))}
                                  </td>
                                </tr>
                              </tfoot>
                            </table>
                          </div>
                        ))}
                        
                        <div className="mt-12 bg-gray-50 p-8 rounded-2xl border-2 border-gray-900 flex justify-between items-center">
                           <span className="text-xl font-black">إجمالي الديون المتبقية على جميع الطلاب</span>
                           <span className="text-3xl font-black text-red-600">
                              {formatCurrency(reportData.studentBalances.reduce((sum, s) => sum + s.remaining, 0))}
                           </span>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="grid grid-cols-2 gap-12 mb-12">
                          <div className="space-y-6">
                            <h4 className="text-xl font-black border-b border-gray-200 pb-2 flex items-center gap-2">
                              <TrendingUp className="w-5 h-5 text-emerald-600" />
                              تفاصيل الإيرادات
                            </h4>
                            <div className="flex justify-between font-bold">
                              <span>أقساط الطلاب</span>
                              <span>{formatCurrency(reportData.income)}</span>
                            </div>
                            <div className="flex justify-between font-black text-lg pt-4 border-t border-gray-900">
                              <span>إجمالي الإيرادات</span>
                              <span>{formatCurrency(reportData.income)}</span>
                            </div>
                          </div>

                          <div className="space-y-6">
                            <h4 className="text-xl font-black border-b border-gray-200 pb-2 flex items-center gap-2">
                              <TrendingDown className="w-5 h-5 text-red-600" />
                              تفاصيل المصاريف
                            </h4>
                            <div className="flex justify-between font-bold">
                              <span>رواتب الموظفين</span>
                              <span>{formatCurrency(reportData.salaries)}</span>
                            </div>
                            <div className="flex justify-between font-bold">
                              <span>فواتير ومشتريات</span>
                              <span>{formatCurrency(reportData.invoices)}</span>
                            </div>
                            <div className="flex justify-between font-bold">
                              <span>مصروفات عامة</span>
                              <span>{formatCurrency(reportData.generalExpenses)}</span>
                            </div>
                            <div className="flex justify-between font-bold text-red-600">
                              <span>مسلم للمستثمر (ارباح)</span>
                              <span>{formatCurrency(reportData.pieData.find(d => d.name === 'مسلم للمستثمر')?.value || 0)}</span>
                            </div>
                            <div className="flex justify-between font-black text-lg pt-4 border-t border-gray-900">
                              <span>إجمالي المصاريف</span>
                              <span>{formatCurrency(reportData.expenses)}</span>
                            </div>
                          </div>
                        </div>

                        <div className="bg-gray-900 text-white p-8 rounded-2xl flex justify-between items-center">
                          <span className="text-2xl font-black">صافي الربح النهائي للفترة</span>
                          <span className="text-4xl font-black">{formatCurrency(reportData.net)}</span>
                        </div>
                      </>
                    )}

                    <div className="mt-24 flex justify-between">
                      <div className="text-center">
                        <div className="w-48 border-b-2 border-gray-900 mb-2"></div>
                        <p className="font-black">توقيع المدير</p>
                      </div>
                      <div className="text-center">
                        <div className="w-48 border-b-2 border-gray-900 mb-2"></div>
                        <p className="font-black">توقيع المحاسب</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="p-12 text-center opacity-50 bg-gray-50">
           <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
           <p className="text-gray-500 font-bold">انقر على "معاينة وطباعة" لمشاهدة التقرير الكامل بصيغة قابلة للطباعة</p>
        </div>
      </div>
    </div>
  );
}

