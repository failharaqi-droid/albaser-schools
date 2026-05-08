import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
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

  // Form State
  const [amount, setAmount] = useState('');
  const [recipient, setRecipient] = useState('');
  const [notes, setNotes] = useState('');
  const [academicYear, setAcademicYear] = useState('2025-2026');
  const [customSchoolName, setCustomSchoolName] = useState(school.name);
  const [ledgerTitle, setLedgerTitle] = useState('سجل تسليم مبالغ المستثمرين (الزمام المالي)');

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
      date: new Date().toISOString(),
      month: selectedMonth,
      recipientName: recipient || 'المستثمر الرئيسي',
      notes,
      academicYear,
      createdAt: new Date().toISOString()
    };

    localDb.add('investorPayments', newPayment);
    setShowAddForm(false);
    resetForm();
    
    // Auto Print Receipt
    printReceipt(newPayment);
  };

  const resetForm = () => {
    setAmount('');
    setRecipient('');
    setNotes('');
  };

  const printReceipt = (payment: InvestorPayment) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const receiptContent = (copyType: string) => `
      <div class="border-box">
        <div class="copy-label">${copyType}</div>
        ${school.logo ? `<img class="watermark" src="${school.logo}" />` : ''}
        <div class="header">
          <div class="school-info">
            <h1>${customSchoolName}</h1>
            <p>العام الدراسي: ${payment.academicYear}</p>
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
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header Actions */}
      <div className="flex flex-wrap items-center justify-between gap-6 bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
        <div className="flex items-center gap-6">
          <div className="bg-blue-600 p-4 rounded-3xl text-white shadow-xl shadow-blue-100">
            <TrendingDown className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-gray-900 tracking-tight">سجل تسليم المستثمر</h1>
            <p className="text-gray-500 font-bold">إدارة المبالغ المسلمة للمستثمر وتوثيقها</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex bg-gray-100 p-1 rounded-2xl">
            <button
              onClick={() => setViewType('electronic')}
              className={`px-6 py-2 rounded-xl font-black transition-all ${
                viewType === 'electronic' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              سجل إلكتروني
            </button>
            <button
              onClick={() => setViewType('manual')}
              className={`px-6 py-2 rounded-xl font-black transition-all ${
                viewType === 'manual' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              سجل يدوي (دفتري)
            </button>
          </div>
          {canModify && (
            <button
              onClick={() => setShowAddForm(true)}
              className="flex items-center gap-2 bg-blue-600 text-white px-8 py-3 rounded-2xl font-black hover:bg-blue-700 transition-all shadow-lg shadow-blue-100"
            >
              <Plus className="w-5 h-5" />
              <span>إضافة تسليم جديد</span>
            </button>
          )}
        </div>
      </div>

      {/* Add Form Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-6">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-[3rem] p-10 max-w-xl w-full shadow-2xl space-y-8"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-black text-gray-900">إضافة مبلغ مسلم للمستثمر</h2>
              <button onClick={() => setShowAddForm(false)} className="p-3 hover:bg-gray-100 rounded-full transition-colors text-gray-400">
                <ArrowLeftRight className="w-6 h-6 rotate-45" />
              </button>
            </div>

            <form onSubmit={handleAddPayment} className="grid grid-cols-2 gap-6">
              <div className="col-span-2">
                <label className="block text-sm font-black text-gray-700 mb-2 mr-2">المبلغ (دينار عراقي)</label>
                <div className="relative">
                  <DollarSign className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="number"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl py-4 pr-12 pl-4 font-black text-xl text-blue-600 focus:border-blue-500 outline-none transition-all"
                    placeholder="0.00"
                  />
                </div>
                {amount && (
                  <p className="mt-2 text-xs text-blue-500 font-bold mr-2">تدرج كتابةً: {numberToWordsArabic(Number(amount))}</p>
                )}
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-black text-gray-700 mb-2 mr-2">اسم المدرسة (للوصل)</label>
                <input
                  type="text"
                  value={customSchoolName}
                  onChange={(e) => setCustomSchoolName(e.target.value)}
                  className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl py-3 px-4 font-black outline-none focus:border-blue-500 transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-black text-gray-700 mb-2 mr-2">الشهر</label>
                <input
                  type="month"
                  required
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl py-3 px-4 font-black outline-none focus:border-blue-500 transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-black text-gray-700 mb-2 mr-2">العام الدراسي</label>
                <select
                  value={academicYear}
                  onChange={(e) => setAcademicYear(e.target.value)}
                  className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl py-3 px-4 font-black outline-none focus:border-blue-500 transition-all"
                >
                  <option value="2024-2025">2024-2025</option>
                  <option value="2025-2026">2025-2026</option>
                  <option value="2026-2027">2026-2027</option>
                </select>
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-black text-gray-700 mb-2 mr-2">اسم المستلم</label>
                <input
                  type="text"
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl py-3 px-4 font-black outline-none focus:border-blue-500 transition-all"
                  placeholder="اترك فارغاً للمستثمر الرئيسي"
                />
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-black text-gray-700 mb-2 mr-2">ملاحظات إضافية</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl py-3 px-4 font-black outline-none focus:border-blue-500 transition-all min-h-[100px]"
                  placeholder="تفاصيل إضافية عن التسليم..."
                />
              </div>

              <div className="col-span-2 flex gap-4 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white font-black py-4 rounded-2xl hover:bg-blue-700 shadow-xl shadow-blue-100 transition-all flex items-center justify-center gap-2"
                >
                  <Printer className="w-5 h-5" />
                  <span>تثبيت وطباعة الوصل</span>
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Main Content View */}
      {viewType === 'electronic' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* List Section */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="بحث في المبالغ المسلمة..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-2xl py-3 pr-12 pl-4 font-black outline-none focus:border-blue-500 transition-all"
                  />
                </div>
                <div className="flex items-center gap-2 mr-4">
                  <Filter className="w-4 h-4 text-gray-400" />
                  <input
                    type="month"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="bg-gray-50 border border-secondary-200 rounded-xl px-4 py-2 font-black outline-none"
                  />
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50/50">
                      <th className="px-6 py-4 text-right text-sm font-black text-gray-500">التاريخ</th>
                      <th className="px-6 py-4 text-right text-sm font-black text-gray-500">المبلغ</th>
                      <th className="px-6 py-4 text-right text-sm font-black text-gray-500">المستلم</th>
                      <th className="px-6 py-4 text-right text-sm font-black text-gray-500">البيان</th>
                      <th className="px-6 py-4 text-center text-sm font-black text-gray-500">إجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredPayments.map((p) => (
                      <tr key={p.id} className="hover:bg-gray-50/50 transition-colors group">
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="font-black text-gray-900">{format(new Date(p.date), 'yyyy/MM/dd')}</span>
                            <span className="text-xs text-gray-400">{format(new Date(p.date), 'HH:mm')}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="font-black text-blue-600">{formatCurrency(p.amount)}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="font-bold text-gray-700">{p.recipientName}</span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500 max-w-[200px] truncate">
                          {p.notes || `دفعة شهر ${p.month}`}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                              onClick={() => printReceipt(p)}
                              className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100"
                            >
                              <Printer className="w-4 h-4" />
                            </button>
                            {canModify && (
                              <button 
                                onClick={() => {
                                  if (confirm('هل أنت متأكد من حذف هذا السجل؟')) {
                                    localDb.delete('investorPayments', p.id);
                                  }
                                }}
                                className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filteredPayments.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-gray-400 font-bold italic">
                          لم يتم العثور على مبالغ مسلمة لهذا الشهر
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Statistics Sidebar */}
          <div className="space-y-6">
            <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-full blur-3xl -mr-16 -mt-16 transition-all group-hover:scale-150"></div>
              <div className="relative space-y-4">
                <div className="bg-blue-100 w-12 h-12 rounded-2xl flex items-center justify-center text-blue-600">
                  <TrendingDown className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-gray-500 font-bold mb-1">إجمالي المسلم (للشهر المحدد)</p>
                  <h3 className="text-3xl font-black text-blue-600 tracking-tight">
                    {formatCurrency(filteredPayments.reduce((sum, p) => sum + p.amount, 0))}
                  </h3>
                </div>
                <div className="pt-4 border-t border-gray-50 flex items-center justify-between text-sm">
                  <span className="text-gray-400 font-bold">عدد العمليات:</span>
                  <span className="font-black text-gray-900">{filteredPayments.length}</span>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-emerald-600 to-emerald-700 p-8 rounded-[2rem] text-white shadow-xl shadow-emerald-100">
              <div className="space-y-4">
                <div className="bg-white/20 w-12 h-12 rounded-2xl flex items-center justify-center">
                  <CheckCircle className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-emerald-100 font-bold mb-1">صافي الإيرادات بعد الاستلام</p>
                  <h3 className="text-3xl font-black tracking-tight">قيد التطوير</h3>
                  <p className="text-xs text-emerald-200 mt-2 italic">يتم الربط مع الميزانية العامة تلقائياً</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Customization Bar for Ledger */}
          <div className="bg-blue-50 p-6 rounded-3xl border border-blue-100 grid grid-cols-1 md:grid-cols-3 gap-6">
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

          <div className="bg-white p-12 rounded-[2.5rem] border-2 border-blue-100 shadow-inner grid grid-cols-1 gap-12 max-w-5xl mx-auto overflow-hidden">
             <div className="text-center space-y-4 border-b-4 border-dashed border-blue-900 pb-8">
                <h2 className="text-4xl font-black text-blue-900">{customSchoolName}</h2>
                <h3 className="text-2xl font-black text-gray-700">{ledgerTitle}</h3>
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
              <div className="text-center space-y-6">
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
    </div>
  );
}
