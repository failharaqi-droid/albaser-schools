import { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { School, Student, Payment, AttendanceRecord, AttendanceStatus } from '../types';
import { localDb } from '../services/localDb';
import { WhatsAppService } from '../services/WhatsAppService';
import { toast } from './Toast';
import * as XLSX from 'xlsx';
import { 
  ArrowLeftRight,
  FileCheck,
  AlertTriangle,
  Settings,
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  UserPlus, 
  Phone, 
  Filter,
  X,
  Users,
  CreditCard,
  ScanLine,
  DollarSign,
  User,
  Download,
  Upload,
  Fingerprint,
  Eye,
  Calendar,
  Clock,
  CheckCircle,
  CheckCircle2,
  XCircle,
  TrendingUp,
  History,
  Bell,
  Printer,
  ChevronRight,
  ChevronLeft,
  LayoutGrid,
  Zap,
  Info,
  AlertCircle,
  LogOut,
  MessageSquare,
  HelpCircle,
  UserCheck,
  Activity,
  MapPin
} from 'lucide-react';
import { formatCurrency, generateNumericBarcode, numberToArabicWords } from '../lib/utils';
import BarcodeScanner from './BarcodeScanner';
import PaymentModal from './PaymentModal';
import { QRCodeSVG } from 'qrcode.react';
import { format, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { ar } from 'date-fns/locale';
import { useReactToPrint } from 'react-to-print';
import { useRef } from 'react';

interface StudentManagerProps {
  school: School;
  students: Student[];
  onPay: (studentId: string) => void;
  canModify?: boolean;
  initialMode?: 'list' | 'add';
}

const GRADES = [
  "الأول الابتدائي", "الثاني الابتدائي", "الثالث الابتدائي", "الرابع الابتدائي", "الخامس الابتدائي", "السادس الابتدائي",
  "الأول المتوسط", "الثاني المتوسط", "الثالث المتوسط",
  "الرابع العلمي", "الرابع الأدبي", "الخامس العلمي", "الخامس الأدبي", "السادس العلمي", "السادس الأدبي"
];

const ABJAD_ALPHABET = ['أ', 'ب', 'ج', 'د', 'هـ', 'و', 'ز', 'ح', 'ط', 'ي', 'ك', 'ل', 'م', 'ن', 'س', 'ع', 'ف', 'ص', 'ق', 'ر', 'ش', 'ت', 'ث', 'خ', 'ذ', 'ض', 'ظ', 'غ'];

export default function StudentManager({ school, students, onPay, canModify = true, initialMode = 'list' }: StudentManagerProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGrade, setSelectedGrade] = useState('الكل');
  const [isAdding, setIsAdding] = useState(initialMode === 'add');
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isScanningForForm, setIsScanningForForm] = useState(false);
  const [quickPayStudent, setQuickPayStudent] = useState<Student | null>(null);
  const [quickAmount, setQuickAmount] = useState('');
  const [selectedStudentForProfile, setSelectedStudentForProfile] = useState<Student | null>(null);
  const [selectedPaymentForReceipt, setSelectedPaymentForReceipt] = useState<Payment | null>(null);
  const [profileTab, setProfileTab] = useState<'overview' | 'finance' | 'attendance'>('overview');
  const [deletingStudent, setDeletingStudent] = useState<Student | null>(null);
  const [editingAttendance, setEditingAttendance] = useState<AttendanceRecord | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  const [attendanceFormData, setAttendanceFormData] = useState({
    status: 'present' as AttendanceStatus,
    reason: ''
  });
  const [isPrintingRegistry, setIsPrintingRegistry] = useState(false);
  const [registryConfig, setRegistryConfig] = useState({
    grade: 'الكل',
    letter: 'الكل',
    startSerial: 1,
    selectedIds: new Set<string>(),
    emptyColumns: 4, // Default number of empty columns
    columnTitles: ['', '', '', ''], // Custom titles for empty columns
    registryTitle: 'سجل يدوي',
    searchQuery: '',
    showSelectedOnly: false
  });
  const [isDistributing, setIsDistributing] = useState(false);
  const [distributionSettings, setDistributionSettings] = useState({
    studentsPerSection: 45,
    showFillerRows: true,
    showSignatures: true,
    showGradesList: true
  });
  const [showFrequentAbsences, setShowFrequentAbsences] = useState(false);

  const studentsAbsences = useMemo(() => {
    const attendanceRecords = localDb.getAll('attendanceRecords');
    const stats: Record<string, number> = {};
    
    attendanceRecords.forEach(r => {
      if (r.type === 'student' && r.status === 'absent') {
        stats[r.entityId] = (stats[r.entityId] || 0) + 1;
      }
    });

    return stats;
  }, [students.length]);

  const highAbsenceStudents = useMemo(() => {
    return students.filter(s => (studentsAbsences[s.id] || 0) >= 6)
      .sort((a, b) => (studentsAbsences[b.id] || 0) - (studentsAbsences[a.id] || 0));
  }, [students, studentsAbsences]);

  const printRef = useRef<HTMLDivElement>(null);
  const distributionPrintRef = useRef<HTMLDivElement>(null);
  const pastReceiptRef = useRef<HTMLDivElement>(null);
  
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `${registryConfig.registryTitle}_${registryConfig.grade}_${format(new Date(), 'yyyy-MM-dd')}`
  });

  const handleDistributionPrint = useReactToPrint({
    contentRef: distributionPrintRef,
    documentTitle: `توزيع_الشعب_${school.name}_${format(new Date(), 'yyyy-MM-dd')}`
  });

  const handlePrintPastReceipt = useReactToPrint({
    contentRef: pastReceiptRef,
    documentTitle: `وصل استلام - ${selectedStudentForProfile?.name || 'طالب'}`
  });

  const [formData, setFormData] = useState({
    name: '',
    parentName: '',
    totalAmount: '',
    grade: GRADES[0],
    phone: '',
    address: '',
    barcode: '',
    attendanceBarcode: '',
    installmentBarcode: '',
    dob: '',
    photo: '',
    fingerprintId: ''
  });

  const filteredStudents = useMemo(() => {
    setCurrentPage(1); // Reset to first page on search/filter
    return students.filter(s => {
        const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                             s.barcode.includes(searchTerm) || 
                             (s.phone && s.phone.includes(searchTerm)) ||
                             (s.attendanceBarcode && s.attendanceBarcode.includes(searchTerm)) || 
                             (s.installmentBarcode && s.installmentBarcode.includes(searchTerm));
        const matchesGrade = selectedGrade === 'الكل' || s.grade === selectedGrade;
        return matchesSearch && matchesGrade;
      }).sort((a, b) => {
        const gradeA = GRADES.indexOf(a.grade);
        const gradeB = GRADES.indexOf(b.grade);
        if (gradeA !== gradeB) return gradeA - gradeB;
        return a.name.localeCompare(b.name, 'ar');
      });
  }, [students, searchTerm, selectedGrade]);

  const paginatedStudents = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredStudents.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredStudents, currentPage]);

  const totalPages = Math.ceil(filteredStudents.length / itemsPerPage);

  const studentsWithSequence = useMemo(() => {
    const gradeGroups: { [grade: string]: Student[] } = {};
    
    // Group all students by grade
    students.forEach(s => {
      if (!gradeGroups[s.grade]) gradeGroups[s.grade] = [];
      gradeGroups[s.grade].push(s);
    });

    const sequences: { [studentId: string]: number } = {};

    // Sort each group alphabetically and assign sequence
    Object.keys(gradeGroups).forEach(grade => {
      gradeGroups[grade]
        .sort((a, b) => a.name.localeCompare(b.name, 'ar'))
        .forEach((s, idx) => {
          sequences[s.id] = idx + 1;
        });
    });

    return sequences;
  }, [students]);

  const studentProfileData = useMemo(() => {
    if (!selectedStudentForProfile) return null;
    
    const payments = localDb.getAll('payments') as Payment[];
    const studentPayments = payments.filter(p => p.studentId === selectedStudentForProfile.id);
    const paidAmount = studentPayments.reduce((sum, p) => sum + p.amount, 0);
    const remainingAmount = selectedStudentForProfile.totalAmount - paidAmount;
    
    const attendance = localDb.getAll('attendanceRecords') as AttendanceRecord[];
    const studentAttendance = attendance.filter(r => r.entityId === selectedStudentForProfile.id && r.type === 'student');
    
    const currentMonthStart = startOfMonth(new Date());
    const currentMonthEnd = endOfMonth(new Date());
    const monthlyAttendance = studentAttendance.filter(r => 
      isWithinInterval(new Date(r.date), { start: currentMonthStart, end: currentMonthEnd })
    );
    
    const presentCount = studentAttendance.filter(r => r.status === 'present').length;
    const absentCount = studentAttendance.filter(r => r.status === 'absent').length;
    const lateCount = studentAttendance.filter(r => r.status === 'late').length;
    const excusedCount = studentAttendance.filter(r => r.status === 'excused').length;
    const violationCount = studentAttendance.filter(r => r.status === 'violation').length;
    const dismissedCount = studentAttendance.filter(r => r.status === 'dismissed').length;

    const attendanceRate = studentAttendance.length > 0 
      ? Math.round((presentCount / studentAttendance.length) * 100) 
      : 100;

    const lastPayment = studentPayments.length > 0
      ? [...studentPayments].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]
      : null;

    return {
      studentPayments,
      paidAmount,
      remainingAmount,
      studentAttendance,
      presentCount,
      absentCount,
      lateCount,
      excusedCount,
      violationCount,
      dismissedCount,
      attendanceRate,
      monthlyAttendance,
      lastPayment
    };
  }, [selectedStudentForProfile]);

  const distributionData = useMemo(() => {
    const gradesWithSections: { 
      grade: string; 
      total: number;
      sections: { name: string; students: Student[] }[] 
    }[] = [];

    const gradesToProcess = selectedGrade === 'الكل' ? GRADES : [selectedGrade];

    gradesToProcess.forEach(grade => {
      const gradeStudents = students
        .filter(s => s.grade === grade)
        .sort((a, b) => a.name.localeCompare(b.name, 'ar'));

      if (gradeStudents.length === 0) return;

      const sections = [];
      const studentsPerSection = distributionSettings.studentsPerSection;
      const sectionCount = Math.ceil(gradeStudents.length / studentsPerSection);

      for (let i = 0; i < sectionCount; i++) {
        const start = i * studentsPerSection;
        const end = start + studentsPerSection;
        sections.push({
          name: ABJAD_ALPHABET[i % ABJAD_ALPHABET.length],
          students: gradeStudents.slice(start, end)
        });
      }

      gradesWithSections.push({
        grade,
        total: gradeStudents.length,
        sections
      });
    });

    return gradesWithSections;
  }, [students, selectedGrade]);

  const exportDistributionToExcel = () => {
    const rows: any[] = [];
    distributionData.forEach(gradeData => {
      gradeData.sections.forEach(section => {
        section.students.forEach((st, idx) => {
          rows.push({
            'الصف': gradeData.grade,
            'الشعبة': section.name,
            'ت': idx + 1,
            'اسم الطالب': st.name,
            'رقم الهاتف': st.phone,
            'اسم ولي الأمر': st.parentName
          });
        });
      });
    });

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "توزيع الشعب");
    XLSX.writeFile(workbook, `توزيع_الشعب_${school.name}.xlsx`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation
    const amount = Number(formData.totalAmount);
    if (isNaN(amount) || amount < 0) {
      toast.error('يرجى إدخال مبلغ صحيح');
      return;
    }

    if (editingStudent) {
      await localDb.update('students', editingStudent.id, {
        ...formData,
        totalAmount: amount,
        barcode: (formData.barcode || editingStudent.barcode || generateNumericBarcode(school.id)).replace(/\D/g, ''),
        attendanceBarcode: (formData.attendanceBarcode || editingStudent.attendanceBarcode || generateNumericBarcode(school.id)).replace(/\D/g, ''),
        installmentBarcode: (formData.installmentBarcode || editingStudent.installmentBarcode || generateNumericBarcode(school.id)).replace(/\D/g, ''),
      });
      toast.success('تم تحديث بيانات الطالب بنجاح');
    } else {
      const newStudent = await localDb.add('students', {
        ...formData,
        schoolId: school.id,
        totalAmount: amount,
        address: formData.address,
        barcode: (formData.barcode || generateNumericBarcode(school.id)).replace(/\D/g, ''),
        attendanceBarcode: (formData.attendanceBarcode || generateNumericBarcode(school.id)).replace(/\D/g, ''),
        installmentBarcode: (formData.installmentBarcode || generateNumericBarcode(school.id)).replace(/\D/g, ''),
        createdAt: new Date().toISOString()
      }) as Student;

      toast.success('تم تسجيل الطالب بنجاح');

      // Send Welcome Message
      import('../services/WhatsAppService').then(({ WhatsAppService }) => {
        WhatsAppService.sendNotification(school.id, newStudent.id, 'welcome').then(res => {
          if (res && res.mode === 'manual' && res.url) {
            window.open(res.url, '_blank');
          }
        });
      });
    }
    resetForm();
  };

  const resetForm = () => {
    setFormData({ 
      name: '', parentName: '', totalAmount: '', grade: GRADES[0], phone: '', address: '', 
      barcode: '', attendanceBarcode: '', installmentBarcode: '',
      dob: '', photo: '', fingerprintId: '' 
    });
    setIsAdding(false);
    setEditingStudent(null);
  };

  const startEdit = (student: Student) => {
    setEditingStudent(student);
    setFormData({
      name: student.name,
      parentName: student.parentName || '',
      totalAmount: student.totalAmount.toString(),
      grade: student.grade,
      phone: student.phone,
      address: student.address || '',
      barcode: student.barcode,
      attendanceBarcode: student.attendanceBarcode || '',
      installmentBarcode: student.installmentBarcode || '',
      dob: student.dob || '',
      photo: student.photo || '',
      fingerprintId: student.fingerprintId || ''
    });
    setIsAdding(true);
  };

  const executeDeleteStudent = async (id: string) => {
      await localDb.delete('students', id);
      
      // Also delete payments for this student
      const payments = localDb.getAll('payments') as Payment[];
      const studentPayments = payments.filter(p => p.studentId === id);
      for (const p of studentPayments) {
        await localDb.delete('payments', p.id);
      }

      // Also delete attendance records for this student
      const attendance = localDb.getAll('attendanceRecords') as AttendanceRecord[];
      const studentAttendance = attendance.filter(r => r.entityId === id && r.type === 'student');
      for (const r of studentAttendance) {
        await localDb.delete('attendanceRecords', r.id);
      }

      toast.success('تم حذف الطالب وكافة سجلاته بنجاح');
      
      // Close profile if it was open for this student
      if (selectedStudentForProfile?.id === id) {
        setSelectedStudentForProfile(null);
      }
      
      setDeletingStudent(null);
  };

  const handleUpdateAttendance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAttendance) return;
    
    await localDb.update('attendanceRecords', editingAttendance.id, {
      status: attendanceFormData.status,
      reason: attendanceFormData.reason
    });
    
    toast.success('تم تحديث سجل الحضور بنجاح');
    setEditingAttendance(null);
  };

  const sendAbsenceAlert = async (student: Student, absences: number) => {
    let type: 'warning' | 'summons' | 'expulsion' = 'warning';
    let label = 'تنبيه غياب (6 أيام)';

    if (absences >= 12) {
      type = 'expulsion';
      label = 'إنذار فصل (12 يوم)';
    } else if (absences >= 10) {
      type = 'summons';
      label = 'استدعاء ولي أمر (10 أيام)';
    }

    const result = await WhatsAppService.sendNotification(
      student.schoolId,
      student.id,
      type,
      { absences }
    );

    if (result) {
      if (result.mode === 'manual' && result.url) {
        window.open(result.url, '_blank');
      } else {
        toast.success(`تم إرسال ${label} بنجاح عبر البوت`);
      }
    } else {
      toast.error('فشل إرسال التنبيه. يرجى التحقق من إعدادات البوت.');
    }
  };

  const sendStatusReport = async (student: Student) => {
    if (!studentProfileData) return;
    
    const count = studentProfileData.absentCount;
    // Calculate alerts/summons/warnings count based on the business logic applied earlier
    const alertsCount = count >= 6 ? 1 : 0;
    const summonsCount = count >= 10 ? 1 : 0;
    const warningsCount = count >= 12 ? 1 : 0;

    const data = {
      total: student.totalAmount,
      paid: studentProfileData.paidAmount,
      remain: studentProfileData.remainingAmount,
      last_payment: studentProfileData.lastPayment?.amount || 0,
      last_payment_date: studentProfileData.lastPayment?.date ? format(new Date(studentProfileData.lastPayment.date), 'yyyy-MM-dd') : 'لا يوجد',
      absences: count,
      alerts: alertsCount,
      summons: summonsCount,
      warnings: warningsCount
    };

    const res = await WhatsAppService.sendNotification(
      student.schoolId,
      student.id,
      'status',
      data
    );

    if (res && res.mode === 'manual' && res.url) {
      window.open(res.url, '_blank');
    } else if (res && res.success) {
      toast.success('تم إرسال تقرير حالة الطالب بنجاح');
    } else {
      toast.error('فشل في إرسال التقرير. تأكد من إعدادات الواتساب وتعيين قالب تقرير الحالة');
    }
  };

  const handleScan = (decodedText: string) => {
    setSearchTerm(decodedText);
    setIsScanning(false);
  };

  const handleScanForForm = (decodedText: string) => {
    setFormData(prev => ({ ...prev, barcode: decodedText }));
    setIsScanningForForm(false);
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, photo: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleQuickPay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickPayStudent || !quickAmount) return;
    
    const amount = Number(quickAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('يرجى إدخال مبلغ صحيح');
      return;
    }

    await localDb.add('payments', {
      studentId: quickPayStudent.id,
      amount,
      date: new Date().toISOString(),
      method: 'cash',
      note: 'دفع سريع من قائمة الطلاب'
    });

    toast.success(`تم تسجيل دفعة بقيمة ${formatCurrency(amount)} بنجاح`);

    // Calculate remaining and send notification
    const payments = localDb.getAll('payments') as Payment[];
    const studentPayments = payments.filter(p => p.studentId === quickPayStudent.id);
    const paidAmount = studentPayments.reduce((sum, p) => sum + p.amount, 0);
    const remain = quickPayStudent.totalAmount - paidAmount;

    import('../services/WhatsAppService').then(({ WhatsAppService }) => {
      WhatsAppService.sendNotification(school.id, quickPayStudent.id, 'payment', {
        amount: amount,
        remain: remain
      }).then(res => {
        if (res && res.mode === 'manual' && res.url) {
          window.open(res.url, '_blank');
        }
      });
    });
    
    setQuickPayStudent(null);
    setQuickAmount('');
  };

  const sendPaymentReminder = (student: Student) => {
    const payments = localDb.getAll('payments') as Payment[];
    const studentPayments = payments.filter(p => p.studentId === student.id);
    const paidAmount = studentPayments.reduce((sum, p) => sum + p.amount, 0);
    const remain = student.totalAmount - paidAmount;

    if (remain <= 0) {
      toast.info('تم تسديد كامل المبلغ لهذا الطالب');
      return;
    }

    import('../services/WhatsAppService').then(({ WhatsAppService }) => {
      WhatsAppService.sendNotification(school.id, student.id, 'reminder', {
        remain: remain
      }).then(res => {
        if (res && res.mode === 'manual' && res.url) {
          window.open(res.url, '_blank');
        } else if (res && res.success) {
          toast.success('تم إرسال تذكير الدفع بنجاح');
        }
      });
    });
  };

  const exportToExcel = () => {
    // Sort students by grade then by name
    const sortedStudents = [...students].sort((a, b) => {
      const gradeA = GRADES.indexOf(a.grade);
      const gradeB = GRADES.indexOf(b.grade);
      if (gradeA !== gradeB) return gradeA - gradeB;
      return a.name.localeCompare(b.name, 'ar');
    });

    const excelData = sortedStudents.map((s, index) => ({
      'ت': index + 1,
      'اسم الطالب': s.name,
      'الصف': s.grade,
      'المبلغ الكلي': s.totalAmount,
      'اسم ولي الأمر': s.parentName || '',
      'رقم الهاتف': s.phone,
      'عنوان السكن': s.address || ''
    }));

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "سجل الطلاب");
    
    // Set column widths
    const wscols = [
      { wch: 5 },  // ت
      { wch: 35 }, // اسم الطالب
      { wch: 25 }, // الصف
      { wch: 15 }, // المبلغ الكلي
      { wch: 30 }, // اسم ولي الأمر
      { wch: 15 }, // رقم الهاتف
      { wch: 40 }  // عنوان السكن
    ];
    worksheet['!cols'] = wscols;

    XLSX.writeFile(workbook, `سجل_الطلاب_المنظم_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
  };

  const exportToCSV = () => {
    // Sort students by grade then by name
    const sortedStudents = [...students].sort((a, b) => {
      const gradeA = GRADES.indexOf(a.grade);
      const gradeB = GRADES.indexOf(b.grade);
      if (gradeA !== gradeB) return gradeA - gradeB;
      return a.name.localeCompare(b.name, 'ar');
    });

    const csvData = sortedStudents.map((s) => ({
      'معرف الطالب': s.id,
      'اسم الطالب': s.name,
      'الصف': s.grade,
      'رقم الهاتف': s.phone,
      'اسم ولي الأمر': s.parentName || '',
      'عنوان السكن': s.address || ''
    }));

    const worksheet = XLSX.utils.json_to_sheet(csvData);
    const csvContent = XLSX.utils.sheet_to_csv(worksheet);
    
    // Add BOM for Excel character recognition (UTF-8)
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `سجل_الطلاب_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-col md:flex-row gap-2 justify-between items-center bg-white p-4 rounded-3xl border border-gray-100 shadow-sm">
        <div className="flex-1 w-full flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="البحث عن طالب (الاسم أو الباركود)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-2xl pr-12 pl-6 py-3 outline-none font-bold focus:ring-2"
              style={{ ['--tw-ring-color' as any]: 'var(--primary-theme-soft)' }}
            />
          </div>
          <button
            onClick={() => setIsScanning(true)}
            className="theme-bg-soft theme-text px-4 rounded-2xl hover:bg-opacity-80 transition-all shadow-sm border theme-border-soft flex items-center justify-center group"
            title="مسح باركود"
          >
            <ScanLine className="w-6 h-6 group-hover:scale-110 transition-transform" />
          </button>
        </div>
        
        {isScanning && (
          <div className="integrated-page">
            <div className="modal-content">
                <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-white relative z-50 sticky top-0 shadow-sm px-10">
                  <div className="flex items-center gap-3 text-right leading-relaxed">
                    <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl text-slate-800 shadow-sm">
                      <ScanLine className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-slate-900 tracking-tight text-slate-900 tracking-tight leading-relaxed">ماسح الباركود الذكي</h3>
                      <p className="text-sm font-bold text-slate-400 mt-1 leading-relaxed">توجيه الكاميرا نحو كود الطالب للتعرف السريع</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setIsScanning(false)} 
                    className="p-4 bg-slate-50 hover:bg-rose-50 rounded-2xl transition-all text-slate-300 hover:text-rose-500 border border-slate-50"
                  >
                    <ArrowLeftRight className="w-6 h-6 rotate-45" />
                  </button>
                </div>
                <div className="flex-1 flex items-center justify-center bg-slate-950 p-4 relative overflow-hidden">
                  <div className="absolute inset-0 opacity-20 pointer-events-none">
                    <div className="w-full h-full border-[40px] border-indigo-500/30 rounded-[5rem] animate-pulse"></div>
                  </div>
                  <div className="relative z-10 w-full h-full rounded-2xl overflow-hidden border-4 border-white/20 shadow-2xl">
                    <BarcodeScanner 
                      onScan={handleScan} 
                      onClose={() => setIsScanning(false)} 
                    />
                  </div>
                  <div className="absolute bottom-10 left-0 right-0 flex justify-center">
                    <p className="bg-white/10 backdrop-blur-md text-white/60 px-8 py-3 rounded-full text-xs font-black uppercase tracking-[0.5em] animate-pulse">
                      Scanning for Identity QR/Barcode
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

        {isScanningForForm && (
            <div className="integrated-page no-scrollbar">
              <div 
                key="scanning-form-modal"
                className="modal-content"
              >
                <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-white relative z-50 sticky top-0 shadow-sm px-10">
                  <div className="flex items-center gap-3 text-right leading-relaxed">
                    <div className="bg-emerald-600 p-5 rounded-xl text-white shadow-xl shadow-indigo-100 rotate-3">
                      <ScanLine className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-slate-900 tracking-tight text-slate-900 tracking-tight leading-relaxed">ماسح الباركود المخصص</h3>
                      <p className="text-sm font-bold text-slate-400 mt-1 leading-relaxed">تخصيص كود تعريفي جديد للطالب عبر المسح المباشر</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setIsScanningForForm(false)} 
                    className="p-4 bg-slate-50 hover:bg-rose-50 rounded-2xl transition-all text-slate-300 hover:text-rose-500 border border-slate-50"
                  >
                    <ArrowLeftRight className="w-6 h-6 rotate-45" />
                  </button>
                </div>
                <div className="flex-1 flex items-center justify-center bg-slate-950 p-4 relative overflow-hidden">
                  <div className="absolute inset-0 opacity-20 pointer-events-none">
                    <div className="w-full h-full border-[40px] border-emerald-500/30 rounded-[5rem] animate-pulse"></div>
                  </div>
                  <div className="relative z-10 w-full h-full rounded-2xl overflow-hidden border-4 border-white/20 shadow-2xl">
                    <BarcodeScanner 
                      onScan={handleScanForForm} 
                      onClose={() => setIsScanningForForm(false)} 
                    />
                  </div>
                  <div className="absolute bottom-10 left-0 right-0 flex justify-center">
                    <p className="bg-white/10 backdrop-blur-md text-white/60 px-8 py-3 rounded-full text-xs font-black uppercase tracking-[0.5em] animate-pulse">
                      Binding New Barcode to Student Identity
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        
        <div className="flex gap-3 w-full md:w-auto">
          <button
            onClick={() => setShowFrequentAbsences(true)}
            className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-black transition-all border-2 ${
              highAbsenceStudents.length > 0 
                ? 'bg-rose-50 border-rose-200 text-rose-600 shadow-sm animate-pulse' 
                : 'bg-white border-gray-100 text-gray-400 hover:bg-gray-50'
            }`}
          >
            <Bell className="w-5 h-5" />
            <span className="hidden lg:inline">إنذارات الغياب</span>
            {highAbsenceStudents.length > 0 && (
              <span className="bg-rose-500 text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center">
                {highAbsenceStudents.length}
              </span>
            )}
          </button>

          <select
            value={selectedGrade}
            onChange={(e) => setSelectedGrade(e.target.value)}
            className="bg-gray-50 border border-gray-200 rounded-2xl px-3 py-1.5 min-h-[38px] outline-none font-bold focus:ring-2"
            style={{ ['--tw-ring-color' as any]: 'var(--primary-theme-soft)' }}
          >
            <option value="الكل">جميع الصفوف</option>
            {GRADES.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
          
          <button
            onClick={() => setIsDistributing(true)}
            className="bg-indigo-600 text-white px-6 py-3 rounded-2xl font-black flex items-center gap-2 hover:bg-indigo-700 shadow-lg shadow-indigo-100"
          >
            <LayoutGrid className="w-5 h-5" />
            توزيع الشعب
          </button>
          
          <button
            onClick={() => setIsPrintingRegistry(true)}
            className="bg-purple-600 text-white px-6 py-3 rounded-2xl font-black flex items-center gap-2 hover:bg-purple-700 shadow-lg shadow-purple-100"
          >
            <Printer className="w-5 h-5" />
            طباعة السجل
          </button>
          
          <button
            onClick={exportToCSV}
            className="bg-blue-600 text-white px-6 py-3 rounded-2xl font-black flex items-center gap-2 hover:bg-blue-700 shadow-lg shadow-blue-100"
          >
            <Download className="w-5 h-5" />
            تصدير CSV
          </button>
          
          <button
            onClick={exportToExcel}
            className="bg-emerald-600 text-white px-6 py-3 rounded-2xl font-black flex items-center gap-2 hover:bg-emerald-700 shadow-lg shadow-emerald-100"
          >
            <Download className="w-5 h-5" />
            تصدير Excel
          </button>
          
          {canModify && (
            <button
              onClick={() => setIsAdding(true)}
              className="theme-bg text-white px-6 py-3 rounded-2xl font-black flex items-center gap-2 theme-shadow transition-all hover:opacity-90"
            >
              <UserPlus className="w-5 h-5" />
              إضافة طالب
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-right border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100 text-xs text-slate-800">
              <th className="px-4 py-2 font-black">تسلسل الصف</th>
              <th className="px-3 py-1.5 min-h-[38px] font-black">الطالب</th>
              <th className="px-3 py-1.5 min-h-[38px] font-black">الصف</th>
              <th className="px-3 py-1.5 min-h-[38px] font-black text-sm">المبلغ الكلي</th>
              <th className="px-3 py-1.5 min-h-[38px] font-black text-sm">الباركود</th>
              <th className="px-3 py-1.5 min-h-[38px] font-black text-sm">البصمة</th>
              <th className="px-3 py-1.5 min-h-[38px] font-black text-sm">الإجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {paginatedStudents.map((student) => (
              <tr 
                key={student.id} 
                className="hover:bg-[var(--primary-theme-soft)] transition-colors group"
              >
                <td className="px-4 py-2">
                  <div className="w-6 h-6 rounded-lg bg-gray-100 flex items-center justify-center text-xs font-black text-gray-600">
                    {studentsWithSequence[student.id] || '-'}
                  </div>
                </td>
                <td className="px-3 py-1.5 min-h-[38px]">
                  <div className="flex items-center gap-3 group/photo relative">
                    <div className="w-6 h-6 rounded-full bg-gray-100 border border-gray-200 overflow-hidden flex-shrink-0 flex items-center justify-center">
                      {student.photo ? (
                        <img src={student.photo} alt={student.name} className="w-full h-full object-cover" />
                      ) : (
                        <User className="w-5 h-5 text-gray-300" />
                      )}
                    </div>
                    <span className="font-black text-gray-900">{student.name}</span>
                    
                    {/* Hover Preview */}
                    {student.photo && (
                      <div className="absolute right-full mr-4 top-1/2 -translate-y-1/2 z-50 opacity-0 group-hover/photo:opacity-100 pointer-events-none transition-all duration-300 scale-95 group-hover/photo:scale-100">
                        <div className="bg-white p-2 rounded-2xl shadow-2xl border border-gray-100 w-48 h-48 overflow-hidden">
                          <img src={student.photo} alt={student.name} className="w-full h-full object-cover rounded-xl" />
                        </div>
                      </div>
                    )}
                  </div>
                </td>
                <td className="px-3 py-1.5 min-h-[38px]">
                  <span className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-xs font-black">
                    {student.grade}
                  </span>
                </td>
                <td className="px-3 py-1.5 min-h-[38px] font-black text-gray-900">{formatCurrency(student.totalAmount)}</td>
                <td className="px-3 py-1.5 min-h-[38px] font-mono text-xs theme-text font-black">{student.barcode}</td>
                <td className="px-3 py-1.5 min-h-[38px]">
                  {student.fingerprintId ? (
                    <div className="flex items-center gap-1 text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full w-fit">
                      <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                      <span className="text-[10px] font-black">مسجلة</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 text-gray-400 bg-gray-50 px-3 py-1 rounded-full w-fit">
                      <span className="text-[10px] font-black">غير مسجلة</span>
                    </div>
                  )}
                </td>
                <td className="px-3 py-1.5 min-h-[38px]">
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => setSelectedStudentForProfile(student)}
                      className="p-2 text-gray-400 hover:bg-gray-100 rounded-xl transition-colors relative group/tooltip"
                      title="عرض الملف الشخصي"
                    >
                      <Eye className="w-5 h-5" />
                      <div className="absolute bottom-full right-0 mb-2 px-3 py-1.5 bg-slate-900 text-white text-[10px] rounded-lg opacity-0 group-hover/tooltip:opacity-100 pointer-events-none transition-all whitespace-nowrap z-50">
                        مراجعة بيانات وحضور الطالب
                      </div>
                    </button>
                    <button 
                      onClick={() => sendPaymentReminder(student)}
                      className="p-2 text-amber-500 hover:bg-amber-50 rounded-xl transition-colors relative group/tooltip"
                      title="إرسال تذكير بالدفع"
                    >
                      <Bell className="w-5 h-5" />
                      <div className="absolute bottom-full right-0 mb-2 px-3 py-1.5 bg-slate-900 text-white text-[10px] rounded-lg opacity-0 group-hover/tooltip:opacity-100 pointer-events-none transition-all whitespace-nowrap z-50">
                        إرسال رسالة تذكير للأهالي
                      </div>
                    </button>
                    <button 
                      onClick={() => setQuickPayStudent(student)}
                      className="flex items-center gap-1 px-3 py-1.5 theme-bg text-white rounded-xl hover:opacity-90 transition-all font-black text-xs theme-shadow"
                      title="دفع سريع"
                    >
                      <DollarSign className="w-3 h-3" />
                      دفع سريع
                    </button>
                    <button 
                      onClick={() => onPay(student.id)}
                      className="flex items-center gap-1 px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-100 transition-all font-black text-xs"
                    >
                      <CreditCard className="w-3 h-3" />
                      دفعة جديدة
                    </button>
                    {canModify && (
                      <>
                        <button onClick={() => startEdit(student)} className="p-2 text-blue-600 hover:bg-blue-100 rounded-xl transition-colors">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => setDeletingStudent(student)} className="p-2 text-red-600 hover:bg-red-100 rounded-xl transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6 bg-white p-4 rounded-3xl border border-gray-100 shadow-sm">
          <button
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
            className="p-3 rounded-2xl bg-gray-50 text-gray-400 hover:bg-indigo-50 hover:text-indigo-600 disabled:opacity-30 disabled:hover:bg-gray-50 disabled:hover:text-gray-400 transition-all flex items-center gap-2 font-black text-xs"
          >
            <ChevronRight className="w-5 h-5" />
            السابق
          </button>
          
          <div className="flex items-center gap-2">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum;
              if (totalPages <= 5) pageNum = i + 1;
              else if (currentPage <= 3) pageNum = i + 1;
              else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i;
              else pageNum = currentPage - 2 + i;

              return (
                <button
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  className={`w-6 h-6 rounded-xl font-black text-sm transition-all ${
                    currentPage === pageNum 
                      ? 'theme-bg text-white shadow-lg theme-shadow' 
                      : 'bg-gray-50 text-gray-400 hover:bg-gray-100'
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
          </div>

          <button
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
            className="p-3 rounded-2xl bg-gray-50 text-gray-400 hover:bg-indigo-50 hover:text-indigo-600 disabled:opacity-30 disabled:hover:bg-gray-50 disabled:hover:text-gray-400 transition-all flex items-center gap-2 font-black text-xs"
          >
            التالي
            <ChevronLeft className="w-5 h-5" />
          </button>
          
          <div className="mr-4 px-4 border-r border-gray-100 h-8 flex items-center">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
              صفحة {currentPage} من {totalPages} (إجمالي {filteredStudents.length} طالب)
            </span>
          </div>
        </div>
      )}

      {editingAttendance && (
            <div className="integrated-page no-scrollbar">
            <div 
              key="editing-attendance-modal"
              className="modal-content"
            >
              <div className="p-4 border-b border-slate-50 flex items-center justify-between bg-white relative z-20 sticky top-0 shadow-sm px-10">
                <div className="flex items-center gap-3 text-right leading-relaxed">
                  <div className="theme-bg p-5 rounded-2xl text-white theme-shadow shadow-xl group hover:rotate-3 transition-transform">
                    <History className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-900 tracking-tight text-slate-900 tracking-tight leading-relaxed">تعديل سجل الحضور والملاحظات</h3>
                    <p className="text-sm font-bold text-slate-400 mt-1 uppercase tracking-widest leading-relaxed">تحديث البيانات الرسمية لتاريخ: {format(new Date(editingAttendance.date), 'dd MMMM yyyy', { locale: ar })}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setEditingAttendance(null)} 
                  className="p-4 bg-slate-50 hover:bg-rose-50 rounded-2xl transition-all text-slate-300 hover:text-rose-500 border border-slate-50"
                >
                  <ArrowLeftRight className="w-6 h-6 rotate-45" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 lg:p-5 custom-scrollbar w-full bg-slate-50/20 custom-scrollbar flex items-center justify-center">
                <div className="max-w-5xl w-full bg-white p-5 rounded-3xl border border-slate-100 shadow-2xl space-y-2">
                  <form onSubmit={handleUpdateAttendance} className="space-y-2">
                    <div className="space-y-2">
                      <label className="block text-sm font-black text-indigo-600 uppercase tracking-[0.3em] leading-relaxed text-right pr-6">تغيير حالة الحضور الرسمية</label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {[
                          { id: 'present', label: 'تثبيت حضور الطالب', color: 'emerald', icon: CheckCircle2 },
                          { id: 'absent', label: 'تثبيت غياب الطالب', color: 'rose', icon: XCircle },
                          { id: 'late', label: 'تثبيت تأخير الطالب', color: 'amber', icon: Clock },
                          { id: 'excused', label: 'عذر رسمي مقبول', color: 'blue', icon: FileCheck }
                        ].map(status => (
                          <button
                            key={status.id}
                            type="button"
                            onClick={() => setAttendanceFormData({ ...attendanceFormData, status: status.id as AttendanceStatus })}
                            className={`p-5 rounded-2xl font-black transition-all border-4 flex items-center gap-3 text-xl justify-end ${
                              attendanceFormData.status === status.id 
                              ? `bg-${status.color}-50 border-${status.color}-500 text-${status.color}-700 shadow-xl shadow-${status.color}-100 -translate-y-1` 
                              : 'bg-white border-slate-50 text-slate-400 hover:bg-slate-50'
                            }`}
                          >
                            <span className="leading-relaxed">{status.label}</span>
                            <status.icon className={`w-6 h-6 ${attendanceFormData.status === status.id ? 'animate-pulse' : ''}`} />
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2 text-right">
                      <label className="block text-sm font-black text-indigo-600 uppercase tracking-[0.3em] leading-relaxed pr-6">ملاحظات إضافية أو سبب الغياب</label>
                      <textarea 
                        value={attendanceFormData.reason}
                        onChange={(e) => setAttendanceFormData({ ...attendanceFormData, reason: e.target.value })}
                        className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 text-xl font-bold outline-none focus:ring-2 focus:ring-indigo-100 transition-all min-h-[250px] text-right shadow-inner placeholder:text-slate-200"
                        placeholder="يرجى كتابة التفاصيل هنا ليتم حفظها في سجل الطالب..."
                      />
                    </div>

                    <div className="pt-6">
                      <button 
                        type="submit"
                        className="w-full theme-bg text-white py-10 rounded-2xl font-black text-lg theme-shadow shadow-2xl hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                      >
                        <CheckCircle2 className="w-6 h-6" />
                        حفظ التعديلات في السجل الرسمي
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>
          )}

      {/* High Absence Modal */}
      {showFrequentAbsences && (
            <div className="integrated-page no-scrollbar">
            <div 
              key="high-absences-modal"
              className="modal-content"
            >
              <div className="p-4 border-b border-slate-50 flex items-center justify-between bg-white sticky top-0 z-20 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="p-5 bg-rose-600 text-white rounded-xl shadow-xl shadow-rose-100 rotate-3">
                    <Bell className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-900 tracking-tight text-slate-900 tracking-tight">سجل الغيابات المتكررة والإنذارات</h3>
                    <p className="text-xs font-bold text-slate-500 mt-2">متابعة دقيقة للطلبة المتجاوزين للسقف المسموح به من الغيابات</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowFrequentAbsences(false)} 
                  className="bg-slate-50 p-4 hover:bg-slate-100 border border-slate-100 rounded-2xl transition-all text-slate-600 hover:text-slate-900 active:scale-95 transition-all text-slate-400 hover:text-rose-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar w-full p-5 lg:p-4 bg-slate-50/20">
                <div className="max-w-5xl mx-auto w-full /space-y-2">
                  <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                {highAbsenceStudents.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-dashed border-slate-200">
                      <CheckCircle className="w-6 h-6 text-slate-300" />
                    </div>
                    <p className="text-slate-400 font-bold">لا يوجد طلبة متجاوزين لعدد الغيابات المسموح حالياً</p>
                  </div>
                ) : (
                  highAbsenceStudents.map(student => {
                    const absences = studentsAbsences[student.id] || 0;
                    let alertType = { label: 'تنبيه أول', color: 'amber' };
                    if (absences >= 12) alertType = { label: 'إنذار بالفصل', color: 'rose' };
                    else if (absences >= 10) alertType = { label: 'استدعاء ولي أمر', color: 'orange' };

                    return (
                            <div key={student.id} className="bg-white border border-slate-100 p-4 rounded-2xl flex items-center justify-between hover:shadow-md transition-all group">
                        <div className="flex items-center gap-2">
                          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-black ${
                            absences >= 12 ? 'bg-rose-50 text-rose-600' : 
                            absences >= 10 ? 'bg-orange-50 text-orange-600' : 
                            'bg-amber-50 text-amber-600'
                          }`}>
                            {absences}
                          </div>
                          <div>
                            <h4 className="text-base font-black text-slate-900">{student.name}</h4>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-[10px] font-black text-slate-400 bg-slate-50 px-2 py-0.5 rounded-lg border border-slate-100">
                                {student.grade}
                              </span>
                              <span className={`text-[10px] font-black px-2 py-0.5 rounded-lg border ${
                                absences >= 12 ? 'bg-rose-50 text-rose-500 border-rose-100' : 
                                absences >= 10 ? 'bg-orange-50 text-orange-500 border-orange-100' : 
                                'bg-amber-50 text-amber-500 border-amber-100'
                              }`}>
                                {alertType.label}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => {
                              setSelectedStudentForProfile(student);
                              setShowFrequentAbsences(false);
                            }}
                            className="p-3 bg-slate-50 text-slate-400 hover:bg-indigo-50 hover:text-indigo-600 rounded-xl transition-all"
                          >
                            <Eye className="w-5 h-5" />
                          </button>
                          <button 
                            onClick={() => sendAbsenceAlert(student, absences)}
                            className="p-3 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-xl transition-all"
                            title="إرسال إشعار ولي الأمر"
                          >
                            <MessageSquare className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
                  </div>
                </div>
              </div>
            </div>
          </div>
          )}
      
        {deletingStudent && (
          <div className="integrated-page">
            <div className="modal-content">
              <div className="p-4 border-b border-rose-50 flex items-center justify-between bg-white relative z-50 sticky top-0 shadow-sm px-12">
                <div className="flex items-center gap-3 text-right leading-relaxed">
                  <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl text-slate-800 shadow-sm">
                    <Trash2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-900 tracking-tight text-slate-900 tracking-tight leading-relaxed">تأكيد الحذف النهائي</h3>
                    <p className="text-sm font-bold text-slate-400 mt-1 leading-relaxed uppercase tracking-widest">تحذير: هذا الإجراء لا يمكن التراجع عنه أبداً</p>
                  </div>
                </div>
                <button 
                  onClick={() => setDeletingStudent(null)} 
                  className="p-4 bg-slate-50 hover:bg-slate-100 rounded-2xl transition-all text-slate-300 hover:text-slate-600 border border-slate-50"
                >
                  <ArrowLeftRight className="w-6 h-6 rotate-45" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 lg:p-5 custom-scrollbar w-full bg-rose-50/10 custom-scrollbar flex items-center justify-center">
                <div className="max-w-5xl w-full bg-white p-5 rounded-3xl border-4 border-rose-100 shadow-2xl text-center space-y-2">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-48 h-48 bg-rose-50 rounded-2xl flex items-center justify-center text-rose-500 shadow-2xl shadow-rose-100 group animate-pulse border-4 border-white">
                      <AlertTriangle className="w-10 h-10" />
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-4xl font-black text-slate-900 tracking-tight leading-relaxed px-10">
                        هل أنت متأكد تماماً من حذف الطالب 
                        <br />
                        <span className="text-rose-600 underline decoration-rose-200 underline-offset-8 decoration-8 font-black">"{deletingStudent.name}"</span>؟
                      </h3>
                      <div className="p-5 bg-rose-50 rounded-2xl border-2 border-rose-100/50 space-y-2 max-w-xl mx-auto">
                        <p className="text-lg text-rose-800 font-bold leading-relaxed">
                          بمجرد التأكيد، سيتم مسح كافة البيانات المالية، سجلات الحضور، الصور، والمعلومات الشخصية من النظام للأبد.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 pt-6">
                    <button 
                      onClick={() => executeDeleteStudent(deletingStudent.id)}
                      className="w-full bg-rose-600 text-white py-12 rounded-2xl font-black text-xl shadow-2xl shadow-rose-200 hover:bg-rose-700 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3"
                    >
                      <Trash2 className="w-6 h-6" />
                      نعم، تأكيد الحذف النهائي
                    </button>
                    <button 
                      onClick={() => setDeletingStudent(null)}
                      className="w-full bg-slate-100 text-slate-500 py-8 rounded-2xl font-black text-lg hover:bg-slate-200 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                    >
                      إلغاء والتراجع عن الحذف
                      <ArrowLeftRight className="w-6 h-6 rotate-45" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      

      {/* Student Profile Modal */}
      {selectedStudentForProfile && studentProfileData && (
        <div className="integrated-page">
          <div className="modal-content">
              <div className="p-5 pb-0 border-b border-slate-100 bg-white sticky top-0 z-20 shadow-sm flex flex-col">
                <div className="flex flex-col md:flex-row items-start md:items-center gap-2 mb-6">
                  <div className="relative group">
                    <div className="w-10 h-10 rounded-2xl bg-white p-1 shadow-xl border border-slate-100 overflow-hidden">
                      <div className="w-full h-full rounded-xl overflow-hidden bg-slate-50 flex items-center justify-center">
                        {selectedStudentForProfile.photo ? (
                          <img src={selectedStudentForProfile.photo} alt={selectedStudentForProfile.name} className="w-full h-full object-cover" />
                        ) : (
                          <User className="w-6 h-6 text-slate-200" />
                        )}
                      </div>
                    </div>
                    <div className="absolute -bottom-1 -right-1 bg-emerald-500 text-white p-2 rounded-xl border-4 border-white shadow-lg">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                  </div>

                  <div className="flex-1 space-y-2 text-right">
                    <div className="flex flex-col md:flex-row md:items-center gap-2 justify-end">
                      <h2 className="text-lg font-black text-slate-900 tracking-tight">{selectedStudentForProfile.name}</h2>
                      <span className="bg-indigo-50 text-indigo-600 px-4 py-1 rounded-full text-[10px] font-black border border-indigo-100 uppercase tracking-widest inline-block md:inline-flex">
                        {selectedStudentForProfile.grade}
                      </span>
                    </div>
                    <div className="flex flex-wrap justify-end gap-2 text-slate-400">
                      <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider">
                        <Fingerprint className="w-3.5 h-3.5" />
                        ID: {selectedStudentForProfile.barcode}
                      </div>
                      <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider">
                        <Phone className="w-3.5 h-3.5" />
                        {selectedStudentForProfile.phone}
                      </div>
                      {selectedStudentForProfile.address && (
                        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider">
                          <MapPin className="w-3.5 h-3.5" />
                          {selectedStudentForProfile.address}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 self-start md:self-center">
                    <button 
                      onClick={() => sendStatusReport(selectedStudentForProfile)}
                      className="flex items-center gap-3 px-3 py-1.5 min-h-[38px] bg-indigo-600 text-white hover:bg-slate-900 rounded-2xl transition-all shadow-xl font-black text-xs"
                    >
                      <MessageSquare className="w-5 h-5" />
                      تقرير مباشر
                    </button>
                    <button 
                      onClick={() => {
                        setEditingStudent(selectedStudentForProfile);
                        setSelectedStudentForProfile(null);
                      }}
                      className="flex items-center gap-3 px-3 py-1.5 min-h-[38px] bg-white text-slate-900 border border-slate-200 hover:bg-slate-50 rounded-2xl transition-all shadow-lg font-black text-xs"
                    >
                      <Edit2 className="w-5 h-5" />
                      تعديل
                    </button>
                    <button 
                      onClick={() => setSelectedStudentForProfile(null)} 
                      className="p-4 bg-slate-50 text-slate-400 hover:bg-rose-50 hover:text-rose-600 rounded-2xl transition-all"
                    >
                      <X className="w-6 h-6" />
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-3 px-4">
                  <button 
                    onClick={() => setProfileTab('overview')}
                    className={`pb-4 px-2 text-sm font-black border-b-4 transition-all ${profileTab === 'overview' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                  >
                    الملخص العام
                  </button>
                  <button 
                    onClick={() => setProfileTab('finance')}
                    className={`pb-4 px-2 text-sm font-black border-b-4 transition-all ${profileTab === 'finance' ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                  >
                    المالية والرسوم
                  </button>
                  <button 
                    onClick={() => setProfileTab('attendance')}
                    className={`pb-4 px-2 text-sm font-black border-b-4 transition-all ${profileTab === 'attendance' ? 'border-amber-600 text-amber-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                  >
                    سجل الحضور
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar w-full bg-slate-50 p-4 lg:p-4">
                <div className="max-w-5xl mx-auto">
                  {profileTab === 'overview' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {/* Financial Status Quick View */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                            <DollarSign className="w-5 h-5 text-emerald-500" />
                            الملخص المالي
                          </h3>
                        </div>
                        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm space-y-2">
                          <div className="space-y-2">
                            <p className="text-[10px] font-black text-slate-400 uppercase text-right">إجمالي الرسوم المطلوبة</p>
                            <p className="text-lg font-black text-slate-900 tracking-tight text-slate-900 text-right" dir="rtl">{formatCurrency(selectedStudentForProfile.totalAmount)}</p>
                          </div>
                          <div className="h-4 bg-slate-50 rounded-full overflow-hidden flex shadow-inner">
                            <div
                              className="bg-emerald-500 h-full shadow-lg shadow-emerald-100"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100/50 text-right">
                              <p className="text-[9px] font-black text-emerald-600 uppercase mb-1">المدفوع</p>
                              <p className="text-lg font-black text-emerald-700">{formatCurrency(studentProfileData?.paidAmount || 0)}</p>
                            </div>
                            <div className="bg-rose-50 p-4 rounded-2xl border border-rose-100/50 text-right">
                              <p className="text-[9px] font-black text-rose-600 uppercase mb-1">المتبقي</p>
                              <p className="text-lg font-black text-rose-700">{formatCurrency(studentProfileData?.remainingAmount || 0)}</p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Attendance Stats Quick View */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                            <UserCheck className="w-5 h-5 text-indigo-500" />
                            ملخص الالتزام والحضور
                          </h3>
                        </div>
                        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm space-y-2">
                          <div className="grid grid-cols-2 gap-2">
                             <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100 flex flex-col items-center justify-center text-center">
                                <span className="text-lg font-black text-slate-900 tracking-tight text-indigo-600 mb-1">{studentProfileData?.attendanceRate}%</span>
                                <span className="text-[10px] font-black text-indigo-400">نسبة الالتزام</span>
                             </div>
                             <div className="grid grid-cols-2 gap-2">
                               <div className="bg-slate-50 rounded-2xl flex flex-col items-center justify-center p-2">
                                  <span className="text-xl font-black text-slate-700">{studentProfileData?.presentCount}</span>
                                  <span className="text-[9px] font-bold text-slate-400">حضور</span>
                               </div>
                               <div className="bg-rose-50 rounded-2xl flex flex-col items-center justify-center p-2">
                                  <span className="text-xl font-black text-rose-600">{studentProfileData?.absentCount}</span>
                                  <span className="text-[9px] font-bold text-rose-400">غياب</span>
                               </div>
                               <div className="bg-amber-50 rounded-2xl flex flex-col items-center justify-center p-2">
                                  <span className="text-xl font-black text-amber-600">{studentProfileData?.lateCount}</span>
                                  <span className="text-[9px] font-bold text-amber-400">تأخير</span>
                               </div>
                               <div className="bg-blue-50 rounded-2xl flex flex-col items-center justify-center p-2">
                                  <span className="text-xl font-black text-blue-600">{studentProfileData?.excusedCount}</span>
                                  <span className="text-[9px] font-bold text-blue-400">عذر</span>
                               </div>
                             </div>
                          </div>
                      
                          {/* Alert if needed */}
                          {(() => {
                            const absences = studentProfileData?.absentCount || 0;
                            if (absences >= 6) {
                              const config = absences >= 12 ? { color: 'rose', text: 'إنذار نهائي بالفصل' } 
                                           : absences >= 10 ? { color: 'orange', text: 'استدعاء ولي أمر' } 
                                           : { color: 'amber', text: 'تنبيه غياب متكرر' };
                              return (
                                <div className={`p-4 rounded-2xl bg-${config.color}-50 border border-${config.color}-200 flex items-center justify-between`}>
                                   <div className={`flex items-center gap-3 text-${config.color}-700 font-black text-sm`}>
                                     <AlertTriangle className="w-5 h-5" />
                                     {config.text}
                                   </div>
                                   <button 
                                     onClick={() => sendAbsenceAlert(selectedStudentForProfile, absences)}
                                     className={`px-3 py-1.5 rounded-lg bg-${config.color}-100 text-${config.color}-700 text-[10px] font-black hover:bg-${config.color}-200 transition-colors`}
                                   >
                                     إرسال إشعار
                                   </button>
                                </div>
                              );
                            }
                            return null;
                          })()}
                        </div>
                      </div>

                      {/* Comprehensive Status */}
                      <div className="md:col-span-2 mt-4 space-y-2">
                        <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                            <Activity className="w-5 h-5 text-sky-500" />
                            تقرير المتابعة الشامل
                        </h3>
                        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row gap-3 items-center">
                           <div className="flex-1 space-y-2 w-full">
                               <p className="text-sm text-slate-600 font-medium leading-relaxed max-w-sm">
                                  هذا التقرير يجمع لك أحدث المستجدات حول حالة الطالب من الناحية المالية وحضوره خلال العام الدراسي الحالي.
                               </p>
                               <button
                                 onClick={() => sendStatusReport(selectedStudentForProfile)}
                                 className="w-full sm:w-auto px-8 py-3 bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white rounded-xl font-black text-sm flex items-center justify-center gap-3 transition-colors"
                               >
                                 <MessageSquare className="w-4 h-4" />
                                 إرسال تقرير شامل عبر الواتساب
                               </button>
                           </div>
                           <div className="w-full md:w-64 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                             <h4 className="text-[10px] font-black text-slate-400 mb-2">آخر نشاط مسجل</h4>
                             <div className="space-y-2">
                                {studentProfileData?.lastPayment && (
                                  <div className="flex justify-between items-center text-xs">
                                     <span className="text-slate-500 font-bold">آخر دفعة</span>
                                     <span className="font-black text-emerald-600">{formatCurrency(studentProfileData.lastPayment.amount)}</span>
                                  </div>
                                )}
                                <div className="flex justify-between items-center text-xs">
                                   <span className="text-slate-500 font-bold">أيام الغياب</span>
                                   <span className="font-black text-rose-600">{studentProfileData?.absentCount} أيام</span>
                                </div>
                             </div>
                           </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {profileTab === 'finance' && (
                    <div className="space-y-2 animate-in fade-in slide-in-from-bottom-4 duration-500">
                       <div className="flex items-center justify-between">
                          <h3 className="text-xl font-black text-slate-900">سجل الدفعات المالية</h3>
                          <button 
                            onClick={() => {
                              const stId = selectedStudentForProfile.id;
                              setSelectedStudentForProfile(null);
                              onPay(stId);
                            }}
                            className="bg-emerald-500 text-white px-6 py-2.5 rounded-xl font-black text-sm hover:bg-emerald-600 transition-colors shadow-lg shadow-emerald-200"
                          >
                            إضافة دفعة جديدة
                          </button>
                       </div>
                       
                       <div className="space-y-2">
                         {studentProfileData?.studentPayments?.length ? (
                           studentProfileData.studentPayments.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(p => (
                             <div key={p.id} className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex flex-col sm:flex-row items-center justify-between group hover:border-emerald-300 transition-all gap-2">
                               <div className="flex items-center gap-3">
                                 <div className="p-4 bg-emerald-50 text-emerald-600 rounded-2xl group-hover:scale-110 transition-transform">
                                   <DollarSign className="w-6 h-6" />
                                 </div>
                                 <div className="text-right">
                                   <p className="text-base font-black text-slate-900">دفعة نقدية مسجلة</p>
                                   <p className="text-[11px] text-slate-500 font-bold mt-1 flex items-center gap-2">
                                     <Calendar className="w-3.5 h-3.5" />
                                     {format(new Date(p.date), 'EEEE, dd MMMM yyyy', { locale: ar })}
                                   </p>
                                 </div>
                               </div>
                               <div className="text-left w-full sm:w-auto flex justify-between sm:block border-t sm:border-0 border-slate-100 pt-4 sm:pt-0">
                                 <div className="flex items-center gap-2 justify-end mb-1">
                                   <button 
                                     onClick={() => setSelectedPaymentForReceipt(p)}
                                     className="p-3 bg-slate-50 text-slate-400 hover:bg-emerald-50 hover:text-emerald-600 rounded-xl transition-all shadow-sm group/print"
                                     title="طباعة الوصل"
                                   >
                                     <Printer className="w-5 h-5 group-hover/print:scale-110 transition-transform" />
                                   </button>
                                   <p className="text-lg font-black text-emerald-600 tracking-tighter" dir="rtl">{formatCurrency(p.amount)}</p>
                                 </div>
                                 <p className="text-[10px] font-bold text-emerald-500/70 sm:mt-1 text-left flex items-center justify-end gap-1">
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    تحقق موثق
                                 </p>
                               </div>
                             </div>
                           ))
                         ) : (
                           <div className="text-center py-20 bg-white rounded-2xl border-2 border-dashed border-slate-200">
                             <div className="w-20 h-20 bg-slate-50 rounded-xl flex items-center justify-center mx-auto mb-4">
                               <DollarSign className="w-6 h-6 text-slate-300" />
                             </div>
                             <p className="text-xl font-black text-slate-800">لا توجد مدفوعات مسجلة</p>
                           </div>
                         )}
                       </div>
                    </div>
                  )}

                  {profileTab === 'attendance' && (
                    <div className="space-y-2 animate-in fade-in slide-in-from-bottom-4 duration-500">
                       <div className="flex items-center justify-between">
                          <h3 className="text-xl font-black text-slate-900">تاريخ الحضور والغياب</h3>
                          
                          <div className="flex gap-2">
                             <div className="px-4 py-2 bg-emerald-50 text-emerald-700 rounded-xl text-xs font-black flex items-center gap-2">
                                <CheckCircle className="w-4 h-4" /> حاضر ({studentProfileData?.presentCount})
                             </div>
                             <div className="px-4 py-2 bg-rose-50 text-rose-700 rounded-xl text-xs font-black md:flex items-center gap-2 hidden">
                                <XCircle className="w-4 h-4" /> غائب ({studentProfileData?.absentCount})
                             </div>
                          </div>
                       </div>
                       
                       <div className="space-y-2">
                         {studentProfileData?.studentAttendance?.length ? (
                           studentProfileData.studentAttendance.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(r => {
                             const statusMeta = r.status === 'present' ? { bg: 'bg-emerald-50 text-emerald-600', icon: CheckCircle, label: 'حضور' } : 
                                                r.status === 'late' ? { bg: 'bg-amber-50 text-amber-600', icon: Clock, label: 'تأخير' } : 
                                                r.status === 'absent' ? { bg: 'bg-rose-50 text-rose-600', icon: XCircle, label: 'غياب' } :
                                                r.status === 'excused' ? { bg: 'bg-blue-50 text-blue-600', icon: Info, label: 'عذر رسمي' } :
                                                r.status === 'dismissed' ? { bg: 'bg-slate-100 text-slate-600', icon: LogOut, label: 'مغادرة' } :
                                                r.status === 'violation' ? { bg: 'bg-orange-50 text-orange-600', icon: AlertCircle, label: 'مخالفة' } :
                                                { bg: 'bg-slate-50 text-slate-600', icon: AlertCircle, label: 'أخرى' };

                             return (
                               <div key={r.id} className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between group hover:border-slate-300 transition-all gap-2">
                                 <div className="flex items-center gap-3 text-right flex-1">
                                   <div className={`p-4 rounded-2xl ${statusMeta.bg}`}>
                                     <statusMeta.icon className="w-6 h-6" />
                                   </div>
                                   <div className="space-y-1">
                                     <div className="flex flex-wrap items-center gap-2">
                                       <p className="text-base font-black text-slate-900">{statusMeta.label}</p>
                                       {r.reason && (
                                         <span className="text-[10px] font-black bg-slate-100 text-slate-600 px-2 py-1 rounded-lg">
                                           سبب: {r.reason}
                                         </span>
                                       )}
                                       {r.scanTime && (
                                         <span className="text-[10px] font-black bg-indigo-50 text-indigo-600 px-2 py-1 rounded-lg flex items-center gap-1">
                                           <Clock className="w-3 h-3" />
                                           {format(new Date(r.scanTime), 'hh:mm a')}
                                         </span>
                                       )}
                                     </div>
                                     <p className="text-[11px] text-slate-500 font-bold flex items-center gap-1.5 mt-1">
                                        <Calendar className="w-3.5 h-3.5" />
                                        {format(new Date(r.date), 'EEEE, dd MMMM yyyy', { locale: ar })}
                                     </p>
                                   </div>
                                 </div>
                                 
                                 {canModify && (
                                   <div className="flex justify-end pt-2 sm:pt-0">
                                     <button 
                                       onClick={() => {
                                         setEditingAttendance(r);
                                         setAttendanceFormData({
                                           status: r.status,
                                           reason: r.reason || ''
                                         });
                                       }}
                                       className="px-4 py-2 bg-slate-50 text-slate-600 hover:text-white hover:bg-slate-800 rounded-xl text-xs font-black transition-colors"
                                     >
                                       تعديل الحالة
                                     </button>
                                   </div>
                                 )}
                               </div>
                             );
                           })
                         ) : (
                            <div className="text-center py-20 bg-white rounded-2xl border-2 border-dashed border-slate-200">
                              <Calendar className="w-10 h-10 text-slate-200 mx-auto mb-4" />
                              <p className="text-xl font-bold text-slate-400">لا توجد سجلات غياب لهذا الطالب</p>
                           </div>
                         )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}


      {isAdding && (
        <div className="fixed inset-0 z-[200] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-gray-100 shadow-2xl w-full max-w-4xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-100 text-blue-600 rounded-2xl">
                  {editingStudent ? <Edit2 className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 tracking-tight">{editingStudent ? 'تحديث بيانات الطالب' : 'تسجيل طالب جديد'}</h3>
                </div>
              </div>
              <button 
                onClick={resetForm}
                className="p-3 bg-white hover:bg-gray-100 rounded-xl transition-all text-gray-500 shadow-sm"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                  {/* Image Upload Column */}
                  <div className="md:col-span-3 space-y-2 flex flex-col items-center justify-center">
                    <div className="w-32 h-32 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center relative overflow-hidden group cursor-pointer hover:border-blue-300 hover:bg-blue-50 transition-all">
                      {formData.photo ? (
                        <img src={formData.photo} alt="Student" className="w-full h-full object-cover" />
                      ) : (
                        <div className="flex flex-col items-center text-slate-400 group-hover:text-blue-500 transition-colors">
                          <Upload className="w-8 h-8 mb-2" />
                          <span className="text-xs font-bold text-center px-2">الصورة الشخصية</span>
                        </div>
                      )}
                      <input 
                        type="file" 
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onloadend = () => setFormData({ ...formData, photo: reader.result as string });
                            reader.readAsDataURL(file);
                          }
                        }}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                      />
                    </div>
                    {formData.photo && (
                       <button 
                         type="button"
                         onClick={() => setFormData({ ...formData, photo: '' })}
                         className="text-rose-500 text-xs font-bold hover:underline"
                       >
                         حذف الصورة
                       </button>
                    )}
                  </div>

                  {/* Form Fields Column */}
                  <div className="md:col-span-9 grid grid-cols-1 md:grid-cols-2 gap-3 bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                    <div className="space-y-1.5 md:col-span-2">
                       <label className="text-xs font-bold text-slate-600">الاسم الكامل للطالب</label>
                       <div className="relative">
                         <User className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                         <input
                           required
                           type="text"
                           value={formData.name}
                           onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                           className="w-full bg-white border border-slate-200 rounded-xl pr-9 pl-3 py-2.5 outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 font-bold text-sm transition-all shadow-sm"
                           placeholder="الاسم الثلاثي أو الرباعي"
                         />
                       </div>
                    </div>
                    
                    <div className="space-y-1.5">
                       <label className="text-xs font-bold text-slate-600">اسم ولي الأمر</label>
                       <input
                         required
                         type="text"
                         value={formData.parentName}
                         onChange={(e) => setFormData({ ...formData, parentName: e.target.value })}
                         className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 font-bold text-sm transition-all shadow-sm"
                         placeholder="الاسم الكامل"
                       />
                    </div>

                    <div className="space-y-1.5">
                       <label className="text-xs font-bold text-slate-600">رقم الواتساب</label>
                       <div className="relative">
                         <Phone className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                         <input
                           required
                           type="tel"
                           value={formData.phone}
                           onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                           className="w-full bg-white border border-slate-200 rounded-xl pr-9 pl-3 py-2.5 outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 font-bold text-sm transition-all tracking-widest shadow-sm text-left"
                           dir="ltr"
                           placeholder="07XXXXXXXXX"
                         />
                       </div>
                    </div>

                    <div className="space-y-1.5">
                       <label className="text-xs font-bold text-slate-600">الصف الدراسي</label>
                       <select
                         value={formData.grade}
                         onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
                         className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 font-bold text-sm transition-all shadow-sm"
                       >
                         {GRADES.map(g => <option key={g} value={g}>{g}</option>)}
                       </select>
                    </div>

                    <div className="space-y-1.5">
                       <label className="text-xs font-bold text-slate-600">تاريخ الميلاد</label>
                       <input
                         type="date"
                         value={formData.dob}
                         onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                         className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 font-bold text-sm transition-all shadow-sm"
                       />
                    </div>
                    <div className="space-y-1.5 md:col-span-2">
                       <label className="text-xs font-bold text-slate-600">عنوان السكن</label>
                       <input
                         type="text"
                         value={formData.address}
                         onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                         className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 font-bold text-sm transition-all shadow-sm text-right"
                         placeholder="المنطقة، الزقاق، رقم الدار"
                       />
                    </div>
                  </div>
                </div>

                {/* Financial and Barcode */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100 space-y-1.5">
                    <label className="text-xs font-bold text-slate-600">القسط السنوي الإجمالي</label>
                    <div className="relative">
                      <input
                        required
                        type="number"
                        value={formData.totalAmount}
                        onChange={(e) => setFormData({ ...formData, totalAmount: e.target.value })}
                        className="w-full bg-white border border-slate-200 rounded-xl px-8 py-3 outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 font-black text-xl text-center text-blue-600 shadow-sm"
                        placeholder="0"
                      />
                      <DollarSign className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-slate-400 text-xs">د.ع</span>
                    </div>
                  </div>

                  <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100 space-y-1.5">
                    <label className="text-xs font-bold text-slate-600">الباركود التعريفي (اختياري)</label>
                    <div className="flex gap-2 h-[50px]">
                      <button
                        type="button"
                        onClick={() => setIsScanningForForm(true)}
                        className="bg-white text-slate-500 px-4 rounded-xl hover:bg-slate-100 transition-all border border-slate-200 shadow-sm hover:text-blue-600"
                        title="مسح الكاميرا"
                      >
                        <ScanLine className="w-5 h-5" />
                      </button>
                      <input
                        type="text"
                        value={formData.barcode}
                        onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                        className="flex-1 w-full bg-white border border-slate-200 rounded-xl px-3 outline-none font-bold text-center tracking-widest text-slate-800 shadow-sm placeholder:text-slate-300"
                        placeholder="يولد تلقائياً"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-2 flex flex-col md:flex-row items-center justify-end gap-3 mt-4">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="w-full md:w-auto px-6 py-2.5 rounded-xl font-bold text-slate-500 hover:bg-slate-100 transition-all"
                  >
                    إلغاء العملية
                  </button>
                  <button
                    type="submit"
                    className="w-full md:w-auto px-8 py-2.5 bg-blue-600 text-white rounded-xl font-black shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 className="w-5 h-5" />
                    {editingStudent ? 'حفظ التعديلات' : 'إتمام التسجيل'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {isPrintingRegistry && (
            <div className="integrated-page no-scrollbar">
            <div className="modal-content">
              <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-white relative z-50 sticky top-0 shadow-sm px-12">
                <div className="flex items-center gap-3 text-right">
                  <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl text-slate-800 shadow-sm">
                    <Printer className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-900 tracking-tight text-gray-900 tracking-tight">سجل طباعة الأسماء المتكامل</h3>
                    <p className="text-sm font-bold text-gray-400 mt-1 uppercase tracking-widest leading-relaxed">تخصيص البيانات واستخراج سجلات الحضور الورقية بنسق احترافي</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="bg-gray-50 px-3 py-1.5 min-h-[38px] rounded-2xl border border-gray-100 flex items-center gap-2">
                    <span className="text-sm font-black text-gray-500 uppercase tracking-widest">التسلسل يبدأ من:</span>
                    <input 
                      type="number" 
                      min="1"
                      value={registryConfig.startSerial}
                      onChange={(e) => setRegistryConfig(prev => ({ ...prev, startSerial: parseInt(e.target.value) || 1 }))}
                      className="w-24 bg-white border border-gray-200 rounded-xl px-4 py-2 text-center font-black text-blue-600 focus:ring-2 focus:ring-blue-100 outline-none text-xl transition-all"
                    />
                  </div>
                  <button 
                    onClick={() => handlePrint()}
                    className="bg-purple-600 text-white px-8 py-5 rounded-xl font-black flex items-center gap-3 hover:bg-slate-900 shadow-2xl shadow-purple-100 transition-all active:scale-95"
                  >
                    <Printer className="w-6 h-6" />
                    تصدير للطباعة ({registryConfig.selectedIds.size})
                  </button>
                  <button 
                    onClick={() => setIsPrintingRegistry(false)} 
                    className="bg-slate-50 p-4 hover:bg-slate-100 border border-slate-100 rounded-2xl transition-all text-slate-600 hover:text-slate-900 active:scale-95 transition-all text-slate-300 hover:text-rose-600"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>


              <div className="flex-1 overflow-hidden flex flex-col lg:flex-row bg-slate-50/20">
                {/* Filters Sidebar */}
                <div className="lg:w-80 bg-gray-50/50 p-5 border-l border-gray-100 overflow-y-auto custom-scrollbar space-y-2">
                  <div className="space-y-2">
                    <h4 className="text-sm font-black text-blue-600 uppercase tracking-widest px-2">بحث سريع</h4>
                    <div className="relative">
                      <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input 
                        type="text"
                        placeholder="ابحث عن اسم الطالب..."
                        value={registryConfig.searchQuery}
                        onChange={(e) => setRegistryConfig(prev => ({ ...prev, searchQuery: e.target.value }))}
                        className="w-full bg-white border border-gray-200 rounded-2xl pr-12 pl-4 py-3 text-sm font-black outline-none focus:ring-4 focus:ring-purple-100 transition-all"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-sm font-black text-blue-600 uppercase tracking-widest px-2">إعدادات السجل</h4>
                    <div className="space-y-2">
                      <div>
                        <label className="text-[10px] font-black text-gray-400 block mb-1">عنوان السجل</label>
                        <input 
                          type="text"
                          value={registryConfig.registryTitle}
                          onChange={(e) => setRegistryConfig(prev => ({ ...prev, registryTitle: e.target.value }))}
                          className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2 text-sm font-black outline-none focus:ring-2 focus:ring-purple-500"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-black text-gray-400 block mb-1">عدد الأعمدة الفارغة</label>
                        <input 
                          type="number"
                          min="0"
                          max="10"
                          value={registryConfig.emptyColumns}
                          onChange={(e) => {
                            const val = Math.min(10, Math.max(0, parseInt(e.target.value) || 0));
                            setRegistryConfig(prev => ({ 
                              ...prev, 
                              emptyColumns: val,
                              columnTitles: Array(val).fill('').map((_, i) => prev.columnTitles[i] || '')
                            }));
                          }}
                          className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2 text-sm font-black outline-none focus:ring-2 focus:ring-purple-500"
                        />
                      </div>
                      
                      {registryConfig.emptyColumns > 0 && (
                        <div className="space-y-2 pt-2 border-t border-gray-100">
                          <label className="text-[10px] font-black text-gray-400 block mb-2">عناوين الأعمدة (اختياري)</label>
                          {Array.from({ length: registryConfig.emptyColumns }).map((_, i) => (
                            <input 
                              key={i}
                              type="text"
                              placeholder={`عنوان العمود ${i + 1}`}
                              value={registryConfig.columnTitles[i] || ''}
                              onChange={(e) => {
                                const newTitles = [...registryConfig.columnTitles];
                                newTitles[i] = e.target.value;
                                setRegistryConfig(prev => ({ ...prev, columnTitles: newTitles }));
                              }}
                              className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2 text-[10px] font-bold outline-none focus:ring-2 focus:ring-purple-500"
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-sm font-black text-blue-600 uppercase tracking-widest px-2">تصفية حسب الصف</h4>
                    <div className="grid grid-cols-1 gap-2">
                      <button 
                        onClick={() => setRegistryConfig(prev => ({ ...prev, grade: 'الكل' }))}
                        className={`text-right px-3 py-1.5 min-h-[38px] rounded-2xl font-black text-sm transition-all border ${registryConfig.grade === 'الكل' ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-100' : 'bg-white text-gray-600 border-gray-100 hover:bg-gray-100'}`}
                      >
                        جميع الصفوف
                      </button>
                      {GRADES.map(grade => (
                        <button 
                          key={grade}
                          onClick={() => setRegistryConfig(prev => ({ ...prev, grade }))}
                          className={`text-right px-3 py-1.5 min-h-[38px] rounded-2xl font-black text-sm transition-all border ${registryConfig.grade === grade ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-100' : 'bg-white text-gray-600 border-gray-100 hover:bg-gray-100'}`}
                        >
                          {grade}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Main Content Area */}
                <div className="flex-1 flex flex-col overflow-hidden bg-white">
                  {/* Alphabetic Letter Filter Bar */}
                  <div className="p-4 border-b border-gray-50 overflow-x-auto custom-scrollbar bg-white/80 backdrop-blur-md sticky top-0 z-10 flex gap-2">
                    {['الكل', 'أ', 'ب', 'ت', 'ث', 'ج', 'ح', 'خ', 'د', 'ذ', 'ر', 'ز', 'س', 'ش', 'ص', 'ض', 'ط', 'ظ', 'ع', 'غ', 'ف', 'ق', 'ك', 'ل', 'م', 'ن', 'هـ', 'و', 'ي'].map(letter => (
                      <button
                        key={letter}
                        onClick={() => setRegistryConfig(prev => ({ ...prev, letter }))}
                        className={`min-w-[40px] h-10 rounded-xl flex items-center justify-center font-black transition-all text-sm border ${registryConfig.letter === letter ? 'bg-purple-600 text-white border-purple-600 shadow-lg shadow-purple-100' : 'bg-gray-50 text-gray-500 border-gray-100 hover:bg-purple-50 hover:text-purple-600'}`}
                      >
                        {letter}
                      </button>
                    ))}
                  </div>

                  <div className="p-4 bg-gray-50 flex justify-between items-center px-8 border-b border-gray-100">
                    <div className="flex gap-2 items-center">
                      <button 
                        onClick={() => {
                          const shownIds = students
                            .filter(s => (registryConfig.grade === 'الكل' || s.grade === registryConfig.grade))
                            .filter(s => (registryConfig.letter === 'الكل' || s.name.trim().startsWith(registryConfig.letter)))
                            .filter(s => s.name.toLowerCase().includes(registryConfig.searchQuery.toLowerCase()))
                            .map(s => s.id);
                          setRegistryConfig(prev => {
                            const newSet = new Set(prev.selectedIds);
                            shownIds.forEach(id => newSet.add(id));
                            return { ...prev, selectedIds: newSet };
                          });
                        }}
                        className="bg-blue-50 text-blue-600 px-4 py-2 rounded-xl text-xs font-black hover:bg-blue-100 transition-all"
                      >
                        تحديد المعروض
                      </button>
                      <button 
                        onClick={() => {
                          setRegistryConfig(prev => ({ ...prev, selectedIds: new Set() }));
                        }}
                        className="bg-red-50 text-red-600 px-4 py-2 rounded-xl text-xs font-black hover:bg-red-100 transition-all"
                      >
                        إفراغ القائمة السجل ({registryConfig.selectedIds.size})
                      </button>

                      <div className="h-6 w-px bg-gray-200 mx-2"></div>

                      <button 
                         onClick={() => setRegistryConfig(prev => ({ ...prev, showSelectedOnly: !prev.showSelectedOnly }))}
                         className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 border ${registryConfig.showSelectedOnly ? 'bg-purple-600 text-white border-purple-600' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'}`}
                      >
                         <CheckCircle2 className="w-4 h-4" />
                         عرض المختارة فقط ({registryConfig.selectedIds.size})
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                       <div className="w-3 h-3 rounded-full bg-purple-600 animate-pulse"></div>
                       <p className="text-xs font-black text-gray-500">سيتم طباعة {registryConfig.selectedIds.size} طالب في السجل اليدوي</p>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto custom-scrollbar w-full p-5 bg-slate-50/20">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 w-full mx-auto">
                      {students
                        .filter(s => (registryConfig.grade === 'الكل' || s.grade === registryConfig.grade))
                        .filter(s => (registryConfig.letter === 'الكل' || s.name.trim().startsWith(registryConfig.letter)))
                        .filter(s => s.name.toLowerCase().includes(registryConfig.searchQuery.toLowerCase()))
                        .filter(s => !registryConfig.showSelectedOnly || registryConfig.selectedIds.has(s.id))
                        .sort((a, b) => a.name.localeCompare(b.name, 'ar'))
                        .map((s) => {
                          const isSelected = registryConfig.selectedIds.has(s.id);
                          return (
                            <div 
                              key={s.id} 
                              onClick={() => {
                                setRegistryConfig(prev => {
                                  const newSet = new Set(prev.selectedIds);
                                  if (newSet.has(s.id)) newSet.delete(s.id);
                                  else newSet.add(s.id);
                                  return { ...prev, selectedIds: newSet };
                                });
                              }}
                              className={`p-5 rounded-3xl border-2 transition-all cursor-pointer flex items-center gap-2 group ${isSelected ? 'theme-bg-soft theme-border theme-shadow translate-y-[-2px]' : 'bg-white border-gray-100 hover:theme-border-soft'}`}
                            >
                              <div className={`w-6 h-6 rounded-2xl flex items-center justify-center border-2 transition-all ${isSelected ? 'theme-bg theme-border text-white' : 'bg-white border-gray-200 text-gray-300'}`}>
                                {isSelected && <CheckCircle className="w-6 h-6" />}
                                {!isSelected && <div className="w-5 h-5 rounded-lg border-2 border-gray-100" />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className={`font-black truncate ${isSelected ? 'theme-text' : 'text-gray-900'}`}>{s.name}</p>
                                <p className="text-[10px] font-bold text-gray-400">{s.grade}</p>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          )}

      {isDistributing && (
            <div className="integrated-page no-scrollbar">
            <div className="modal-content">
              <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-white relative z-50 sticky top-0 shadow-sm px-12">
                <div className="flex items-center gap-3 text-right leading-relaxed">
                  <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl text-slate-800 shadow-sm">
                    <LayoutGrid className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-900 tracking-tight text-slate-900 tracking-tight leading-relaxed">توزيع الشعب التلقائي</h3>
                    <p className="text-sm font-bold text-slate-400 mt-1 leading-relaxed">توزيع الطلاب حسب الأسماء أبجدياً (45 طالب لكل شعبة)</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 px-4">
                  <button 
                    onClick={exportDistributionToExcel}
                    className="bg-emerald-600 text-white px-10 py-5 rounded-xl font-black text-lg hover:bg-emerald-700 transition-all flex items-center gap-2 shadow-2xl shadow-emerald-100/50"
                  >
                    <LayoutGrid className="w-6 h-6" />
                    تصدير Excel
                  </button>
                  <button 
                    onClick={handleDistributionPrint}
                    className="bg-slate-900 text-white px-10 py-5 rounded-xl font-black text-lg hover:bg-black transition-all flex items-center gap-2 shadow-2xl shadow-slate-200"
                  >
                    <Printer className="w-6 h-6" />
                    استخراج للطباعة
                  </button>
                  <button 
                    onClick={() => setIsDistributing(false)} 
                    className="p-4 bg-slate-50 hover:bg-rose-50 rounded-2xl transition-all text-slate-300 hover:text-rose-500 border border-slate-50"
                  >
                    <ArrowLeftRight className="w-6 h-6 rotate-45" />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">
                <div className="lg:w-96 bg-slate-50/50 p-4 border-l border-slate-100 overflow-y-auto custom-scrollbar space-y-2">
                  <div className="space-y-2">
                    <h4 className="text-xs font-black text-indigo-600 uppercase tracking-[0.3em] px-4 flex items-center gap-3 justify-end">
                      إعدادات التحكم الذكي
                      <Settings className="w-4 h-4" />
                    </h4>
                    
                    <div className="space-y-2">
                      <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-2">
                        <label className="text-[10px] font-black text-slate-400 block px-2">عدد الطلاب في الشعبة الواحدة</label>
                        <div className="relative group">
                          <Users className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-300 w-6 h-6 group-focus-within:text-indigo-500 transition-colors" />
                          <input 
                            type="number"
                            min="5"
                            max="100"
                            value={distributionSettings.studentsPerSection}
                            onChange={(e) => setDistributionSettings(prev => ({ ...prev, studentsPerSection: parseInt(e.target.value) || 1 }))}
                            className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-5 pr-16 pl-6 font-black text-lg text-slate-900 outline-none focus:ring-2 focus:ring-indigo-100 transition-all text-center"
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between p-4 bg-white rounded-2xl border border-slate-100 cursor-pointer hover:bg-slate-50 transition-all shadow-sm"
                           onClick={() => setDistributionSettings(prev => ({ ...prev, showFillerRows: !prev.showFillerRows }))}>
                        <div className={`w-14 h-7 rounded-full p-1 transition-all ${distributionSettings.showFillerRows ? 'bg-indigo-600' : 'bg-slate-200'}`}>
                          <div className={`w-5 h-5 bg-white rounded-full transition-all ${distributionSettings.showFillerRows ? 'mr-7' : 'mr-0'}`} />
                        </div>
                        <span className="text-sm font-black text-slate-700">إظهار حقول فارغة (إضافات)</span>
                      </div>

                      <div className="flex items-center justify-between p-4 bg-white rounded-2xl border border-slate-100 cursor-pointer hover:bg-slate-50 transition-all shadow-sm"
                           onClick={() => setDistributionSettings(prev => ({ ...prev, showSignatures: !prev.showSignatures }))}>
                        <div className={`w-14 h-7 rounded-full p-1 transition-all ${distributionSettings.showSignatures ? 'bg-indigo-600' : 'bg-slate-200'}`}>
                          <div className={`w-5 h-5 bg-white rounded-full transition-all ${distributionSettings.showSignatures ? 'mr-7' : 'mr-0'}`} />
                        </div>
                        <span className="text-sm font-black text-slate-700">تضمين هوامش التوقيع الرسمي</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-[0.3em] px-4 flex items-center gap-3 justify-end">
                      تصفية عرض القوائم
                      <Filter className="w-4 h-4" />
                    </h4>
                    <div className="grid grid-cols-1 gap-2">
                       <button 
                        onClick={() => setSelectedGrade('الكل')}
                        className={`text-right px-3 py-1.5 min-h-[38px] text-lg rounded-2xl font-black text-sm transition-all border-4 ${selectedGrade === 'الكل' ? 'theme-bg text-white theme-border theme-shadow -translate-x-2' : 'bg-white text-slate-500 border-slate-50 hover:bg-slate-100'}`}
                      >
                        جميع المراحل الدراسية
                      </button>
                      {GRADES.map(grade => (
                        <button 
                          key={grade}
                          onClick={() => setSelectedGrade(grade)}
                          className={`text-right px-3 py-1.5 min-h-[38px] text-lg rounded-2xl font-black text-sm transition-all border-4 ${selectedGrade === grade ? 'theme-bg text-white theme-border theme-shadow -translate-x-2' : 'bg-white text-slate-500 border-slate-50 hover:bg-slate-100'}`}
                        >
                          {grade}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar w-full p-4 lg:p-4 bg-slate-50/30">
                  <div className="w-full mx-auto space-y-20 pb-4">
                    {distributionData.map((gradeData, gIdx) => (
                      <div key={gIdx} className="space-y-2">
                        <div className="flex items-center gap-2 px-6">
                          <div className="h-16 w-3 theme-bg rounded-full shadow-lg theme-shadow"></div>
                          <div className="flex flex-col text-right">
                            <h4 className="text-5xl font-black text-slate-900 tracking-tight leading-relaxed">{gradeData.grade}</h4>
                            <p className="text-lg font-bold text-slate-400 mt-1 uppercase tracking-widest">إجمالي المسجلين: {gradeData.total} طالب في المرحلة</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                          {gradeData.sections.map((section, sIdx) => (
                            <div key={sIdx} className="bg-white rounded-3xl border border-slate-100 shadow-2xl overflow-hidden flex flex-col group hover:scale-[1.03] transition-all duration-500 hover:shadow-indigo-100/50">
                              <div className="theme-bg p-4 flex flex-col gap-2 text-white relative overflow-hidden">
                                <div className="absolute -right-8 -top-5 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
                                <div className="flex justify-between items-center relative z-10 leading-relaxed">
                                  <div className="bg-white/20 px-6 py-2 rounded-full text-base font-black border border-white/10 shadow-inner">
                                    {section.students.length} طالب
                                  </div>
                                  <h5 className="text-lg font-black text-slate-900 tracking-tight tracking-tight leading-relaxed">شعبة ({section.name})</h5>
                                </div>
                                <p className="text-sm font-bold opacity-70 uppercase tracking-[0.2em] text-right mt-2 leading-relaxed leading-relaxed">{gradeData.grade}</p>
                              </div>
                              <div className="p-4 flex-1 max-h-[500px] overflow-y-auto custom-scrollbar bg-white">
                                <div className="space-y-2">
                                  {section.students.map((st, stIdx) => (
                                    <div key={st.id} className="flex items-center justify-between group/row p-4 rounded-2xl hover:bg-slate-50 transition-all border border-transparent hover:border-slate-100">
                                      <div className="flex items-center gap-3 text-right leading-relaxed">
                                        <p className="text-xl font-bold text-slate-700 truncate group-hover/row:text-indigo-600 transition-colors leading-relaxed">
                                          {st.name}
                                        </p>
                                        <div className="w-6 h-6 rounded-xl bg-slate-50 text-slate-300 font-black text-xs flex items-center justify-center border border-slate-100 group-hover/row:bg-white group-hover/row:text-indigo-500 transition-all shadow-inner">
                                          {stIdx + 1}
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                              <div className="p-5 bg-slate-50 border-t border-slate-50 text-center flex flex-col gap-2">
                                <div className="flex items-center justify-center gap-2 text-slate-400 italic">
                                  <p className="text-sm font-black">آخر أسم في القائمة:</p>
                                  <ArrowLeftRight className="w-4 h-4 rotate-45 opacity-30" />
                                </div>
                                <p className="text-xl font-black text-slate-900 leading-relaxed capitalize">{section.students[section.students.length - 1]?.name || '-'}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                    
                    {distributionData.length === 0 && (
                      <div className="text-center py-20 bg-white rounded-[5rem] border-4 border-dashed border-slate-100 shadow-sm flex flex-col items-center gap-2">
                         <div className="w-40 h-40 bg-slate-50 rounded-full flex items-center justify-center text-slate-200 shadow-inner">
                           <Users className="w-10 h-10 grayscale opacity-30" />
                         </div>
                         <div className="space-y-2">
                           <h3 className="text-4xl font-black text-slate-300 tracking-tight">قواعد البيانات شاغرة حالياً</h3>
                           <p className="text-xl font-bold text-slate-400">لا يوجد طلاب مسجلين في هذا الصف لبدء عملية التوزيع الرقمي</p>
                         </div>
                         <button 
                           onClick={() => setIsDistributing(false)}
                           className="bg-slate-900 text-white px-12 py-6 rounded-2xl font-black text-xl shadow-2xl hover:scale-105 transition-all"
                         >
                           العودة للقائمة الرئيسية
                         </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
          )}

      {/* Hidden Printable Content */}
      <div className="hidden">
        <div ref={printRef} className="p-4 text-right bg-white" dir="rtl">
          {/* Official Header */}
          <div className="flex justify-between items-start mb-8 pb-4 border-b-2 border-gray-900">
            <div className="flex-1">
              <h1 className="text-lg font-black text-slate-900 tracking-tight text-gray-900 mb-1">{school.name}</h1>
              <p className="text-sm font-bold text-gray-600 mb-4">وزارة التربية والتعليم</p>
              <div className="space-y-1">
                <p className="text-lg font-black text-gray-800">{registryConfig.registryTitle}</p>
                <p className="text-xs font-bold text-gray-500">للعام الدراسي {school.academicYear || `${new Date().getFullYear()} - ${new Date().getFullYear() + 1}`}</p>
              </div>
            </div>
            
            <div className="flex flex-col items-center gap-2 px-8">
               {school.logo ? (
                 <img src={school.logo} alt="شعار المدرسة" className="h-16 object-contain grayscale" />
               ) : (
                 <div className="w-10 h-10 border-2 border-gray-900 rounded-2xl flex items-center justify-center text-[10px] font-black text-gray-300">
                   شعار المدرسة
                 </div>
               )}
            </div>

            <div className="flex-1 text-left">
              <div className="bg-gray-50 border border-gray-200 px-3 py-1.5 min-h-[38px] rounded-3xl inline-block">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 text-right">تاريخ الاستخراج</p>
                <p className="text-lg font-black text-gray-900" dir="ltr">{format(new Date(), 'yyyy / MM / dd')}</p>
              </div>
              <div className="mt-4">
                 <p className="text-xs font-black text-gray-400">الصف: <span className="text-gray-900">{registryConfig.grade === 'الكل' ? 'جميع الصفوف' : registryConfig.grade}</span></p>
                 <p className="text-xs font-black text-gray-400">العدد: <span className="text-gray-900">{registryConfig.selectedIds.size} طالب</span></p>
              </div>
            </div>
          </div>

          {/* Main Table */}
          <table className="w-full border-collapse border-2 border-gray-900">
            <thead>
              <tr className="bg-gray-100 text-gray-900">
                <th className="border border-gray-900 p-3 font-black text-sm w-12 text-center">ت</th>
                <th className="border border-gray-900 p-3 font-black text-base text-right min-w-[200px]">اسم الطالب الثلاثي واللقب</th>
                <th className="border border-gray-900 p-3 font-black text-sm w-32 text-center">الحالة / الصف</th>
                {Array.from({ length: registryConfig.emptyColumns }).map((_, i) => (
                  <th key={i} className="border border-gray-900 p-3 font-black text-xs text-center min-w-[70px]">
                    {registryConfig.columnTitles[i] || `حقل ${i + 1}`}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {students
                .filter(s => registryConfig.selectedIds.has(s.id))
                .sort((a, b) => {
                  const gradeA = GRADES.indexOf(a.grade);
                  const gradeB = GRADES.indexOf(b.grade);
                  if (gradeA !== gradeB) return gradeA - gradeB;
                  return a.name.localeCompare(b.name, 'ar');
                })
                .map((s, idx) => (
                  <tr key={s.id} className="hover:bg-gray-50">
                    <td className="border border-gray-900 p-2 text-center font-black text-sm">{registryConfig.startSerial + idx}</td>
                    <td className="border border-gray-900 p-2 font-black text-base pr-4">{s.name}</td>
                    <td className="border border-gray-900 p-2 font-bold text-xs text-center">{s.grade}</td>
                    {Array.from({ length: registryConfig.emptyColumns }).map((_, i) => (
                      <td key={i} className="border border-gray-900 p-2 h-10"></td>
                    ))}
                  </tr>
                ))}
              
              {/* Add blank rows for late manual additions if needed */}
              {Array.from({ length: 3 }).map((_, i) => (
                <tr key={`blank-${i}`}>
                   <td className="border border-gray-900 p-2 text-center font-black text-sm text-gray-200">{registryConfig.startSerial + registryConfig.selectedIds.size + i}</td>
                   <td className="border border-gray-900 p-2 h-10"></td>
                   <td className="border border-gray-900 p-2 h-10"></td>
                   {Array.from({ length: registryConfig.emptyColumns }).map((_, j) => (
                     <td key={j} className="border border-gray-900 p-2 h-10"></td>
                   ))}
                </tr>
              ))}
            </tbody>
          </table>

          {/* Footer / Signatures Area */}
          <div className="mt-12 grid grid-cols-2 gap-2 px-4">
            <div className="text-center pt-4">
              <p className="text-sm font-black text-gray-900">منظم السجل</p>
              <div className="mt-8 border-b-2 border-gray-200 w-3/4 mx-auto"></div>
              <p className="text-[10px] font-bold text-gray-400 mt-2">التوقيع</p>
            </div>
            <div className="text-center pt-4">
              <p className="text-sm font-black text-gray-900">مدير المدرسة</p>
              <p className="text-xs font-bold text-gray-500 mt-1 italic">{school.principalName}</p>
              <div className="mt-4 border-b-2 border-gray-200 w-3/4 mx-auto"></div>
              <p className="text-[10px] font-bold text-gray-400 mt-2">التوقيع</p>
            </div>
          </div>
          
          <div className="mt-16 pt-8 border-t border-gray-100 flex justify-between items-center text-[10px] font-bold text-gray-400">
            <p>نظام إدارة المدارس الرقمي - تم التحقق من البيانات والمطابقة برمجياً</p>
            <p dir="ltr">Printed: {format(new Date(), 'yyyy-MM-dd HH:mm')}</p>
          </div>
        </div>
      </div>

      <div className="hidden">
         <div ref={distributionPrintRef} className="p-4 bg-white text-right" dir="rtl">
            <div className="text-center mb-10 pb-6 border-b-2 border-gray-900">
               {school.logo && (
                 <div className="flex justify-center mb-3">
                   <img src={school.logo} alt="شعار المدرسة" className="h-16 object-contain grayscale" />
                 </div>
               )}
               <h1 className="text-lg font-black text-slate-900 tracking-tight mb-1">{school.name}</h1>
               <p className="text-xl font-bold mb-4">قوائم توزيع الطلاب على الشعب (توزيع تلقائي)</p>
               <div className="flex justify-center gap-3 text-sm font-black text-gray-500">
                  <p>العام الدراسي: {school.academicYear || `${new Date().getFullYear()} - ${new Date().getFullYear() + 1}`}</p>
                  <p>تاريخ الاستخراج: {format(new Date(), 'yyyy/MM/dd')}</p>
               </div>
            </div>

            {distributionData.map((gradeData, gIdx) => (
               <div key={gIdx} className="mb-16 page-break-after-always">
                  <h2 className="text-lg font-black bg-gray-100 p-4 rounded-xl border border-gray-900 mb-6 flex justify-between items-center">
                     <span>{gradeData.grade}</span>
                     <span className="text-base font-bold">العدد الكلي: {gradeData.total} طالب</span>
                  </h2>

                  <div className="grid grid-cols-2 gap-x-8 gap-y-12">
                     {gradeData.sections.map((section, sIdx) => (
                        <div key={sIdx} className="border-2 border-gray-900 rounded-2xl overflow-hidden">
                           <div className="bg-gray-900 text-white p-3 text-center border-b-2 border-gray-900">
                              <h3 className="text-lg font-black tracking-widest">شعبة ({section.name})</h3>
                           </div>
                           <table className="w-full border-collapse">
                              <thead>
                                 <tr className="bg-gray-50 border-b border-gray-900">
                                    <th className="p-2 border-l border-gray-900 w-10 text-sm font-black text-center">ت</th>
                                    <th className="p-2 text-base font-black text-right">اسم الطالب</th>
                                 </tr>
                              </thead>
                              <tbody>
                                 {section.students.map((st, idx) => (
                                    <tr key={st.id} className="border-b border-gray-200 last:border-b-0">
                                       <td className="p-1.5 border-l border-gray-900 text-center text-xs font-black">{idx + 1}</td>
                                       <td className="p-1.5 text-sm font-bold pr-3">{st.name}</td>
                                    </tr>
                                 ))}
                                 {/* Filler rows to keep table size consistent if desired or needed */}
                                 {distributionSettings.showFillerRows && Array.from({ length: Math.max(0, distributionSettings.studentsPerSection - section.students.length) }).map((_, i) => (
                                    <tr key={`filler-${i}`} className="border-b border-gray-200 h-8 opacity-0">
                                       <td className="p-1 border-l border-gray-900"></td>
                                       <td className="p-1"></td>
                                    </tr>
                                 ))}
                              </tbody>
                           </table>
                        </div>
                     ))}
                  </div>
               </div>
            ))}
            
            {distributionSettings.showSignatures && (
              <div className="mt-20 flex justify-around px-10 border-t-2 border-gray-900 pt-10">
                 <div className="text-center w-64">
                    <p className="font-black text-xl mb-12">مدير المدرسة</p>
                    <p className="font-bold border-t border-gray-300 pt-2 text-gray-500">{school.principalName}</p>
                 </div>
                 <div className="text-center w-64">
                    <p className="font-black text-xl mb-12">المسؤول الإداري</p>
                    <div className="border-t border-gray-300 w-full mt-12"></div>
                 </div>
              </div>
            )}
         </div>
      </div>
      {quickPayStudent && (
        <div className="integrated-page">
          <div className="modal-content">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-white relative z-50 sticky top-0 shadow-sm px-12">
                <div className="flex items-center gap-3 text-right leading-relaxed">
                  <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl text-slate-800 shadow-sm">
                    <CreditCard className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-900 tracking-tight text-slate-900 tracking-tight leading-relaxed">بوابة الدفع السريع المباشر</h3>
                    <p className="text-sm font-bold text-slate-400 mt-1 leading-relaxed">تسجيل وتحصيل المبالغ المالية الفورية للطلاب</p>
                  </div>
                </div>
                <button 
                  onClick={() => setQuickPayStudent(null)} 
                  className="p-4 bg-slate-50 hover:bg-rose-50 rounded-2xl transition-all text-slate-300 hover:text-rose-500 border border-slate-50"
                >
                  <ArrowLeftRight className="w-6 h-6 rotate-45" />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-4 lg:p-5 custom-scrollbar w-full bg-slate-50/20 custom-scrollbar flex items-center justify-center">
                <div className="max-w-2xl w-full bg-white p-5 rounded-3xl border border-slate-100 shadow-2xl space-y-2 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="relative group">
                      <div className="w-48 h-48 rounded-2xl bg-slate-50 p-2 shadow-2xl border border-slate-100 group-hover:scale-105 transition-all duration-500 overflow-hidden">
                        <div className="w-full h-full rounded-2xl overflow-hidden bg-white flex items-center justify-center shadow-inner">
                          {quickPayStudent.photo ? (
                            <img src={quickPayStudent.photo} alt={quickPayStudent.name} className="w-full h-full object-cover" />
                          ) : (
                            <User className="w-10 h-10 text-slate-200 animate-pulse" />
                          )}
                        </div>
                      </div>
                      <div className="absolute -bottom-4 -right-4 theme-bg text-white p-5 rounded-xl shadow-2xl theme-shadow border-4 border-white">
                        <CreditCard className="w-6 h-6" />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <h3 className="text-5xl font-black text-slate-900 tracking-tight leading-relaxed">{quickPayStudent.name}</h3>
                      <p className="text-lg font-bold theme-text underline decoration-theme-soft underline-offset-8 decoration-4 leading-relaxed">{quickPayStudent.grade}</p>
                    </div>
                  </div>

                  <form onSubmit={handleQuickPay} className="space-y-2">
                    <div className="space-y-2">
                      <label className="block text-sm font-black text-indigo-600 uppercase tracking-[0.3em] leading-relaxed">القيمة المراد تحصيلها الآن (د.ع)</label>
                      <div className="relative group max-w-lg mx-auto">
                        <DollarSign className="absolute right-8 top-1/2 -translate-y-1/2 text-indigo-400 w-6 h-6" />
                        <input
                          autoFocus
                          required
                          type="number"
                          value={quickAmount}
                          onChange={(e) => setQuickAmount(e.target.value)}
                          className="w-full bg-indigo-50 border-4 border-indigo-100 rounded-2xl py-10 pr-24 pl-12 font-black text-6xl text-center text-indigo-900 transition-all outline-none focus:ring-2 focus:ring-indigo-100/50 shadow-inner tracking-tighter"
                          placeholder="0.00"
                        />
                      </div>
                      <div className="flex flex-col items-center gap-3">
                        <div className="bg-amber-50 text-amber-600 px-6 py-2 rounded-full text-xs font-black uppercase tracking-widest border border-amber-100 flex items-center gap-2">
                          <MessageSquare className="w-4 h-4" />
                          تنبيه: سيتم إرسال إشعار فوري لولي الأمر عبر الواتساب
                        </div>
                        <p className="text-sm font-bold text-slate-400 leading-relaxed italic">سيتم توثيق الدفعة في سجل الحسابات وتاريخ اليوم آلياً</p>
                      </div>
                    </div>
                    
                    <div className="flex flex-col gap-3 pt-6">
                      <button
                        type="submit"
                        disabled={!quickAmount}
                        className="w-full theme-bg text-white py-10 rounded-2xl font-black text-xl theme-shadow shadow-2xl hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:scale-100 flex items-center justify-center gap-3"
                      >
                        <CheckCircle2 className="w-6 h-6" />
                        تثبيت وإتمام عملية القبض
                      </button>
                      <button
                        type="button"
                        onClick={() => setQuickPayStudent(null)}
                        className="w-full bg-slate-100 text-slate-400 py-6 rounded-2xl font-black text-xl hover:bg-rose-50 hover:text-rose-500 transition-all flex items-center justify-center gap-2"
                      >
                        إلغاء العملية والعودة
                        <ArrowLeftRight className="w-6 h-6 rotate-45" />
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>
          )}

      {selectedPaymentForReceipt && selectedStudentForProfile && (
        <PaymentModal
          student={selectedStudentForProfile}
          school={school}
          payments={localDb.getAll('payments')}
          initialPayment={selectedPaymentForReceipt}
          onClose={() => setSelectedPaymentForReceipt(null)}
        />
      )}
    </div>
  );
}
