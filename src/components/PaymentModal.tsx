import { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { School, Student, Payment } from '../types';
import { localDb } from '../services/localDb';
import { WhatsAppService } from '../services/WhatsAppService';
import { 
  CreditCard, 
  X, 
  User, 
  CheckCircle2, 
  ArrowLeftRight,
  History,
  MessageSquare,
  Printer
} from 'lucide-react';
import { formatCurrency, numberToArabicWords } from '../lib/utils';
import { format } from 'date-fns';
import { useReactToPrint } from 'react-to-print';
import { QRCodeSVG } from 'qrcode.react';

interface PaymentModalProps {
  student: Student;
  school: School;
  payments: Payment[];
  onClose: () => void;
  onSuccess?: () => void;
}

export default function PaymentModal({ student, school, payments, onClose, onSuccess }: PaymentModalProps) {
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<'cash' | 'bank' | 'zain_cash' | 'other'>('cash');
  const [note, setNote] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
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
  const receiptRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({ 
    contentRef: receiptRef,
    documentTitle: `وصل استلام - ${student?.name || 'طالب'}`
  });

  // Automatically trigger print
  useEffect(() => {
    if (showReceipt && lastPayment && autoPrint) {
      const timer = setTimeout(() => {
        handlePrint();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [showReceipt, lastPayment, autoPrint, handlePrint]);

  useEffect(() => {
    setTimeout(() => amountInputRef.current?.focus(), 200);
  }, []);

  const studentPayments = useMemo(() => {
    return payments.filter(p => p.studentId === student.id)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [student, payments]);

  const totalPaid = studentPayments.reduce((sum, p) => sum + p.amount, 0);
  const remaining = student.totalAmount - totalPaid;

  const processPayment = () => {
    if (!amount || isProcessing) return;
    setIsProcessing(true);

    try {
      const paymentData = {
        studentId: student.id,
        amount: Number(amount),
        date: new Date().toISOString(),
        method: method,
        note: note || 'دفع قسط مدرسي'
      };
      
      const newPayment = localDb.add('payments', paymentData);
      setLastPayment(newPayment as Payment);
      
      // WhatsApp Notification
      WhatsAppService.sendNotification(
        school.id, 
        student.id, 
        'payment', 
        { 
          amount: formatCurrency(Number(amount)), 
          remain: formatCurrency(remaining - Number(amount)) 
        }
      ).then(res => {
        if (res && res.mode === 'manual' && res.url) {
          window.open(res.url, '_blank');
        }
      });

      setShowReceipt(true);
      onSuccess?.();
      // Don't call onClose() immediately if we want to show receipt
      // onClose();
    } catch (error) {
      console.error('Payment processing failed', error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-gray-900/40 backdrop-blur-md"
      />
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className={`bg-white w-full rounded-[2.5rem] shadow-2xl relative z-10 overflow-hidden flex flex-col ${showReceipt ? 'max-w-4xl max-h-[90vh]' : 'max-w-2xl'}`}
      >
        {!showReceipt ? (
          <>
            <div className="p-8 border-b border-gray-100 flex items-center justify-between bg-white relative z-20">
              <div className="flex items-center gap-3">
                <div className="bg-blue-600 p-3 rounded-2xl text-white shadow-lg shadow-blue-100">
                  <CreditCard className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-gray-900">دفعة جديدة</h3>
                  <p className="text-xs font-bold text-gray-400 mt-0.5">تسجيل قسط مدرسي جديد</p>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="p-3 hover:bg-gray-100 rounded-2xl transition-all text-gray-400 hover:text-red-500"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-8 max-h-[60vh] overflow-y-auto custom-scrollbar space-y-8">
              {/* Student Info Card */}
              <div className="bg-blue-50/50 p-6 rounded-3xl border border-blue-100 flex items-center gap-4">
                {student.photo ? (
                  <img src={student.photo} alt={student.name} className="w-16 h-16 rounded-2xl object-cover border-2 border-white shadow-sm" />
                ) : (
                  <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg">
                    <User className="w-8 h-8" />
                  </div>
                )}
                <div className="flex-1">
                  <h4 className="text-xl font-black text-gray-900">{student.name}</h4>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-[10px] font-black bg-blue-100 text-blue-700 px-2 py-0.5 rounded-md uppercase">{student.grade}</span>
                    <span className="text-xs text-gray-500 font-bold">{student.phone}</span>
                  </div>
                </div>
              </div>

              {/* Account Stats */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                  <p className="text-[10px] text-gray-400 font-black mb-1">المبلغ الكلي</p>
                  <p className="text-lg font-black text-gray-900">{formatCurrency(student.totalAmount)}</p>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                  <p className="text-[10px] text-emerald-600 font-black mb-1">إجمالي الواصل</p>
                  <p className="text-lg font-black text-emerald-700">{formatCurrency(totalPaid)}</p>
                </div>
                <div className="bg-red-50/50 p-4 rounded-2xl border border-red-100/50">
                  <p className="text-[10px] text-red-500 font-black mb-1">المتبقي</p>
                  <p className="text-lg font-black text-red-600">{formatCurrency(remaining)}</p>
                </div>
                <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100/50">
                  <p className="text-[10px] text-blue-600 font-black mb-1">آخر تسديد</p>
                  <p className="text-lg font-black text-blue-700">
                    {studentPayments.length > 0 ? formatCurrency(studentPayments[0].amount) : 'لا يوجد'}
                  </p>
                </div>
              </div>

              {/* Payment Form */}
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <div className="flex justify-between items-center mb-2 px-2">
                      <label className="block text-sm font-black text-gray-700">مغ الدفعة</label>
                      {remaining > 0 && (
                        <button 
                          onClick={() => setAmount(remaining.toString())}
                          className="text-[10px] font-black text-blue-600 hover:underline"
                        >
                          دفع المتبقي بالكامل
                        </button>
                      )}
                    </div>
                    <input
                      ref={amountInputRef}
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-6 py-4 text-2xl font-black focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all"
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-black text-gray-700 mb-2 px-2">طريقة الدفع</label>
                    <select
                      value={method}
                      onChange={(e) => setMethod(e.target.value as any)}
                      className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-6 py-4 text-lg font-black outline-none focus:ring-4 focus:ring-blue-100 appearance-none"
                    >
                      <option value="cash">نقداً</option>
                      <option value="bank">تحويل بنكي</option>
                      <option value="zain_cash">زين كاش</option>
                      <option value="other">أخرى</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-black text-gray-700 mb-2 px-2">ملاحظات إضافية (اختياري)</label>
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-6 py-4 font-bold outline-none focus:ring-4 focus:ring-blue-100 min-h-[100px]"
                    placeholder="مثال: دفع القسط الثالث لشهر نيسان"
                  />
                </div>
              </div>
            </div>

            <div className="p-8 bg-gray-50 border-t border-gray-100 flex gap-4">
              <button
                onClick={onClose}
                className="flex-1 bg-white text-gray-500 py-5 rounded-[2rem] font-black border border-gray-200 hover:bg-gray-100 transition-all active:scale-[0.98]"
              >
                إلغاء
              </button>
              <button
                onClick={processPayment}
                disabled={!amount || isProcessing}
                className="flex-[2] bg-blue-600 text-white py-5 rounded-[2rem] font-black text-lg hover:bg-blue-700 shadow-xl shadow-blue-100 disabled:opacity-50 transition-all active:scale-[0.98] flex items-center justify-center gap-3"
              >
                {isProcessing ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <CheckCircle2 className="w-6 h-6" />
                    تأكيد واستلام المبلغ
                  </>
                )}
              </button>
            </div>
          </>
        ) : (
          <div className="flex flex-col md:flex-row h-full overflow-hidden">
            {/* Receipt Content Area */}
            <div className="flex-1 overflow-y-auto p-8 bg-gray-100/50 custom-scrollbar">
              <style>
                {`
                  @media print {
                    .receipt-print-container {
                      color: ${school.receiptTextColor || '#111827'} !important;
                    }
                    .receipt-header-print {
                      background-color: ${school.receiptHeaderColor || '#f3f4f6'} !important;
                      -webkit-print-color-adjust: exact;
                    }
                  }
                `}
              </style>
              <div 
                ref={receiptRef} 
                className={`bg-white p-10 shadow-sm rounded-3xl border border-gray-100 min-h-full print:p-0 print:shadow-none print:border-none receipt-print-container ${
                  school.receiptFontSize === 'small' ? 'text-xs' : school.receiptFontSize === 'large' ? 'text-lg' : 'text-sm'
                }`}
                style={{ color: school.receiptTextColor || '#111827' }}
                dir="rtl"
              >
                {/* Receipt Header */}
                <div 
                  className="flex justify-between items-start mb-8 border-b-2 border-gray-900 pb-6 px-4 -mx-4 rounded-t-2xl receipt-header-print"
                  style={{ backgroundColor: school.receiptHeaderColor || '#f3f4f6' }}
                >
                  <div className="flex items-center gap-4">
                    {school.logo ? (
                      <div className="w-16 h-16 bg-white rounded-xl flex items-center justify-center overflow-hidden border border-gray-100">
                        <img src={school.logo} alt="School Logo" className="w-full h-full object-contain" />
                      </div>
                    ) : (
                      <div className="w-16 h-16 bg-blue-600 rounded-xl flex items-center justify-center text-white">
                        <CreditCard className="w-8 h-8" />
                      </div>
                    )}
                    <div>
                      <h2 className="text-xl font-black" style={{ color: school.receiptTextColor || '#111827' }}>{school.name}</h2>
                      <span className="bg-gray-900 text-white px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider">وصل استلام رسمي</span>
                    </div>
                  </div>
                  <div className="text-left">
                    <p className="text-[10px] font-black opacity-50 mb-1">رقم الوصل</p>
                    <p className="text-xs font-black font-mono">#{lastPayment?.id.slice(-6).toUpperCase()}</p>
                    <p className="text-[10px] font-bold opacity-50 mt-1">{format(new Date(lastPayment?.date || new Date()), 'yyyy/MM/dd')}</p>
                  </div>
                </div>

                {/* Body Content */}
                <div className="space-y-6 mb-8 py-2">
                   <div className="relative border-b border-gray-100 pb-2">
                      <span className="absolute -top-2.5 right-2 bg-white px-1 text-[8px] font-black opacity-40">الاسم</span>
                      <p className="text-lg font-black pr-2">{student.name}</p>
                   </div>
                   <div className="flex gap-4">
                      <div className="flex-1 relative border-b border-gray-100 pb-2">
                         <span className="absolute -top-2.5 right-2 bg-white px-1 text-[8px] font-black opacity-40">المبلغ</span>
                         <p className="text-2xl font-black text-blue-600 pr-2">{formatCurrency(lastPayment?.amount || 0)}</p>
                      </div>
                      <div className="flex-1 relative border-b border-gray-100 pb-2">
                         <span className="absolute -top-2.5 right-2 bg-white px-1 text-[8px] font-black opacity-40">المبلغ كتابةً</span>
                         <p className="text-[10px] font-bold opacity-80 pr-2 pt-2">{numberToArabicWords(lastPayment?.amount || 0)}</p>
                      </div>
                   </div>
                   <div className="relative border-b border-gray-100 pb-2">
                      <span className="absolute -top-2.5 right-2 bg-white px-1 text-[8px] font-black opacity-40">التفاصيل</span>
                      <p className="text-xs font-bold opacity-90 pr-2">{lastPayment?.note || 'سداد أقساط دراسية'}</p>
                   </div>
                </div>

                {school.showPreviousPayments && studentPayments.length > 1 && (
                  <div className="mb-8">
                    <h4 className="text-[10px] font-black mb-3 opacity-60 flex items-center gap-2">
                       <History className="w-3 h-3" />
                       سجل الدفعات السابقة
                    </h4>
                    <div className="overflow-hidden border border-gray-100 rounded-2xl">
                      <table className="w-full text-right">
                        <thead>
                          <tr className="bg-gray-50 text-[8px] font-black opacity-40">
                            <th className="px-3 py-1.5">المبلغ</th>
                            <th className="px-3 py-1.5">كتابةً</th>
                            <th className="px-3 py-1.5">التاريخ</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {studentPayments.filter(p => p.id !== lastPayment?.id).map((p) => (
                            <tr key={p.id} className="text-[9px]">
                              <td className="px-3 py-1.5 font-black">{formatCurrency(p.amount)}</td>
                              <td className="px-3 py-1.5 opacity-70 italic">{numberToArabicWords(p.amount)}</td>
                              <td className="px-3 py-1.5 opacity-50 font-mono italic">{format(new Date(p.date), 'yyyy/MM/dd')}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-3 gap-4 mb-8">
                   <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 text-center">
                      <p className="text-[8px] font-black opacity-40 mb-1">الإجمالي</p>
                      <p className="text-xs font-black">{formatCurrency(student.totalAmount)}</p>
                   </div>
                   <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100 text-center">
                      <p className="text-[8px] font-black text-emerald-600 mb-1">المسدد سابقاً</p>
                      <p className="text-xs font-black text-emerald-700">
                        {formatCurrency(payments.filter(p => p.studentId === student.id && p.id !== lastPayment?.id).reduce((sum, p) => sum + p.amount, 0))}
                      </p>
                   </div>
                   <div className="p-3 bg-red-50 rounded-xl border border-red-100 text-center">
                      <p className="text-[8px] font-black text-red-600 mb-1">المتبقي</p>
                      <p className="text-xs font-black text-red-700">
                        {formatCurrency(student.totalAmount - payments.filter(p => p.studentId === student.id).reduce((sum, p) => sum + p.amount, 0))}
                      </p>
                   </div>
                </div>

                <div className="flex justify-between items-end pt-4">
                  <div className="flex gap-4">
                    <div className="text-center">
                      {stampConfig.showQRCode && (
                        <div className="flex flex-col items-center">
                          <QRCodeSVG value={student.barcode} size={50} />
                          <p className="text-[6px] font-mono text-gray-400 mt-1">{student.barcode}</p>
                        </div>
                      )}
                    </div>
                    {(school.quickPaymentLink || school.zainCashNumber) && (
                      <div className="text-center flex flex-col items-center">
                        <QRCodeSVG 
                          value={school.quickPaymentLink || `tel:${school.zainCashNumber}`} 
                          size={50} 
                        />
                        <p className="text-[6px] font-black text-blue-600 mt-1">دفع سريع</p>
                      </div>
                    )}
                  </div>
                  <div className="text-center space-y-2">
                    {stampConfig.showAccountant && (
                      <>
                        <div className="w-32 border-b border-gray-900 mx-auto"></div>
                        <p className="font-black text-xs">توقيع المحاسب</p>
                      </>
                    )}
                    <p className="text-[8px] text-gray-400 font-bold">شكراً لثقتكم بنا</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Sidebar Actions */}
            <div className="w-full md:w-64 bg-white border-r border-gray-100 p-6 flex flex-col gap-4">
              <button onClick={onClose} className="p-3 hover:bg-red-50 text-red-500 rounded-xl transition-all flex items-center justify-center gap-2 self-start mb-4">
                <X className="w-5 h-5" />
                <span className="font-bold text-sm">إغلاق</span>
              </button>

              <div className="space-y-4">
                <div className="bg-indigo-50 p-4 rounded-2xl border border-indigo-100">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-[10px] font-black text-indigo-600 uppercase">طباعة تلقائية</p>
                    <button 
                      onClick={toggleAutoPrint}
                      className={`w-8 h-4 rounded-full p-0.5 transition-all ${autoPrint ? 'bg-indigo-600' : 'bg-gray-300'}`}
                    >
                      <div className={`w-3 h-3 bg-white rounded-full transition-all ${autoPrint ? 'ml-4' : 'ml-0'}`} />
                    </button>
                  </div>
                  <button onClick={() => handlePrint()} className="w-full bg-blue-600 text-white py-3 rounded-xl font-black text-sm flex items-center justify-center gap-2 hover:bg-blue-700 shadow-lg shadow-blue-100">
                    <Printer className="w-4 h-4" />
                    طباعة الآن
                  </button>
                </div>

                <button onClick={() => {
                  const message = `*وصل استلام مدرسة ${school.name}*\nتم استلام: ${formatCurrency(lastPayment?.amount || 0)}\nالمتبقي: ${formatCurrency(remaining)}`;
                  const url = WhatsAppService.getManualUrl(student.phone, message);
                  window.open(url, '_blank');
                }} className="w-full bg-emerald-600 text-white py-3 rounded-xl font-black text-sm flex items-center justify-center gap-2 hover:bg-emerald-700">
                  <MessageSquare className="w-4 h-4" />
                  إرسال واتساب
                </button>
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
