import { useMemo, useState, useRef } from 'react';
import { School, Student, Payment } from '../types';
import { WhatsAppService } from '../services/WhatsAppService';
import { 
  AlertCircle, 
  Phone, 
  MessageSquare, 
  User, 
  DollarSign,
  Search,
  Filter,
  Send,
  X,
  Copy,
  Check,
  Printer,
  Clock,
  AlertTriangle,
  History
} from 'lucide-react';
import { formatCurrency } from '../lib/utils';
import { useReactToPrint } from 'react-to-print';
import { format, differenceInDays } from 'date-fns';

interface UnpaidListProps {
  school: School;
  students: Student[];
  payments: Payment[];
}

export default function UnpaidList({ school, students, payments }: UnpaidListProps) {
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkMessage, setBulkMessage] = useState('');
  const [copied, setCopied] = useState(false);
  const [sentIds, setSentIds] = useState<string[]>([]);
  const [filterPaidThisMonth, setFilterPaidThisMonth] = useState(true);
  const [severityFilter, setSeverityFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all');
  const [showPreview, setShowPreview] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({ 
    contentRef: reportRef,
    onAfterPrint: () => setShowPreview(false)
  });

  const unpaidStudents = useMemo(() => {
    const now = new Date();
    const currentMonth = format(now, 'yyyy-MM');

    return students.map(student => {
      const studentPayments = payments.filter(p => p.studentId === student.id);
      const totalPaid = studentPayments.reduce((sum, p) => sum + p.amount, 0);
      const remaining = student.totalAmount - totalPaid;
      
      const sortedPayments = [...studentPayments].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      const lastPayment = sortedPayments[0];
      
      const paidThisMonth = studentPayments.some(p => format(new Date(p.date), 'yyyy-MM') === currentMonth);
      
      // Calculate Severity
      const lastPayDate = lastPayment ? new Date(lastPayment.date) : new Date(student.createdAt);
      const daysSincePayment = differenceInDays(now, lastPayDate);
      
      let severity: 'high' | 'medium' | 'low' = 'low';
      let statusLabel = 'قيد المتابعة';
      
      if (daysSincePayment > 60 || remaining > (student.totalAmount * 0.7)) {
        severity = 'high';
        statusLabel = 'تأخير حرج';
      } else if (daysSincePayment > 30) {
        severity = 'medium';
        statusLabel = 'متأخر';
      } else if (paidThisMonth) {
        severity = 'low';
        statusLabel = 'مسدد جزئي';
      }

      return { 
        ...student, 
        totalPaid, 
        remaining,
        lastPaymentAmount: lastPayment ? lastPayment.amount : 0,
        lastPaymentDate: lastPayment ? format(new Date(lastPayment.date), 'yyyy-MM-dd') : 'لا يوجد',
        paidThisMonth,
        daysSincePayment,
        severity,
        statusLabel
      };
    }).filter(s => s.remaining > 0)
      .filter(s => filterPaidThisMonth ? !s.paidThisMonth : true)
      .filter(s => severityFilter === 'all' ? true : s.severity === severityFilter)
      .sort((a, b) => {
        // First sort by grade (Class)
        const gradeCompare = a.grade.localeCompare(b.grade, 'ar');
        if (gradeCompare !== 0) return gradeCompare;
        // Then sort by name alphabetically
        return a.name.localeCompare(b.name, 'ar');
      });
  }, [students, payments, filterPaidThisMonth]);

  const groupedByGrade = useMemo(() => {
    const groups: { [key: string]: typeof unpaidStudents } = {};
    unpaidStudents.forEach(student => {
      if (!groups[student.grade]) groups[student.grade] = [];
      groups[student.grade].push(student);
    });
    
    // Sort students alphabetically within each grade
    Object.keys(groups).forEach(grade => {
      groups[grade].sort((a, b) => a.name.localeCompare(b.name, 'ar'));
    });
    
    return groups;
  }, [unpaidStudents]);

  const totalUnpaid = unpaidStudents.reduce((sum, s) => sum + s.remaining, 0);
  const highRiskCount = unpaidStudents.filter(s => s.severity === 'high').length;

  const defaultMessageTemplate = `*🚨 تنبيه هام بخصوص المتأخرات - مدرسة ${school.name}*

عزيزي ولي أمر الطالب: {name}
نود تذكيركم بموقف الحساب الخاص بالطالب:

- القسط الكلي: {total}
- إجمالي الواصل: {paid_total}
- المبلغ المتبقي: {remain}

يرجى مراجعة قسم الحسابات لتسوية المتبقي لضمان استمرار الخدمات التعليمية.
شكراً لتفهمكم.`;

  const sendWhatsAppReminder = (student: typeof unpaidStudents[0], customMessage?: string) => {
    WhatsAppService.sendNotification(
      school.id,
      student.id,
      'reminder',
      { 
        remain: formatCurrency(student.remaining),
        total: formatCurrency(student.totalAmount),
        paid_total: formatCurrency(student.totalPaid),
        last_amount: formatCurrency(student.lastPaymentAmount),
        last_date: student.lastPaymentDate
      },
      customMessage
    ).then(res => {
      if (res && res.mode === 'manual' && res.url) {
        window.open(res.url, '_blank');
      } else if (res && res.success) {
        // Option to show success toast
      }
    });
    
    if (!sentIds.includes(student.id)) {
      setSentIds(prev => [...prev, student.id]);
    }
  };

  const copyAllNumbers = () => {
    const numbers = unpaidStudents.map(s => WhatsAppService.formatPhone(s.phone)).join('\n');
    navigator.clipboard.writeText(numbers);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const sendNext = () => {
    const nextStudent = unpaidStudents.find(s => !sentIds.includes(s.id));
    if (nextStudent) {
      sendWhatsAppReminder(nextStudent, bulkMessage);
    }
  };

  return (
    <div className="space-y-8">
      <div className="bg-orange-50 p-8 rounded-3xl border border-orange-100 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div className="bg-orange-600 p-4 rounded-2xl text-white">
            <AlertCircle className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-2xl font-black text-orange-900">إجمالي المبالغ غير المسددة</h3>
            <div className="flex items-center gap-4 mt-1">
               <p className="text-orange-700 font-bold">لعدد {unpaidStudents.length} طالب</p>
               <div className="flex gap-2">
                 <button 
                    onClick={() => setFilterPaidThisMonth(!filterPaidThisMonth)}
                    className={`text-[10px] px-3 py-1.5 rounded-full font-black transition-all ${
                      filterPaidThisMonth 
                      ? 'bg-orange-600 text-white shadow-sm' 
                      : 'bg-white text-orange-600 border border-orange-200'
                    }`}
                 >
                    {filterPaidThisMonth ? 'من لم يسدد هذا الشهر' : 'جميع المديونين'}
                 </button>
                 <select
                    value={severityFilter}
                    onChange={(e) => setSeverityFilter(e.target.value as any)}
                    className="text-[10px] bg-white border border-orange-200 text-orange-600 px-3 py-1.5 rounded-full font-black outline-none"
                 >
                    <option value="all">كل الحالات</option>
                    <option value="high">تأخير حرج ({unpaidStudents.filter(s => s.severity === 'high').length})</option>
                    <option value="medium">متأخرين ({unpaidStudents.filter(s => s.severity === 'medium').length})</option>
                 </select>
               </div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-left ml-8">
            <p className="text-4xl font-black text-orange-600">{formatCurrency(totalUnpaid)}</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowPreview(true)}
              className="flex items-center gap-2 bg-white text-gray-900 border border-gray-200 px-6 py-3 rounded-2xl font-black hover:bg-gray-50 shadow-sm transition-all"
            >
              <Printer className="w-5 h-5" />
              معاينة التقرير
            </button>
            <button
              onClick={() => {
                setBulkMessage(bulkMessage || defaultMessageTemplate);
                setShowBulkModal(true);
              }}
              className="flex items-center gap-2 bg-orange-600 text-white px-6 py-3 rounded-2xl font-black hover:bg-orange-700 shadow-lg shadow-orange-100 transition-all"
            >
              <Send className="w-5 h-5" />
              إرسال تذكير جماعي
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-right" dir="rtl">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="px-8 py-6 font-black text-gray-900">الطالب والصف</th>
              <th className="px-8 py-6 font-black text-gray-900">حالة التأخير</th>
              <th className="px-8 py-6 font-black text-gray-900">المبلغ الكلي</th>
              <th className="px-8 py-6 font-black text-gray-900">المسدد</th>
              <th className="px-8 py-6 font-black text-gray-900 text-orange-600">المتبقي</th>
              <th className="px-8 py-6 font-black text-gray-900 text-center">الإجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {unpaidStudents.map(student => (
              <tr key={student.id} className="hover:bg-gray-50/50 transition-colors group">
                <td className="px-8 py-6">
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-2xl ${
                      student.severity === 'high' ? 'bg-red-50 text-red-600' : 
                      student.severity === 'medium' ? 'bg-orange-50 text-orange-600' :
                      'bg-blue-50 text-blue-600'
                    }`}>
                      <User className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-black text-gray-900">{student.name}</p>
                      <p className="text-xs text-gray-500 font-bold">{student.grade} • {WhatsAppService.formatPhone(student.phone)}</p>
                    </div>
                  </div>
                </td>
                <td className="px-8 py-6">
                  <div className="flex items-center gap-2">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                      student.severity === 'high' ? 'bg-red-100 text-red-700' :
                      student.severity === 'medium' ? 'bg-orange-100 text-orange-700' :
                      'bg-emerald-100 text-emerald-700'
                    }`}>
                      {student.statusLabel}
                    </span>
                    <span className="text-[10px] text-gray-400 font-bold flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      منذ {student.daysSincePayment} يوم
                    </span>
                  </div>
                </td>
                <td className="px-8 py-6 font-bold">{formatCurrency(student.totalAmount)}</td>
                <td className="px-8 py-6 font-bold text-emerald-600">{formatCurrency(student.totalPaid)}</td>
                <td className="px-8 py-6 font-black text-orange-600">{formatCurrency(student.remaining)}</td>
                <td className="px-8 py-6">
                  <div className="flex gap-2">
                    <button
                      onClick={() => sendWhatsAppReminder(student)}
                      className="flex items-center gap-2 bg-emerald-50 text-emerald-600 px-4 py-2 rounded-xl hover:bg-emerald-100 font-black transition-all"
                    >
                      <MessageSquare className="w-4 h-4" />
                      تذكير واتساب
                    </button>
                    <a
                      href={`tel:${student.phone}`}
                      className="p-2 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition-all"
                    >
                      <Phone className="w-5 h-5" />
                    </a>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {unpaidStudents.length === 0 && (
          <div className="text-center py-24 text-gray-400">
            <AlertCircle className="w-16 h-16 mx-auto mb-4 opacity-20" />
            <p className="text-xl font-bold">لا يوجد طلاب بذمتهم مبالغ غير مسددة</p>
          </div>
        )}
      </div>

      {showBulkModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50">
              <div className="flex items-center gap-3">
                <div className="bg-orange-100 p-2 rounded-xl text-orange-600">
                  <Send className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-black text-gray-900">إرسال تذكير جماعي</h3>
              </div>
              <button onClick={() => setShowBulkModal(false)} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-8 overflow-y-auto flex-1 space-y-6">
              <div className="bg-orange-50 p-6 rounded-3xl border border-orange-100">
                <div className="flex justify-between items-center mb-4">
                  <p className="text-sm font-black text-orange-900">حالة الإرسال</p>
                  <div className="flex items-center gap-4">
                    <button 
                      onClick={() => setSentIds([])}
                      className="text-[10px] font-black text-orange-600 hover:underline"
                    >
                      إعادة ضبط
                    </button>
                    <p className="text-sm font-black text-orange-600">{sentIds.length} من {unpaidStudents.length}</p>
                  </div>
                </div>
                <div className="w-full bg-orange-200 h-3 rounded-full overflow-hidden mb-4">
                  <div 
                    className="bg-orange-600 h-full transition-all duration-500" 
                    style={{ width: `${(sentIds.length / unpaidStudents.length) * 100}%` }}
                  ></div>
                </div>
                {sentIds.length < unpaidStudents.length && (
                  <button
                    onClick={sendNext}
                    className="w-full bg-orange-600 text-white py-3 rounded-xl font-black text-sm hover:bg-orange-700 shadow-md transition-all flex items-center justify-center gap-2"
                  >
                    <Send className="w-4 h-4" />
                    إرسال التالي
                  </button>
                )}
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <label className="block text-sm font-black text-gray-700">نص الرسالة المشتركة</label>
                  <div className="flex gap-2">
                    <span className="text-[10px] bg-gray-100 px-2 py-1 rounded-lg text-gray-500 font-bold">{"{name}"} : اسم الطالب</span>
                    <span className="text-[10px] bg-gray-100 px-2 py-1 rounded-lg text-gray-500 font-bold">{"{amount}"} : المبلغ</span>
                  </div>
                </div>
                <textarea
                  value={bulkMessage}
                  onChange={(e) => setBulkMessage(e.target.value)}
                  className="w-full border border-gray-200 rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-orange-500 font-bold text-sm min-h-[120px]"
                  placeholder="اكتب رسالة التذكير هنا..."
                />
              </div>

              <div className="flex items-center justify-between bg-blue-50 p-4 rounded-2xl">
                <div>
                  <p className="text-sm font-black text-blue-900">نسخ جميع الأرقام</p>
                  <p className="text-xs text-blue-600 font-bold">لإضافتهم في قائمة رسائل جماعية (Broadcast)</p>
                </div>
                <button
                  onClick={copyAllNumbers}
                  className="flex items-center gap-2 bg-white text-blue-600 px-4 py-2 rounded-xl font-black shadow-sm hover:shadow-md transition-all border border-blue-100"
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copied ? 'تم النسخ' : 'نسخ الأرقام'}
                </button>
              </div>

              <div className="space-y-3">
                <h4 className="text-sm font-black text-gray-700 flex items-center justify-between sticky top-0 bg-white py-2 z-10">
                  قائمة الطلاب ({unpaidStudents.length})
                  <span className="text-[10px] text-gray-400">اضغط على الأيقونة الخضراء للإرسال</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {unpaidStudents.map(student => {
                    const isSent = sentIds.includes(student.id);
                    return (
                      <div 
                        key={student.id} 
                        className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${
                          isSent ? 'bg-emerald-50 border-emerald-100 opacity-60' : 'bg-gray-50 border-gray-100 hover:border-orange-200'
                        }`}
                      >
                        <div className="flex items-center gap-3 overflow-hidden">
                          <div className={`p-2 rounded-xl ${isSent ? 'bg-emerald-100 text-emerald-600' : 'bg-white text-gray-400'}`}>
                            {isSent ? <Check className="w-4 h-4" /> : <User className="w-4 h-4" />}
                          </div>
                          <div className="truncate">
                            <p className="text-xs font-black text-gray-900 truncate">{student.name}</p>
                            <p className="text-[10px] text-orange-600 font-bold">{formatCurrency(student.remaining)}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => sendWhatsAppReminder(student, bulkMessage)}
                          className={`p-2 rounded-xl transition-all shadow-sm ${
                            isSent ? 'bg-white text-emerald-600' : 'bg-emerald-600 text-white hover:bg-emerald-700'
                          }`}
                          title="إرسال"
                        >
                          <MessageSquare className="w-5 h-5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="p-6 bg-gray-50 border-t border-gray-100">
              <button
                onClick={() => setShowBulkModal(false)}
                className="w-full bg-gray-900 text-white py-4 rounded-2xl font-black hover:bg-gray-800 transition-all"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Preview Modal */}
      {showPreview && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[60] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-5xl rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[95vh] border border-white/20">
            <div className="p-8 border-b border-gray-100 flex items-center justify-between bg-white sticky top-0 z-10">
              <div className="flex items-center gap-4">
                <div className="bg-red-50 p-3 rounded-2xl text-red-600">
                  <Printer className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-gray-900">معاينة تقرير المتأخرات</h3>
                  <p className="text-gray-500 font-bold">يمكنك مراجعة التقرير قبل طباعته أو حفظه</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => handlePrint()}
                  className="bg-red-900 text-white px-8 py-4 rounded-2xl font-black shadow-xl shadow-red-900/20 hover:bg-red-950 transition-all flex items-center gap-3"
                >
                  <Printer className="w-5 h-5" />
                  بدء الطباعة
                </button>
                <button 
                  onClick={() => setShowPreview(false)} 
                  className="p-4 hover:bg-gray-100 rounded-2xl transition-all text-gray-400"
                >
                  <X className="w-7 h-7" />
                </button>
              </div>
            </div>
            
            <div className="p-12 overflow-y-auto bg-gray-50/50">
              <div className="bg-white p-12 shadow-2xl rounded-3xl mx-auto shadow-slate-200/50" style={{ width: '210mm', minHeight: '297mm' }}>
                <div ref={reportRef} className="p-4 text-right" dir="rtl">
                  <div className="flex justify-between items-start mb-12 border-b-4 border-red-900 pb-8">
                    <div className="flex items-center gap-6">
                      {school.logo ? (
                        <div className="w-24 h-24 bg-white rounded-2xl flex items-center justify-center overflow-hidden border border-gray-100 shadow-sm">
                          <img src={school.logo} alt="School Logo" className="w-full h-full object-contain" />
                        </div>
                      ) : (
                        <div className="w-24 h-24 bg-red-900 rounded-2xl flex items-center justify-center shadow-lg shadow-red-900/20">
                          <User className="w-12 h-12 text-white" />
                        </div>
                      )}
                      <div>
                        <h2 className="text-3xl font-black text-gray-900 mb-2">{school.name}</h2>
                        <p className="text-red-900 font-black text-lg">تقرير الطلبة غير المسددين لهذا الشهر</p>
                      </div>
                    </div>
                    <div className="text-left space-y-1">
                      <p className="text-sm font-black text-gray-400">التاريخ: {format(new Date(), 'yyyy-MM-dd')}</p>
                      <p className="text-sm font-black text-gray-900">إجمالي الحالات: {unpaidStudents.length}</p>
                      <p className="text-lg font-black text-red-900">{formatCurrency(totalUnpaid)}</p>
                    </div>
                  </div>

                  {Object.entries(groupedByGrade).map(([grade, gradeStudents]) => (
                    <div key={grade} className="mb-12 break-inside-avoid">
                      <h3 className="text-xl font-black bg-slate-900 text-white p-4 rounded-2xl mb-6 flex justify-between items-center">
                        <span>الصف: {grade}</span>
                        <span className="text-sm opacity-60">{gradeStudents.length} طالب</span>
                      </h3>
                      <table className="w-full border-collapse rounded-2xl overflow-hidden border border-gray-200">
                        <thead>
                          <tr className="bg-gray-100">
                            <th className="p-4 text-sm font-black text-right border-b">اسم الطالب</th>
                            <th className="p-4 text-sm font-black text-right border-b">الصف</th>
                            <th className="p-4 text-sm font-black text-right border-b">حالة التأخير</th>
                            <th className="p-4 text-sm font-black text-right border-b">الواصل</th>
                            <th className="p-4 text-sm font-black text-right border-b">المتبقي</th>
                          </tr>
                        </thead>
                        <tbody>
                          {gradeStudents.map((student) => (
                            <tr key={student.id} className="border-b last:border-b-0 hover:bg-gray-50/50">
                              <td className="p-4 text-sm font-black text-gray-900">{student.name}</td>
                              <td className="p-4 text-sm font-bold text-gray-500">{student.grade}</td>
                              <td className="p-4 text-[10px] font-black">
                                <span className={
                                  student.severity === 'high' ? 'text-red-600' :
                                  student.severity === 'medium' ? 'text-orange-600' :
                                  'text-emerald-600'
                                }>
                                  {student.statusLabel}
                                </span>
                              </td>
                              <td className="p-4 text-sm font-bold text-emerald-600">{formatCurrency(student.totalPaid)}</td>
                              <td className="p-4 text-sm font-black text-red-600">{formatCurrency(student.remaining)}</td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="bg-gray-50 font-black">
                            <td colSpan={4} className="p-4 text-left border-t">مجموع ديون الصف:</td>
                            <td className="p-4 text-right border-t text-red-600">
                              {formatCurrency(gradeStudents.reduce((sum, s) => sum + s.remaining, 0))}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  ))}

                  <div className="mt-12 flex justify-between items-end pt-12 border-t border-gray-100">
                    <div className="text-center space-y-4">
                      <div className="w-48 border-b-2 border-gray-200 mb-2"></div>
                      <p className="font-black text-gray-900">توقيع المحاسب</p>
                    </div>
                    <div className="text-center">
                      <p className="text-[10px] text-gray-400 font-bold">تم استخراج هذا التقرير آلياً • مدرسة {school.name}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Hidden Print Source (to ensure it prints nicely even if modal styles are complex) */}
      <div className="hidden">
        <div ref={reportRef} className="p-12 text-right" dir="rtl">
          {/* Same content as preview but styled for print */}
          <div className="flex justify-between items-start mb-12 border-b-4 pb-8" style={{ borderColor: 'var(--primary-theme)' }}>
            <div className="flex items-center gap-6">
              {school.logo ? (
                <div className="w-24 h-24 bg-white rounded-2xl flex items-center justify-center overflow-hidden border border-gray-100">
                  <img src={school.logo} alt="School Logo" className="w-full h-full object-contain" />
                </div>
              ) : (
                <div className="w-24 h-24 rounded-2xl flex items-center justify-center" style={{ backgroundColor: 'var(--primary-theme)' }}>
                  <User className="w-12 h-12 text-white" />
                </div>
              )}
              <div>
                <h2 className="text-3xl font-black text-gray-900 mb-2">{school.name}</h2>
                <p className="theme-text font-black text-lg">تقرير الطلبة غير المسددين لهذا الشهر</p>
              </div>
            </div>
            <div className="text-left">
              <p className="text-sm font-black text-gray-400">التاريخ: {format(new Date(), 'yyyy-MM-dd')}</p>
              <p className="text-sm font-black text-gray-900">إجمالي الحالات: {unpaidStudents.length}</p>
              <p className="text-lg font-black theme-text">{formatCurrency(totalUnpaid)}</p>
            </div>
          </div>

          {Object.entries(groupedByGrade).map(([grade, gradeStudents]) => (
            <div key={grade} className="mb-12" style={{ pageBreakAfter: 'always' }}>
              <h3 className="text-xl font-black bg-slate-900 text-white p-4 rounded-2xl mb-6">
                الصف: {grade} ({gradeStudents.length} طالب)
              </h3>
              <table className="w-full border-collapse border border-gray-200">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="p-4 text-sm font-black text-right border">اسم الطالب</th>
                    <th className="p-4 text-sm font-black text-right border">الصف</th>
                    <th className="p-4 text-sm font-black text-right border">الحالة</th>
                    <th className="p-4 text-sm font-black text-right border">الواصل</th>
                    <th className="p-4 text-sm font-black text-right border">المتبقي</th>
                  </tr>
                </thead>
                <tbody>
                  {gradeStudents.map((student) => (
                    <tr key={student.id} className="border-b">
                      <td className="p-4 text-sm font-black text-gray-900 border">{student.name}</td>
                      <td className="p-4 text-sm font-bold text-gray-500 border">{student.grade}</td>
                      <td className="p-4 text-[10px] font-black border">{student.statusLabel}</td>
                      <td className="p-4 text-sm font-bold text-emerald-600 border">{formatCurrency(student.totalPaid)}</td>
                      <td className="p-4 text-sm font-black text-red-600 border">{formatCurrency(student.remaining)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
