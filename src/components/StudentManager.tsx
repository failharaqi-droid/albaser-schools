import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { School, Student, Payment, AttendanceRecord, AttendanceStatus } from '../types';
import { localDb } from '../services/localDb';
import { WhatsAppService } from '../services/WhatsAppService';
import * as XLSX from 'xlsx';
import { 
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
  HelpCircle
} from 'lucide-react';
import { formatCurrency, generateNumericBarcode } from '../lib/utils';
import BarcodeScanner from './BarcodeScanner';
import { format, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { ar } from 'date-fns/locale';
import { useReactToPrint } from 'react-to-print';
import { useRef } from 'react';

interface StudentManagerProps {
  school: School;
  students: Student[];
  onPay: (studentId: string) => void;
  canModify?: boolean;
}

const GRADES = [
  "الأول الابتدائي", "الثاني الابتدائي", "الثالث الابتدائي", "الرابع الابتدائي", "الخامس الابتدائي", "السادس الابتدائي",
  "الأول المتوسط", "الثاني المتوسط", "الثالث المتوسط",
  "الرابع الإعدادي", "الخامس الإعدادي", "السادس الإعدادي"
];

const ABJAD_ALPHABET = ['أ', 'ب', 'ج', 'د', 'هـ', 'و', 'ز', 'ح', 'ط', 'ي', 'ك', 'ل', 'م', 'ن', 'س', 'ع', 'ف', 'ص', 'ق', 'ر', 'ش', 'ت', 'ث', 'خ', 'ذ', 'ض', 'ظ', 'غ'];

export default function StudentManager({ school, students, onPay, canModify = true }: StudentManagerProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGrade, setSelectedGrade] = useState('الكل');
  const [isAdding, setIsAdding] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isScanningForForm, setIsScanningForForm] = useState(false);
  const [quickPayStudent, setQuickPayStudent] = useState<Student | null>(null);
  const [quickAmount, setQuickAmount] = useState('');
  const [selectedStudentForProfile, setSelectedStudentForProfile] = useState<Student | null>(null);
  const [profileTab, setProfileTab] = useState<'payments' | 'attendance'>('attendance');
  const [deletingStudent, setDeletingStudent] = useState<Student | null>(null);
  const [editingAttendance, setEditingAttendance] = useState<AttendanceRecord | null>(null);
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
  
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `${registryConfig.registryTitle}_${registryConfig.grade}_${format(new Date(), 'yyyy-MM-dd')}`
  });

  const handleDistributionPrint = useReactToPrint({
    contentRef: distributionPrintRef,
    documentTitle: `توزيع_الشعب_${school.name}_${format(new Date(), 'yyyy-MM-dd')}`
  });

  const [formData, setFormData] = useState({
    name: '',
    parentName: '',
    totalAmount: '',
    grade: GRADES[0],
    phone: '',
    barcode: '',
    attendanceBarcode: '',
    installmentBarcode: '',
    dob: '',
    photo: '',
    fingerprintId: ''
  });

  const filteredStudents = useMemo(() => {
      return students.filter(s => {
        const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                             s.barcode.includes(searchTerm) || 
                             (s.attendanceBarcode && s.attendanceBarcode.includes(searchTerm)) || 
                             (s.installmentBarcode && s.installmentBarcode.includes(searchTerm));
        const matchesGrade = selectedGrade === 'الكل' || s.grade === selectedGrade;
        return matchesSearch && matchesGrade;
      }).sort((a, b) => a.name.localeCompare(b.name, 'ar'));
  }, [students, searchTerm, selectedGrade]);

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingStudent) {
      localDb.update('students', editingStudent.id, {
        ...formData,
        totalAmount: Number(formData.totalAmount),
        barcode: (formData.barcode || editingStudent.barcode || generateNumericBarcode()).replace(/\D/g, ''),
        attendanceBarcode: (formData.attendanceBarcode || editingStudent.attendanceBarcode || generateNumericBarcode()).replace(/\D/g, ''),
        installmentBarcode: (formData.installmentBarcode || editingStudent.installmentBarcode || generateNumericBarcode()).replace(/\D/g, ''),
      });
    } else {
      const newStudent = localDb.add('students', {
        ...formData,
        schoolId: school.id,
        totalAmount: Number(formData.totalAmount),
        barcode: (formData.barcode || generateNumericBarcode()).replace(/\D/g, ''),
        attendanceBarcode: (formData.attendanceBarcode || generateNumericBarcode()).replace(/\D/g, ''),
        installmentBarcode: (formData.installmentBarcode || generateNumericBarcode()).replace(/\D/g, ''),
        createdAt: new Date().toISOString()
      }) as Student;

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
      name: '', parentName: '', totalAmount: '', grade: GRADES[0], phone: '', 
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
      barcode: student.barcode,
      attendanceBarcode: student.attendanceBarcode || '',
      installmentBarcode: student.installmentBarcode || '',
      dob: student.dob || '',
      photo: student.photo || '',
      fingerprintId: student.fingerprintId || ''
    });
    setIsAdding(true);
  };

  const executeDeleteStudent = (id: string) => {
      localDb.delete('students', id);
      
      // Also delete payments for this student
      const payments = localDb.getAll('payments') as Payment[];
      const studentPayments = payments.filter(p => p.studentId === id);
      studentPayments.forEach(p => localDb.delete('payments', p.id));

      // Also delete attendance records for this student
      const attendance = localDb.getAll('attendanceRecords') as AttendanceRecord[];
      const studentAttendance = attendance.filter(r => r.entityId === id && r.type === 'student');
      studentAttendance.forEach(r => localDb.delete('attendanceRecords', r.id));

      // Close profile if it was open for this student
      if (selectedStudentForProfile?.id === id) {
        setSelectedStudentForProfile(null);
      }
      
      setDeletingStudent(null);
  };

  const handleUpdateAttendance = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAttendance) return;
    
    localDb.update('attendanceRecords', editingAttendance.id, {
      status: attendanceFormData.status,
      reason: attendanceFormData.reason
    });
    
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
        alert(`تم إرسال ${label} بنجاح عبر البوت`);
      }
    } else {
      alert('فشل إرسال التنبيه. يرجى التحقق من إعدادات البوت.');
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
      alert('تم إرسال تقرير حالة الطالب بنجاح');
    } else {
      alert('فشل في إرسال التقرير. تأكد من إعدادات الواتساب وتعيين قالب تقرير الحالة');
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

  const handleQuickPay = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickPayStudent || !quickAmount) return;
    
    const amount = Number(quickAmount);
    localDb.add('payments', {
      studentId: quickPayStudent.id,
      amount,
      date: new Date().toISOString(),
      note: 'دفع سريع من قائمة الطلاب'
    });

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
      alert('تم تسديد كامل المبلغ لهذا الطالب');
      return;
    }

    import('../services/WhatsAppService').then(({ WhatsAppService }) => {
      WhatsAppService.sendNotification(school.id, student.id, 'reminder', {
        remain: remain
      }).then(res => {
        if (res && res.mode === 'manual' && res.url) {
          window.open(res.url, '_blank');
        } else if (res && res.success) {
          alert('تم إرسال تذكير الدفع بنجاح');
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
      'رقم الهاتف': s.phone
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
      { wch: 15 }  // رقم الهاتف
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
      'اسم ولي الأمر': s.parentName || ''
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
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
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
          <BarcodeScanner 
            onScan={handleScan} 
            onClose={() => setIsScanning(false)} 
          />
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
            className="bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 outline-none font-bold focus:ring-2"
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
              <th className="px-4 py-4 font-black">تسلسل الصف</th>
              <th className="px-6 py-4 font-black">الطالب</th>
              <th className="px-6 py-4 font-black">الصف</th>
              <th className="px-6 py-4 font-black text-sm">المبلغ الكلي</th>
              <th className="px-6 py-4 font-black text-sm">الباركود</th>
              <th className="px-6 py-4 font-black text-sm">البصمة</th>
              <th className="px-6 py-4 font-black text-sm">الإجراءات</th>
            </tr>
          </thead>
          <motion.tbody 
            initial="hidden"
            animate="visible"
            variants={{
              hidden: { opacity: 0 },
              visible: { opacity: 1, transition: { staggerChildren: 0.05 } }
            }}
            className="divide-y divide-gray-50"
          >
            {filteredStudents.map((student) => (
              <motion.tr 
                key={student.id} 
                variants={{
                  hidden: { opacity: 0, x: 10 },
                  visible: { opacity: 1, x: 0 }
                }}
                className="hover:bg-[var(--primary-theme-soft)] transition-colors group"
              >
                <td className="px-4 py-4">
                  <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-xs font-black text-gray-600">
                    {studentsWithSequence[student.id] || '-'}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3 group/photo relative">
                    <div className="w-10 h-10 rounded-full bg-gray-100 border border-gray-200 overflow-hidden flex-shrink-0 flex items-center justify-center">
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
                <td className="px-6 py-4">
                  <span className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-xs font-black">
                    {student.grade}
                  </span>
                </td>
                <td className="px-6 py-4 font-black text-gray-900">{formatCurrency(student.totalAmount)}</td>
                <td className="px-6 py-4 font-mono text-xs theme-text font-black">{student.barcode}</td>
                <td className="px-6 py-4">
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
                <td className="px-6 py-4">
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
              </motion.tr>
            ))}
          </motion.tbody>
        </table>
      </div>

      <AnimatePresence>
        {editingAttendance && (
          <div className="fixed inset-0 z-[400] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setEditingAttendance(null)}
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white w-full max-w-lg rounded-[3rem] shadow-2xl relative z-10 overflow-hidden"
            >
              <div className="p-8 border-b border-slate-50 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
                    <History className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-900">تعديل سجل الحضور</h3>
                    <p className="text-[10px] font-bold text-slate-400">بتاريخ: {format(new Date(editingAttendance.date), 'dd MMMM yyyy', { locale: ar })}</p>
                  </div>
                </div>
                <button onClick={() => setEditingAttendance(null)} className="p-2 hover:bg-slate-50 rounded-xl transition-all">
                  <X className="w-6 h-6 text-slate-400" />
                </button>
              </div>

              <form onSubmit={handleUpdateAttendance} className="p-8 space-y-6">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">حالة الحضور</label>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { id: 'present', label: 'حاضر', color: 'emerald' },
                      { id: 'absent', label: 'غائب', color: 'rose' },
                      { id: 'late', label: 'متأخر', color: 'amber' },
                      { id: 'excused', label: 'عذر رسمي', color: 'blue' }
                    ].map(status => (
                      <button
                        key={status.id}
                        type="button"
                        onClick={() => setAttendanceFormData({ ...attendanceFormData, status: status.id as AttendanceStatus })}
                        className={`p-4 rounded-2xl font-black transition-all border-2 text-sm flex items-center gap-3 ${
                          attendanceFormData.status === status.id 
                          ? `bg-${status.color}-50 border-${status.color}-500 text-${status.color}-700 shadow-sm` 
                          : 'bg-white border-slate-100 text-slate-400 hover:bg-slate-50'
                        }`}
                      >
                        <div className={`w-3 h-3 rounded-full bg-${status.color}-500 ${attendanceFormData.status === status.id ? 'animate-pulse' : ''}`} />
                        {status.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3 text-right">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">ملاحظات / سبب الغياب</label>
                  <textarea 
                    value={attendanceFormData.reason}
                    onChange={(e) => setAttendanceFormData({ ...attendanceFormData, reason: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-5 text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-100 transition-all min-h-[100px] text-right"
                    placeholder="اكتب سبب الغياب أو أية ملاحظات إضافية هنا..."
                  />
                </div>

                <button 
                  type="submit"
                  className="w-full theme-bg text-white py-5 rounded-2xl font-black text-lg theme-shadow transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  <CheckCircle2 className="w-6 h-6" />
                  حفظ التعديلات
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* High Absence Modal */}
      <AnimatePresence>
        {showFrequentAbsences && (
          <div className="fixed inset-0 z-[500] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowFrequentAbsences(false)}
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl relative z-10 overflow-hidden flex flex-col max-h-[85vh]"
            >
              <div className="p-8 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-rose-50 text-rose-600 rounded-2xl">
                    <Bell className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-900">سجل الغيابات المتكررة</h3>
                    <p className="text-[10px] font-bold text-slate-400">الطلبة المتجاوزين لـ 6 أيام غياب</p>
                  </div>
                </div>
                <button onClick={() => setShowFrequentAbsences(false)} className="p-2 hover:bg-white rounded-xl transition-all shadow-sm">
                  <X className="w-6 h-6 text-slate-400" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 space-y-4">
                {highAbsenceStudents.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-dashed border-slate-200">
                      <CheckCircle className="w-10 h-10 text-slate-300" />
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
                            <div key={student.id} className="bg-white border border-slate-100 p-6 rounded-[2rem] flex items-center justify-between hover:shadow-md transition-all group">
                        <div className="flex items-center gap-4">
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
              
              <div className="p-8 bg-slate-50/50 border-t border-slate-100">
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-white p-4 rounded-2xl border border-slate-100 text-center">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">تنبيه اول</p>
                    <p className="text-sm font-black text-amber-600">+6 أيام</p>
                  </div>
                  <div className="bg-white p-4 rounded-2xl border border-slate-100 text-center">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">استدعاء ولي</p>
                    <p className="text-sm font-black text-orange-600">+10 أيام</p>
                  </div>
                  <div className="bg-white p-4 rounded-2xl border border-slate-100 text-center">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">إنذار فصل</p>
                    <p className="text-sm font-black text-rose-600">+12 يوم</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {deletingStudent && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDeletingStudent(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white w-full max-w-lg rounded-[3.5rem] shadow-2xl relative z-10 overflow-hidden border border-white/20"
            >
              <div className="p-10 text-center space-y-8">
                <div className="w-24 h-24 bg-rose-50 rounded-[2.5rem] flex items-center justify-center mx-auto text-rose-500 shadow-xl shadow-rose-200/50 group hover:rotate-6 transition-transform">
                  <Trash2 className="w-12 h-12" />
                </div>
                <div className="space-y-3">
                  <h3 className="text-3xl font-black text-slate-900 tracking-tight">تأكيد حذف الطالب</h3>
                  <p className="text-lg text-slate-500 font-bold leading-relaxed">
                    هل أنت متأكد من حذف الطالب <span className="text-rose-600 font-black decoration-rose-200 underline decoration-4 underline-offset-4">"{deletingStudent.name}"</span>؟ 
                    <br />
                    <span className="text-sm text-slate-400 mt-4 block p-4 bg-slate-50 rounded-2xl border border-slate-100">هذا الإجراء سيقوم بحذف كافة السجلات المالية والغيابات المرتبطة بهذا الطالب بشكل نهائي.</span>
                  </p>
                </div>
                <div className="flex flex-col gap-4">
                  <button 
                    onClick={() => executeDeleteStudent(deletingStudent.id)}
                    className="w-full bg-rose-600 text-white py-6 rounded-[2rem] font-black text-xl hover:bg-rose-700 shadow-2xl shadow-rose-200 transition-all active:scale-[0.98] flex items-center justify-center gap-3"
                  >
                    <Trash2 className="w-6 h-6" />
                    تأكيد الحذف النهائي
                  </button>
                  <button 
                    onClick={() => setDeletingStudent(null)}
                    className="w-full bg-slate-50 text-slate-400 py-5 rounded-[2rem] font-black text-lg hover:bg-slate-100 hover:text-slate-900 transition-all active:scale-[0.98]"
                  >
                    تراجع
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Student Profile Modal */}
      <AnimatePresence>
        {selectedStudentForProfile && studentProfileData && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 md:p-8">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedStudentForProfile(null)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-md"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white w-full max-w-5xl rounded-[3.5rem] shadow-2xl overflow-hidden relative z-10 border border-white/20 flex flex-col max-h-[90vh]"
            >
              <div className="p-10 border-b border-slate-50 bg-slate-50/30 flex flex-col md:flex-row items-center gap-8">
                <div className="relative group">
                  <div className="w-32 h-32 rounded-[2.5rem] bg-white p-1.5 shadow-xl border border-slate-100 overflow-hidden">
                    <div className="w-full h-full rounded-[2.2rem] overflow-hidden bg-slate-50 flex items-center justify-center">
                      {selectedStudentForProfile.photo ? (
                        <img src={selectedStudentForProfile.photo} alt={selectedStudentForProfile.name} className="w-full h-full object-cover" />
                      ) : (
                        <User className="w-16 h-16 text-slate-200" />
                      )}
                    </div>
                  </div>
                  <div className="absolute -bottom-2 -right-2 bg-emerald-500 text-white p-2.5 rounded-2xl border-4 border-white shadow-lg">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                </div>

                <div className="flex-1 text-center md:text-right space-y-2">
                  <div className="flex flex-col md:flex-row md:items-center gap-3">
                    <h2 className="text-4xl font-black text-slate-900 tracking-tight">{selectedStudentForProfile.name}</h2>
                    <span className="bg-indigo-50 text-indigo-600 px-5 py-1.5 rounded-full text-xs font-black border border-indigo-100 uppercase tracking-widest inline-block md:inline-flex mx-auto md:mx-0">
                      {selectedStudentForProfile.grade}
                    </span>
                  </div>
                  <div className="flex flex-wrap justify-center md:justify-start gap-4 text-slate-400">
                    <div className="flex items-center gap-2 text-sm font-bold">
                      <Fingerprint className="w-4 h-4" />
                      ID: {selectedStudentForProfile.barcode}
                    </div>
                    <div className="flex items-center gap-2 text-sm font-bold">
                      <Phone className="w-4 h-4" />
                      {selectedStudentForProfile.phone}
                    </div>
                    <div className="flex items-center gap-2 text-sm font-bold">
                      <Calendar className="w-4 h-4" />
                      تاريخ التسجيل: {format(new Date(selectedStudentForProfile.createdAt), 'yyyy/MM/dd')}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => sendStatusReport(selectedStudentForProfile)}
                    className="flex flex-col items-center gap-1 p-3 bg-indigo-600 text-white hover:bg-slate-900 rounded-3xl transition-all shadow-xl"
                    title="إرسال تقرير حالة الطالب"
                  >
                    <MessageSquare className="w-6 h-6" />
                    <span className="text-[10px] font-black">تقرير الحالة</span>
                  </button>
                  <button 
                    onClick={() => {
                      setEditingStudent(selectedStudentForProfile);
                      setSelectedStudentForProfile(null);
                    }}
                    className="p-4 bg-white text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-3xl transition-all border border-slate-100 shadow-sm"
                    title="تعديل"
                  >
                    <Edit2 className="w-6 h-6" />
                  </button>
                  <button 
                    onClick={() => setSelectedStudentForProfile(null)}
                    className="p-4 bg-slate-900 text-white hover:bg-black rounded-3xl transition-all shadow-xl"
                  >
                    <X className="w-8 h-8" />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar p-10 space-y-10 bg-slate-50/20">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <div className="lg:col-span-1 space-y-6">
                    <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest px-2">الوضع المالي</h3>
                    <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-8">
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <p className="text-[10px] font-black text-slate-400 uppercase pr-1 text-right">إجمالي المبلغ</p>
                          <p className="text-3xl font-black text-slate-900 text-right" dir="rtl">{formatCurrency(selectedStudentForProfile.totalAmount)}</p>
                        </div>
                        
                        <div className="h-4 bg-slate-50 rounded-full overflow-hidden flex shadow-inner">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${(studentProfileData?.paidAmount || 0) / (selectedStudentForProfile.totalAmount || 1) * 100}%` }}
                            className="bg-emerald-500 h-full shadow-lg shadow-emerald-100"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100/50 text-right">
                            <p className="text-[9px] font-black text-emerald-600 uppercase mb-1">المدفوع</p>
                            <p className="text-lg font-black text-emerald-700">{formatCurrency(studentProfileData?.paidAmount || 0)}</p>
                          </div>
                          <div className="bg-rose-50/50 p-4 rounded-2xl border border-rose-100/50 text-right">
                            <p className="text-[9px] font-black text-rose-600 uppercase mb-1">المتبقي</p>
                            <p className="text-lg font-black text-rose-700">{formatCurrency(studentProfileData?.remainingAmount || 0)}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest px-2 mt-10">استعلام حالة الطالب الشامل</h3>
                    <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-6">
                      <div className="grid grid-cols-1 gap-4">
                        <div className="p-6 bg-slate-50 rounded-3xl border border-slate-200">
                          <div className="flex items-center gap-3 mb-6 border-b border-slate-200 pb-4">
                            <div className="p-3 bg-indigo-600 rounded-2xl text-white">
                              <Info className="w-5 h-5" />
                            </div>
                            <div className="text-right">
                              <h4 className="text-sm font-black text-slate-900">تقرير المتابعة والوضع المالي</h4>
                              <p className="text-[10px] font-bold text-slate-400">آخر تحديث: {new Date().toLocaleDateString('ar-EG')}</p>
                            </div>
                          </div>

                          <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-1 text-right">
                                <p className="text-[9px] font-black text-slate-400 uppercase">إجمالي الرسوم</p>
                                <p className="text-sm font-black text-slate-900">{formatCurrency(selectedStudentForProfile.totalAmount)}</p>
                              </div>
                              <div className="space-y-1 text-right">
                                <p className="text-[9px] font-black text-emerald-600 uppercase">المبلغ الواصل</p>
                                <p className="text-sm font-black text-emerald-700">{formatCurrency(studentProfileData?.paidAmount || 0)}</p>
                              </div>
                            </div>

                            <div className="bg-white p-4 rounded-2xl border border-slate-100 flex justify-between items-center text-right shadow-sm">
                               <div className="flex items-center gap-2">
                                 <div className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                                 <span className="text-[10px] font-black text-rose-600 uppercase">المبلغ المتبقي</span>
                               </div>
                               <span className="text-base font-black text-rose-700">{formatCurrency(studentProfileData?.remainingAmount || 0)}</span>
                            </div>

                            <div className="grid grid-cols-2 gap-3 pt-2">
                              <div className="bg-white p-3 rounded-2xl border border-slate-100 text-right">
                                <p className="text-[8px] font-black text-slate-400">آخر دفعة</p>
                                <p className="text-[11px] font-black text-indigo-600">{formatCurrency(studentProfileData?.lastPayment?.amount || 0)}</p>
                              </div>
                              <div className="bg-white p-3 rounded-2xl border border-slate-100 text-right">
                                <p className="text-[8px] font-black text-slate-400">تاريخها</p>
                                <p className="text-[10px] font-black text-slate-600">{studentProfileData?.lastPayment?.date ? format(new Date(studentProfileData.lastPayment.date), 'yyyy-MM-dd') : '---'}</p>
                              </div>
                            </div>

                            <div className="pt-4 border-t border-slate-200 grid grid-cols-4 gap-2">
                               <div className="flex flex-col items-center">
                                 <span className="text-xs font-black text-slate-900">{studentProfileData?.absentCount || 0}</span>
                                 <span className="text-[8px] font-bold text-slate-400">غياب</span>
                               </div>
                               <div className="flex flex-col items-center">
                                 <span className="text-xs font-black text-amber-600">{(studentProfileData?.absentCount || 0) >= 6 ? 1 : 0}</span>
                                 <span className="text-[8px] font-bold text-amber-500">تنبيه</span>
                               </div>
                               <div className="flex flex-col items-center">
                                 <span className="text-xs font-black text-orange-600">{(studentProfileData?.absentCount || 0) >= 10 ? 1 : 0}</span>
                                 <span className="text-[8px] font-bold text-orange-500">استدعاء</span>
                               </div>
                               <div className="flex flex-col items-center">
                                 <span className="text-xs font-black text-rose-600">{(studentProfileData?.absentCount || 0) >= 12 ? 1 : 0}</span>
                                 <span className="text-[8px] font-bold text-rose-500">إنذار</span>
                               </div>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <button
                        onClick={() => sendStatusReport(selectedStudentForProfile)}
                        className="w-full py-5 bg-indigo-600 hover:bg-slate-900 text-white rounded-[2rem] font-black text-sm flex items-center justify-center gap-3 transition-all shadow-xl shadow-indigo-100 active:scale-95"
                      >
                        <MessageSquare className="w-5 h-5" />
                        إرسال التقرير الشامل لولي الأمر
                      </button>
                    </div>

                    <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest px-2 mt-10">إحصائيات الحضور المفصلة</h3>
                    <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-6">
                       {(() => {
                          const absences = studentProfileData?.absentCount || 0;
                          
                          let alertConfig = absences >= 12 ? {
                                label: 'إنذار نهائي بالفصل',
                                sub: 'تجاوز 12 يوم غياب - إجراء إداري فوري.',
                                color: 'rose'
                              } : absences >= 10 ? {
                                label: 'استدعاء ولي أمر',
                                sub: 'تجاوز 10 أيام غياب - حضور ولي الأمر ضروري.',
                                color: 'orange'
                              } : absences >= 6 ? {
                                label: 'تنبيه غياب متكرر (أول)',
                                sub: 'الطالب تجاوز 6 أيام غياب.',
                                color: 'amber'
                              } : null;

                          return alertConfig ? (
                             <div className={`p-5 rounded-3xl border-2 flex flex-col gap-2 relative overflow-hidden ${
                               alertConfig.color === 'rose' ? 'bg-rose-50 border-rose-200 text-rose-800' :
                               alertConfig.color === 'orange' ? 'bg-orange-50 border-orange-200 text-orange-800' :
                               'bg-amber-50 border-amber-200 text-amber-800'
                             }`}>
                               <div className="flex items-center gap-3 relative z-10">
                                 <Bell className="w-5 h-5 animate-bounce" />
                                 <span className="font-black text-sm">{alertConfig.label}</span>
                               </div>
                               <p className="text-[10px] font-bold opacity-70 relative z-10">{alertConfig.sub}</p>
                               
                               <button
                                 onClick={() => sendAbsenceAlert(selectedStudentForProfile, absences)}
                                 className={`mt-2 py-2 px-4 rounded-xl font-black text-[10px] self-start relative z-10 flex items-center gap-2 transition-all active:scale-95 ${
                                   alertConfig.color === 'rose' ? 'bg-rose-600 text-white shadow-lg shadow-rose-200' :
                                   alertConfig.color === 'orange' ? 'bg-orange-500 text-white shadow-lg shadow-orange-200' :
                                   'bg-amber-500 text-white shadow-lg shadow-amber-200'
                                 }`}
                               >
                                 <MessageSquare className="w-3.5 h-3.5" />
                                 إرسال الإشعار الآن
                               </button>
                             </div>
                          ) : null;
                       })()}

                       <div className="grid grid-cols-2 gap-4">
                         <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 items-center justify-center flex flex-col">
                            <span className="text-2xl font-black text-indigo-600">{studentProfileData?.attendanceRate}%</span>
                            <span className="text-[9px] font-black text-slate-400 mt-1">نسبة الالتزام</span>
                         </div>
                         <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 items-center justify-center flex flex-col">
                            <span className="text-2xl font-black text-emerald-600">{studentProfileData?.presentCount}</span>
                            <span className="text-[9px] font-black text-emerald-400 mt-1">أيام الحضور</span>
                         </div>
                       </div>

                       <div className="space-y-4 pt-2 border-t border-slate-50">
                         <div className="flex justify-between items-center text-xs font-bold px-2">
                           <div className="flex items-center gap-2">
                             <div className="w-2 h-2 rounded-full bg-rose-500" />
                             <span className="text-slate-500">أيام الغياب</span>
                           </div>
                           <span className="text-rose-600 font-black">{studentProfileData?.absentCount} يوم</span>
                         </div>
                         <div className="flex justify-between items-center text-xs font-bold px-2">
                           <div className="flex items-center gap-2">
                             <div className="w-2 h-2 rounded-full bg-amber-500" />
                             <span className="text-slate-500">التأخيرات</span>
                           </div>
                           <span className="text-amber-600 font-black">{studentProfileData?.lateCount} مرات</span>
                         </div>
                         <div className="flex justify-between items-center text-xs font-bold px-2">
                           <div className="flex items-center gap-2">
                             <div className="w-2 h-2 rounded-full bg-blue-500" />
                             <span className="text-slate-500">أعذار رسمية</span>
                           </div>
                           <span className="text-blue-600 font-black">{studentProfileData?.excusedCount}</span>
                         </div>
                         <div className="flex justify-between items-center text-xs font-bold px-2">
                           <div className="flex items-center gap-2">
                             <div className="w-2 h-2 rounded-full bg-orange-500" />
                             <span className="text-slate-500">مخالفات</span>
                           </div>
                           <span className="text-orange-600 font-black">{studentProfileData?.violationCount}</span>
                         </div>
                       </div>
                    </div>

                    <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-8 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden">
                       <Info className="absolute -right-6 -bottom-6 w-32 h-32 text-white/5 rotate-12" />
                       <h4 className="text-sm font-black mb-4 flex items-center gap-2 relative z-10">
                         <HelpCircle className="w-4 h-4 text-indigo-400" />
                         دليل الإنذارات والغياب
                       </h4>
                       <div className="space-y-4 relative z-10">
                         <div className="flex gap-4 group">
                           <div className="mt-1 w-6 h-6 rounded-lg bg-amber-500/20 text-amber-500 flex items-center justify-center text-[10px] font-black border border-amber-500/30">6</div>
                           <div className="space-y-1">
                             <p className="text-[11px] font-black text-amber-400">تنبيه أولي (تجاوز غياب)</p>
                             <p className="text-[9px] text-white/40 leading-relaxed">يتم إرسال رسالة توعوية لولي الأمر بضرورة متابعة غياب الطالب لتجنب التأثير الدراسي.</p>
                           </div>
                         </div>
                         <div className="flex gap-4 group">
                           <div className="mt-1 w-6 h-6 rounded-lg bg-orange-500/20 text-orange-500 flex items-center justify-center text-[10px] font-black border border-orange-500/30">10</div>
                           <div className="space-y-1">
                             <p className="text-[11px] font-black text-orange-400">استدعاء رسمي لولي الأمر</p>
                             <p className="text-[9px] text-white/40 leading-relaxed">رسالة رسمية تطلب مراجعة إدارة المدرسة فوراً لمناقشة وضع الطالب وسلوكيات الغياب.</p>
                           </div>
                         </div>
                         <div className="flex gap-4 group">
                           <div className="mt-1 w-6 h-6 rounded-lg bg-rose-500/20 text-rose-500 flex items-center justify-center text-[10px] font-black border border-rose-500/30">12</div>
                           <div className="space-y-1">
                             <p className="text-[11px] font-black text-rose-400">إنذار نهائي بالفصل</p>
                             <p className="text-[9px] text-white/40 leading-relaxed">الإجراء الأخير قبل فصل الطالب رسمياً حسب لائحة الغياب المقررة من الإدارة.</p>
                           </div>
                         </div>
                       </div>
                    </div>
                  </div>

                  <div className="lg:col-span-2 space-y-10">
                    <div className="space-y-6">
                      <div className="flex items-center justify-between px-2">
                        <div className="flex bg-slate-100 p-1 rounded-2xl">
                          <button 
                            onClick={() => setProfileTab('attendance')}
                            className={`px-6 py-2 rounded-xl text-xs font-black transition-all ${profileTab === 'attendance' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}
                          >
                            الحضور اليومي
                          </button>
                          <button 
                            onClick={() => setProfileTab('payments')}
                            className={`px-6 py-2 rounded-xl text-xs font-black transition-all ${profileTab === 'payments' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}
                          >
                            سجل المدفوعات
                          </button>
                        </div>
                        <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest">
                          {profileTab === 'attendance' ? 'تاريخ الحضور والغياب' : 'سجل الدفعات المالية'}
                        </h3>
                      </div>

                      <div className="space-y-4">
                        {profileTab === 'payments' && (
                          studentProfileData?.studentPayments.length ? (
                            studentProfileData.studentPayments.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(p => (
                              <div key={p.id} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex items-center justify-between group hover:border-emerald-200 transition-all">
                                <div className="flex items-center gap-5">
                                  <div className="p-4 bg-emerald-50 text-emerald-600 rounded-2xl group-hover:scale-110 transition-transform">
                                    <DollarSign className="w-6 h-6" />
                                  </div>
                                  <div>
                                    <p className="text-base font-black text-slate-900">دفعة نقدية</p>
                                    <p className="text-[10px] text-slate-400 font-bold mt-0.5">{format(new Date(p.date), 'EEEE, dd MMMM yyyy', { locale: ar })}</p>
                                  </div>
                                </div>
                                <div className="text-left">
                                  <p className="text-xl font-black text-emerald-600 tracking-tighter" dir="rtl">{formatCurrency(p.amount)}</p>
                                  <p className="text-[10px] font-bold text-slate-400">تحقق موثق</p>
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="text-center py-20 bg-slate-50 rounded-[3rem] border-2 border-dashed border-slate-100">
                              <DollarSign className="w-16 h-16 text-slate-200 mx-auto mb-4" />
                              <p className="text-lg font-black text-slate-300">لا توجد مدفوعات مسجلة</p>
                            </div>
                          )
                        )}

                        {profileTab === 'attendance' && (
                          studentProfileData?.studentAttendance.length ? (
                            studentProfileData.studentAttendance.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(r => (
                              <div key={r.id} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex items-center justify-between group hover:border-indigo-200 transition-all">
                                <div className="flex items-center gap-5 text-right flex-1">
                                  <div className={`p-4 rounded-2xl ${
                                    r.status === 'present' ? 'bg-emerald-50 text-emerald-600' : 
                                    r.status === 'late' ? 'bg-amber-50 text-amber-600' : 
                                    r.status === 'absent' ? 'bg-rose-50 text-rose-600' :
                                    r.status === 'excused' ? 'bg-blue-50 text-blue-600' :
                                    r.status === 'dismissed' ? 'bg-slate-100 text-slate-600' :
                                    r.status === 'violation' ? 'bg-orange-50 text-orange-600' :
                                    'bg-slate-50 text-slate-600'
                                  }`}>
                                    {r.status === 'present' ? <CheckCircle className="w-6 h-6" /> : 
                                     r.status === 'late' ? <Clock className="w-6 h-6" /> : 
                                     r.status === 'absent' ? <XCircle className="w-6 h-6" /> :
                                     r.status === 'excused' ? <Info className="w-6 h-6" /> :
                                     r.status === 'dismissed' ? <LogOut className="w-6 h-6" /> :
                                     r.status === 'violation' ? <AlertCircle className="w-6 h-6" /> :
                                     <AlertCircle className="w-6 h-6" />}
                                  </div>
                                  <div className="space-y-1">
                                    <div className="flex items-center gap-2 j">
                                      <p className="text-base font-black text-slate-900 text-right">
                                        {r.status === 'present' ? 'حضور' : 
                                         r.status === 'late' ? 'تأخير' : 
                                         r.status === 'absent' ? 'غياب' : 
                                         r.status === 'excused' ? 'عذر رسمي' : 
                                         r.status === 'dismissed' ? 'مغادرة' :
                                         r.status === 'violation' ? 'مخالفة' :
                                         'أخرى'}
                                      </p>
                                      {r.reason && (
                                        <span className="text-[10px] font-black bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md">
                                          سبب: {r.reason}
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-[10px] text-slate-400 font-bold mt-0.5 text-right">{format(new Date(r.date), 'EEEE, dd MMMM yyyy', { locale: ar })}</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-4">
                                  {r.scanTime && (
                                    <div className="text-left">
                                      <div className="flex items-center gap-1.5 text-[10px] font-black text-indigo-600 bg-indigo-50 px-4 py-1.5 rounded-full border border-indigo-100 shadow-sm">
                                        <Clock className="w-3.5 h-3.5" />
                                        {format(new Date(r.scanTime), 'hh:mm a')}
                                      </div>
                                    </div>
                                  )}
                                  {canModify && (
                                    <button 
                                      onClick={() => {
                                        setEditingAttendance(r);
                                        setAttendanceFormData({
                                          status: r.status,
                                          reason: r.reason || ''
                                        });
                                      }}
                                      className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                                    >
                                      <Edit2 className="w-4 h-4" />
                                    </button>
                                  )}
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="text-center py-20 bg-slate-50 rounded-[3rem] border-2 border-dashed border-slate-100">
                              <History className="w-16 h-16 text-slate-200 mx-auto mb-4" />
                              <p className="text-lg font-black text-slate-300">لا توجد سجلات حضور مسجلة</p>
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-10 bg-slate-50/50 border-t border-slate-50 flex flex-col md:flex-row gap-4 items-center">
                <button 
                  onClick={() => sendPaymentReminder(selectedStudentForProfile)}
                  className="w-full md:flex-1 bg-amber-500 text-white py-6 rounded-[2rem] font-black flex items-center justify-center gap-3 hover:bg-amber-600 shadow-2xl shadow-amber-200 transition-all active:scale-[0.98]"
                >
                  <Bell className="w-7 h-7" />
                  إرسال تذكير بالدفع
                </button>
                <button 
                  onClick={() => {
                    const stId = selectedStudentForProfile.id;
                    setSelectedStudentForProfile(null);
                    onPay(stId);
                  }}
                  className="w-full md:flex-1 bg-emerald-600 text-white py-6 rounded-[2rem] font-black flex items-center justify-center gap-3 hover:bg-emerald-700 shadow-2xl shadow-emerald-200 transition-all active:scale-[0.98]"
                >
                  <CreditCard className="w-7 h-7" />
                  تسجيل دفعة جديدة
                </button>
                <button 
                  onClick={() => setDeletingStudent(selectedStudentForProfile)}
                  className="w-full md:w-auto bg-rose-50 text-rose-600 px-8 py-6 rounded-[2rem] font-black flex items-center justify-center gap-3 hover:bg-rose-100 transition-all active:scale-[0.98]"
                  title="حذف الطالب"
                >
                  <Trash2 className="w-7 h-7" />
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>


      <AnimatePresence>
        {isAdding && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 md:p-8">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={resetForm}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-md"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white w-full max-w-5xl rounded-[3.5rem] shadow-2xl relative z-10 overflow-hidden flex flex-col max-h-[95vh] border border-white/20"
            >
              <div className="p-10 border-b border-slate-50 flex items-center justify-between bg-white relative z-20">
                <div className="flex items-center gap-6 text-right">
                  <div className="theme-bg p-5 rounded-[2rem] text-white theme-shadow shadow-xl group hover:rotate-3 transition-transform">
                    <UserPlus className="w-10 h-10" />
                  </div>
                  <div>
                    <h3 className="text-4xl font-black text-slate-900 tracking-tight">{editingStudent ? 'تحديث السجلات' : 'تسجيل طالب جديد'}</h3>
                    <p className="text-sm font-bold text-slate-400 mt-1 uppercase tracking-widest leading-relaxed">قم بملء البيانات المطلوبة بعناية لضمان دقة التقارير والبيانات المالية</p>
                  </div>
                </div>
                <button 
                  onClick={resetForm}
                  className="bg-slate-50 p-5 hover:bg-slate-100 rounded-[2rem] transition-all text-slate-400 hover:text-slate-900 shrink-0"
                >
                  <X className="w-10 h-10" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-10 flex-1 overflow-y-auto custom-scrollbar bg-slate-50/20">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                  <div className="space-y-8">
                    <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm space-y-8 relative overflow-hidden group">
                      <div className="absolute top-0 right-0 w-2 h-full bg-blue-500 opacity-20"></div>
                      <h4 className="text-xs font-black text-blue-600 uppercase tracking-widest px-2 mb-2 flex items-center gap-2 justify-end">
                        الهوية الشخصية
                        <User className="w-4 h-4" />
                      </h4>
                      <div className="space-y-6 text-right">
                        <div className="space-y-2">
                          <label className="block text-xs font-black text-slate-400 px-2 uppercase tracking-wide">الاسم الكامل للطالب</label>
                          <input
                            required
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="w-full bg-slate-50 border border-slate-100 rounded-3xl px-8 py-5 outline-none focus:ring-8 focus:ring-blue-100 font-bold text-xl transition-all text-right shadow-sm"
                            placeholder="مثال: سيف علي جاسم العبيدي"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-6">
                          <div className="space-y-2">
                            <label className="block text-xs font-black text-slate-400 px-2 uppercase tracking-wide">تاريخ الميلاد</label>
                            <input
                              type="date"
                              value={formData.dob}
                              onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                              className="w-full bg-slate-50 border border-slate-100 rounded-3xl px-8 py-5 outline-none focus:ring-8 focus:ring-blue-100 font-bold transition-all text-right shadow-sm"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="block text-xs font-black text-slate-400 px-2 uppercase tracking-wide">المرحلة الدراسية</label>
                            <div className="relative">
                              <select
                                value={formData.grade}
                                onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
                                className="w-full bg-slate-50 border border-slate-100 rounded-3xl px-8 py-5 outline-none focus:ring-8 focus:ring-blue-100 font-bold appearance-none transition-all text-right shadow-sm"
                              >
                                {GRADES.map(g => <option key={g} value={g}>{g}</option>)}
                              </select>
                              <ChevronRight className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 pointer-events-none rotate-90" />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm space-y-8 relative overflow-hidden group">
                      <div className="absolute top-0 right-0 w-2 h-full bg-orange-500 opacity-20"></div>
                      <h4 className="text-xs font-black text-orange-600 uppercase tracking-widest px-2 mb-2 flex items-center gap-2 justify-end">
                        بيانات التواصل العائلي
                        <Phone className="w-4 h-4" />
                      </h4>
                      <div className="space-y-6 text-right">
                        <div className="space-y-2">
                          <label className="block text-xs font-black text-slate-400 px-2 uppercase tracking-wide">اسم ولي الأمر</label>
                          <input
                            required
                            type="text"
                            value={formData.parentName}
                            onChange={(e) => setFormData({ ...formData, parentName: e.target.value })}
                            className="w-full bg-slate-50 border border-slate-100 rounded-3xl px-8 py-5 outline-none focus:ring-8 focus:ring-orange-100 font-bold transition-all text-right shadow-sm"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="block text-xs font-black text-slate-400 px-2 uppercase tracking-wide">رقم الهاتف النشط (واتساب)</label>
                          <div className="relative">
                            <input
                              required
                              type="tel"
                              value={formData.phone}
                              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                              className="w-full bg-slate-50 border border-slate-100 rounded-3xl px-8 py-5 outline-none focus:ring-8 focus:ring-orange-100 font-black text-left tracking-widest transition-all shadow-sm"
                              dir="ltr"
                              placeholder="07XXXXXXXXX"
                            />
                            <Phone className="absolute right-6 top-1/2 -translate-y-1/2 w-6 h-6 text-slate-200" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-8">
                    <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm space-y-8 relative overflow-hidden group">
                       <div className="absolute top-0 right-0 w-2 h-full bg-emerald-500 opacity-20"></div>
                       <h4 className="text-xs font-black text-emerald-600 uppercase tracking-widest px-2 mb-2 flex items-center gap-2 justify-end">
                        الميزانية وأكواد التتبع
                        <CreditCard className="w-4 h-4" />
                      </h4>
                      <div className="space-y-6 text-right">
                        <div className="bg-emerald-50/50 p-8 rounded-[2.5rem] border border-emerald-100/50 shadow-inner">
                          <label className="block text-xs font-black text-emerald-700 mb-3 px-2 uppercase tracking-widest">القسط السنوي الإجمالي (د.ع)</label>
                          <div className="relative">
                            <input
                              required
                              type="number"
                              value={formData.totalAmount}
                              onChange={(e) => setFormData({ ...formData, totalAmount: e.target.value })}
                              className="w-full bg-white border border-emerald-200 rounded-[2rem] px-8 py-6 pr-16 outline-none focus:ring-8 focus:ring-emerald-100 font-black text-3xl text-emerald-900 transition-all shadow-sm text-right"
                            />
                            <DollarSign className="absolute right-6 top-1/2 -translate-y-1/2 text-emerald-600 w-8 h-8" />
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-1 gap-5">
                          <div className="space-y-2">
                            <label className="block text-[10px] font-black text-slate-400 px-2 uppercase tracking-widest"> كود الباركود العام</label>
                            <input
                              type="text"
                              maxLength={8}
                              value={formData.barcode}
                              onChange={(e) => setFormData({ ...formData, barcode: e.target.value.replace(/\D/g, '') })}
                              placeholder="سيتم توليده آلياً"
                              className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-3 outline-none focus:ring-4 focus:ring-blue-100 font-mono text-center font-black tracking-widest shadow-sm"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <label className="block text-[10px] font-black text-indigo-400 px-2 uppercase tracking-widest">كود الحضور</label>
                              <input
                                type="text"
                                maxLength={8}
                                value={formData.attendanceBarcode}
                                onChange={(e) => setFormData({ ...formData, attendanceBarcode: e.target.value.replace(/\D/g, '') })}
                                className="w-full bg-indigo-50/30 border border-indigo-100 rounded-2xl px-6 py-3 outline-none focus:ring-4 focus:ring-indigo-100 font-mono text-center font-black tracking-widest text-indigo-700 shadow-sm"
                              />
                            </div>
                            <div className="space-y-2">
                              <label className="block text-[10px] font-black text-blue-400 px-2 uppercase tracking-widest">كود الحسابات</label>
                              <input
                                type="text"
                                maxLength={8}
                                value={formData.installmentBarcode}
                                onChange={(e) => setFormData({ ...formData, installmentBarcode: e.target.value.replace(/\D/g, '') })}
                                className="w-full bg-blue-50/30 border border-blue-100 rounded-2xl px-6 py-3 outline-none focus:ring-4 focus:ring-blue-100 font-mono text-center font-black tracking-widest text-blue-700 shadow-sm"
                              />
                            </div>
                          </div>
                          <div className="pt-4">
                            <label className="block text-xs font-black text-blue-600 mb-3 px-2 flex items-center gap-2 uppercase tracking-widest group cursor-help justify-end">
                              <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
                              معرف البصمة الرقمية
                            </label>
                            <div className="flex bg-slate-900 rounded-[2rem] overflow-hidden shadow-xl group focus-within:ring-8 focus-within:ring-slate-100 transition-all border border-slate-800">
                              <div className="p-6 bg-blue-600 flex items-center justify-center text-white shrink-0">
                                <ScanLine className="w-8 h-8" />
                              </div>
                              <input
                                type="text"
                                value={formData.fingerprintId}
                                onChange={(e) => setFormData({ ...formData, fingerprintId: e.target.value })}
                                placeholder="المس جهاز البصمة الآن..."
                                className="flex-1 bg-transparent px-8 py-5 outline-none font-mono text-center font-black tracking-widest text-2xl text-white placeholder:text-slate-600 placeholder:text-sm placeholder:font-bold"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm relative overflow-hidden group">
                       <div className="absolute top-0 right-0 w-2 h-full bg-purple-500 opacity-20"></div>
                       <h4 className="text-xs font-black text-purple-600 uppercase tracking-widest px-2 mb-6 flex items-center gap-2 justify-end">
                        صورة الملف الشخصي
                        <Upload className="w-4 h-4" />
                      </h4>
                      <div className="flex items-center gap-8 bg-slate-50 p-6 rounded-[2.5rem] border border-slate-100 border-dashed">
                        <div className="relative shrink-0">
                          <div className="w-28 h-28 bg-white rounded-[2rem] flex items-center justify-center overflow-hidden border-2 border-slate-200 shadow-xl group-hover:scale-105 transition-transform duration-500">
                            {formData.photo ? (
                              <img src={formData.photo} alt="Student" className="w-full h-full object-cover" />
                            ) : (
                              <div className="flex flex-col items-center gap-1">
                                <User className="text-slate-200 w-12 h-12" />
                                <span className="text-[8px] font-black text-slate-300">لا توجد صورة</span>
                              </div>
                            )}
                          </div>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handlePhotoUpload}
                            className="hidden"
                            id="form-photo-upload-main"
                          />
                          <label
                            htmlFor="form-photo-upload-main"
                            className="absolute -bottom-2 -right-2 bg-indigo-600 text-white p-3 rounded-2xl shadow-2xl cursor-pointer hover:bg-indigo-700 transition-all border-4 border-white active:scale-90"
                          >
                            <Plus className="w-5 h-5" />
                          </label>
                        </div>
                        <div className="flex-1 space-y-2 text-right">
                          <p className="text-xs font-bold text-slate-500 leading-relaxed">يرجى رفع صورة واضحة بخلفية فاتحة لاستخدامها في هوية الطالب الذكية.</p>
                          {formData.photo && (
                            <button
                              type="button"
                              onClick={() => setFormData(prev => ({ ...prev, photo: '' }))}
                              className="text-rose-500 text-[10px] font-black hover:bg-rose-50 px-3 py-1.5 rounded-lg transition-colors border border-rose-100"
                            >
                              إزالة واستبدال الصورة
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-12 flex flex-col md:flex-row gap-5 sticky bottom-0 bg-white/60 backdrop-blur-xl p-8 rounded-[3rem] border border-white/50 shadow-2xl z-50">
                  <button
                    type="submit"
                    className="flex-[3] bg-indigo-600 text-white py-6 rounded-[2rem] font-black text-2xl shadow-2xl shadow-indigo-200 hover:bg-indigo-700 transition-all active:scale-[0.98] flex items-center justify-center gap-4 group"
                  >
                    <span>{editingStudent ? 'تحديث البيانات المسجلة' : 'تثبيت التسجيل النهائي'}</span>
                    <CheckCircle className="w-8 h-8 group-hover:rotate-12 transition-transform" />
                  </button>
                  {editingStudent && (
                    <button
                      type="button"
                      onClick={() => setDeletingStudent(editingStudent)}
                      className="flex-1 bg-rose-50 text-rose-600 py-6 rounded-[2rem] font-black text-xl hover:bg-rose-100 transition-all active:scale-[0.98] border border-rose-100 flex items-center justify-center gap-2"
                    >
                      <Trash2 className="w-6 h-6" />
                      حذف
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={resetForm}
                    className="flex-1 bg-slate-900 text-white px-10 py-6 rounded-[2rem] font-black text-xl hover:bg-black transition-all active:scale-[0.98] shadow-xl"
                  >
                    تراجع
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Registry Print Modal */}
      <AnimatePresence>
        {isPrintingRegistry && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsPrintingRegistry(false)}
              className="absolute inset-0 bg-gray-900/60 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white w-full max-w-6xl h-[90vh] rounded-[3rem] shadow-2xl flex flex-col overflow-hidden relative z-10"
            >
              <div className="p-8 border-b border-gray-100 flex items-center justify-between bg-white sticky top-0 z-20">
                <div className="flex items-center gap-4">
                  <div className="p-4 bg-purple-600 rounded-[2rem] text-white shadow-xl shadow-purple-200">
                    <Printer className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="text-3xl font-black text-gray-900">سجل طباعة الطلاب</h3>
                    <p className="text-xs font-bold text-gray-400 mt-1">تخصيص القائمة، الفرز بالحروف، وتحديد التسلسل</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="bg-gray-50 px-6 py-3 rounded-2xl border border-gray-100 flex items-center gap-4">
                    <span className="text-sm font-black text-gray-500">بداية التسلسل:</span>
                    <input 
                      type="number" 
                      min="1"
                      value={registryConfig.startSerial}
                      onChange={(e) => setRegistryConfig(prev => ({ ...prev, startSerial: parseInt(e.target.value) || 1 }))}
                      className="w-20 bg-white border border-gray-200 rounded-xl px-3 py-2 text-center font-black text-blue-600 focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                  <button 
                    onClick={() => handlePrint()}
                    className="bg-purple-600 text-white px-8 py-4 rounded-2xl font-black flex items-center gap-2 hover:bg-purple-700 shadow-xl shadow-purple-200 transition-all active:scale-95"
                  >
                    <Printer className="w-5 h-5" />
                    استخراج للطباعة ({registryConfig.selectedIds.size})
                  </button>
                  <button 
                    onClick={() => setIsPrintingRegistry(false)} 
                    className="p-4 bg-gray-50 hover:bg-gray-100 rounded-3xl transition-all text-gray-400"
                  >
                    <X className="w-8 h-8" />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">
                {/* Filters Sidebar */}
                <div className="lg:w-80 bg-gray-50/50 p-8 border-l border-gray-100 overflow-y-auto custom-scrollbar space-y-8">
                  <div className="space-y-4">
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

                  <div className="space-y-4">
                    <h4 className="text-sm font-black text-blue-600 uppercase tracking-widest px-2">إعدادات السجل</h4>
                    <div className="space-y-4">
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

                  <div className="space-y-4">
                    <h4 className="text-sm font-black text-blue-600 uppercase tracking-widest px-2">تصفية حسب الصف</h4>
                    <div className="grid grid-cols-1 gap-2">
                      <button 
                        onClick={() => setRegistryConfig(prev => ({ ...prev, grade: 'الكل' }))}
                        className={`text-right px-6 py-4 rounded-2xl font-black text-sm transition-all border ${registryConfig.grade === 'الكل' ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-100' : 'bg-white text-gray-600 border-gray-100 hover:bg-gray-100'}`}
                      >
                        جميع الصفوف
                      </button>
                      {GRADES.map(grade => (
                        <button 
                          key={grade}
                          onClick={() => setRegistryConfig(prev => ({ ...prev, grade }))}
                          className={`text-right px-6 py-4 rounded-2xl font-black text-sm transition-all border ${registryConfig.grade === grade ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-100' : 'bg-white text-gray-600 border-gray-100 hover:bg-gray-100'}`}
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
                    <div className="flex gap-4 items-center">
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

                  <div className="flex-1 overflow-y-auto custom-scrollbar p-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
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
                              className={`p-5 rounded-3xl border-2 transition-all cursor-pointer flex items-center gap-4 group ${isSelected ? 'theme-bg-soft theme-border theme-shadow translate-y-[-2px]' : 'bg-white border-gray-100 hover:theme-border-soft'}`}
                            >
                              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center border-2 transition-all ${isSelected ? 'theme-bg theme-border text-white' : 'bg-white border-gray-200 text-gray-300'}`}>
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
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isDistributing && (
          <div className="fixed inset-0 z-[140] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDistributing(false)}
              className="absolute inset-0 bg-gray-900/40 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white w-full max-w-6xl rounded-[3rem] shadow-2xl relative z-10 overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-8 border-b border-gray-100 flex items-center justify-between bg-white relative z-20">
                <div className="flex items-center gap-4">
                  <div className="theme-bg p-4 rounded-3xl text-white theme-shadow">
                    <LayoutGrid className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="text-3xl font-black text-gray-900">توزيع الشعب التلقائي</h3>
                    <p className="text-xs font-bold text-gray-400 mt-1">توزيع الطلاب حسب الأسماء أبجدياً (45 طالب لكل شعبة)</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <button 
                    onClick={exportDistributionToExcel}
                    className="bg-emerald-600 text-white px-8 py-4 rounded-2xl font-black text-base hover:bg-emerald-700 transition-all flex items-center gap-3 shadow-xl shadow-emerald-100"
                  >
                    <LayoutGrid className="w-6 h-6" />
                    تصدير Excel
                  </button>
                  <button 
                    onClick={handleDistributionPrint}
                    className="bg-gray-900 text-white px-8 py-4 rounded-2xl font-black text-base hover:bg-black transition-all flex items-center gap-3 shadow-xl"
                  >
                    <Printer className="w-6 h-6" />
                    استخراج للطباعة
                  </button>
                  <button 
                    onClick={() => setIsDistributing(false)} 
                    className="p-4 bg-gray-50 hover:bg-gray-100 rounded-3xl transition-all text-gray-400"
                  >
                    <X className="w-8 h-8" />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">
                {/* Settings Sidebar */}
                <div className="lg:w-80 bg-gray-50/50 p-8 border-l border-gray-100 overflow-y-auto custom-scrollbar space-y-8">
                  <div className="space-y-6">
                    <h4 className="text-sm font-black text-indigo-600 uppercase tracking-widest px-2">إعدادات التحكم</h4>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="text-[10px] font-black text-gray-400 block mb-1">طلاب كل شعبة</label>
                        <input 
                          type="number"
                          min="5"
                          max="100"
                          value={distributionSettings.studentsPerSection}
                          onChange={(e) => setDistributionSettings(prev => ({ ...prev, studentsPerSection: parseInt(e.target.value) || 1 }))}
                          className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm font-black outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>

                      <div className="flex items-center justify-between p-4 bg-white rounded-2xl border border-gray-100 cursor-pointer hover:bg-gray-50 transition-all"
                           onClick={() => setDistributionSettings(prev => ({ ...prev, showFillerRows: !prev.showFillerRows }))}>
                        <span className="text-xs font-black text-gray-700">إظهار حقول فارغة</span>
                        <div className={`w-12 h-6 rounded-full p-1 transition-all ${distributionSettings.showFillerRows ? 'bg-indigo-600' : 'bg-gray-200'}`}>
                          <div className={`w-4 h-4 bg-white rounded-full transition-all ${distributionSettings.showFillerRows ? 'mr-6' : 'mr-0'}`} />
                        </div>
                      </div>

                      <div className="flex items-center justify-between p-4 bg-white rounded-2xl border border-gray-100 cursor-pointer hover:bg-gray-50 transition-all"
                           onClick={() => setDistributionSettings(prev => ({ ...prev, showSignatures: !prev.showSignatures }))}>
                        <span className="text-xs font-black text-gray-700">إظهار التواقيع</span>
                        <div className={`w-12 h-6 rounded-full p-1 transition-all ${distributionSettings.showSignatures ? 'bg-indigo-600' : 'bg-gray-200'}`}>
                          <div className={`w-4 h-4 bg-white rounded-full transition-all ${distributionSettings.showSignatures ? 'mr-6' : 'mr-0'}`} />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-sm font-black text-gray-400 uppercase tracking-widest px-2">تصفية العرض</h4>
                    <div className="grid grid-cols-1 gap-2">
                       <button 
                        onClick={() => setSelectedGrade('الكل')}
                        className={`text-right px-6 py-4 rounded-2xl font-black text-sm transition-all border ${selectedGrade === 'الكل' ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-100' : 'bg-white text-gray-600 border-gray-100 hover:bg-gray-100'}`}
                      >
                        جميع الصفوف
                      </button>
                      {GRADES.map(grade => (
                        <button 
                          key={grade}
                          onClick={() => setSelectedGrade(grade)}
                          className={`text-right px-6 py-4 rounded-2xl font-black text-sm transition-all border ${selectedGrade === grade ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-100' : 'bg-white text-gray-600 border-gray-100 hover:bg-gray-100'}`}
                        >
                          {grade}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar p-8 bg-gray-50/30">
                  <div className="space-y-12">
                  {distributionData.map((gradeData, gIdx) => (
                    <div key={gIdx} className="space-y-6">
                      <div className="flex items-center gap-4 px-2">
                        <div className="h-10 w-2 bg-indigo-600 rounded-full"></div>
                        <h4 className="text-2xl font-black text-gray-900">{gradeData.grade}</h4>
                        <span className="bg-gray-200 text-gray-600 px-4 py-1 rounded-full text-sm font-black">
                          {gradeData.total} طالب
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                        {gradeData.sections.map((section, sIdx) => (
                          <div key={sIdx} className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden flex flex-col">
                            <div className="bg-indigo-600 p-6 flex justify-between items-center text-white">
                              <div>
                                <h5 className="text-xl font-black">شعبة ({section.name})</h5>
                                <p className="text-[10px] font-bold opacity-70 uppercase tracking-widest">{gradeData.grade}</p>
                              </div>
                              <div className="bg-white/20 px-4 py-1 rounded-full text-xs font-black border border-white/10">
                                {section.students.length} طالب
                              </div>
                            </div>
                            <div className="p-6 flex-1 max-h-80 overflow-y-auto custom-scrollbar">
                              <div className="space-y-3">
                                {section.students.map((st, stIdx) => (
                                  <div key={st.id} className="flex items-center gap-3 group">
                                    <span className="text-[10px] font-black text-gray-300 w-4">{stIdx + 1}</span>
                                    <p className="text-sm font-bold text-gray-700 truncate group-hover:text-indigo-600 transition-colors">
                                      {st.name}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            </div>
                            <div className="p-4 bg-gray-50 border-t border-gray-50 text-center">
                              <p className="text-[10px] font-black text-gray-400">آخر اسم: {section.students[section.students.length - 1]?.name?.split(' ')[0] || '-'}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                  
                  {distributionData.length === 0 && (
                    <div className="text-center py-20 bg-white rounded-[3rem] border-2 border-dashed border-gray-200">
                       <Users className="w-16 h-16 text-gray-200 mx-auto mb-4" />
                       <p className="text-xl font-black text-gray-400">لا يوجد طلاب مسجلين في هذا الصف لتوزيعهم</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>

      {/* Hidden Printable Content */}
      <div className="hidden">
        <div ref={printRef} className="p-12 text-right bg-white" dir="rtl">
          {/* Official Header */}
          <div className="flex justify-between items-start mb-8 pb-8 border-b-2 border-gray-900">
            <div className="flex-1">
              <h1 className="text-3xl font-black text-gray-900 mb-1">{school.name}</h1>
              <p className="text-sm font-bold text-gray-600 mb-4">وزارة التربية والتعليم</p>
              <div className="space-y-1">
                <p className="text-lg font-black text-gray-800">{registryConfig.registryTitle}</p>
                <p className="text-xs font-bold text-gray-500">للعام الدراسي {new Date().getFullYear()} - {new Date().getFullYear() + 1}</p>
              </div>
            </div>
            
            <div className="flex flex-col items-center gap-2 px-8">
               <div className="w-24 h-24 border-2 border-gray-900 rounded-2xl flex items-center justify-center text-[10px] font-black text-gray-300">
                 شعار المدرسة
               </div>
            </div>

            <div className="flex-1 text-left">
              <div className="bg-gray-50 border border-gray-200 px-6 py-4 rounded-3xl inline-block">
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
          <div className="mt-12 grid grid-cols-2 gap-8 px-4">
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
         <div ref={distributionPrintRef} className="p-12 bg-white text-right" dir="rtl">
            <div className="text-center mb-10 pb-6 border-b-2 border-gray-900">
               <h1 className="text-3xl font-black mb-1">{school.name}</h1>
               <p className="text-xl font-bold mb-4">قوائم توزيع الطلاب على الشعب (توزيع تلقائي)</p>
               <div className="flex justify-center gap-10 text-sm font-black text-gray-500">
                  <p>العام الدراسي: {new Date().getFullYear()} - {new Date().getFullYear() + 1}</p>
                  <p>تاريخ الاستخراج: {format(new Date(), 'yyyy/MM/dd')}</p>
               </div>
            </div>

            {distributionData.map((gradeData, gIdx) => (
               <div key={gIdx} className="mb-16 page-break-after-always">
                  <h2 className="text-2xl font-black bg-gray-100 p-4 rounded-xl border border-gray-900 mb-6 flex justify-between items-center">
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
      <AnimatePresence>
        {quickPayStudent && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 md:p-8">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setQuickPayStudent(null)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-md"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white w-full max-w-md rounded-[3rem] shadow-2xl overflow-hidden relative z-10 border border-slate-100"
            >
              <div className="p-8 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-4">
                  <div className="p-4 bg-blue-600 rounded-3xl text-white shadow-xl shadow-blue-100">
                    <CreditCard className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-slate-900">دفع سريع</h3>
                    <p className="text-sm text-slate-400 font-bold uppercase tracking-widest">إضافة دفعة مباشرة</p>
                  </div>
                </div>
                <button 
                  onClick={() => setQuickPayStudent(null)} 
                  className="p-3 hover:bg-slate-200 rounded-2xl transition-all text-slate-400"
                >
                  <X className="w-8 h-8" />
                </button>
              </div>
              
              <div className="p-8 space-y-8">
                <div className="flex items-center gap-5 p-6 bg-blue-50 rounded-[2rem] border border-blue-100 shadow-sm">
                  <div className="w-20 h-20 rounded-[1.5rem] bg-white border-2 border-blue-100 overflow-hidden shrink-0 flex items-center justify-center shadow-inner">
                    {quickPayStudent.photo ? (
                      <img src={quickPayStudent.photo} alt={quickPayStudent.name} className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-10 h-10 text-blue-300" />
                    )}
                  </div>
                  <div className="overflow-hidden">
                    <p className="text-xl font-black text-blue-900 truncate tracking-tight">{quickPayStudent.name}</p>
                    <p className="text-sm font-bold text-blue-600 opacity-80">{quickPayStudent.grade}</p>
                  </div>
                </div>

                <form onSubmit={handleQuickPay} className="space-y-8">
                  <div className="space-y-4">
                    <label className="block text-xs font-black text-slate-400 pr-2 uppercase tracking-widest text-center">المبلغ المدفوع (د.ع)</label>
                    <div className="relative">
                      <input
                        autoFocus
                        required
                        type="number"
                        value={quickAmount}
                        onChange={(e) => setQuickAmount(e.target.value)}
                        className="w-full bg-slate-50 border-2 border-slate-100 rounded-[2.5rem] px-8 py-8 outline-none focus:ring-8 focus:ring-blue-100 focus:border-blue-500 font-black text-4xl text-center text-blue-900 transition-all placeholder:text-slate-200"
                        placeholder="0.00"
                      />
                      <DollarSign className="absolute left-8 top-1/2 -translate-y-1/2 text-slate-200 w-10 h-10" />
                    </div>
                    <div className="flex justify-center">
                      <span className="bg-amber-50 text-amber-600 px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter border border-amber-100">
                        سيتم إرسال إشعار تلقائي للوالدين
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex gap-4">
                    <button
                      type="submit"
                      disabled={!quickAmount}
                      className="flex-1 bg-blue-600 text-white py-6 rounded-[2rem] font-black text-xl hover:bg-blue-700 shadow-2xl shadow-blue-200 transition-all active:scale-[0.98] disabled:opacity-50"
                    >
                      حفظ العملية
                    </button>
                    <button
                      type="button"
                      onClick={() => setQuickPayStudent(null)}
                      className="px-8 bg-slate-100 text-slate-500 py-6 rounded-[2rem] font-black text-lg hover:bg-slate-200 transition-all active:scale-[0.98]"
                    >
                      إلغاء
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
