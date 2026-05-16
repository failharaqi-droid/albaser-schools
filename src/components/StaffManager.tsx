import { useState, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useReactToPrint } from 'react-to-print';
import { School, Staff, StaffPayment, StaffInvoice, AttendanceRecord } from '../types';
import { localDb } from '../services/localDb';
import { 
  ArrowLeftRight,
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
  const [confirmingPayment, setConfirmingPayment] = useState<{staff: Staff, existingId?: string, isCancel?: boolean, netSalary?: number, totalInvoices?: number, deductions?: number} | null>(null);
  const [deletingInvoiceItem, setDeletingInvoiceItem] = useState<{id: string, amount: number} | null>(null);
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
        attendanceBarcode: (formData.attendanceBarcode || editingStaff.attendanceBarcode || generateNumericBarcode(school.id)).replace(/\D/g, '')
      });
    } else {
      localDb.add('staff', { 
        ...formData, 
        schoolId: school.id, 
        salary: Number(formData.salary),
        deductionAmount: Number(formData.deductionAmount),
        attendanceBarcode: (formData.attendanceBarcode || generateNumericBarcode(school.id)).replace(/\D/g, '')
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
      setConfirmingPayment({ staff: staffMember, existingId: existing.id, isCancel: true });
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

    setConfirmingPayment({
      staff: staffMember,
      netSalary,
      totalInvoices,
      deductions: totalAbsenceDeduction
    });
  };

  const handleExecutePaymentToggle = () => {
    if (!confirmingPayment) return;

    if (confirmingPayment.isCancel && confirmingPayment.existingId) {
      localDb.delete('staffPayments', confirmingPayment.existingId);
    } else if (confirmingPayment.netSalary !== undefined) {
      localDb.add('staffPayments', {
        staffId: confirmingPayment.staff.id,
        month: selectedMonth,
        amount: confirmingPayment.netSalary,
        date: new Date().toISOString(),
        status: 'paid'
      });
    }
    setConfirmingPayment(null);
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

  const deleteInvoice = (inv: StaffInvoice) => {
    setDeletingInvoiceItem({ id: inv.id, amount: inv.amount });
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
    <div className="space-y-2 animate-in fade-in duration-700">
      <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-4 bg-blue-50 text-blue-600 rounded-3xl">
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-black text-gray-900">إدارة رواتب الموظفين</h3>
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
        <div className="flex items-center gap-2">
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

          <div className="flex gap-2">
            <button
            onClick={() => setIsPreviewingPayroll(true)}
            className="bg-emerald-50 text-emerald-600 px-8 py-2 rounded-2xl font-black flex items-center gap-2 hover:bg-emerald-100 border border-emerald-100 transition-all transform hover:scale-[1.02]"
          >
            <Printer className="w-6 h-6" />
            معاينة سجل الرواتب
          </button>
          {canModify && (
            <button
              onClick={() => setIsAdding(true)}
              className="bg-blue-600 text-white px-8 py-2 rounded-2xl font-black flex items-center gap-2 hover:bg-blue-700 shadow-xl shadow-blue-100 transition-all transform hover:scale-[1.02]"
            >
              <UserPlus className="w-6 h-6" />
              إضافة موظف جديد
            </button>
          )}
        </div>
      </div>

      </div>

      
        {viewMode === 'cards' ? (
          <motion.div 
            key="grid"
            initial="hidden"
            animate="visible"
            exit="hidden"
            variants={{
              hidden: { opacity: 0 },
              visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
            }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2"
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
                <div 
                  key={member.id}

                  className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-2xl transition-all group relative overflow-hidden"
                >
                   {isPaid && (
                      <div className="absolute top-0 right-0 w-10 h-10 overflow-hidden">
                        <div className="bg-emerald-500 text-white text-[10px] font-black py-1 px-10 transform rotate-45 translate-x-6 translate-y-3 text-center shadow-sm">
                          تم الدفع
                        </div>
                      </div>
                   )}
                  
                  <div className="flex justify-between items-start mb-6">
                    <div className="flex items-center gap-2">
                      <div className="bg-blue-50 p-4 rounded-2xl text-blue-600 group-hover:scale-110 transition-transform">
                        <Briefcase className="w-6 h-6" />
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

                  <div className="space-y-2 mb-8">
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
                    <div className="flex justify-between items-center p-5 bg-blue-600 rounded-xl text-white shadow-lg shadow-blue-100">
                      <span className="text-lg font-black italic underline underline-offset-4 decoration-blue-300">الصافي المقرر</span>
                      <span className="text-lg font-black">{formatCurrency(netSalary)}</span>
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
                </div>
    );
            })}
          </motion.div>
        ) : (
          <div
            key="summary"
            className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"
          >
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-right border-collapse">
                <thead>
                  <tr className="bg-gray-50/80 border-b border-gray-100">
                    <th className="px-3 py-1.5 min-h-[38px] text-lg font-black text-gray-600 text-sm">الموظف</th>
                    <th className="px-3 py-1.5 min-h-[38px] text-lg font-black text-gray-600 text-sm text-center">الراتب الأساسي</th>
                    <th className="px-3 py-1.5 min-h-[38px] text-lg font-black text-gray-600 text-sm text-center">إجمالي الخصومات</th>
                    <th className="px-3 py-1.5 min-h-[38px] text-lg font-black text-gray-600 text-sm text-center">الصافي</th>
                    <th className="px-3 py-1.5 min-h-[38px] text-lg font-black text-gray-600 text-sm text-center">الحالة</th>
                    <th className="px-3 py-1.5 min-h-[38px] text-lg font-black text-gray-600 text-sm text-left">الإجراءات</th>
                  </tr>
                </thead>
                <motion.tbody 
                  initial="hidden"
                  animate="visible"
                  variants={{
                    hidden: { opacity: 0 },
                    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
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
                      <tr 
                        key={member.id}
                        className={`hover:bg-gray-50/50 transition-colors group ${isPaid ? 'bg-emerald-50/20' : ''}`}
                      >
                        <td className="px-3 py-1.5 min-h-[38px] text-lg">
                          <div className="flex items-center gap-2">
                            <div className={`w-6 h-6 rounded-2xl flex items-center justify-center shrink-0 ${isPaid ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-50 text-blue-600'}`}>
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
                        <td className="px-3 py-1.5 min-h-[38px] text-lg font-bold text-gray-600 text-center">
                          {formatCurrency(member.salary)}
                        </td>
                        <td className="px-3 py-1.5 min-h-[38px] text-lg">
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
                        <td className="px-3 py-1.5 min-h-[38px] text-lg text-center">
                           <span className={`px-4 py-2 rounded-xl font-black ${isPaid ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-50 text-blue-700'}`}>
                              {formatCurrency(netSalary)}
                           </span>
                        </td>
                        <td className="px-3 py-1.5 min-h-[38px] text-lg text-center">
                          <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-[10px] font-black border ${
                            isPaid 
                              ? 'bg-emerald-600 text-white border-emerald-700 shadow-sm' 
                              : 'bg-amber-50 text-amber-600 border-amber-100'
                          }`}>
                            <div className={`w-2 h-2 rounded-full ${isPaid ? 'bg-white' : 'bg-amber-500'}`}></div>
                            {isPaid ? 'مكتمل الدفع' : 'بانتظار الدفع'}
                          </div>
                        </td>
                        <td className="px-3 py-1.5 min-h-[38px] text-lg">
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
                      </tr>
    );
                  })}
                  {staff.length === 0 && (
                    <tr
                    >
                      <td colSpan={6} className="px-8 py-20 text-center">
                        <div className="flex flex-col items-center opacity-20 grayscale">
                          <Briefcase className="w-10 h-10 mb-4" />
                          <p className="font-black text-xl">لا يوجد موظفين مسجلين</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </motion.tbody>
                <tfoot className="bg-gray-50/50">
                  <tr className="font-black text-gray-900 border-t border-gray-100">
                    <td colSpan={3} className="px-3 py-1.5 min-h-[38px] text-lg text-left">إجمالي صافي الرواتب للشهر الحالي:</td>
                    <td className="px-3 py-1.5 min-h-[38px] text-lg">
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
          </div>
        )}
      

      {deletingStaff && (
        <div className="integrated-page">
          <div className="modal-content">
            <div className="p-4 border-b border-rose-50 flex items-center justify-between bg-white relative z-50 sticky top-0 shadow-sm px-12">
                <div className="flex items-center gap-3 text-right leading-relaxed">
                  <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl text-slate-800 shadow-sm">
                    <Trash2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-900 tracking-tight text-slate-900 tracking-tight leading-relaxed">تأكيد الحذف النهائي للموظف</h3>
                    <p className="text-sm font-bold text-slate-400 mt-1 leading-relaxed uppercase tracking-widest">تحذير: هذا الإجراء لا يمكن التراجع عنه أبداً</p>
                  </div>
                </div>
                <button 
                  onClick={() => setDeletingStaff(null)} 
                  className="p-4 bg-slate-50 hover:bg-slate-100 rounded-2xl transition-all text-slate-300 hover:text-slate-600 border border-slate-50"
                >
                  <ArrowLeftRight className="w-6 h-6 rotate-45" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 lg:p-5 custom-scrollbar w-full bg-rose-50/10 custom-scrollbar flex items-center justify-center">
                <div className="max-w-5xl w-full bg-white p-5 rounded-3xl border-4 border-rose-100 shadow-2xl text-center space-y-2">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-48 h-48 bg-rose-50 rounded-2xl flex items-center justify-center text-rose-500 shadow-2xl shadow-rose-100 group animate-pulse border-4 border-white">
                      <AlertCircle className="w-10 h-10" />
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-4xl font-black text-slate-900 tracking-tight leading-relaxed px-10">
                        هل أنت متأكد من إزالة الموظف 
                        <br />
                        <span className="text-rose-600 underline decoration-rose-200 underline-offset-8 decoration-8 font-black">"{deletingStaff.name}"</span> من الكادر؟
                      </h3>
                      <div className="p-5 bg-rose-50 rounded-2xl border-2 border-rose-100/50 space-y-2 max-w-xl mx-auto">
                        <p className="text-lg text-rose-800 font-bold leading-relaxed">
                          بمجرد التأكيد، سيتم مسح كافة سجلات الرواتب، الغيابات، والمعلومات الوظيفية من النظام للأبد.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 pt-6">
                    <button 
                      onClick={() => {
                        localDb.delete('staff', deletingStaff.id);
                        setDeletingStaff(null);
                      }}
                      className="w-full bg-rose-600 text-white py-12 rounded-2xl font-black text-xl shadow-2xl shadow-rose-200 hover:bg-rose-700 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3"
                    >
                      <Trash2 className="w-6 h-6" />
                      إزالة وتأكيد الحذف
                    </button>
                    <button 
                      onClick={() => setDeletingStaff(null)}
                      className="w-full bg-slate-100 text-slate-500 py-8 rounded-2xl font-black text-lg hover:bg-slate-200 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                    >
                      تراجع عن الحذف
                      <ArrowLeftRight className="w-6 h-6 rotate-45" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      

      {/* Staff Profile Modal */}
      {selectedStaffForProfile && staffProfileData && (
        <div className="integrated-page">
          <div className="modal-content">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-white relative z-20 sticky top-0 shadow-sm overflow-hidden">
              <div className="absolute top-0 right-0 w-[40rem] h-[40rem] bg-gradient-to-br from-blue-50 to-indigo-50 rounded-full blur-[80px] -mr-40 -mt-40 pointer-events-none opacity-60" />

              <div className="flex items-center gap-2 text-right relative z-20">
                <div className="bg-gradient-to-br from-blue-600 to-blue-800 p-4 rounded-2xl text-white shadow-2xl shadow-blue-200/50 flex items-center justify-center">
                  <UserCheck className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-4xl font-black text-gray-900 tracking-tight leading-relaxed">الملف الشخصي للموظف</h3>
                  <p className="text-sm font-bold text-gray-500 mt-2">{selectedStaffForProfile.name} - {selectedStaffForProfile.role}</p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedStaffForProfile(null)} 
                className="p-5 bg-gray-50 hover:bg-rose-50 rounded-2xl transition-all text-gray-400 hover:text-rose-600 border border-gray-100 relative z-20"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar w-full p-5 lg:p-4 bg-slate-50/20">
              <div className="w-full mx-auto grid grid-cols-1 lg:grid-cols-3 gap-3">
                <div className="space-y-2 text-right">
                  <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm text-center">
                    <div className="w-32 h-32 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 mx-auto mb-6">
                      <Briefcase className="w-10 h-10" />
                    </div>
                    <h4 className="text-lg font-black text-gray-900 mb-2">{selectedStaffForProfile.name}</h4>
                    <p className="text-blue-600 font-bold mb-8">{selectedStaffForProfile.role}</p>
                    
                    <div className="space-y-2 pt-8 border-t border-slate-50">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-400 font-bold">رقم الهاتف</span>
                        <span className="font-black text-gray-900" dir="ltr">{selectedStaffForProfile.phone || 'غير مسجل'}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-400 font-bold">الراتب الأساسي</span>
                        <span className="font-black text-emerald-600">{formatCurrency(selectedStaffForProfile.salary)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-2 space-y-2">
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                        <p className="text-sm font-black text-slate-400 mb-2 text-right">أيام الغياب الكلية</p>
                        <p className="text-4xl font-black text-rose-600 text-right">{staffProfileData.absences} <span className="text-sm tracking-widest mr-2">يوم</span></p>
                      </div>
                      <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                        <p className="text-sm font-black text-slate-400 mb-2 text-right">إجمالي الاستقطاعات</p>
                        <p className="text-4xl font-black text-indigo-600 text-right" dir="rtl">{formatCurrency(staffProfileData.invoices.reduce((s, i) => s + i.amount, 0))}</p>
                      </div>
                   </div>
                   {/* Rest of profile... */}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Staff Modal */}
      {isAdding && (
        <div className="integrated-page">
          <div className="modal-content">
            {/* Header */}
            <div className="p-5 lg:p-4 border-b border-gray-100 flex items-center justify-between bg-white relative z-50 sticky top-0 shadow-sm overflow-hidden text-right">
              <div className="absolute top-0 right-0 w-[40rem] h-[40rem] bg-gradient-to-br from-blue-500/5 to-transparent rounded-full blur-[100px] -mr-40 -mt-40 pointer-events-none" />

              <div className="flex items-center gap-3 relative z-20">
                <div className="bg-blue-600 p-5 rounded-xl text-white shadow-2xl shadow-blue-200 flex items-center justify-center">
                  <UserPlus className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 tracking-tight text-gray-900 tracking-tight leading-normal">
                    {editingStaff ? 'تحديث بيانات الموظف' : 'إضافة موظف جديد للكادر'}
                  </h3>
                  <p className="text-sm font-bold text-gray-500">تسجيل المعلومات الوظيفية والمالية للموظفين</p>
                </div>
              </div>
              <button 
                onClick={resetForm} 
                className="p-5 bg-gray-50 hover:bg-rose-50 rounded-xl transition-all text-gray-400 hover:text-rose-600 border border-gray-100 relative z-20"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Form Content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar w-full p-5 lg:p-4 bg-gray-50/30">
              <div className="max-w-5xl mx-auto w-full">
                <form onSubmit={handleSubmit} className="space-y-2">
                  {/* Personal Info Group */}
                  <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm space-y-2 text-right">
                    <h4 className="text-[10px] font-black text-blue-500 uppercase tracking-[0.3em] px-4 border-r-4 border-blue-500">المعلومات الشخصية والوظيفية</h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      <div className="md:col-span-2 space-y-2">
                        <label className="block text-sm font-black text-gray-700 pr-4">الاسم الكامل للموظف</label>
                        <input 
                          required 
                          type="text" 
                          value={formData.name} 
                          onChange={(e) => setFormData({...formData, name: e.target.value})} 
                          className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-8 py-5 outline-none focus:ring-2 focus:ring-blue-100 focus:bg-white font-bold text-lg transition-all shadow-inner" 
                          placeholder="الاسم الثلاثي واللقب..."
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="block text-sm font-black text-gray-700 pr-4">المسمى الوظيفي</label>
                        <input 
                          required 
                          type="text" 
                          value={formData.role} 
                          onChange={(e) => setFormData({...formData, role: e.target.value})} 
                          className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-8 py-5 outline-none focus:ring-2 focus:ring-blue-100 focus:bg-white font-black text-xl transition-all shadow-inner" 
                          placeholder="مثلاً: معلم، محاسب، موظف إداري..."
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="block text-sm font-black text-gray-700 pr-4">رقم الهاتف</label>
                        <input 
                          required 
                          type="text" 
                          value={formData.phone} 
                          onChange={(e) => setFormData({...formData, phone: e.target.value})} 
                          className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-8 py-5 outline-none focus:ring-2 focus:ring-blue-100 focus:bg-white font-black text-xl transition-all shadow-inner text-left" 
                          dir="ltr"
                          placeholder="07XX XXX XXXX"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Financial & ID Group */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm space-y-2 text-right">
                      <h4 className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.3em] px-4 border-r-4 border-emerald-500">المخصصات المالية</h4>
                      
                      <div className="space-y-2">
                        <label className="block text-sm font-black text-emerald-800 pr-4">الراتب الشهري الأساسي</label>
                        <div className="relative">
                          <input 
                            required 
                            type="number" 
                            value={formData.salary} 
                            onChange={(e) => setFormData({...formData, salary: e.target.value})} 
                            className="w-full bg-emerald-50/50 border border-emerald-100 rounded-2xl px-8 py-5 outline-none focus:ring-2 focus:ring-emerald-100 font-black text-xl text-emerald-600 transition-all text-center" 
                            placeholder="0"
                          />
                          <div className="absolute left-6 top-1/2 -translate-y-1/2 font-black text-emerald-300">IQD</div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="block text-sm font-black text-rose-700 pr-4">استقطاع الغياب اليومي</label>
                        <input 
                          required 
                          type="number" 
                          value={formData.deductionAmount} 
                          onChange={(e) => setFormData({...formData, deductionAmount: e.target.value})} 
                          className="w-full bg-rose-50/50 border border-rose-100 rounded-2xl px-8 py-5 outline-none focus:ring-2 focus:ring-rose-100 font-black text-lg text-rose-600 transition-all text-center" 
                          placeholder="0"
                        />
                      </div>
                    </div>

                    <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm space-y-2 text-right">
                      <h4 className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.3em] px-4 border-r-4 border-indigo-500">معرفات النظام</h4>
                      
                      <div className="space-y-2">
                        <label className="block text-sm font-black text-gray-400 pr-4">كود الباركود (اختياري)</label>
                        <div className="relative">
                           <ScanLine className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-300 w-6 h-6" />
                           <input 
                             type="text" 
                             value={formData.attendanceBarcode} 
                             onChange={(e) => setFormData({...formData, attendanceBarcode: e.target.value})} 
                             className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-8 py-5 outline-none focus:ring-2 focus:ring-gray-100 font-mono text-center text-xl font-black tracking-widest" 
                             placeholder="AUTO"
                           />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="block text-sm font-black text-indigo-400 pr-4">معرف البصمة (إن وجد)</label>
                        <div className="relative">
                           <Zap className="absolute left-6 top-1/2 -translate-y-1/2 text-indigo-300 w-6 h-6" />
                           <input 
                             type="text" 
                             value={formData.fingerprintId} 
                             onChange={(e) => setFormData({...formData, fingerprintId: e.target.value})} 
                             className="w-full bg-indigo-50/50 border border-indigo-100 rounded-2xl px-8 py-5 outline-none focus:ring-2 focus:ring-indigo-100 font-mono text-center text-lg font-black text-indigo-900 tracking-widest" 
                             placeholder="---"
                           />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Submit Actions */}
                  <div className="pt-10 flex flex-col md:flex-row items-center justify-center gap-3">
                    <button 
                      type="submit" 
                      className="w-full md:w-80 bg-blue-600 text-white py-6 rounded-2xl font-black text-lg hover:bg-blue-700 shadow-2xl shadow-blue-200 transition-all active:scale-95 flex items-center justify-center gap-2 group"
                    >
                      <CheckCircle2 className="w-6 h-6 group-hover:scale-110 transition-transform" />
                      {editingStaff ? 'حفظ التعديلات' : 'تأكيد وحفظ الموظف'}
                    </button>
                    <button 
                      type="button"
                      onClick={resetForm}
                      className="w-full md:w-60 bg-gray-100 text-gray-500 py-6 rounded-2xl font-black text-xl hover:bg-gray-200 transition-all"
                    >
                      إلغاء
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
      

      {/* Monthly Expense Management Modal */}
      
        {viewingInvoicesFor && (
          <div className="integrated-page">
            <div className="modal-content">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-white relative z-20 sticky top-0 shadow-sm px-12">
                <div className="flex items-center gap-3 text-right leading-relaxed">
                  <div className="p-5 theme-bg rounded-2xl text-white shadow-xl theme-shadow">
                    <BarChart3 className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-900 tracking-tight text-slate-900 tracking-tight leading-relaxed">مدقق المستحقات والالتزامات المالية</h3>
                    <p className="text-sm font-bold text-indigo-600 mt-1">{viewingInvoicesFor.name} — سجل شهر {format(new Date(selectedMonth), 'MMMM yyyy', { locale: ar })}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setViewingInvoicesFor(null)} 
                    className="bg-slate-50 p-4 hover:bg-slate-100 border border-slate-100 rounded-2xl transition-all text-slate-600 hover:text-slate-900 active:scale-95 transition-all text-slate-400 hover:text-rose-600 border border-slate-100"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-5 custom-scrollbar bg-slate-50/20">
                <div className="max-w-5xl mx-auto w-full /space-y-2">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-right leading-relaxed">
                    <div className="bg-white p-4 rounded-2xl border border-slate-100 flex items-center justify-between shadow-sm">
                      <span className="font-black text-slate-900 text-xl tracking-tight leading-relaxed">{formatCurrency(viewingInvoicesFor.salary)}</span>
                      <div className="flex flex-col items-end leading-relaxed">
                         <span className="text-slate-400 font-black text-xs uppercase tracking-widest leading-relaxed">الاستحقاق الشهري</span>
                         <span className="text-slate-600 font-black text-lg leading-relaxed">الراتب الثابت</span>
                      </div>
                    </div>
                    <div className="bg-rose-50 p-4 rounded-2xl border border-rose-100 flex items-center justify-between shadow-sm">
                      <span className="font-black text-rose-700 text-xl tracking-tight leading-relaxed">{formatCurrency(calculateDeductions(viewingInvoicesFor.id, selectedMonth) * (viewingInvoicesFor.deductionAmount || 0))}</span>
                      <div className="flex flex-col items-end leading-relaxed">
                         <span className="text-rose-400 font-black text-xs uppercase tracking-widest leading-relaxed">الخصم الآلي للغياب</span>
                         <span className="text-rose-600 font-black text-lg leading-relaxed">إجمالي {calculateDeductions(viewingInvoicesFor.id, selectedMonth)} أيام</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 text-right leading-relaxed">
                    <div className="flex items-center justify-between px-6">
                       <button 
                        onClick={() => setIsAddingInvoice(viewingInvoicesFor)}
                        className="bg-indigo-600 text-white px-8 py-2 rounded-2xl font-black flex items-center gap-3 hover:scale-105 transition-all shadow-xl shadow-indigo-100"
                      >
                        <Plus className="w-6 h-6" />
                        إضافة سند صرف جديد
                      </button>
                      <h4 className="font-black text-slate-900 flex items-center gap-2 justify-end text-lg leading-relaxed">
                        تفاصيل السلف والمصاريف الإضافية
                        <DollarSign className="w-6 h-6 text-indigo-500" />
                      </h4>
                    </div>
                    
                    {staffInvoices.filter(i => i.staffId === viewingInvoicesFor.id && format(new Date(i.date), 'yyyy-MM') === selectedMonth).length > 0 ? (
                      <div className="space-y-2">
                        {staffInvoices.filter(i => i.staffId === viewingInvoicesFor.id && format(new Date(i.date), 'yyyy-MM') === selectedMonth).map((inv) => (
                          <div key={inv.id} className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-2xl hover:border-indigo-200 transition-all group shadow-sm hover:shadow-2xl">
                            <div className="flex items-center gap-2 leading-relaxed">
                              <p className="font-black text-rose-600 text-xl tracking-tighter leading-relaxed">{formatCurrency(inv.amount)}</p>
                              <div className="flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0">
                                <button 
                                  onClick={() => {
                                    setEditingInvoice(inv);
                                    setInvoiceData({ amount: inv.amount.toString(), description: inv.description });
                                  }}
                                  className="p-5 text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all shadow-sm bg-slate-50 border border-slate-100"
                                >
                                  <Edit2 className="w-6 h-6" />
                                </button>
                                <button 
                                  onClick={() => deleteInvoice(inv)}
                                  className="p-5 text-rose-600 hover:bg-rose-50 rounded-xl transition-all shadow-sm bg-slate-50 border border-slate-100"
                                >
                                  <Trash2 className="w-6 h-6" />
                                </button>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 leading-relaxed">
                              <div className="text-right leading-relaxed">
                                <p className="font-black text-slate-900 text-lg leading-relaxed">{inv.description}</p>
                                <p className="text-sm text-slate-400 font-bold uppercase tracking-widest mt-2 leading-relaxed leading-relaxed">{format(new Date(inv.date), 'EEEE, d MMMM yyyy', { locale: ar })}</p>
                              </div>
                              <div className="w-20 h-20 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 shadow-inner group-hover:scale-110 transition-all duration-500">
                                <FileText className="w-6 h-6" />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-32 text-center border-4 border-dashed border-slate-100 rounded-[5rem] bg-white shadow-sm">
                        <div className="opacity-10 grayscale">
                          <DollarSign className="w-32 h-32 mx-auto mb-8" />
                          <p className="font-black text-4xl tracking-tight leading-relaxed">لا تتوفر سجلات مصروفات مالية لشهر {format(new Date(selectedMonth), 'MMMM', { locale: ar })}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="p-4 border-t border-slate-100 bg-white flex flex-col md:flex-row justify-center gap-2 h-fit sticky bottom-0 z-30 shadow-sm">
                <button 
                  onClick={() => setViewingInvoicesFor(null)}
                  className="px-24 bg-slate-900 text-white py-8 rounded-2xl font-black hover:bg-black transition-all text-lg shadow-2xl w-full max-w-xl"
                >
                  إغلاق نافذة المدقق المالي
                </button>
              </div>
            </div>
          </div>
        )}
      

      
        {(isAddingInvoice || editingInvoice) && (
          <div className="integrated-page">
            <div className="modal-content">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-white relative z-50 sticky top-0 shadow-sm px-12">
                <div className="flex items-center gap-3 text-right leading-relaxed">
                  <div className="p-4 theme-bg rounded-2xl text-white shadow-xl theme-shadow translate-y-1">
                    <DollarSign className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-900 tracking-tight text-slate-900 tracking-tight leading-relaxed">{editingInvoice ? 'تعديل السند المالي' : 'إضافة سند صرف'}</h3>
                    <p className="text-sm font-bold text-slate-400 mt-1 uppercase tracking-widest leading-relaxed">{(editingInvoice ? staff.find(s => s.id === editingInvoice.staffId) : isAddingInvoice)?.name}</p>
                  </div>
                </div>
                <button 
                  onClick={() => { setIsAddingInvoice(null); setEditingInvoice(null); setInvoiceData({ amount: '', description: '' }); }} 
                  className="p-4 bg-slate-50 hover:bg-rose-50 rounded-2xl transition-all text-slate-300 hover:text-rose-500 border border-slate-50"
                >
                  <ArrowLeftRight className="w-6 h-6 rotate-45" />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-4 lg:p-5 custom-scrollbar w-full bg-slate-50/20 custom-scrollbar flex items-center justify-center">
                <form onSubmit={addInvoice} className="w-full max-w-4xl mx-auto min-h-screen my-0 bg-white p-5  border border-slate-100 shadow-sm space-y-2 text-right">
                  <div className="space-y-2">
                    <div>
                      <label className="block text-sm font-black text-indigo-600 pr-8 uppercase tracking-widest leading-relaxed">القيمة النقدية (د.ع)</label>
                      <div className="relative group">
                        <DollarSign className="absolute right-8 top-1/2 -translate-y-1/2 text-indigo-400 w-6 h-6" />
                        <input 
                          required 
                          autoFocus
                          type="number" 
                          value={invoiceData.amount} 
                          onChange={(e) => setInvoiceData({...invoiceData, amount: e.target.value})} 
                          className="w-full bg-indigo-50 border border-indigo-100 rounded-2xl py-10 pr-24 pl-10 font-black text-5xl text-indigo-600 focus:ring-2 focus:ring-indigo-100/50 outline-none transition-all shadow-inner text-center tracking-tighter" 
                          placeholder="0.00"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-black text-slate-400 pr-8 uppercase tracking-widest leading-relaxed">الغرض من الصرف / الملاحظات</label>
                      <textarea 
                        required 
                        value={invoiceData.description} 
                        onChange={(e) => setInvoiceData({...invoiceData, description: e.target.value})} 
                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-10 py-10 outline-none focus:ring-2 focus:ring-slate-100/50 font-bold min-h-[250px] resize-none text-lg text-slate-900 transition-all placeholder:text-slate-300 shadow-inner leading-relaxed" 
                        placeholder="يرجى كتابة تفاصيل السلفة أو المشتريات هنا..."
                      />
                    </div>
                  </div>
                  
                  <div className="pt-6">
                    <button type="submit" className="w-full theme-bg text-white py-10 rounded-2xl font-black text-xl theme-shadow shadow-2xl hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 group">
                      <div className="p-4 bg-white/20 rounded-2xl group-hover:rotate-12 transition-transform">
                        <CheckCircle2 className="w-6 h-6" />
                      </div>
                      <span>{editingInvoice ? 'حفظ السند المعدل' : 'إعتماد سند الصرف'}</span>
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      

      {/* Payroll Preview Modal */}
      
        {isPreviewingPayroll && (
          <div className="integrated-page">
            <div className="modal-content">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-white relative z-50 sticky top-0 shadow-sm px-12">
                <div className="flex items-center gap-3 text-right leading-relaxed">
                  <div className="p-4 bg-emerald-600 rounded-2xl text-white shadow-xl shadow-emerald-100">
                    <Printer className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-900 tracking-tight text-slate-900 tracking-tight leading-relaxed">تدقيق وتجهيز سجل الرواتب</h3>
                    <p className="text-sm font-bold text-slate-400 mt-1 leading-relaxed">المعاينة النهائية قبل عملية الطباعة والأرشفة</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 leading-relaxed">
                  <button 
                    onClick={() => handlePrintPayroll()}
                    className="theme-bg text-white px-10 py-5 rounded-xl font-black hover:scale-[1.02] active:scale-95 flex items-center gap-3 transition-all theme-shadow shadow-2xl text-lg leading-relaxed"
                  >
                    تأكيد الطباعة النهائية
                    <Printer className="w-6 h-6" />
                  </button>
                  <button 
                    onClick={() => setIsPreviewingPayroll(false)}
                    className="p-5 hover:bg-rose-50 rounded-xl transition-all text-slate-300 hover:text-rose-500 border border-slate-50"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>

                <div className="flex items-center gap-3 px-12 py-6 bg-slate-50/50 border-b border-slate-100 overflow-x-auto justify-end">
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

                <div className="flex-1 overflow-y-auto p-4 bg-slate-100/50 flex justify-center custom-scrollbar">
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
            </div>
          </div>
        )}
      
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
      {/* Payment Confirmation Modal */}
      {confirmingPayment && (
        <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-md flex items-center justify-center p-4" dir="rtl">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8 text-center space-y-6">
              <div className={`w-24 h-24 rounded-full mx-auto flex items-center justify-center mb-6 ${confirmingPayment.isCancel ? 'bg-rose-50 text-rose-500' : 'bg-emerald-50 text-emerald-500'}`}>
                {confirmingPayment.isCancel ? <Trash2 className="w-12 h-12" /> : <CheckCircle2 className="w-12 h-12" />}
              </div>
              <h3 className="text-3xl font-black text-gray-900 tracking-tight">
                {confirmingPayment.isCancel ? 'إلغاء تأكيد الدفع' : 'تأكيد دفع الراتب'}
              </h3>
              
              {confirmingPayment.isCancel ? (
                <p className="text-lg text-gray-500 font-bold leading-relaxed">
                  هل أنت متأكد من إلغاء تأكيد الدفع للموظف <span className="text-rose-600">"{confirmingPayment.staff.name}"</span> لشهر {selectedMonth}؟
                </p>
              ) : (
                <p className="text-lg text-gray-500 font-bold leading-relaxed">
                  هل تريد تأكيد دفع الراتب الصافي بقيمة <span className="text-emerald-600 font-black">{formatCurrency(confirmingPayment.netSalary || 0)}</span> للموظف <span className="font-black text-gray-900">"{confirmingPayment.staff.name}"</span>؟
                  <br/>
                  <span className="text-sm">بعد خصم فواتير بقيمة {formatCurrency(confirmingPayment.totalInvoices || 0)} واستقطاع غيابات بقيمة {formatCurrency(confirmingPayment.deductions || 0)}.</span>
                </p>
              )}
              
              <div className="flex flex-col gap-3 pt-4">
                <button 
                  onClick={handleExecutePaymentToggle}
                  className={`w-full text-white py-4 rounded-2xl font-black text-lg active:scale-95 transition-all flex items-center justify-center gap-2 ${confirmingPayment.isCancel ? 'bg-rose-600 hover:bg-rose-700 shadow-xl shadow-rose-200' : 'bg-emerald-600 hover:bg-emerald-700 shadow-xl shadow-emerald-200'}`}
                >
                  {confirmingPayment.isCancel ? <Trash2 className="w-6 h-6" /> : <CheckCircle2 className="w-6 h-6" />}
                  تأكيد
                </button>
                <button 
                  onClick={() => setConfirmingPayment(null)}
                  className="w-full bg-gray-100 text-gray-600 py-4 rounded-2xl font-black text-lg hover:bg-gray-200 active:scale-95 transition-all"
                >
                  إلغاء الأمر
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Invoice Deletion Modal */}
      {deletingInvoiceItem && (
        <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-md flex items-center justify-center p-4" dir="rtl">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8 text-center space-y-6">
              <div className="w-24 h-24 bg-rose-50 rounded-full mx-auto flex items-center justify-center text-rose-500 mb-6">
                <Trash2 className="w-12 h-12" />
              </div>
              <h3 className="text-3xl font-black text-gray-900 tracking-tight">تأكيد الحذف</h3>
              <p className="text-lg text-gray-500 font-bold leading-relaxed">
                هل أنت متأكد من حذف هذا المصرف وقدره <span className="text-rose-600 font-black">{formatCurrency(deletingInvoiceItem.amount)}</span>؟
                <br />
                <span className="text-sm font-medium">لا يمكن التراجع عن هذا الإجراء بعد تنفيذه.</span>
              </p>
              
              <div className="flex flex-col gap-3 pt-4">
                <button 
                  onClick={() => {
                    localDb.delete('staffInvoices', deletingInvoiceItem.id);
                    setDeletingInvoiceItem(null);
                  }}
                  className="w-full bg-rose-600 text-white py-4 rounded-2xl font-black text-lg shadow-xl shadow-rose-200 hover:bg-rose-700 active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  <Trash2 className="w-6 h-6" />
                  نعم، تأكيد الحذف
                </button>
                <button 
                  onClick={() => setDeletingInvoiceItem(null)}
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
    <div className="p-4 text-right rtl min-h-screen bg-white" dir="rtl">
      <div className="flex justify-between items-start mb-12 border-b-4 border-gray-900 pb-4">
        <div>
          {school.logo && (
            <div className="mb-4">
              <img src={school.logo} alt="شعار المدرسة" className="h-16 object-contain" />
            </div>
          )}
          <h2 className="text-lg font-black text-slate-900 tracking-tight text-gray-900 mb-2">{school.name}</h2>
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
            <td colSpan={5} className="border-2 border-gray-900 p-4 text-left font-black">إجمالي الرواتب الصافية:</td>
            <td className="border-2 border-gray-900 p-4 text-center text-lg" dir="ltr">
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
            <td className="border-2 border-gray-900 p-4"></td>
          </tr>
        </tfoot>
      </table>

      <div className="mt-24 grid grid-cols-3 gap-3 text-center">
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
