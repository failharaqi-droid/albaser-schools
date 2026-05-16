import { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { School, Student, Payment } from '../types';
import { localDb } from '../services/localDb';
import { WhatsAppService } from '../services/WhatsAppService';
import { 
  Search, 
  CreditCard, 
  Printer, 
  MessageSquare, 
  ScanLine, 
  User, 
  DollarSign, 
  CheckCircle2,
  X,
  History,
  ArrowLeftRight
} from 'lucide-react';
import { formatCurrency, numberToArabicWords } from '../lib/utils';
import { format } from 'date-fns';
import { useReactToPrint } from 'react-to-print';
import { QRCodeSVG } from 'qrcode.react';
import BarcodeScanner from './BarcodeScanner';

interface PaymentProcessorProps {
  school: School;
  students: Student[];
  payments: Payment[];
  canModify?: boolean;
  preSelectedStudentId?: string | null;
  onClearPreSelect?: () => void;
}

export default function PaymentProcessor({ 
  school, 
  students, 
  payments, 
  preSelectedStudentId,
  onClearPreSelect
}: PaymentProcessorProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<'cash' | 'bank' | 'zain_cash' | 'other'>('cash');
  const [note, setNote] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [lastPayment, setLastPayment] = useState<Payment | null>(null);
  const [showReceipt, setShowReceipt] = useState(false);
  const [autoPrint, setAutoPrint] = useState(school.autoPrintReceipt ?? true);

  const toggleAutoPrint = () => {
    const newState = !autoPrint;
    setAutoPrint(newState);
    // Persist to school settings
    localDb.update('schools', school.id, { autoPrintReceipt: newState });
  };
  const [stampConfig, setStampConfig] = useState({
    showAccountant: true,
    showQRCode: true
  });

  const amountInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (preSelectedStudentId) {
      const student = students.find(s => s.id === preSelectedStudentId);
      if (student) {
        setSelectedStudent(student);
        onClearPreSelect?.();
        // Focus amount input after selection
        setTimeout(() => amountInputRef.current?.focus(), 100);
      }
    }
  }, [preSelectedStudentId, students, onClearPreSelect]);

  const receiptRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({ 
    contentRef: receiptRef,
    documentTitle: `وصل استلام - ${selectedStudent?.name || 'طالب'}`,
    onAfterPrint: () => {
      if (autoPrint) {
        // Optional: close receipt after auto-print if desired
        // setShowReceipt(false);
      }
    }
  });

  // Automatically trigger print when receipt is shown and autoPrint is enabled
  useEffect(() => {
    if (showReceipt && lastPayment && autoPrint) {
      const timer = setTimeout(() => {
        handlePrint();
      }, 500); // Give it time to render the modal content
      return () => clearTimeout(timer);
    }
  }, [showReceipt, lastPayment, autoPrint, handlePrint]);

  const studentPayments = useMemo(() => {
    if (!selectedStudent) return [];
    return payments.filter(p => p.studentId === selectedStudent.id)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [selectedStudent, payments]);

  const totalPaid = studentPayments.reduce((sum, p) => sum + p.amount, 0);
  const remaining = selectedStudent ? selectedStudent.totalAmount - totalPaid : 0;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const student = students.find(s => 
      s.name === searchTerm || 
      s.barcode === searchTerm || 
      s.attendanceBarcode === searchTerm || 
      s.installmentBarcode === searchTerm
    );
    if (student) {
      setSelectedStudent(student);
      setSearchTerm('');
    }
  };

  const processPayment = () => {
    if (!selectedStudent || !amount) return;
    const paymentData = {
      studentId: selectedStudent.id,
      amount: Number(amount),
      date: new Date().toISOString(),
      method: method,
      note: note || 'دفع قسط مدرسي'
    };
    const newPayment = localDb.add('payments', paymentData);
    setLastPayment(newPayment as Payment);
    
    // Trigger WhatsApp Notification
    WhatsAppService.sendNotification(
      school.id, 
      selectedStudent.id, 
      'payment', 
      { amount: formatCurrency(Number(amount)), remain: formatCurrency(remaining - Number(amount)) }
    ).then(res => {
      if (res && res.mode === 'manual' && res.url) {
        window.open(res.url, '_blank');
      }
      });

    setAmount('');
    setNote('');
    setShowReceipt(true);
  };

  const sendWhatsApp = () => {
    if (!selectedStudent || !lastPayment) return;
    const message = `*وصل استلام مدرسة ${school.name}*\n\nتم استلام مبلغ: ${formatCurrency(lastPayment.amount)}\nكتابةً: ${numberToArabicWords(lastPayment.amount)}\n\nمن الطالب: ${selectedStudent.name}\nبتاريخ: ${format(new Date(lastPayment.date), 'yyyy-MM-dd')}\n\nالمبلغ المتبقي: ${formatCurrency(remaining)}\n\n${school.receiptNote || 'شكراً لثقتكم بنا.'}`;
    const manualUrl = WhatsAppService.getManualUrl(selectedStudent.phone, message);
    window.open(manualUrl, '_blank');
  };

  const handleScan = (decodedText: string) => {
    const student = students.find(s => s.barcode === decodedText || s.id === decodedText);
    if (student) {
      setSelectedStudent(student);
      setIsScanning(false);
      setTimeout(() => amountInputRef.current?.focus(), 100);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-2">
      <div className="lg:col-span-2 space-y-2">
        <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm">
          <h3 className="text-xl font-black mb-6 flex items-center gap-2">
            <CreditCard className="theme-text" />
            معالجة دفعة جديدة
          </h3>
          
          <form onSubmit={handleSearch} className="flex gap-3 mb-8">
            <div className="flex-1 relative">
              <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="ابحث عن طالب..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-2xl pr-12 pl-4 py-2 outline-none font-bold focus:ring-2"
                style={{ ['--tw-ring-color' as any]: 'var(--primary-theme-soft)' }}
              />
            </div>
            <button 
              type="button"
              onClick={() => setIsScanning(!isScanning)}
              className={`p-4 rounded-2xl border transition-all ${isScanning ? 'bg-red-50 border-red-200 text-red-600' : 'theme-bg-soft theme-border theme-text'}`}
            >
              <ScanLine className="w-6 h-6" />
            </button>
          </form>

          {isScanning && (
            <BarcodeScanner 
              onScan={handleScan} 
              onClose={() => setIsScanning(false)} 
            />
          )}

          {selectedStudent ? (
            <div className="space-y-2 animate-in fade-in slide-in-from-top-4 duration-300">
              <div className="theme-bg-soft p-4 rounded-3xl theme-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="relative">
                    {selectedStudent.photo ? (
                      <div className="w-10 h-10 rounded-2xl overflow-hidden border-2 theme-border-soft shadow-sm">
                        <img src={selectedStudent.photo} alt={selectedStudent.name} className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <div className="theme-bg p-4 rounded-2xl text-white theme-shadow">
                        <User className="w-6 h-6" />
                      </div>
                    )}
                    <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-white flex items-center justify-center ${remaining === 0 ? 'bg-emerald-500' : 'bg-red-500'}`}>
                      {remaining === 0 ? <CheckCircle2 className="w-3 h-3 text-white" /> : <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />}
                    </div>
                  </div>
                  <div>
                    <h4 className="text-xl font-black text-gray-900">{selectedStudent.name}</h4>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-[10px] font-black theme-bg-soft theme-text px-2 py-0.5 rounded-md uppercase">{selectedStudent.grade}</span>
                      <span className="text-xs text-gray-500 font-bold">{selectedStudent.phone}</span>
                      {selectedStudent.parentName && (
                        <span className="text-xs text-gray-400 font-medium">ولي الأمر: {selectedStudent.parentName}</span>
                      )}
                    </div>
                  </div>
                </div>
                <button onClick={() => setSelectedStudent(null)} className="p-2 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-xl transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Enhanced Payment Stats */}
              <div className="space-y-2">
                <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm">
                  <div className="flex justify-between items-end mb-4">
                    <div>
                      <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-1">نسبة التسديد</p>
                      <p className="text-lg font-black text-gray-900">
                        {Math.round((totalPaid / selectedStudent.totalAmount) * 100)}%
                      </p>
                    </div>
                    <div className="text-left">
                      <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-1">المبلغ المتبقي</p>
                      <p className="text-lg font-black text-red-600">{formatCurrency(remaining)}</p>
                    </div>
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="h-3 bg-gray-100 rounded-full overflow-hidden flex">
                    <div
                      className="h-full theme-bg rounded-full shadow-sm"
                    />
                  </div>

                  <div className="grid grid-cols-2 mt-6 gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-10 bg-gray-200 rounded-full" />
                      <div>
                        <p className="text-[10px] text-gray-400 font-black uppercase mb-1">المبلغ الكلي</p>
                        <p className="text-lg font-black text-gray-900">{formatCurrency(selectedStudent.totalAmount)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-10 bg-emerald-400 rounded-full" />
                      <div>
                        <p className="text-[10px] text-emerald-600 font-black uppercase mb-1">إجمالي الواصل</p>
                        <p className="text-lg font-black text-emerald-700">{formatCurrency(totalPaid)}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <div className="bg-blue-50/30 p-5 rounded-3xl border border-blue-100/30">
                    <div className="flex items-center gap-2 mb-2">
                      <History className="w-4 h-4 text-blue-600" />
                      <p className="text-[10px] text-blue-600 font-black uppercase">آخر تسديد</p>
                    </div>
                    {studentPayments.length > 0 ? (
                      <div className="flex justify-between items-center">
                        <p className="text-xl font-black text-blue-900">{formatCurrency(studentPayments[0].amount)}</p>
                        <p className="text-[10px] font-black text-blue-400 bg-white px-2 py-1 rounded-lg border border-blue-100">
                          {format(new Date(studentPayments[0].date), 'yyyy-MM-dd')}
                        </p>
                      </div>
                    ) : (
                      <p className="text-sm font-bold text-blue-400 italic">لا يوجد سجل مدفوعات</p>
                    )}
                  </div>
                  
                  <div className="bg-emerald-50/30 p-5 rounded-3xl border border-emerald-100/30">
                    <p className="text-[10px] text-emerald-600 font-black uppercase mb-2">حالة الحساب</p>
                    <div className="flex items-center gap-3">
                      {remaining === 0 ? (
                        <div className="flex items-center gap-2 text-emerald-700">
                          <CheckCircle2 className="w-5 h-5" />
                          <span className="text-xl font-black underline decoration-emerald-200 decoration-4">مكتمل سداد</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-red-600">
                          <div className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                          <span className="text-xl font-black">بانتظار سداد</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="block text-sm font-black text-gray-700">مغ الدفعة</label>
                      <div className="flex gap-2">
                        {remaining > 0 && (
                          <button 
                            onClick={() => setAmount(remaining.toString())}
                            className="text-[10px] font-black text-blue-600 hover:bg-blue-50 px-2 py-1 rounded-lg flex items-center gap-1 transition-all"
                          >
                            <ArrowLeftRight className="w-3 h-3" />
                            كامل المتبقي
                          </button>
                        )}
                        {remaining > 0 && remaining / 2 > 0 && (
                          <button 
                            onClick={() => setAmount((remaining / 2).toString())}
                            className="text-[10px] font-black text-emerald-600 hover:bg-emerald-50 px-2 py-1 rounded-lg transition-all"
                          >
                            نصف المتبقي
                          </button>
                        )}
                      </div>
                    </div>
                    <input
                      ref={amountInputRef}
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="w-full bg-white border-2 border-gray-100 rounded-3xl px-6 py-5 text-lg font-black focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all placeholder:text-gray-200 shadow-sm"
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-black text-gray-700 mb-2">طريقة الدفع</label>
                    <select
                      value={method}
                      onChange={(e) => setMethod(e.target.value as any)}
                      className="w-full bg-white border border-gray-200 rounded-2xl px-4 py-2 text-lg font-black focus:ring-2 focus:ring-blue-500 outline-none appearance-none"
                    >
                      <option value="cash">نقداً</option>
                      <option value="bank">تحويل بنكي</option>
                      <option value="zain_cash">زين كاش</option>
                      <option value="other">أخرى</option>
                    </select>
                  </div>
                </div>
                <button
                  onClick={processPayment}
                  disabled={!amount}
                  className="w-full bg-blue-600 text-white py-5 rounded-2xl font-black text-lg hover:bg-blue-700 shadow-xl shadow-blue-100 disabled:opacity-50"
                >
                  تأكيد الدفع وإصدار الوصل
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-gray-400">
              <User className="w-10 h-10 mx-auto mb-4 opacity-20" />
              <p className="text-lg font-bold">يرجى البحث عن طالب للبدء</p>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm">
          <h3 className="text-xl font-black mb-6 flex items-center gap-2">
            <History className="text-blue-600" />
            آخر الدفعات
          </h3>
          <motion.div 
            initial="hidden"
            animate="visible"
            variants={{
              hidden: { opacity: 0 },
              visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
            }}
            className="space-y-2 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar"
          >
            {studentPayments.map(p => (
              <div 
                key={p.id}

                className="p-4 bg-gray-50 rounded-2xl border border-gray-100 relative group transition-all hover:bg-blue-50/50"
              >
                <div className="flex justify-between items-start mb-2">
                  <span className="text-sm font-black text-gray-900">{formatCurrency(p.amount)}</span>
                  <span className="text-[10px] text-gray-400 font-bold">{format(new Date(p.date), 'yyyy-MM-dd')}</span>
                </div>
                <p className="text-xs text-gray-500 font-bold">{p.note}</p>
                <div className="absolute left-2 bottom-2 opacity-0 group-hover:opacity-100 transition-opacity">
                   <button onClick={() => { setLastPayment(p); setShowReceipt(true); }} className="p-1 text-blue-600 hover:bg-blue-100 rounded">
                      <Printer className="w-4 h-4" />
                   </button>
                </div>
              </div>
            ))}
          </motion.div>
        </div>
      </div>

      
        {showReceipt && lastPayment && selectedStudent && (
          <div className="integrated-page z-[300] no-scrollbar">
            <div
              className="bg-white w-full w-full mx-auto min-h-screen my-0  relative z-10 shadow-sm flex flex-col no-scrollbar"
            >
              {/* Receipt Content Area */}
              <div className="flex-1 overflow-y-auto p-5 md:p-4 bg-gray-50/50 custom-scrollbar">
                <style>
                  {`
                    @media print {
                      .receipt-print-container {
                        color: ${school.receiptTextColor || '#111827'} !important;
                      }
                      .receipt-header-print {
                        background-color: ${school.receiptHeaderColor || '#f3f4f6'} !important;
                        -webkit-print-color-adjust: exact;

                  `}
                </style>
                <div 
                  ref={receiptRef} 
                  className={`bg-white p-4 shadow-sm rounded-3xl border border-gray-100 min-h-full print:p-0 print:shadow-none print:border-none receipt-print-container ${
                    school.receiptFontSize === 'small' ? 'text-sm' : school.receiptFontSize === 'large' ? 'text-xl' : 'text-base'
                  }`} 
                  style={{ color: school.receiptTextColor || '#111827' }}
                  dir="rtl"
                >
                  {/* Receipt Header */}
                  <div 
                    className="flex justify-between items-start mb-12 border-b-2 border-gray-900 pb-4 px-6 -mx-6 rounded-t-3xl receipt-header-print"
                    style={{ backgroundColor: school.receiptHeaderColor || '#f3f4f6' }}
                  >
                    <div className="flex items-center gap-3">
                      {school.logo ? (
                        <div className="w-10 h-10 bg-white rounded-2xl flex items-center justify-center overflow-hidden border-2 border-gray-100 shadow-sm">
                          <img src={school.logo} alt="School Logo" className="w-full h-full object-contain" />
                        </div>
                      ) : (
                        <div className="w-10 h-10 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg">
                          <CreditCard className="w-6 h-6" />
                        </div>
                      )}
                      <div>
                        <h2 className="text-lg font-black text-slate-900 tracking-tight mb-2" style={{ color: school.receiptTextColor || '#111827' }}>{school.name}</h2>
                        <div className="flex items-center gap-2">
                           <span className="bg-gray-900 text-white px-3 py-1 rounded-lg text-xs font-black">وصل استلام رسمي</span>
                           {school.phone && <p className="text-[10px] opacity-70 font-bold" dir="ltr">{school.phone}</p>}
                        </div>
                      </div>
                    </div>
                    <div className="text-left">
                      <div className="bg-white/50 px-4 py-2 rounded-xl mb-2 backdrop-blur-sm border border-black/5">
                        <p className="text-[10px] font-black opacity-50 mb-0.5 uppercase tracking-widest">رقم الوصل</p>
                        <p className="text-sm font-black font-mono">#{lastPayment.id.slice(-6).toUpperCase()}</p>
                      </div>
                      <p className="text-xs font-black opacity-60">{format(new Date(lastPayment.date), 'yyyy/MM/dd HH:mm')}</p>
                      {school.academicYear && (
                         <p className="text-xs font-black opacity-60 mt-1">العام الدراسي: {school.academicYear}</p>
                      )}
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="space-y-2 mb-12">
                     <div className="relative border-b-2 border-gray-100 pb-2">
                        <span className="absolute -top-3 right-4 bg-white px-2 text-[10px] font-black opacity-40">استلمنا من السيد/ة</span>
                        <p className="text-lg font-black pr-4">{selectedStudent.name}</p>
                     </div>

                     <div className="flex flex-col md:flex-row gap-2">
                        <div className="flex-1 relative border-b-2 border-gray-100 pb-2">
                           <span className="absolute -top-3 right-4 bg-white px-2 text-[10px] font-black opacity-40">مبـلغ وقدره</span>
                           <p className="text-4xl font-black text-blue-600 pr-4">{formatCurrency(lastPayment.amount)}</p>
                        </div>
                        <div className="flex-1 relative border-b-2 border-gray-100 pb-2">
                           <span className="absolute -top-3 right-4 bg-white px-2 text-[10px] font-black opacity-40">فقط لا غير</span>
                           <p className="text-lg font-bold italic opacity-80 pr-4 pt-1">{numberToArabicWords(lastPayment.amount)}</p>
                        </div>
                     </div>

                     <div className="relative border-b-2 border-gray-100 pb-2">
                        <span className="absolute -top-3 right-4 bg-white px-2 text-[10px] font-black opacity-40">وذلك عن</span>
                        <p className="text-lg font-bold opacity-90 pr-4">{lastPayment.note || 'سداد أقساط دراسية'}</p>
                     </div>
                  </div>

                  {studentPayments.length > 1 && (
                    <div className="mb-12">
                      <h4 className="text-sm font-black mb-4 border-r-4 border-blue-600 pr-3 flex items-center gap-2">
                         <History className="w-4 h-4" />
                         سجل الدفعات السابقة
                      </h4>
                      <div className="overflow-hidden border border-gray-100 rounded-3xl">
                        <table className="w-full text-right">
                          <thead>
                            <tr className="bg-gray-50 text-[10px] font-black opacity-40">
                              <th className="px-4 py-2">ت</th>
                              <th className="px-4 py-2">المبلغ</th>
                              <th className="px-4 py-2">كتابةً</th>
                              <th className="px-4 py-2">التاريخ</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-50">
                            {studentPayments.filter(p => p.id !== lastPayment.id).map((p, idx) => (
                              <tr key={p.id} className="text-xs">
                                <td className="px-4 py-2 opacity-50">{idx + 1}</td>
                                <td className="px-4 py-2 font-black">{formatCurrency(p.amount)}</td>
                                <td className="px-4 py-2 opacity-70 italic">{numberToArabicWords(p.amount)}</td>
                                <td className="px-4 py-2 opacity-50 font-mono">{format(new Date(p.date), 'yyyy/MM/dd')}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Account Summary Section */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-12">
                     <div className="p-4 bg-gray-50 rounded-3xl border border-gray-100">
                        <p className="text-[10px] font-black opacity-40 mb-2">إجمالي الأقساط</p>
                        <p className="text-lg font-black">{formatCurrency(selectedStudent.totalAmount)}</p>
                     </div>
                     <div className="p-4 bg-emerald-50 rounded-3xl border border-emerald-100">
                        <p className="text-[10px] font-black text-emerald-600 mb-2">المسدد سابقاً</p>
                        <p className="text-lg font-black text-emerald-700">
                          {formatCurrency(payments.filter(p => p.studentId === selectedStudent.id && p.id !== lastPayment.id).reduce((sum, p) => sum + p.amount, 0))}
                        </p>
                     </div>
                     <div className="p-4 bg-red-50 rounded-3xl border-2 border-red-600">
                        <p className="text-[10px] font-black text-red-600 mb-2">المتبقي المطلوب</p>
                        <p className="text-lg font-black text-red-700">
                          {formatCurrency(selectedStudent.totalAmount - payments.filter(p => p.studentId === selectedStudent.id).reduce((sum, p) => sum + p.amount, 0))}
                        </p>
                     </div>
                  </div>

                  {/* Signatures and Footer */}
                  <div className="flex justify-between items-end pt-12">
                    <div className="flex gap-2">
                      <div className="text-center">
                        {stampConfig.showQRCode && (
                          <>
                            <QRCodeSVG value={selectedStudent.barcode} size={100} className="mb-4" />
                            <p className="text-[10px] font-mono opacity-40">كود الطالب: {selectedStudent.barcode}</p>
                          </>
                        )}
                      </div>
                      {(school.quickPaymentLink || school.zainCashNumber) && (
                        <div className="text-center">
                          <QRCodeSVG 
                            value={school.quickPaymentLink || `tel:${school.zainCashNumber}`} 
                            size={100} 
                            className="mb-4" 
                          />
                          <p className="text-[10px] font-black text-blue-600">باركود الدفع السريع</p>
                          {school.zainCashNumber && <p className="text-[8px] font-bold opacity-40">{school.zainCashNumber}</p>}
                        </div>
                      )}
                    </div>
                    <div className="text-center space-y-2">
                      {stampConfig.showAccountant && (
                        <>
                          <div className="w-48 border-b-2 border-gray-900 mx-auto"></div>
                          <p className="font-black text-lg">توقيع المحاسب المختص</p>
                        </>
                      )}
                      <p className="text-[10px] opacity-40 font-bold">{school.receiptNote || 'يتوجب الاحتفاظ بهذا الوصل لضمان حقوقكم'}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Sidebar */}
              <div className="w-full md:w-72 bg-white border-r border-gray-100 p-5 flex flex-col gap-2">
                 <button 
                  onClick={() => setShowReceipt(false)}
                  className="mb-8 p-3 hover:bg-red-50 text-red-500 rounded-2xl transition-all flex items-center justify-center gap-2 self-start"
                >
                  <X className="w-6 h-6" />
                  <span className="font-bold">إغلاق</span>
                </button>

                <div className="flex flex-col gap-2">
                   <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest px-2">إعدادات الطباعة</h4>
                   
                   <div className="space-y-2 px-2 bg-gray-50 p-4 rounded-2xl">
                     <div className="flex items-center justify-between p-1 bg-white/50 rounded-xl px-2">
                        <label htmlFor="autoPrint" className="text-[10px] font-black text-indigo-600 uppercase">طباعة تلقائية</label>
                        <button 
                          onClick={toggleAutoPrint}
                          className={`w-10 h-5 rounded-full p-1 transition-all ${autoPrint ? 'bg-indigo-600' : 'bg-gray-200'}`}
                        >
                          <div className={`w-3 h-3 bg-white rounded-full transition-all ${autoPrint ? 'mr-5' : 'mr-0'}`} />
                        </button>
                      </div>

                     <div className="flex items-center gap-2">
                       <input 
                        type="checkbox" 
                        id="rcptAccountant" 
                        checked={stampConfig.showAccountant}
                        onChange={(e) => setStampConfig({...stampConfig, showAccountant: e.target.checked})}
                        className="accent-blue-600"
                       />
                       <label htmlFor="rcptAccountant" className="text-xs font-bold text-gray-600">توقيع المحاسب</label>
                     </div>
                     <div className="flex items-center gap-2">
                       <input 
                        type="checkbox" 
                        id="rcptQR" 
                        checked={stampConfig.showQRCode}
                        onChange={(e) => setStampConfig({...stampConfig, showQRCode: e.target.checked})}
                        className="accent-blue-600"
                       />
                       <label htmlFor="rcptQR" className="text-xs font-bold text-gray-600">رمز QR</label>
                     </div>
                   </div>

                   <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest px-2">إجراءات الوصل</h4>
                   
                   <button 
                    onClick={() => handlePrint()} 
                    className="w-full bg-blue-600 text-white py-2 rounded-2xl font-black flex items-center justify-center gap-3 hover:bg-blue-700 shadow-xl shadow-blue-100 transition-all active:scale-[0.98]"
                  >
                    <Printer className="w-5 h-5" />
                    طباعة الوصل
                  </button>

                   <button 
                    onClick={sendWhatsApp} 
                    className="w-full bg-emerald-600 text-white py-2 rounded-2xl font-black flex items-center justify-center gap-3 hover:bg-emerald-700 shadow-xl shadow-emerald-100 transition-all active:scale-[0.98]"
                  >
                    <MessageSquare className="w-5 h-5" />
                    إرسال واتساب
                  </button>
                </div>

                <div className="mt-auto pt-8 border-t border-gray-100">
                   <div className="bg-blue-50 p-4 rounded-3xl text-center">
                      <p className="text-[10px] font-black text-blue-600 mb-2">حالة الحساب</p>
                      <div className="flex items-center justify-center gap-2">
                         <div className={`w-3 h-3 rounded-full ${remaining === 0 ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
                         <p className="font-black text-gray-900">{remaining === 0 ? 'مكتمل الدفع' : 'بانتظار سداد'}</p>
                      </div>
                   </div>
                </div>
              </div>
            </div>
          </div>
        )}
      
    </div>
  );
}
