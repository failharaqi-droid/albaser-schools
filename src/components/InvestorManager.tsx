import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  CreditCard, 
  Calendar, 
  User, 
  FileText, 
  Plus, 
  Printer, 
  Search,
  Filter,
  Trash2,
  CheckCircle,
  Clock,
  ArrowLeftRight,
  TrendingDown,
  DollarSign
} from 'lucide-react';
import { format } from 'date-fns';
import { School, InvestorPayment } from '../types';
import { localDb } from '../services/localDb';
import { formatCurrency } from '../lib/utils';
import { toast } from './Toast';

// Arabic Number to Words Helper
const numberToWordsArabic = (amount: number): string => {
  const units = ["", "واحد", "اثنان", "ثلاثة", "أربعة", "خمسة", "ستة", "سبعة", "ثمانية", "تسعة"];
  const tens = ["", "عشرة", "عشرون", "ثلاثون", "أربعون", "خمسون", "ستون", "سبعون", "ثمانون", "تسعون"];
  const hundreds = ["", "مائة", "مائتان", "ثلاثمائة", "أربعمائة", "خمسمائة", "ستمائة", "سبعمائة", "ثمانمائة", "تسعمائة"];
  
  if (amount === 0) return "صفر";
  if (amount >= 1000000000) return "مبلغ كبير جداً";

  let words = "";

  const billions = Math.floor(amount / 1000000000);
  amount %= 1000000000;
  const millions = Math.floor(amount / 1000000);
  amount %= 1000000;
  const thousands = Math.floor(amount / 1000);
  amount %= 1000;

  if (billions > 0) words += (billions === 1 ? "مليار" : billions === 2 ? "ملياران" : units[billions] + " مليارات") + " و ";
  if (millions > 0) words += (millions === 1 ? "مليون" : millions === 2 ? "مليونان" : units[millions] + " ملايين") + " و ";
  if (thousands > 0) words += (thousands === 1 ? "ألف" : thousands === 2 ? "ألفان" : units[thousands] + " آلاف") + " و ";
  
  const h = Math.floor(amount / 100);
  const t = Math.floor((amount % 100) / 10);
  const u = amount % 10;

  if (h > 0) words += hundreds[h] + " و ";
  if (t === 1 && u > 0) {
    const teens = ["", "أحد عشر", "اثنا عشر", "ثلاثة عشر", "أربعة عشر", "خمسة عشر", "ستة عشر", "سبعة عشر", "ثمانية عشر", "تسعة عشر"];
    words += teens[u];
  } else {
    if (u > 0) words += units[u];
    if (t > 0) words += (u > 0 ? " و " : "") + tens[t];
  }

  return words.trim().replace(/ و$/, "") + " دينار عراقي لا غير";
};

interface InvestorManagerProps {
  school: School;
  investorPayments: InvestorPayment[];
  canModify?: boolean;
}

