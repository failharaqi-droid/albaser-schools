import { useState, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useReactToPrint } from 'react-to-print';
import { School, Staff, StaffPayment, StaffInvoice, AttendanceRecord } from '../types';
import { localDb } from '../services/localDb';
import { 
  UserPlus, 
  Edit2, 
  Trash2, 
  DollarSign, 
  Calendar, 
  CheckCircle2, 
  X, 
  Plus,
  AlertCircle,
  Eye,
  Briefcase,
  Phone,
  BarChart3,
  ChevronLeft,
  FileText,
  UserCheck,
  Printer,
  LayoutGrid,
  Table as TableIcon,
  Zap,
  ScanLine
} from 'lucide-react';
import { formatCurrency, generateNumericBarcode } from '../lib/utils';
import { format, eachMonthOfInterval, subMonths, addMonths, isSameMonth } from 'date-fns';
import { ar } from 'date-fns/locale';

interface StaffManagerProps {
  school: School;
  staff: Staff[];
  staffPayments: StaffPayment[];
  staffInvoices: StaffInvoice[];
  attendanceRecords: AttendanceRecord[];
  canModify?: boolean;
}

export default function StaffManager({ 
  school, staff, staffPayments, staffInvoices, attendanceRecords, canModify = true
}: StaffManagerProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [viewMode, setViewMode] = useState<'cards' | 'summary'>('cards');
  const [isAddingInvoice, setIsAddingInvoice] = useState<Staff | null>(null);
  const [editingInvoice, setEditingInvoice] = useState<StaffInvoice | null>(null);
  const [viewingInvoicesFor, setViewingInvoicesFor] = useState<Staff | null>(null);
  const [selectedStaffForProfile, setSelectedStaffForProfile] = useState<Staff | null>(null);
  const [deletingStaff, setDeletingStaff] = useState<Staff | null>(null);
  const [isPreviewingPayroll, setIsPreviewingPayroll] = useState(false);
  const [stampConfig, setStampConfig] = useState({
    showAccountant: true,
    showPrincipal: true
  });

  const payrollRef = useRef<HTMLDivElement>(null);
  const handlePrintPayroll = useReactToPrint({ 
    contentRef: payrollRef,
    documentTitle: `سجل رواتب - ${selectedMonth}`
  });

  const [formData, setFormData] = useState({ 
    name: '', 
    salary: '', 
    role: '', 
    phone: '', 
    attendanceBarcode: '',
    deductionAmount: '',
    fingerprintId: '',
    dob: '',
    workingDays: [0, 1, 2, 3, 4, 5] // Default Sun to Fri
  });
  const [invoiceData, setInvoiceData] = useState({ amount: '', description: '' });

  const months = useMemo(() => {
    const start = subMonths(new Date(), 6);
    const end = addMonths(new Date(), 6);
    return eachMonthOfInterval({ start, end }).map(m => format(m, 'yyyy-MM'));
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingStaff) {
      localDb.update('staff', editingStaff.id, { 
        ...formData, 
        salary: Number(formData.salary),
        deductionAmount: Number(formData.deductionAmount),
        attendanceBarcode: (formData.attendanceBarcode || editingStaff.attendanceBarcode || generateNumericBarcode()).replace(/\D/g, '')
      });
    } else {
      localDb.add('staff', { 
        ...formData, 
        schoolId: school.id, 
        salary: Number(formData.salary),
        deductionAmount: Number(formData.deductionAmount),
        attendanceBarcode: (formData.attendanceBarcode || generateNumericBarcode()).replace(/\D/g, '')
      });
    }
    resetForm();
  };

  const resetForm = () => {
    setFormData({ 
      name: '', 
      salary: '', 
      role: '', 
      phone: '', 
      attendanceBarcode: '',
      deductionAmount: '', 
      fingerprintId: '',
      dob: '',
      workingDays: [0, 1, 2, 3, 4, 5] 
    });
    setIsAdding(false);
    setEditingStaff(null);
  };

  const startEdit = (member: Staff) => {
    setEditingStaff(member);
    setFormData({
      name: member.name,
      salary: member.salary.toString(),
      role: member.role,
      phone: member.phone || '',
      attendanceBarcode: member.attendanceBarcode || '',
      deductionAmount: (member.deductionAmount || 0).toString(),
      fingerprintId: member.fingerprintId || '',
      dob: member.dob || '',
      workingDays: member.workingDays || [0, 1, 2, 3, 4, 5]
    });
    setIsAdding(true);
  };

  const calculateDeductions = (staffId: string, month: string) => {
    return attendanceRecords.filter(r => 
      r.entityId === staffId && 
      r.type === 'staff' && 
      r.status === 'absent' && 
      r.date.startsWith(month)
    ).length;
  };

  const confirmPayment = (staffMember: Staff) => {
    const existing = staffPayments.find(p => p.staffId === staffMember.id && p.month === selectedMonth);
    if (existing) {
      if (confirm('هل أنت متأكد من إلغاء تأكيد الدفع لهذا الشهر؟')) {
        localDb.delete('staffPayments', existing.id);
      }
      return;
    }

    const invoices = staffInvoices.filter(i => 
      i.staffId === staffMember.id && 
      format(new Date(i.date), 'yyyy-MM') === selectedMonth
    );
    const totalInvoices = invoices.reduce((sum, i) => sum + i.amount, 0);
    const absences = calculateDeductions(staffMember.id, selectedMonth);
    const totalAbsenceDeduction = absences * (staffMember.deductionAmount || 0);
    const netSalary = staffMember.salary - totalInvoices - totalAbsenceDeduction;

    if (confirm(`هل تريد تأكيد دفع الراتب الصافي بقيمة ${formatCurrency(netSalary)} (بعد خصم ${formatCurrency(totalInvoices)} فواتير و ${formatCurrency(totalAbsenceDeduction)} غيابات)؟`)) {
      localDb.add('staffPayments', {
        staffId: staffMember.id,
        month: selectedMonth,
        amount: netSalary,
        date: new Date().toISOString(),
        status: 'paid'
      });
    }
  };

  const addInvoice = (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoiceData.amount) return;
    
    if (editingInvoice) {
      localDb.update('staffInvoices', editingInvoice.id, {
        amount: Number(invoiceData.amount),
        description: invoiceData.description
      });
    } else if (isAddingInvoice) {
      localDb.add('staffInvoices', {
        staffId: isAddingInvoice.id,
        amount: Number(invoiceData.amount),
        description: invoiceData.description,
        date: new Date().toISOString()
      });
    }
    
    setIsAddingInvoice(null);
    setEditingInvoice(null);
    setInvoiceData({ amount: '', description: '' });
  };

  const deleteInvoice = (id: string) => {
    if (confirm('هل أنت متأكد من حذف هذا المصرف؟')) {
      localDb.delete('staffInvoices', id);
    }
  };

  const staffProfileData = useMemo(() => {
    if (!selectedStaffForProfile) return null;
    const member = selectedStaffForProfile;
    const payments = staffPayments.filter(p => p.staffId === member.id).sort((a, b) => b.month.localeCompare(a.month));
    const invoices = staffInvoices.filter(i => i.staffId === member.id).sort((a, b) => b.date.localeCompare(a.date));
    const records = attendanceRecords.filter(r => r.entityId === member.id && r.type === 'staff').sort((a,b) => b.date.localeCompare(a.date));
    
    const absences = records.filter(r => r.status === 'absent').length;
    const present = records.filter(r => r.status === 'present').length;
    const attendanceRate = records.length > 0 ? Math.round((present / records.length) * 100) : 100;

    return {
      payments,
      invoices,
      records: records.slice(0, 10),
      absences,
      attendanceRate
    };
  }, [selectedStaffForProfile, staffPayments, staffInvoices, attendanceRecords]);

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-6">
          <div className="p-4 bg-blue-50 text-blue-600 rounded-3xl">
            <Calendar className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-2xl font-black text-gray-900">إدارة رواتب الموظفين</h3>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-sm text-gray-500 font-bold">عرض الرواتب لشهر:</span>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="bg-gray-100 border-none rounded-xl px-4 py-2 font-black text-blue-600 outline-none focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer"
              >
                {months.map(m => (
                   <option key={m} value={m}>
                     {format(new Date(m), 'MMMM yyyy', { locale: ar })}
                   </option>
                ))}
              </select>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex bg-gray-100 p-1.5 rounded-2xl border border-gray-200">
            <button
              onClick={() => setViewMode('cards')}
              className={`p-3 rounded-xl transition-all flex items-center gap-2 ${
                viewMode === 'cards' 
                  ? 'bg-white shadow-md text-blue-600' 
                  : 'text-gray-400 hover:text-gray-600'
              }`}
              title="عرض الكروت"
            >
              <LayoutGrid className="w-5 h-5" />
              <span className="text-xs font-black hidden lg:block">عرض الشبكة</span>
            </button>
            <button
              onClick={() => setViewMode('summary')}
              className={`p-3 rounded-xl transition-all flex items-center gap-2 ${
                viewMode === 'summary' 
                  ? 'bg-white shadow-md text-blue-600' 
                  : 'text-gray-400 hover:text-gray-600'
              }`}
              title="ملخص الرواتب"
            >
              <TableIcon className="w-5 h-5" />
              <span className="text-xs font-black hidden lg:block">ملخص الرواتب</span>
            </button>
          </div>
          
          <div className="h-10 w-[1px] bg-gray-200 mx-2 hidden md:block"></div>

          <div className="flex gap-4">
            <button
            onClick={() => setIsPreviewingPayroll(true)}
            className="bg-emerald-50 text-emerald-600 px-8 py-4 rounded-[2rem] font-black flex items-center gap-2 hover:bg-emerald-100 border border-emerald-100 transition-all transform hover:scale-[1.02]"
          >
            <Printer className="w-6 h-6" />
            معاينة سجل الرواتب
          </button>
          {canModify && (
            <button
              onClick={() => setIsAdding(true)}
              className="bg-blue-600 text-white px-8 py-4 rounded-[2rem] font-black flex items-center gap-2 hover:bg-blue-700 shadow-xl shadow-blue-100 transition-all transform hover:scale-[1.02]"
            >
              <UserPlus className="w-6 h-6" />
              إضافة موظف جديد
            </button>
          )}
        </div>
      </div>

      </div>

      <AnimatePresence mode="wait">
        {viewMode === 'cards' ? (
          <motion.div 
            key="grid"
            initial="hidden"
            animate="visible"
            exit="hidden"
            variants={{
              hidden: { opacity: 0 },
              visible: { 
                opacity: 1,
                transition: { staggerChildren: 0.05 }
              }
            }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
          >
            {staff.map(member => {
              const isPaid = staffPayments.some(p => p.staffId === member.id && p.month === selectedMonth);
              const invoices = staffInvoices.filter(i => 
                i.staffId === member.id && 
                format(new Date(i.date), 'yyyy-MM') === selectedMonth
              );
              const totalInvoices = invoices.reduce((sum, i) => sum + i.amount, 0);
              const absences = calculateDeductions(member.id, selectedMonth);
              const totalAbsenceDeduction = absences * (member.deductionAmount || 0);
              const netSalary = member.salary - totalInvoices - totalAbsenceDeduction;

              return (
                <motion.div 
                  key={member.id} 
                  variants={{
                    hidden: { opacity: 0, y: 20, scale: 0.95 },
                    visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.5, ease: "easeOut" } }
                  }}
                  whileHover={{ y: -8, scale: 1.02 }}
                  className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm hover:shadow-2xl transition-all group relative overflow-hidden"
                >
                   {isPaid && (
                      <div className="absolute top-0 right-0 w-24 h-24 overflow-hidden">
                        <div className="bg-emerald-500 text-white text-[10px] font-black py-1 px-10 transform rotate-45 translate-x-6 translate-y-3 text-center shadow-sm">
                          تم الدفع
                        </div>
                      </div>
                   )}
                  
                  <div className="flex justify-between items-start mb-6">
                    <div className="flex items-center gap-4">
                      <div className="bg-blue-50 p-4 rounded-2xl text-blue-600 group-hover:scale-110 transition-transform">
                        <Briefcase className="w-8 h-8" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-black text-xl text-gray-900">{member.name}</h4>
                          {member.fingerprintId && (
                            <div title="بصمة مسجلة">
                              <Zap className="w-4 h-4 text-blue-500 fill-blue-500" />
                            </div>
                          )}
                        </div>
                        <p className="text-sm text-gray-500 font-bold">{member.role}</p>
                      </div>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all translate-x-2 group-hover:translate-x-0">
                      <button onClick={() => setSelectedStaffForProfile(member)} className="p-3 text-emerald-600 hover:bg-emerald-50 rounded-2xl" title="عرض السجل الكامل">
                        <Eye className="w-5 h-5" />
                      </button>
                      {canModify && (
                        <>
                          <button onClick={() => startEdit(member)} className="p-3 text-blue-600 hover:bg-blue-50 rounded-2xl">
                            <Edit2 className="w-5 h-5" />
                          </button>
                          <button onClick={() => setDeletingStaff(member)} className="p-3 text-red-600 hover:bg-red-50 rounded-2xl">
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="space-y-3 mb-8">
                    <div className="flex justify-between items-center p-4 bg-gray-50 rounded-2xl transition-all hover:bg-gray-100">
                      <span className="text-sm text-gray-500 font-bold">الراتب المتفق عليه</span>
                      <span className="font-black text-gray-900">{formatCurrency(member.salary)}</span>
                    </div>
                    <div className="flex justify-between items-center p-4 bg-red-50/50 rounded-2xl">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-red-500 font-bold">خصومات الغياب</span>
                        {absences > 0 && <span className="text-[10px] bg-red-600 px-2 py-1 rounded-lg text-white font-black">{absences} غياب</span>}
                      </div>
                      <span className="font-black text-red-600">{formatCurrency(totalAbsenceDeduction)}</span>
                    </div>
                    <div className="flex justify-between items-center p-4 bg-red-50/50 rounded-2xl">
                      <span className="text-sm text-red-500 font-bold">الفواتير والسلف</span>
                      <span className="font-black text-red-600">{formatCurrency(totalInvoices)}</span>
                    </div>
                    <div className="flex justify-between items-center p-5 bg-blue-600 rounded-[1.5rem] text-white shadow-lg shadow-blue-100">
                      <span className="text-lg font-black italic underline underline-offset-4 decoration-blue-300">الصافي المقرر</span>
                      <span className="text-2xl font-black">{formatCurrency(netSalary)}</span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    {(!isPaid || canModify) && (
                      <button
                        onClick={() => !isPaid ? confirmPayment(member) : null}
                        disabled={isPaid && !canModify}
                        className={`flex-1 flex items-center justify-center gap-3 py-5 rounded-[1.75rem] font-black transition-all ${
                          isPaid ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-600 text-white hover:bg-blue-700 shadow-xl shadow-blue-50'
                        }`}
                      >
                        {isPaid ? <CheckCircle2 className="w-6 h-6" /> : <DollarSign className="w-6 h-6" />}
                        {isPaid ? 'تم تأكيد الدفع' : 'تأكيد دفع الراتب'}
                      </button>
                    )}
                    {canModify && (
                      <button 
                        onClick={() => setIsAddingInvoice(member)} 
                        className="p-5 bg-gray-100 text-gray-600 rounded-[1.75rem] hover:bg-gray-200 transition-all"
                        title="إضافة فاتورة/سلفة"
                      >
                        <Plus className="w-6 h-6" />
                      </button>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        ) : (
          <motion.div
            key="summary"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden"
          >
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-right border-collapse">
                <thead>
                  <tr className="bg-gray-50/80 border-b border-gray-100">
                    <th className="px-8 py-6 font-black text-gray-600 text-sm">الموظف</th>
                    <th className="px-8 py-6 font-black text-gray-600 text-sm text-center">الراتب الأساسي</th>
                    <th className="px-8 py-6 font-black text-gray-600 text-sm text-center">إجمالي الخصومات</th>
                    <th className="px-8 py-6 font-black text-gray-600 text-sm text-center">الصافي</th>
                    <th className="px-8 py-6 font-black text-gray-600 text-sm text-center">الحالة</th>
                    <th className="px-8 py-6 font-black text-gray-600 text-sm text-left">الإجراءات</th>
                  </tr>
                </thead>
                <motion.tbody 
                  initial="hidden"
                  animate="visible"
                  variants={{
                    hidden: { opacity: 0 },
                    visible: { 
                      opacity: 1,
                      transition: { staggerChildren: 0.05 }
                    }
                  }}
                  className="divide-y divide-gray-50"
                >
                  {staff.map((member) => {
                    const isPaid = staffPayments.some(p => p.staffId === member.id && p.month === selectedMonth);
                    const invoices = staffInvoices.filter(i => 
                      i.staffId === member.id && 
                      format(new Date(i.date), 'yyyy-MM') === selectedMonth
                    );
                    const totalInvoices = invoices.reduce((sum, i) => sum + i.amount, 0);
                    const absences = calculateDeductions(member.id, selectedMonth);
                    const totalAbsenceDeduction = absences * (member.deductionAmount || 0);
                    const totalDeductions = totalInvoices + totalAbsenceDeduction;
                    const netSalary = member.salary - totalDeductions;

                    return (
                      <motion.tr 
                        key={member.id} 
                        variants={{
                          hidden: { opacity: 0, x: 10 },
                          visible: { opacity: 1, x: 0 }
                        }}
                        className={`hover:bg-gray-50/50 transition-colors group ${isPaid ? 'bg-emerald-50/20' : ''}`}
                      >
                        <td className="px-8 py-6">
                          <div className="flex items-center gap-4">
                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${isPaid ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-50 text-blue-600'}`}>
                              {isPaid ? <CheckCircle2 className="w-6 h-6" /> : <Briefcase className="w-6 h-6" />}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-black text-gray-900">{member.name}</p>
                                {member.fingerprintId && (
                                  <div className="bg-blue-50 text-blue-600 p-1 rounded-md" title="بصمة مسجلة">
                                    <Zap className="w-3 h-3" />
                                  </div>
                                )}
                              </div>
                              <p className="text-xs text-gray-400 font-bold">{member.role}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-8 py-6 font-bold text-gray-600 text-center">
                          {formatCurrency(member.salary)}
                        </td>
                        <td className="px-8 py-6">
                          <div className="flex flex-col items-center gap-1">
                            <button 
                              onClick={() => setViewingInvoicesFor(member)}
                              className="font-black text-red-600 hover:scale-110 transition-transform underline decoration-red-200 underline-offset-4"
                            >
                              {formatCurrency(totalDeductions)}
                            </button>
                            <div className="flex gap-2">
                              {absences > 0 && <span className="text-[9px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-black">{absences} غيابات</span>}
                              {invoices.length > 0 && <span className="text-[9px] bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded font-black">{invoices.length} فواتير</span>}
                            </div>
                          </div>
                        </td>
                        <td className="px-8 py-6 text-center">
                           <span className={`px-4 py-2 rounded-xl font-black ${isPaid ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-50 text-blue-700'}`}>
                              {formatCurrency(netSalary)}
                           </span>
                        </td>
                        <td className="px-8 py-6 text-center">
                          <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-[10px] font-black border ${
                            isPaid 
                              ? 'bg-emerald-600 text-white border-emerald-700 shadow-sm' 
                              : 'bg-amber-50 text-amber-600 border-amber-100'
                          }`}>
                            <div className={`w-2 h-2 rounded-full ${isPaid ? 'bg-white' : 'bg-amber-500'}`}></div>
                            {isPaid ? 'مكتمل الدفع' : 'بانتظار الدفع'}
                          </div>
                        </td>
                        <td className="px-8 py-6">
                          <div className="flex items-center justify-end gap-2">
                             <button 
                                onClick={() => confirmPayment(member)}
                                className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all font-black text-xs ${
                                  isPaid 
                                    ? 'text-white bg-red-500 hover:bg-red-600' 
                                    : 'text-white bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-50 shadow-emerald-100'
                                }`}
                             >
                                {isPaid ? <X className="w-4 h-4" /> : <DollarSign className="w-4 h-4" />}
                                {isPaid ? "إلغاء التأكيد" : "تأكيد الدفع"}
                             </button>
                             <button 
                                onClick={() => setIsAddingInvoice(member)}
                                className="p-3 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition-all"
                                title="إضافة استقطاع"
                             >
                                <Plus className="w-4 h-4" />
                             </button>
                             <button 
                                onClick={() => setSelectedStaffForProfile(member)}
                                className="p-3 text-gray-400 hover:text-emerald-500 hover:bg-emerald-50 rounded-xl transition-all"
                                title="عرض السجل"
                             >
                                <Eye className="w-4 h-4" />
                             </button>
                          </div>
                        </td>
                      </motion.tr>
                    );
                  })}
                  {staff.length === 0 && (
                    <motion.tr
                      variants={{
                        hidden: { opacity: 0 },
                        visible: { opacity: 1 }
                      }}
                    >
                      <td colSpan={6} className="px-8 py-20 text-center">
                        <div className="flex flex-col items-center opacity-20 grayscale">
                          <Briefcase className="w-16 h-16 mb-4" />
                          <p className="font-black text-xl">لا يوجد موظفين مسجلين</p>
                        </div>
                      </td>
                    </motion.tr>
                  )}
                </motion.tbody>
                <tfoot className="bg-gray-50/50">
                  <tr className="font-black text-gray-900 border-t border-gray-100">
                    <td colSpan={3} className="px-8 py-6 text-left">إجمالي صافي الرواتب للشهر الحالي:</td>
                    <td className="px-8 py-6">
                      <span className="text-xl font-black text-blue-600">
                        {formatCurrency(staff.reduce((sum, member) => {
                          const invoices = staffInvoices.filter(i => 
                            i.staffId === member.id && 
                            format(new Date(i.date), 'yyyy-MM') === selectedMonth
                          );
                          const totalInvoices = invoices.reduce((acc, i) => acc + i.amount, 0);
                          const absences = calculateDeductions(member.id, selectedMonth);
                          const deduction = absences * (member.deductionAmount || 0);
                          return sum + (member.salary - totalInvoices - deduction);
                        }, 0))}
                      </span>
                    </td>
                    <td colSpan={2}></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deletingStaff && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDeletingStaff(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white w-full max-w-md rounded-[3rem] shadow-2xl relative z-10 overflow-hidden border border-white/20"
            >
              <div className="p-10 text-center">
                <div className="w-24 h-24 bg-rose-50 text-rose-600 rounded-[2rem] flex items-center justify-center mx-auto mb-8 shadow-inner">
                  <AlertCircle className="w-12 h-12" />
                </div>
                <h3 className="text-3xl font-black text-slate-900 mb-3 tracking-tight">إزالة من الكادر؟</h3>
                <p className="text-slate-500 font-bold mb-10 leading-relaxed text-lg">
                  هل أنت متأكد من حذف الموظف <span className="text-rose-600 font-black">"{deletingStaff.name}"</span>؟ 
                  <br />
                  <span className="text-sm text-slate-400 mt-2 block font-normal italic">لا يمكن التراجع عن هذا الإجراء وسيتم مسح كافة سجلات الرواتب والحضور المرتبطة به.</span>
                </p>
                
                <div className="flex gap-4">
                  <button
                    onClick={() => setDeletingStaff(null)}
                    className="flex-1 bg-slate-100 text-slate-500 py-5 rounded-[1.5rem] font-black hover:bg-slate-200 transition-all text-xl"
                  >
                    تراجع
                  </button>
                  <button
                    onClick={() => {
                      localDb.delete('staff', deletingStaff.id);
                      setDeletingStaff(null);
                    }}
                    className="flex-1 bg-rose-600 text-white py-5 rounded-[1.5rem] font-black shadow-2xl shadow-rose-200 hover:bg-rose-700 transition-all text-xl active:scale-95"
                  >
                    تأكيد الحذف
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Staff Profile Modal */}
      <AnimatePresence>
        {selectedStaffForProfile && staffProfileData && (
          <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 lg:p-12">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedStaffForProfile(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white w-full max-w-6xl h-[90vh] rounded-[3.5rem] shadow-2xl flex flex-col overflow-hidden relative z-10 border border-white/20"
            >
              <div className="p-10 border-b border-slate-50 flex items-center justify-between bg-white">
                <div className="flex items-center gap-8 text-right">
                  <div className="w-24 h-24 rounded-[2rem] theme-bg flex items-center justify-center text-white theme-shadow shadow-2xl rotate-3 hover:rotate-0 transition-transform">
                    <UserCheck className="w-12 h-12" />
                  </div>
                  <div>
                    <h3 className="text-4xl font-black text-slate-900 mb-1 tracking-tight">{selectedStaffForProfile.name}</h3>
                    <div className="flex items-center gap-3 justify-end leading-relaxed">
                      <span className="text-slate-400 font-bold text-sm uppercase tracking-widest leading-relaxed">عضو الكادر الوظيفي النشط</span>
                      <span className="bg-indigo-600 text-white px-5 py-1.5 rounded-full text-xs font-black shadow-lg shadow-indigo-100">{selectedStaffForProfile.role}</span>
                    </div>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedStaffForProfile(null)} 
                  className="p-5 hover:bg-slate-50 hover:text-rose-500 rounded-[2rem] transition-all text-slate-300 shadow-sm border border-slate-100"
                >
                  <X className="w-10 h-10" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-12 lg:p-16 custom-scrollbar bg-slate-50/20">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                  <div className="lg:col-span-4 space-y-10">
                    <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm space-y-8 relative overflow-hidden group">
                      <div className="absolute top-0 right-0 w-2 h-full bg-blue-500 opacity-20"></div>
                      <h4 className="font-black text-slate-900 text-xl border-b border-slate-50 pb-5 flex items-center gap-3 justify-end">
                        المعلومات الوظيفية
                        <Briefcase className="text-blue-500 w-6 h-6" />
                      </h4>
                      <div className="space-y-6 text-right">
                        <div className="space-y-1 bg-slate-50/50 p-5 rounded-3xl border border-slate-50">
                          <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest block">رقم الهاتف</span>
                          <span className="font-black text-xl text-slate-900" dir="ltr">{selectedStaffForProfile.phone}</span>
                        </div>
                        <div className="flex items-center justify-between p-6 bg-emerald-50 rounded-[2rem] border border-emerald-100 shadow-sm">
                          <span className="font-black text-emerald-900">{formatCurrency(selectedStaffForProfile.salary)}</span>
                          <span className="text-emerald-600 font-black text-xs uppercase tracking-widest">الراتب الأساسي</span>
                        </div>
                        <div className="flex items-center justify-between p-6 bg-rose-50 rounded-[2rem] border border-rose-100">
                          <span className="font-black text-rose-600">{formatCurrency(selectedStaffForProfile.deductionAmount || 0)}</span>
                          <span className="text-rose-400 font-black text-xs uppercase tracking-widest">قيمة الاستقطاع اليومي</span>
                        </div>
                        <div className="p-5 bg-indigo-50/50 rounded-3xl border border-indigo-100 text-center">
                           <span className="text-[10px] text-indigo-400 font-black uppercase tracking-widest block mb-2">معرف البصمة الرقمية</span>
                          <span className="font-black text-2xl text-indigo-700 tracking-[0.3em] font-mono">{selectedStaffForProfile.fingerprintId || '---------'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="theme-bg p-12 rounded-[4rem] text-white theme-shadow shadow-2xl relative overflow-hidden group">
                      <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full translate-x-16 -translate-y-16 blur-3xl group-hover:scale-150 transition-transform duration-700"></div>
                      <h4 className="font-black text-2xl mb-10 relative z-10 flex items-center gap-4 justify-end">
                        مؤشر الالتزام
                        <BarChart3 className="w-8 h-8" />
                      </h4>
                      <div className="flex items-center justify-center py-5 relative z-10">
                        <div className="relative w-48 h-48 flex items-center justify-center">
                          <svg className="w-full h-full transform -rotate-90">
                            <circle cx="96" cy="96" r="80" stroke="rgba(255,255,255,0.1)" strokeWidth="12" fill="none" />
                            <circle cx="96" cy="96" r="80" stroke="white" strokeWidth="18" fill="none" strokeDasharray="502.6" strokeDashoffset={502.6 - (502.6 * staffProfileData.attendanceRate) / 100} strokeLinecap="round" className="transition-all duration-1000" />
                          </svg>
                          <div className="absolute flex flex-col items-center">
                            <span className="text-5xl font-black tracking-tighter">{staffProfileData.attendanceRate}%</span>
                            <span className="text-[10px] font-black uppercase tracking-widest opacity-70 mt-1">نسبة الحضور</span>
                          </div>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-5 mt-12 relative z-10">
                        <div className="bg-white/10 p-6 rounded-[2rem] backdrop-blur-md text-center border border-white/10 shadow-inner">
                          <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-2">الغيابات الكلية</p>
                          <p className="text-4xl font-black">{staffProfileData.absences}</p>
                        </div>
                        <div className="bg-white/10 p-6 rounded-[2rem] backdrop-blur-md text-center border border-white/10 shadow-inner">
                          <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-2">الفواتير النشطة</p>
                          <p className="text-4xl font-black">{staffProfileData.invoices.length}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="lg:col-span-8 space-y-12">
                    <section className="bg-white p-12 rounded-[3.5rem] border border-slate-100 shadow-sm space-y-10 relative overflow-hidden group">
                      <div className="absolute top-0 right-0 w-2 h-full bg-indigo-500 opacity-20"></div>
                      <div className="flex justify-between items-center text-right">
                        <div></div>
                        <h4 className="text-3xl font-black flex items-center gap-5 justify-end">
                          سجل الرواتب والمدفوعات
                          <FileText className="text-indigo-600 w-8 h-8" />
                        </h4>
                      </div>
                      <div className="overflow-hidden rounded-[2.5rem] border border-slate-50 shadow-sm">
                        <table className="w-full text-right">
                          <thead className="bg-slate-50 text-slate-400 font-black text-xs uppercase tracking-widest border-b border-slate-50">
                            <tr>
                              <th className="p-8">الشهر المستحق</th>
                              <th className="p-8">تاريخ المعاملة</th>
                              <th className="p-8">المبلغ المصروف</th>
                              <th className="p-8 text-center">حالة القيد</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50">
                            {staffProfileData.payments.map((p, idx) => (
                              <tr key={idx} className="hover:bg-slate-50/50 transition-colors group">
                                <td className="p-8 font-black text-slate-900 text-lg uppercase tracking-tight">{p.month}</td>
                                <td className="p-8 font-bold text-slate-400">{format(new Date(p.date), 'yyyy/MM/dd')}</td>
                                <td className="p-8 font-black text-emerald-600 text-xl tracking-tight">{formatCurrency(p.amount)}</td>
                                <td className="p-8 text-center">
                                  <span className="bg-emerald-50 text-emerald-600 px-5 py-2.5 rounded-[1.25rem] text-[10px] font-black border border-emerald-100 shadow-inner">تم الصرف بنجاح</span>
                                </td>
                              </tr>
                            ))}
                            {staffProfileData.payments.length === 0 && (
                              <tr>
                                <td colSpan={4} className="p-24 text-center">
                                  <div className="opacity-10 grayscale flex flex-col items-center gap-4">
                                    <FileText className="w-20 h-20" />
                                    <p className="font-black text-2xl tracking-tight">لم يتم تسجيل أي مدفوعات نقدية بعد</p>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </section>

                    <section className="bg-white p-12 rounded-[3.5rem] border border-slate-100 shadow-sm space-y-10 relative overflow-hidden group">
                       <div className="absolute top-0 right-0 w-2 h-full bg-rose-500 opacity-20"></div>
                      <h4 className="text-3xl font-black flex items-center gap-5 justify-end">
                        سجلات الحضور الأخيرة
                        <Calendar className="text-rose-600 w-8 h-8" />
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 text-right">
                        {staffProfileData.records.map((r, idx) => (
                          <div key={idx} className="flex items-center justify-between p-8 bg-slate-50 rounded-[2.5rem] border border-slate-100 group hover:border-indigo-200 transition-all hover:bg-white hover:shadow-xl">
                            <span className={`px-5 py-2.5 rounded-2xl text-[10px] font-black border shadow-inner ${
                              r.status === 'present' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-rose-50 text-rose-600 border-rose-100'
                            }`}>
                              {r.status === 'present' ? 'بصمة حضور' : 'غياب'}
                            </span>
                            <div className="flex items-center gap-6">
                              <div className="text-right">
                                <div className="font-black text-slate-900 text-lg leading-none">{format(new Date(r.date), 'EEEE, d MMMM', { locale: ar })}</div>
                                <div className="text-[10px] text-slate-400 font-bold mt-2 uppercase tracking-widest">{r.scanTime ? `وقت التسجيل: ${format(new Date(r.scanTime), 'HH:mm')}` : 'لم يتم تسجيل وقت'}</div>
                              </div>
                              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-lg ${
                                r.status === 'present' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'
                              }`}>
                                {r.status === 'present' ? <CheckCircle2 className="w-7 h-7" /> : <X className="w-7 h-7" />}
                              </div>
                            </div>
                          </div>
                        ))}
                        {staffProfileData.records.length === 0 && (
                          <div className="col-span-full p-24 text-center opacity-10 grayscale border-2 border-dashed border-slate-100 rounded-[3rem]">
                            <Calendar className="w-20 h-20 mx-auto mb-6" />
                            <p className="font-black text-2xl tracking-tight">لا تتوفر بيانات حضور لهذا الموظف</p>
                          </div>
                        )}
                      </div>
                    </section>
                  </div>
                </div>
              </div>

              <div className="p-10 border-t border-slate-100 bg-slate-50/50 flex flex-col md:flex-row justify-end gap-6 h-fit">
                <button 
                  onClick={() => setSelectedStaffForProfile(null)} 
                  className="px-16 py-6 bg-slate-900 text-white rounded-[2rem] font-black text-2xl shadow-2xl shadow-slate-200 hover:bg-black transition-all active:scale-[0.98] w-full md:w-auto"
                >
                  إغلاق السجل الوظيفي
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Staff Form Modal */}
      <AnimatePresence>
        {isAdding && (
          <div className="fixed inset-0 z-[250] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={resetForm}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white w-full max-w-xl max-h-[90vh] rounded-[3.5rem] shadow-2xl overflow-hidden relative z-10 flex flex-col border border-white/20"
            >
              <div className="p-8 border-b border-slate-50 flex items-center justify-between bg-white px-10">
                <div className="flex items-center gap-5 text-right">
                  <div className="p-4 theme-bg rounded-2xl text-white shadow-xl theme-shadow">
                    <UserPlus className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="text-3xl font-black text-slate-900 tracking-tight">{editingStaff ? 'تحديث السجل' : 'إضافة موظف'}</h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-relaxed">يرجى ملء كافة الحقول الإجبارية</p>
                  </div>
                </div>
                <button onClick={resetForm} className="p-4 hover:bg-slate-50 rounded-2xl transition-all text-slate-300">
                  <X className="w-8 h-8" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-12 space-y-10 custom-scrollbar text-right">
                <div className="space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="md:col-span-2">
                      <label className="block text-xs font-black text-slate-500 mb-3 px-2 uppercase tracking-widest leading-relaxed">الاسم الكامل للموظف</label>
                      <input 
                        required 
                        type="text" 
                        value={formData.name} 
                        onChange={(e) => setFormData({...formData, name: e.target.value})} 
                        className="w-full bg-slate-50 border border-slate-100 rounded-[1.5rem] px-8 py-5 outline-none focus:ring-4 focus:ring-blue-100 font-black text-slate-900 text-lg transition-all" 
                        placeholder="أدخل الاسم الثلاثي هنا..."
                        dir="rtl"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-black text-slate-500 mb-3 px-2 uppercase tracking-widest leading-relaxed">المسمى الوظيفي</label>
                      <input 
                        required 
                        type="text" 
                        value={formData.role} 
                        onChange={(e) => setFormData({...formData, role: e.target.value})} 
                        className="w-full bg-slate-50 border border-slate-100 rounded-[1.5rem] px-8 py-5 outline-none focus:ring-4 focus:ring-blue-100 font-black text-slate-900 text-lg transition-all placeholder:font-normal" 
                        placeholder="مثل: معلم، محاسب، حارس..."
                        dir="rtl"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-black text-slate-500 mb-3 px-2 uppercase tracking-widest leading-relaxed">رقم الهاتف النشط</label>
                      <input 
                        required 
                        type="text" 
                        value={formData.phone} 
                        onChange={(e) => setFormData({...formData, phone: e.target.value})} 
                        className="w-full bg-slate-50 border border-slate-100 rounded-[1.5rem] px-8 py-5 outline-none focus:ring-4 focus:ring-blue-100 font-black text-slate-900 text-lg text-left tracking-wider" 
                        dir="ltr" 
                        placeholder="07XX XXX XXXX"
                      />
                    </div>
                    <div className="md:col-span-2">
                       <label className="block text-xs font-black text-slate-500 mb-3 px-2 uppercase tracking-widest leading-relaxed">تاريخ المولد</label>
                      <input 
                        type="date" 
                        value={formData.dob} 
                        onChange={(e) => setFormData({...formData, dob: e.target.value})} 
                        className="w-full bg-slate-50 border border-slate-100 rounded-[1.5rem] px-8 py-5 outline-none focus:ring-4 focus:ring-blue-100 font-black text-slate-900 text-lg text-left" 
                        dir="ltr" 
                      />
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-emerald-50 to-teal-50/30 p-10 rounded-[3rem] border border-emerald-100 grid grid-cols-1 md:grid-cols-2 gap-8 shadow-sm">
                    <div className="md:col-span-2">
                      <h4 className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.2em] mb-4 px-2 flex items-center justify-end gap-2">
                        الإعدادات المالية والرواتب
                        <DollarSign className="w-3 h-3" />
                      </h4>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-emerald-700 mb-3 px-2 uppercase tracking-widest">الراتب الشهري الصافي (د.ع)</label>
                      <input 
                        required 
                        type="number" 
                        value={formData.salary} 
                        onChange={(e) => setFormData({...formData, salary: e.target.value})} 
                        className="w-full bg-white border border-emerald-100 rounded-[1.25rem] px-8 py-4 outline-none focus:ring-4 focus:ring-emerald-200/20 font-black text-2xl text-emerald-900 shadow-inner" 
                        dir="ltr"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-rose-700 mb-3 px-2 uppercase tracking-widest">غرامة الغياب لليوم الواحد</label>
                      <input 
                        required 
                        type="number" 
                        value={formData.deductionAmount} 
                        onChange={(e) => setFormData({...formData, deductionAmount: e.target.value})} 
                        className="w-full bg-white border border-rose-100 rounded-[1.25rem] px-8 py-4 outline-none focus:ring-4 focus:ring-rose-200/20 font-black text-2xl text-rose-600 shadow-inner" 
                        dir="ltr"
                      />
                    </div>
                  </div>

                  <div className="bg-slate-50 p-10 rounded-[3rem] border border-slate-100 space-y-6">
                    <label className="block text-xs font-black text-slate-600 px-2 uppercase tracking-widest text-right">أيام الدوام الأسبوعية الرسمية</label>
                    <div className="flex flex-wrap gap-3 justify-end leading-relaxed">
                      {['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'].map((day, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            const newDays = formData.workingDays.includes(idx)
                              ? formData.workingDays.filter(d => d !== idx)
                              : [...formData.workingDays, idx];
                            setFormData({...formData, workingDays: newDays});
                          }}
                          className={`min-w-[85px] py-4 rounded-2xl text-xs font-black transition-all border ${
                            formData.workingDays.includes(idx) 
                              ? 'theme-bg text-white border-transparent shadow-xl theme-shadow scale-105' 
                              : 'bg-white text-slate-400 border-slate-100 hover:border-indigo-300'
                          }`}
                        >
                          {day}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative">
                    <div className="md:col-span-1">
                      <label className="block text-[10px] font-black text-slate-400 mb-3 px-2 uppercase tracking-widest leading-relaxed">كود التعريف الرقمي (Barcode)</label>
                      <div className="flex bg-slate-50 border border-slate-100 rounded-2xl overflow-hidden group focus-within:ring-4 focus-within:ring-indigo-100 transition-all">
                        <div className="p-5 bg-slate-100 flex items-center justify-center border-l border-slate-100 text-slate-400">
                          <ScanLine className="w-6 h-6" />
                        </div>
                        <input 
                          type="text" 
                          value={formData.attendanceBarcode} 
                          onChange={(e) => setFormData({...formData, attendanceBarcode: e.target.value.replace(/\D/g, '')})} 
                          className="flex-1 bg-transparent px-6 py-5 outline-none font-mono text-center text-lg font-black tracking-[0.2em]" 
                          placeholder="000000"
                        />
                      </div>
                    </div>
                    <div className="md:col-span-1">
                      <label className="block text-[10px] font-black text-indigo-600 mb-3 px-2 uppercase tracking-widest flex items-center gap-2 justify-end leading-relaxed">
                        Fingerprint ID
                        <div className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-ping"></div>
                      </label>
                      <div className="flex bg-indigo-50 border border-indigo-100 rounded-2xl overflow-hidden group focus-within:ring-4 focus-within:ring-indigo-200/50 transition-all">
                        <div className="p-5 theme-bg flex items-center justify-center text-white">
                          <Zap className="w-6 h-6" />
                        </div>
                        <input 
                          type="text" 
                          value={formData.fingerprintId} 
                          onChange={(e) => setFormData({...formData, fingerprintId: e.target.value})} 
                          className="flex-1 bg-transparent px-6 py-5 outline-none font-mono text-center font-black text-xl text-indigo-900 tracking-widest" 
                          placeholder="---"
                        />
                      </div>
                      <p className="text-[9px] text-slate-400 mt-2 px-2 font-bold italic text-right">يرجى تمرير البصمة الآن للحفظ التلقائي أو إدخال المعرف يدوياً</p>
                    </div>
                  </div>
                </div>
              </form>

              <div className="p-10 border-t border-slate-50 bg-white shadow-inner">
                <button 
                  type="submit" 
                  onClick={handleSubmit} 
                  className="w-full theme-bg text-white py-6 rounded-[2.5rem] font-black text-2xl theme-shadow hover:scale-[1.01] transition-all active:scale-[0.98] shadow-2xl"
                >
                  {editingStaff ? 'حفظ التعديلات النهائية' : 'تأكيد تسجيل الموظف'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Monthly Expense Management Modal */}
      <AnimatePresence>
        {viewingInvoicesFor && (
          <div className="fixed inset-0 z-[250] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setViewingInvoicesFor(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white w-full max-w-2xl rounded-[3.5rem] shadow-2xl overflow-hidden relative z-10 flex flex-col max-h-[85vh] border border-white/20"
            >
              <div className="p-10 border-b border-slate-50 flex items-center justify-between bg-white px-12">
                <div className="flex items-center gap-6 text-right leading-relaxed">
                  <div className="p-4 theme-bg rounded-2xl text-white shadow-xl theme-shadow">
                    <BarChart3 className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-slate-900 tracking-tight leading-relaxed">مدقق المستحقات المالية</h3>
                    <p className="text-sm font-bold text-indigo-600 mt-1">{viewingInvoicesFor.name} — سجل {selectedMonth}</p>
                  </div>
                </div>
                <button onClick={() => setViewingInvoicesFor(null)} className="p-4 hover:bg-slate-50 rounded-2xl transition-all text-slate-300">
                  <X className="w-8 h-8" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-10 space-y-10 custom-scrollbar bg-slate-50/20">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-right leading-relaxed">
                  <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 flex items-center justify-between shadow-sm">
                    <span className="font-black text-slate-900 text-xl tracking-tight leading-relaxed">{formatCurrency(viewingInvoicesFor.salary)}</span>
                    <div className="flex flex-col items-end leading-relaxed">
                       <span className="text-slate-400 font-black text-[10px] uppercase tracking-widest leading-relaxed">الاستحقاق الشهري</span>
                       <span className="text-slate-600 font-bold leading-relaxed">الراتب الثابت</span>
                    </div>
                  </div>
                  <div className="bg-rose-50 p-8 rounded-[2.5rem] border border-rose-100 flex items-center justify-between shadow-sm">
                    <span className="font-black text-rose-700 text-xl tracking-tight leading-relaxed">{formatCurrency(calculateDeductions(viewingInvoicesFor.id, selectedMonth) * (viewingInvoicesFor.deductionAmount || 0))}</span>
                    <div className="flex flex-col items-end leading-relaxed">
                       <span className="text-rose-400 font-black text-[10px] uppercase tracking-widest leading-relaxed">الخصم الآلي</span>
                       <span className="text-rose-600 font-bold leading-relaxed">أيام الغياب</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-8 text-right leading-relaxed">
                  <h4 className="font-black text-slate-900 px-4 flex items-center gap-3 justify-end text-lg leading-relaxed">
                    تفاصيل السلف والمصاريف الإضافية
                    <DollarSign className="w-6 h-6 text-indigo-500" />
                  </h4>
                  
                  {staffInvoices.filter(i => i.staffId === viewingInvoicesFor.id && format(new Date(i.date), 'yyyy-MM') === selectedMonth).length > 0 ? (
                    <div className="space-y-4">
                      {staffInvoices.filter(i => i.staffId === viewingInvoicesFor.id && format(new Date(i.date), 'yyyy-MM') === selectedMonth).map((inv) => (
                        <div key={inv.id} className="flex items-center justify-between p-8 bg-white border border-slate-100 rounded-[2.5rem] hover:border-indigo-200 transition-all group shadow-sm hover:shadow-xl">
                          <div className="flex items-center gap-5 leading-relaxed">
                            <p className="font-black text-rose-600 text-2xl tracking-tighter leading-relaxed">{formatCurrency(inv.amount)}</p>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all translate-x-2 group-hover:translate-x-0">
                              <button 
                                onClick={() => {
                                  setEditingInvoice(inv);
                                  setInvoiceData({ amount: inv.amount.toString(), description: inv.description });
                                }}
                                className="p-3 text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all shadow-sm bg-white"
                              >
                                <Edit2 className="w-5 h-5" />
                              </button>
                              <button 
                                onClick={() => deleteInvoice(inv.id)}
                                className="p-3 text-rose-600 hover:bg-rose-50 rounded-xl transition-all shadow-sm bg-white"
                              >
                                <Trash2 className="w-5 h-5" />
                              </button>
                            </div>
                          </div>
                          <div className="flex items-center gap-6 leading-relaxed">
                            <div className="text-right leading-relaxed">
                              <p className="font-black text-slate-900 text-lg leading-relaxed">{inv.description}</p>
                              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1 leading-relaxed leading-relaxed">{format(new Date(inv.date), 'yyyy/MM/dd')}</p>
                            </div>
                            <div className="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-300 group-hover:text-indigo-600 group-hover:bg-indigo-50 transition-all duration-500">
                              <FileText className="w-7 h-7" />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-20 text-center border-4 border-dashed border-slate-100 rounded-[4rem] opacity-20 grayscale">
                      <DollarSign className="w-20 h-20 mx-auto mb-4" />
                      <p className="font-black text-2xl tracking-tight">لا تتوفر سجلات مصروفات لهذا الشهر</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="p-10 border-t border-slate-50 bg-white flex flex-col md:flex-row gap-5 h-fit shadow-inner">
                <button 
                  onClick={() => setIsAddingInvoice(viewingInvoicesFor)}
                  className="flex-1 theme-bg text-white py-5 rounded-[2rem] font-black flex items-center justify-center gap-3 hover:scale-[1.02] transition-all theme-shadow shadow-2xl text-xl"
                >
                  <Plus className="w-7 h-7" />
                  إضافة سلفة أو استقطاع
                </button>
                <button 
                  onClick={() => setViewingInvoicesFor(null)}
                  className="px-16 bg-slate-100 text-slate-500 py-5 rounded-[2rem] font-black hover:bg-slate-200 transition-all text-xl"
                >
                  إغلاق النافذة
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Staff Invoice Modal */}
      <AnimatePresence>
        {(isAddingInvoice || editingInvoice) && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => { setIsAddingInvoice(null); setEditingInvoice(null); setInvoiceData({ amount: '', description: '' }); }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white w-full max-w-md rounded-[3rem] shadow-2xl overflow-hidden relative z-10 border border-white/20"
            >
              <div className="p-8 border-b border-slate-50 flex items-center justify-between bg-white px-10">
                <div className="flex items-center gap-5 text-right leading-relaxed">
                  <div className="p-4 theme-bg rounded-2xl text-white shadow-xl theme-shadow translate-y-1">
                    <DollarSign className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-slate-900 tracking-tight leading-relaxed">{editingInvoice ? 'تعديل السند المالي' : 'إضافة سند صرف'}</h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-relaxed">{(editingInvoice ? staff.find(s => s.id === editingInvoice.staffId) : isAddingInvoice)?.name}</p>
                  </div>
                </div>
                <button onClick={() => { setIsAddingInvoice(null); setEditingInvoice(null); setInvoiceData({ amount: '', description: '' }); }} className="p-4 hover:bg-slate-50 rounded-2xl transition-all text-slate-300">
                  <X className="w-8 h-8" />
                </button>
              </div>
              
              <form onSubmit={addInvoice} className="p-12 space-y-10 text-right">
                <div className="space-y-8">
                  <div>
                    <label className="block text-xs font-black text-slate-500 mb-3 px-2 uppercase tracking-widest leading-relaxed">القيمة النقدية (د.ع)</label>
                    <div className="relative">
                      <input 
                        required 
                        autoFocus
                        type="number" 
                        value={invoiceData.amount} 
                        onChange={(e) => setInvoiceData({...invoiceData, amount: e.target.value})} 
                        className="w-full bg-slate-50 border border-slate-100 rounded-[1.5rem] px-16 py-6 outline-none focus:ring-4 focus:ring-indigo-100 font-black text-4xl text-indigo-600 transition-all text-left shadow-inner tracking-tighter" 
                        placeholder="0.00"
                      />
                      <div className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-300 font-black text-sm">IQD</div>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-black text-slate-500 mb-3 px-2 uppercase tracking-widest leading-relaxed">الغرض من الصرف / الملاحظات</label>
                    <textarea 
                      required 
                      value={invoiceData.description} 
                      onChange={(e) => setInvoiceData({...invoiceData, description: e.target.value})} 
                      className="w-full bg-slate-50 border border-slate-100 rounded-[1.5rem] px-8 py-6 outline-none focus:ring-4 focus:ring-indigo-100 font-bold min-h-[150px] resize-none text-lg text-slate-900 transition-all placeholder:text-slate-300" 
                      placeholder="يرجى كتابة تفاصيل السلفة أو المشتريات هنا..."
                    />
                  </div>
                </div>
                
                <div className="pt-6">
                  <button type="submit" className="w-full theme-bg text-white py-6 rounded-[2.5rem] font-black text-2xl theme-shadow shadow-2xl hover:scale-[1.01] transition-all active:scale-[0.98]">
                    {editingInvoice ? 'حفظ السند المعدل' : 'إعتماد سند الصرف'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Payroll Preview Modal */}
      <AnimatePresence>
        {isPreviewingPayroll && (
          <div className="fixed inset-0 z-[350] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsPreviewingPayroll(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white w-full max-w-6xl h-[90vh] rounded-[3.5rem] shadow-2xl relative z-10 overflow-hidden flex flex-col border border-white/20"
            >
              <div className="p-10 border-b border-slate-50 flex items-center justify-between bg-white px-12">
                <div className="flex items-center gap-6 text-right leading-relaxed">
                  <div className="p-4 bg-emerald-600 rounded-2xl text-white shadow-xl shadow-emerald-100">
                    <Printer className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="text-3xl font-black text-slate-900 tracking-tight leading-relaxed">تدقيق وتجهيز سجل الرواتب</h3>
                    <p className="text-sm font-bold text-slate-400 mt-1 leading-relaxed">المعاينة النهائية قبل عملية الطباعة والأرشفة</p>
                  </div>
                </div>
                <div className="flex items-center gap-6 leading-relaxed">
                  <button 
                    onClick={() => handlePrintPayroll()}
                    className="theme-bg text-white px-10 py-5 rounded-[1.5rem] font-black hover:scale-[1.02] active:scale-95 flex items-center gap-3 transition-all theme-shadow shadow-2xl text-lg leading-relaxed"
                  >
                    تأكيد الطباعة النهائية
                    <Printer className="w-6 h-6" />
                  </button>
                  <button 
                    onClick={() => setIsPreviewingPayroll(false)}
                    className="p-5 hover:bg-rose-50 rounded-[1.5rem] transition-all text-slate-300 hover:text-rose-500 border border-slate-50"
                  >
                    <X className="w-8 h-8" />
                  </button>
                </div>
              </div>

                <div className="flex items-center gap-10 px-12 py-6 bg-slate-50/50 border-b border-slate-100 overflow-x-auto justify-end">
                  <div className="flex items-center gap-3 whitespace-nowrap leading-relaxed">
                    <label htmlFor="toggleAccountant" className="text-sm font-black text-slate-700 cursor-pointer select-none leading-relaxed">إظهار حقل توقيع المحاسب</label>
                    <input 
                      type="checkbox" 
                      id="toggleAccountant" 
                      checked={stampConfig.showAccountant} 
                      onChange={(e) => setStampConfig({...stampConfig, showAccountant: e.target.checked})}
                      className="w-6 h-6 accent-indigo-600 rounded-xl cursor-pointer"
                    />
                  </div>
                  <div className="flex items-center gap-3 whitespace-nowrap leading-relaxed">
                    <label htmlFor="togglePrincipal" className="text-sm font-black text-slate-700 cursor-pointer select-none leading-relaxed">إظهار حقل توقيع مدير المدرسة</label>
                    <input 
                      type="checkbox" 
                      id="togglePrincipal" 
                      checked={stampConfig.showPrincipal} 
                      onChange={(e) => setStampConfig({...stampConfig, showPrincipal: e.target.checked})}
                      className="w-6 h-6 accent-indigo-600 rounded-xl cursor-pointer"
                    />
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-12 bg-slate-100/50 flex justify-center custom-scrollbar">
                  <div className="bg-white shadow-2xl p-16 w-full max-w-5xl h-fit border border-white rounded-[1rem]">
                    <PayrollTableBody 
                      school={school}
                      staff={staff}
                      staffInvoices={staffInvoices}
                      selectedMonth={selectedMonth}
                      calculateDeductions={calculateDeductions}
                      stampConfig={stampConfig}
                    />
                  </div>
                </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <div className="hidden">
        <div ref={payrollRef}>
          <PayrollTableBody 
            school={school}
            staff={staff}
            staffInvoices={staffInvoices}
            selectedMonth={selectedMonth}
            calculateDeductions={calculateDeductions}
            stampConfig={stampConfig}
          />
        </div>
      </div>
    </div>
  );
}

interface PayrollTableBodyProps {
  school: School;
  staff: Staff[];
  staffInvoices: StaffInvoice[];
  selectedMonth: string;
  calculateDeductions: (id: string, month: string) => number;
  stampConfig: {
    showAccountant: boolean;
    showPrincipal: boolean;
  };
}

function PayrollTableBody({ school, staff, staffInvoices, selectedMonth, calculateDeductions, stampConfig }: PayrollTableBodyProps) {
  return (
    <div className="p-12 text-right rtl min-h-screen bg-white" dir="rtl">
      <div className="flex justify-between items-start mb-12 border-b-4 border-gray-900 pb-8">
        <div>
          <h2 className="text-3xl font-black text-gray-900 mb-2">{school.name}</h2>
          <p className="text-xl font-bold text-gray-600">سجل استلام رواتب الكادر الوظيفي</p>
        </div>
        <div className="text-left">
          <p className="text-lg font-black bg-gray-900 text-white px-6 py-2 rounded-xl mb-2">
            لشهر: {format(new Date(selectedMonth), 'MMMM yyyy', { locale: ar })}
          </p>
          <p className="text-sm font-bold text-gray-400">تاريخ الطباعة: {format(new Date(), 'yyyy/MM/dd')}</p>
        </div>
      </div>

      <table className="w-full border-collapse border-2 border-gray-900">
        <thead>
          <tr className="bg-gray-100 font-black text-lg">
            <th className="border-2 border-gray-900 p-4 w-12">#</th>
            <th className="border-2 border-gray-900 p-4">الاسم الكامل للموظف</th>
            <th className="border-2 border-gray-900 p-4">الوظيفة</th>
            <th className="border-2 border-gray-900 p-4">الراتب الأساسي</th>
            <th className="border-2 border-gray-900 p-4">الاستقطاعات</th>
            <th className="border-2 border-gray-900 p-4">الراتب الصافي</th>
            <th className="border-2 border-gray-900 p-4 w-48">التوقيع بالاستلام</th>
          </tr>
        </thead>
        <tbody>
          {staff.map((member, index) => {
            const invoices = staffInvoices.filter(i => 
              i.staffId === member.id && 
              format(new Date(i.date), 'yyyy-MM') === selectedMonth
            );
            const totalInvoices = invoices.reduce((sum, i) => sum + i.amount, 0);
            const absences = calculateDeductions(member.id, selectedMonth);
            const totalAbsenceDeduction = absences * (member.deductionAmount || 0);
            const totalDeductions = totalInvoices + totalAbsenceDeduction;
            const netSalary = member.salary - totalDeductions;

            return (
              <tr key={member.id} className="text-xl font-bold h-20">
                <td className="border-2 border-gray-900 p-4 text-center">{index + 1}</td>
                <td className="border-2 border-gray-900 p-4">{member.name}</td>
                <td className="border-2 border-gray-900 p-4 text-center">{member.role}</td>
                <td className="border-2 border-gray-900 p-4 text-center" dir="ltr">{formatCurrency(member.salary)}</td>
                <td className="border-2 border-gray-900 p-4 text-center text-red-600" dir="ltr">
                  {totalDeductions > 0 ? formatCurrency(totalDeductions) : '-'}
                </td>
                <td className="border-2 border-gray-900 p-4 text-center font-black bg-gray-50" dir="ltr">
                  {formatCurrency(netSalary)}
                </td>
                <td className="border-2 border-gray-900 p-4"></td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="bg-gray-100 font-black">
            <td colSpan={5} className="border-2 border-gray-900 p-6 text-left font-black">إجمالي الرواتب الصافية:</td>
            <td className="border-2 border-gray-900 p-6 text-center text-2xl" dir="ltr">
              {formatCurrency(staff.reduce((sum, member) => {
                const invoices = staffInvoices.filter(i => 
                  i.staffId === member.id && 
                  format(new Date(i.date), 'yyyy-MM') === selectedMonth
                );
                const totalInvoices = invoices.reduce((sum, i) => sum + i.amount, 0);
                const absences = calculateDeductions(member.id, selectedMonth);
                const totalAbsenceDeduction = absences * (member.deductionAmount || 0);
                return sum + (member.salary - totalInvoices - totalAbsenceDeduction);
              }, 0))}
            </td>
            <td className="border-2 border-gray-900 p-6"></td>
          </tr>
        </tfoot>
      </table>

      <div className="mt-24 grid grid-cols-3 gap-12 text-center">
        {stampConfig.showAccountant ? (
          <div>
            <p className="text-xl font-black mb-8 underline underline-offset-8 decoration-2">المحاسب</p>
            <p className="font-bold text-gray-400">..............................</p>
          </div>
        ) : <div />}

        {stampConfig.showPrincipal ? (
          <div>
            <p className="text-xl font-black mb-8 underline underline-offset-8 decoration-2">مدير المدرسة</p>
            <p className="font-bold text-gray-900">{school.principalName || '..............................'}</p>
          </div>
        ) : <div />}
      </div>
      
      <div className="mt-12 text-center text-xs text-gray-400 border-t pt-4">
        تم توليد هذا السجل آلياً عبر نظام إدارة الحسابات المدرسية الذكي
      </div>
    </div>
  );
}