export default function InvestorManager({ school, investorPayments, canModify = true }: InvestorManagerProps) {
  const [viewType, setViewType] = useState<'electronic' | 'manual'>('electronic');
  const [showAddForm, setShowAddForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [paymentDate, setPaymentDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  // Form State
  const [amount, setAmount] = useState('');
  const [recipient, setRecipient] = useState('');
  const [notes, setNotes] = useState('');
  const [academicYear, setAcademicYear] = useState('2025-2026');
  const [customSchoolName, setCustomSchoolName] = useState(school.name);
  const [ledgerTitle, setLedgerTitle] = useState('سجل تسليم مبالغ المستثمرين (الزمام المالي)');
  
  const [deletingItem, setDeletingItem] = useState<{id: string, title: string} | null>(null);

  const filteredPayments = useMemo(() => {
    return investorPayments.filter(p => 
      p.schoolId === school.id &&
      (p.recipientName.includes(searchTerm) || p.month.includes(searchTerm)) &&
      (selectedMonth ? p.month === selectedMonth : true)
    ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [investorPayments, school.id, searchTerm, selectedMonth]);

  const handleAddPayment = (e: React.FormEvent) => {
    e.preventDefault();
    const newPayment: InvestorPayment = {
      id: crypto.randomUUID(),
      schoolId: school.id,
      amount: Number(amount),
      date: new Date(paymentDate).toISOString(),
      month: selectedMonth,
      recipientName: recipient || 'المستثمر الرئيسي',
      notes,
      academicYear,
      createdAt: new Date().toISOString()
    };

    localDb.add('investorPayments', newPayment);
    toast.success('تم تسجيل الدفعة النقدية بنجاح');
    setShowAddForm(false);
    resetForm();
    
    // Auto Print Receipt
    printReceipt(newPayment);
  };

  const resetForm = () => {
    setAmount('');
    setRecipient('');
    setNotes('');
    setPaymentDate(format(new Date(), 'yyyy-MM-dd'));
  };

  const printReceipt = (payment: InvestorPayment) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const receiptContent = (copyType: string) => `
      <div class="border-box">
        <div class="copy-label">${copyType}</div>
        ${school.logo ? `<img class="watermark" src="${school.logo}" />` : ''}
        <div class="header">
          <div class="school-info" style="display: flex; align-items: center; gap: 10px;">
            ${school.logo ? `<img src="${school.logo}" style="height: 50px; object-fit: contain;" />` : ''}
            <div>
              <h1>${customSchoolName}</h1>
              <p>العام الدراسي: ${payment.academicYear}</p>
            </div>
          </div>
          <div style="text-align: left">
            <p>التاريخ: ${format(new Date(payment.date), 'yyyy/MM/dd')}</p>
            <p>رقم الوصل: ${payment.id.slice(0, 5).toUpperCase()}</p>
          </div>
        </div>

        <div class="receipt-title">وصل تسليم نقدية (للمستثمر)</div>

        <div class="content-row">
          استلمنا نحن <strong>${payment.recipientName}</strong> من مدرسة <strong>${school.name}</strong> 
          مبلغاً وقدره: <span class="amount-box">${formatCurrency(payment.amount)}</span>
        </div>
        
        <div class="content-row" style="font-weight: bold; color: #475569;">
          كتابةً: ${numberToWordsArabic(payment.amount)}
        </div>

        <div class="content-row">
          وذلك عن: <strong>${payment.notes || `دفعة شهر ${payment.month}`}</strong>
        </div>

        <div class="footer">
          <div class="signature">
            <p>توقيع المستلم</p>
            <div class="signature-line"></div>
          </div>

        </div>
      </div>
    `;

    const receiptHtml = `
      <html>
        <head>
          <title>وصل تسليم مبلغ - ${school.name}</title>
          <style>
            @page { size: A4 portrait; margin: 10mm; }
            body { 
              font-family: 'Arial', sans-serif; 
              direction: rtl; 
              padding: 0; 
              color: #1a1a1a;
              background: #fff;
            }
            .receipt-container {
              display: flex;
              flex-direction: column;
              gap: 15mm;
            }
            .border-box {
              border: 4px double #1e3a8a;
              padding: 8mm;
              height: 100mm;
              position: relative;
              box-sizing: border-box;
            }
            .copy-label {
              position: absolute;
              top: 4mm;
              left: 4mm;
              background: #f1f5f9;
              padding: 1mm 4mm;
              border-radius: 4px;
              font-size: 8pt;
              font-weight: bold;
              color: #64748b;
              border: 1px solid #e2e8f0;
            }
            .header {
              display: flex;
              justify-content: space-between;
              align-items: center;
              margin-bottom: 3mm;
              border-bottom: 2px solid #1e3a8a;
              padding-bottom: 2mm;
            }
            .school-info h1 { margin: 0; font-size: 16pt; color: #1e3a8a; }
            .school-info p { margin: 1mm 0; font-size: 9pt; font-weight: bold; }
            .receipt-title {
              text-align: center;
              font-size: 14pt;
              font-weight: 900;
              background: #1e3a8a;
              color: white;
              padding: 1.5mm;
              margin: 3mm 0;
              border-radius: 4px;
            }
            .content-row {
              margin: 3mm 0;
              font-size: 11pt;
              line-height: 1.6;
            }
            .amount-box {
              display: inline-block;
              border: 2px solid #1e3a8a;
              padding: 1.5mm 4mm;
              font-weight: 900;
              font-size: 13pt;
              background: #f8fafc;
            }
            .footer {
              display: flex;
              justify-content: space-between;
              margin-top: 6mm;
            }
            .signature {
              text-align: center;
              width: 40%;
            }
            .signature-line {
              border-bottom: 1px solid #000;
              margin-top: 6mm;
              height: 1px;
            }
            .watermark {
              position: absolute;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%);
              opacity: 0.05;
              z-index: -1;
              width: 40mm;
            }
            .divider {
              border-top: 2px dashed #cbd5e1;
              margin: 5mm 0;
              position: relative;
            }
            .divider::after {
              content: '✂';
              position: absolute;
              top: -12px;
              right: 50%;
              background: white;
              padding: 0 4px;
              color: #94a3b8;
            }
          </style>
        </head>
        <body>
          <div class="receipt-container">
            ${receiptContent('نسخة الإدارة (School Copy)')}
            <div class="divider"></div>
            ${receiptContent('نسخة المستلم (Recipient Copy)')}
          </div>
          <script>
            window.onload = () => {
              window.print();
              setTimeout(() => window.close(), 500);
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(receiptHtml);
    printWindow.document.close();
  };

  return (
    <div className="space-y-2 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header Actions */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-2 bg-white p-5 lg:p-4 rounded-2xl border border-gray-100 shadow-xl shadow-gray-100/50 relative overflow-hidden">
        {/* Decor */}
        <div className="absolute top-0 left-0 w-64 h-64 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-full blur-[60px] -ml-20 -mt-20 pointer-events-none" />

        <div className="flex items-center gap-3 relative z-10 text-right">
          <div className="bg-gradient-to-br from-blue-600 to-blue-800 p-4 rounded-2xl text-white shadow-2xl shadow-blue-200 group hover:scale-105 transition-transform duration-500">
            <TrendingDown className="w-6 h-6 group-hover:-translate-y-1 group-hover:scale-110 transition-transform duration-500" />
          </div>
          <div>
            <h1 className="text-4xl font-black text-gray-900 tracking-tight leading-relaxed">سجل تسليم المستثمر</h1>
            <p className="text-gray-500 font-bold text-sm mt-1">إدارة المبالغ المسلمة للمستثمر وتوثيقها ببيانات آمنة ومشفرة</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-2 relative z-10 w-full xl:w-auto">
          <div className="flex bg-gray-50 p-2 rounded-xl border border-gray-100 shadow-inner w-full sm:w-auto">
            <button
              onClick={() => setViewType('electronic')}
              className={`px-8 py-3.5 rounded-[1.2rem] font-black transition-all flex-1 sm:flex-none text-sm ${
                viewType === 'electronic' ? 'bg-white text-blue-700 shadow-md transform scale-100' : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100 scale-95'
              }`}
            >
              سجل إلكتروني
            </button>
            <button
              onClick={() => setViewType('manual')}
              className={`px-8 py-3.5 rounded-[1.2rem] font-black transition-all flex-1 sm:flex-none text-sm ${
                viewType === 'manual' ? 'bg-white text-blue-700 shadow-md transform scale-100' : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100 scale-95'
              }`}
            >
              سجل يدوي (دفتري)
            </button>
          </div>
          {canModify && (
            <button
              onClick={() => setShowAddForm(true)}
              className="flex items-center justify-center w-full sm:w-auto gap-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-10 py-2.5 rounded-xl font-black hover:from-blue-700 hover:to-blue-800 transition-all shadow-xl shadow-blue-200 hover:-translate-y-1 active:translate-y-0 text-sm h-[60px]"
            >
              <Plus className="w-5 h-5 bg-white/20 rounded-full p-0.5" />
              <span>إضافة تسليم جديد</span>
            </button>
          )}
        </div>
      </div>

      {/* Add Form Modal */}
      
        {showAddForm && (
          <div className="integrated-page z-[300] no-scrollbar">
            <div className="modal-content">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-white relative z-50 sticky top-0 shadow-sm px-12">
                <div className="flex items-center gap-3 text-right leading-relaxed">
                  <div className="theme-bg p-4 rounded-2xl text-white shadow-xl theme-shadow">
                    <TrendingDown className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-900 tracking-tight text-slate-900 tracking-tight leading-relaxed">تسجيل دفعة نقدية جديدة للمستثمر</h3>
                    <p className="text-sm font-bold text-slate-400 mt-1 leading-relaxed">توثيق تسليم المبالغ من الزمام المالي للمدرسة</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowAddForm(false)} 
                  className="p-4 hover:bg-rose-50 rounded-2xl transition-all text-slate-300 hover:text-rose-500 border border-slate-50"
                >
                  <ArrowLeftRight className="w-6 h-6 rotate-45" />
                </button>
              </div>

              <form onSubmit={handleAddPayment} className="flex-1 flex flex-col overflow-hidden">
                <div className="flex-1 overflow-y-auto p-4 lg:p-5 custom-scrollbar w-full bg-slate-50/20 custom-scrollbar">
                  <div className="max-w-5xl mx-auto w-full /space-y-2">
                    <div className="bg-white p-4 lg:p-14 rounded-3xl border border-slate-100 shadow-xl space-y-2 text-right">
                      <div className="space-y-2">
                        <label className="block text-sm font-black text-indigo-600 pr-8 uppercase tracking-widest leading-relaxed">المبلغ المسلم (بالدينار العراقي)</label>
                        <div className="relative group">
                          <DollarSign className="absolute right-8 top-1/2 -translate-y-1/2 text-indigo-400 w-6 h-6" />
                          <input
                            type="number"
                            required
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            className="w-full bg-indigo-50 border border-indigo-100 rounded-2xl py-10 pr-24 pl-10 font-black text-5xl text-indigo-600 focus:ring-2 focus:ring-indigo-100/50 outline-none transition-all shadow-inner"
                            placeholder="0.00"
                          />
                        </div>
                        {amount && (
                          <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100 text-xl font-black text-slate-600 leading-relaxed">
                            <span className="text-indigo-500 ml-2">المبلغ كتابةً:</span>
                            {numberToWordsArabic(Number(amount))}
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <label className="block text-xs font-black text-slate-400 pr-6 uppercase tracking-widest leading-relaxed">تاريخ التسليم</label>
                          <input
                            type="date"
                            required
                            value={paymentDate}
                            onChange={(e) => setPaymentDate(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-6 px-10 font-black text-xl outline-none focus:ring-2 focus:ring-slate-100 transition-all shadow-inner text-left"
                            dir="ltr"
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="block text-xs font-black text-slate-400 pr-6 uppercase tracking-widest leading-relaxed">اسم الشخص المستلم</label>
                          <input
                            type="text"
                            required
                            value={recipient}
                            onChange={(e) => setRecipient(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-6 px-10 font-black text-xl outline-none focus:ring-2 focus:ring-slate-100 transition-all shadow-inner"
                            placeholder="اكتب اسم المستلم..."
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="block text-xs font-black text-slate-400 pr-6 uppercase tracking-widest leading-relaxed">اسم المؤسسة (للطباعة)</label>
                          <input
                            type="text"
                            value={customSchoolName}
                            onChange={(e) => setCustomSchoolName(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-6 px-10 font-black text-xl outline-none focus:ring-2 focus:ring-slate-100 transition-all shadow-inner"
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="block text-xs font-black text-slate-400 pr-6 uppercase tracking-widest leading-relaxed">شهر الاستحقاق المالي</label>
                          <input
                            type="month"
                            required
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-6 px-10 font-black text-xl outline-none focus:ring-2 focus:ring-slate-100 transition-all shadow-inner text-left"
                            dir="ltr"
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="block text-xs font-black text-slate-400 pr-6 uppercase tracking-widest leading-relaxed">العام الدراسي الحالي</label>
                          <select
                            value={academicYear}
                            onChange={(e) => setAcademicYear(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-6 px-10 font-black text-xl outline-none focus:ring-2 focus:ring-slate-100 transition-all shadow-inner appearance-none cursor-pointer"
                          >
                            <option value="2024-2025">2024-2025</option>
                            <option value="2025-2026">2025-2026</option>
                            <option value="2026-2027">2026-2027</option>
                          </select>
                        </div>

                        <div className="col-span-1 md:col-span-2 space-y-2">
                          <label className="block text-xs font-black text-slate-400 pr-6 uppercase tracking-widest leading-relaxed">البيان والملاحظات الإضافية</label>
                          <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-8 px-10 font-black text-xl outline-none focus:ring-2 focus:ring-slate-100 transition-all shadow-inner min-h-[150px] leading-relaxed"
                            placeholder="تفاصيل إضافية عن دفعة التسليم..."
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-white border-t border-slate-100 flex items-center justify-center sticky bottom-0 z-50">
                  <button
                    type="submit"
                    className="w-full max-w-2xl theme-bg text-white font-black py-8 rounded-2xl hover:scale-[1.02] active:scale-[0.98] shadow-2xl theme-shadow transition-all flex items-center justify-center gap-3 text-xl"
                  >
                    <Printer className="w-6 h-6" />
                    <span>تأكيد وطباعة الوصل الرسمي</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      

      {/* Main Content View */}
      {viewType === 'electronic' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-2 lg:gap-3">
          {/* List Section */}
          <div className="lg:col-span-2 space-y-2">
            <div className="bg-white p-5 lg:p-4 rounded-2xl border border-gray-100 shadow-xl shadow-gray-100/50 space-y-2 relative overflow-hidden">
               {/* Decorative Gradient Background */}
              <div className="absolute top-0 right-0 w-80 h-80 bg-blue-50 rounded-full blur-[80px] -mr-40 -mt-40 opacity-60 pointer-events-none" />
              
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 relative z-10 w-full bg-gray-50/50 p-4 rounded-2xl border border-gray-100">
                <div className="relative flex-1 w-full sm:max-w-md">
                  <Search className="absolute right-5 top-1/2 -translate-y-1/2 text-blue-400 w-6 h-6" />
                  <input
                    type="text"
                    placeholder="بحث في المبالغ..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-white border border-gray-200 rounded-xl py-2 pr-14 pl-6 font-black text-gray-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all shadow-sm"
                  />
                </div>
                <div className="flex items-center gap-3 w-full sm:w-auto bg-white p-2.5 rounded-xl border border-gray-200 shadow-sm">
                  <span className="w-6 h-6 flex items-center justify-center bg-blue-50 text-blue-600 rounded-xl mr-1">
                    <Filter className="w-5 h-5" />
                  </span>
                  <input
                    type="month"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="bg-transparent border-none text-gray-700 ml-2 font-black outline-none cursor-pointer text-lg"
                  />
                </div>
              </div>

              <div className="space-y-2">
                {filteredPayments.map((p, idx) => (
                  <div
                    key={p.id} 
                    className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between group hover:border-blue-300 transition-all gap-2 overflow-hidden relative"
                  >
                    <div className="absolute top-0 right-0 w-1.5 h-full bg-blue-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="flex items-center gap-3 flex-1">
                      <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center shrink-0 border border-blue-100 group-hover:scale-110 transition-transform shadow-inner shadow-blue-100/50">
                        <CreditCard className="w-7 h-7 text-blue-600" />
                      </div>
                      <div className="space-y-1.5">
                        <h4 className="font-black text-gray-900 text-lg">{formatCurrency(p.amount)}</h4>
                        <div className="flex items-center gap-2 flex-wrap text-xs font-bold text-gray-500">
                           <span className="flex items-center gap-1.5 py-1 px-2.5 bg-gray-50 rounded-lg border border-gray-100">
                             <User className="w-3.5 h-3.5" />
                             {p.recipientName}
                           </span>
                           <span className="flex items-center gap-1.5 py-1 px-2.5 bg-gray-50 rounded-lg border border-gray-100">
                             <Calendar className="w-3.5 h-3.5" />
                             {format(new Date(p.date), 'yyyy/MM/dd')}
                           </span>
                           <span className="flex items-center gap-1.5 py-1 px-2.5 bg-gray-50 rounded-lg border border-gray-100">
                             <Clock className="w-3.5 h-3.5" />
                             {format(new Date(p.date), 'HH:mm')}
                           </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 justify-between md:justify-end border-t border-gray-100 md:border-0 pt-4 md:pt-0">
                       <p className="text-xs font-bold text-gray-400 bg-gray-50/80 px-3 py-1.5 min-h-[38px] rounded-xl max-w-[200px] md:max-w-[150px] lg:max-w-[200px] truncate border border-gray-100" title={p.notes || `دفعة شهر ${p.month}`}>
                         {p.notes || `دفعة شهر ${p.month}`}
                       </p>
                       <div className="flex items-center gap-2">
                         <button 
                           onClick={() => printReceipt(p)}
                           className="flex justify-center items-center gap-2 px-5 py-2.5 bg-blue-50 text-blue-600 font-black text-xs rounded-xl hover:bg-blue-600 hover:text-white transition-all shadow-sm hover:shadow-blue-200"
                         >
                           <Printer className="w-4 h-4" />
                           طباعة
                         </button>
                         {canModify && (
                           <button 
                             onClick={() => setDeletingItem({ id: p.id, title: formatCurrency(p.amount) })}
                             className="p-2.5 bg-red-50 text-red-600 rounded-xl hover:bg-red-600 hover:text-white transition-all shadow-sm hover:shadow-red-200"
                             title="حذف السجل"
                           >
                             <Trash2 className="w-4 h-4" />
                           </button>
                         )}
                       </div>
                    </div>
                  </div>
                ))}
                
                {filteredPayments.length === 0 && (
                   <div className="text-center py-24 bg-gray-50/50 rounded-2xl border-2 border-dashed border-gray-200">
                     <div className="w-10 h-10 bg-white rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-sm border border-gray-100">
                       <CreditCard className="w-6 h-6 text-gray-300" />
                     </div>
                     <p className="text-lg font-black text-gray-800">لا توجد مبالغ مسلمة</p>
                     <p className="text-sm font-bold text-gray-400 mt-2">لم يتم تسجيل أي دفعات نقدية للمستثمر في هذا الشهر</p>
                   </div>
                )}
              </div>
            </div>
          </div>

          {/* Statistics Sidebar */}
          <div className="space-y-2">
            <div className="bg-white p-5 lg:p-4 rounded-2xl border border-gray-100 shadow-xl shadow-gray-100/50 relative overflow-hidden group transition-all hover:shadow-2xl">
              <div className="absolute top-0 right-0 w-64 h-64 bg-blue-100/60 rounded-full blur-[80px] -mr-32 -mt-32 transition-transform duration-700 group-hover:scale-150"></div>
              <div className="relative space-y-2">
                <div className="flex justify-between items-start">
                  <div className="bg-gradient-to-br from-blue-500 to-blue-700 w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-200">
                    <TrendingDown className="w-6 h-6" />
                  </div>
                  <div className="bg-blue-50 text-blue-600 px-4 py-2 rounded-xl text-xs font-black border border-blue-100">الشهر المحدد</div>
                </div>
                <div className="space-y-2">
                  <p className="text-gray-400 font-bold text-sm tracking-widest uppercase mb-1">إجمالي المبالغ المسلمة</p>
                  <h3 className="text-5xl font-black text-gray-900 tracking-tighter" dir="rtl">
                    {formatCurrency(filteredPayments.reduce((sum, p) => sum + p.amount, 0))}
                  </h3>
                </div>
                <div className="p-5 bg-gray-50 rounded-xl border border-gray-100 flex items-center justify-between">
                  <span className="text-gray-400 font-black text-sm">العمليات المسجلة</span>
                  <span className="font-black text-gray-900 text-lg bg-white px-4 py-1.5 rounded-lg shadow-sm border border-gray-200">{filteredPayments.length}</span>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-emerald-500 to-emerald-700 p-5 lg:p-4 rounded-2xl text-white shadow-2xl relative overflow-hidden group">
              <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
              <div className="absolute top-0 left-0 w-64 h-64 bg-emerald-300 rounded-full blur-[80px] -ml-32 -mt-32 opacity-50 transition-transform duration-1000 group-hover:translate-x-10 group-hover:translate-y-10"></div>
              <div className="relative space-y-2">
                <div className="flex justify-between items-start">
                  <div className="bg-white text-emerald-600 w-10 h-10 rounded-xl flex items-center justify-center shadow-lg">
                    <CheckCircle className="w-6 h-6" />
                  </div>
                  <div className="bg-emerald-800/40 text-emerald-50 px-4 py-2 rounded-xl text-xs font-black backdrop-blur-md">ارتباط ديناميكي</div>
                </div>
                <div className="space-y-2">
                  <p className="text-emerald-100 font-bold text-sm tracking-widest uppercase mb-1">صافي الإيرادات</p>
                  <h3 className="text-4xl font-black tracking-tight">قيد التطوير</h3>
                </div>
                <div className="p-4 bg-emerald-800/30 rounded-xl backdrop-blur-md border border-emerald-400/20 text-center text-sm text-emerald-50 font-bold leading-relaxed">
                  هذه الخوارزمية ستقوم باحتساب صافي الأرباح تلقائياً بعد خصم المبالغ المسلمة للمستثمر.
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {/* Customization Bar for Ledger */}
          <div className="bg-blue-50 p-4 rounded-3xl border border-blue-100 grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-black text-blue-900 mb-2 mr-2">اسم المؤسسة</label>
              <input 
                type="text" 
                value={customSchoolName}
                onChange={(e) => setCustomSchoolName(e.target.value)}
                className="w-full bg-white border border-blue-200 rounded-xl px-4 py-2 font-black text-blue-600 focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-black text-blue-900 mb-2 mr-2">عنوان السجل</label>
              <input 
                type="text" 
                value={ledgerTitle}
                onChange={(e) => setLedgerTitle(e.target.value)}
                className="w-full bg-white border border-blue-200 rounded-xl px-4 py-2 font-black text-blue-600 focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-black text-blue-900 mb-2 mr-2">العام الدراسي</label>
              <input 
                type="text" 
                value={academicYear}
                onChange={(e) => setAcademicYear(e.target.value)}
                className="w-full bg-white border border-blue-200 rounded-xl px-4 py-2 font-black text-blue-600 focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border-2 border-blue-100 shadow-inner grid grid-cols-1 gap-3 max-w-5xl mx-auto overflow-hidden">
             <div className="text-center space-y-2 border-b-4 border-dashed border-blue-900 pb-4">
                <h2 className="text-4xl font-black text-blue-900">{customSchoolName}</h2>
                <h3 className="text-lg font-black text-gray-700">{ledgerTitle}</h3>
                <p className="text-gray-400 font-bold italic tracking-widest uppercase">INVESTOR FINANCIAL LEDGER • {academicYear}</p>
             </div>
           
           <div className="relative">
             <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-blue-600 text-white">
                    <th className="p-4 border-2 border-blue-800 text-center w-12">ت</th>
                    <th className="p-4 border-2 border-blue-800 text-center">التاريخ</th>
                    <th className="p-4 border-2 border-blue-800 text-center">المبلغ بالأرقام</th>
                    <th className="p-4 border-2 border-blue-800 text-center">البيان / الملاحظات</th>
                    <th className="p-4 border-2 border-blue-800 text-center">توقيع المستلم</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPayments.slice(0, 15).map((p, idx) => (
                    <tr key={p.id} className="h-20 hover:bg-gray-50">
                      <td className="p-4 border-2 border-blue-100 text-center font-black text-gray-400">{idx + 1}</td>
                      <td className="p-4 border-2 border-blue-100 text-center font-bold">{format(new Date(p.date), 'dd/MM/yyyy')}</td>
                      <td className="p-4 border-2 border-blue-100 text-center font-black text-blue-700">{formatCurrency(p.amount)}</td>
                      <td className="p-4 border-2 border-blue-100 text-right text-sm">
                        <div className="flex flex-col">
                           <span className="font-bold">{p.notes || `دفعة شهر ${p.month}`}</span>
                           <span className="text-[10px] text-gray-400 italic">{numberToWordsArabic(p.amount)}</span>
                        </div>
                      </td>
                      <td className="p-4 border-2 border-blue-100 text-center text-xs text-gray-300 italic">مُوقع إلكترونياً</td>
                    </tr>
                  ))}
                  {[...Array(Math.max(0, 8 - filteredPayments.length))].map((_, i) => (
                    <tr key={`empty-${i}`} className="h-20 opacity-30">
                      <td className="p-4 border-2 border-blue-50 text-center font-black text-gray-200">{filteredPayments.length + i + 1}</td>
                      <td className="p-4 border-2 border-blue-50"></td>
                      <td className="p-4 border-2 border-blue-50"></td>
                      <td className="p-4 border-2 border-blue-50"></td>
                      <td className="p-4 border-2 border-blue-50"></td>
                    </tr>
                  ))}
                </tbody>
             </table>
             
             {/* Authentic Look Overlay */}
             <div className="absolute top-0 right-0 w-full h-full pointer-events-none border-4 border-blue-900/10 rounded-lg"></div>
           </div>

           <div className="flex justify-between items-end px-12 pt-8">
              <div className="text-center space-y-2">
                <p className="font-black text-blue-900 underline underline-offset-8">توقيع الحسابات</p>
                <div className="h-32"></div>
              </div>
              <div className="text-center space-y-2">
                <p className="text-xs text-gray-400">تاريخ الطباعة: {format(new Date(), 'yyyy/MM/dd HH:mm')}</p>
                <div className="flex items-center gap-2 bg-gray-50 px-4 py-2 rounded-xl">
                   <Clock className="w-4 h-4 text-blue-400" />
                   <span className="text-xs font-bold text-gray-500">نظام الإدارة المالي المتكامل</span>
                </div>
              </div>
           </div>
        </div>
      </div>
    )}

      {deletingItem && (
        <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8 text-center space-y-6">
              <div className="w-24 h-24 bg-rose-50 rounded-full mx-auto flex items-center justify-center text-rose-500 mb-6">
                <Trash2 className="w-12 h-12" />
              </div>
              <h3 className="text-3xl font-black text-gray-900 tracking-tight">تأكيد الحذف</h3>
              <p className="text-lg text-gray-500 font-bold leading-relaxed">
                هل أنت متأكد من حذف مبلغ <span className="text-rose-600">"{deletingItem.title}"</span>؟
                <br />
                <span className="text-sm font-medium">لا يمكن التراجع عن هذا الإجراء بعد تنفيذه.</span>
              </p>
              
              <div className="flex flex-col gap-3 pt-4">
                <button 
                  onClick={() => {
                    localDb.delete('investorPayments', deletingItem.id);
                    setDeletingItem(null);
                  }}
                  className="w-full bg-rose-600 text-white py-4 rounded-2xl font-black text-lg shadow-xl shadow-rose-200 hover:bg-rose-700 active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  <Trash2 className="w-6 h-6" />
                  نعم، تأكيد الحذف
                </button>
                <button 
                  onClick={() => setDeletingItem(null)}
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
