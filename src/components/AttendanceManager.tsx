import { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { School, Student, Staff, AttendanceRecord, AttendanceStatus, ParentNotification } from '../types';
import { localDb } from '../services/localDb';
import { WhatsAppService } from '../services/WhatsAppService';
import { useReactToPrint } from 'react-to-print';
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  AlertCircle, 
  Search, 
  FileText,
  Calendar as CalendarIcon,
  Users,
  UserCheck,
  Fingerprint,
  MessageSquare,
  Bell,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Filter,
  Share2,
  Printer,
  Keyboard,
  Zap,
  Download,
  Upload,
  FileSpreadsheet
} from 'lucide-react';
import { format, startOfDay, endOfDay, isSameDay } from 'date-fns';
import * as XLSX from 'xlsx';
import { ar } from 'date-fns/locale';

interface AttendanceManagerProps {
  school: School;
  students: Student[];
  staff: Staff[];
  attendanceRecords: AttendanceRecord[];
  canModify?: boolean;
}

const GRADES = [
  "الأول الابتدائي", "الثاني الابتدائي", "الثالث الابتدائي", "الرابع الابتدائي", "الخامس الابتدائي", "السادس الابتدائي",
  "الأول المتوسط", "الثاني المتوسط", "الثالث المتوسط",
  "الرابع الإعدادي", "الخامس الإعدادي", "السادس الإعدادي"
];

const ABJAD_ALPHABET = ['أ', 'ب', 'ج', 'د', 'هـ', 'و', 'ز', 'ح', 'ط', 'ي', 'ك', 'ل', 'م', 'ن', 'س', 'ع', 'ف', 'ص', 'ق', 'ر', 'ش', 'ت', 'ث', 'خ', 'ذ', 'ض', 'ظ', 'غ'];

const STATUS_CONFIG: Record<AttendanceStatus, { label: string; bg: string; text: string; border: string; dot: string; icon: any }> = {
  present: { label: 'حاضر', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-100', dot: 'bg-emerald-500', icon: CheckCircle2 },
  absent: { label: 'غائب', bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-100', dot: 'bg-red-500', icon: XCircle },
  late: { label: 'متأخر', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-100', dot: 'bg-amber-500', icon: Clock },
  excused: { label: 'مجاز', bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-100', dot: 'bg-gray-500', icon: CheckCircle2 },
  dismissed: { label: 'طرد', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-100', dot: 'bg-blue-500', icon: XCircle },
  violation: { label: 'مخالفة', bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-100', dot: 'bg-indigo-500', icon: AlertCircle },
};

export default function AttendanceManager({ school, students, staff, attendanceRecords, canModify = true }: AttendanceManagerProps) {
  const [activeTab, setActiveTab] = useState<'students' | 'staff' | 'fingerprint' | 'reports' | 'data'>('students');
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [selectedGrade, setSelectedGrade] = useState(GRADES[0]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [isFingerprintActive, setIsFingerprintActive] = useState(false);
  const [fingerprintStatus, setFingerprintStatus] = useState<'idle' | 'scanning' | 'success' | 'error'>('idle');
  const [notifications, setNotifications] = useState<ParentNotification[]>([]);
  const [showNotificationModal, setShowNotificationModal] = useState<{ student: Student, type: 'absence' | 'summons' | 'warning' | 'expulsion' | 'violation' } | null>(null);
  const [notificationContent, setNotificationContent] = useState('');
  const [lastScanned, setLastScanned] = useState<{ name: string; type: 'student' | 'staff'; time: string; status: AttendanceStatus; id?: string } | null>(null);
  const [scanCountdown, setScanCountdown] = useState(0);
  const [reportType, setReportType] = useState<'daily' | 'monthly' | 'notifications' | 'details' | 'summary'>('daily');
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [editingReason, setEditingReason] = useState<{ id: string; name: string; reason: string } | null>(null);
  const [isRegisteringFingerprint, setIsRegisteringFingerprint] = useState<{ id: string, name: string, type: 'student' | 'staff' } | null>(null);
  const [tempFingerprintId, setTempFingerprintId] = useState('');

  const dailyReportRef = useRef<HTMLDivElement>(null);
  const handlePrintDailyReport = useReactToPrint({
    contentRef: dailyReportRef,
    documentTitle: `تقرير_الغياب_${selectedDate}`
  });

  const autoFillAbsences = () => {
    if (!confirm('هل أنت متأكد من تسجيل جميع الحالات غير المؤشرة كغائبين لهذا اليوم؟')) return;
    
    const newRecords: any[] = [];
    const newNotifications: any[] = [];
    const settings = WhatsAppService.getSettings(school.id);
    const useGateway = settings?.isEnabled && settings?.useGateway;
    
    // Students
    students.forEach(student => {
      const existing = attendanceRecords.find(r => r.entityId === student.id && r.date === selectedDate && r.type === 'student');
      if (!existing) {
        newRecords.push({
          entityId: student.id,
          type: 'student',
          status: 'absent',
          date: selectedDate,
          createdAt: new Date().toISOString()
        });

        if (settings?.isEnabled && student.phone) {
          const absenceCount = attendanceRecords.filter(r => 
            r.entityId === student.id && 
            r.type === 'student' && 
            r.status === 'absent' &&
            r.date !== selectedDate
          ).length + 1;

          let type: 'absence' | 'warning' | 'summons' | 'expulsion' = 'absence';
          let template = settings.attendanceAbsentTemplate;

          if (absenceCount >= 12) {
            type = 'expulsion';
            template = settings.absenceExpulsion12Template || settings.attendanceAbsentTemplate;
          } else if (absenceCount >= 10) {
            type = 'summons';
            template = settings.absenceSummons10Template || settings.attendanceAbsentTemplate;
          } else if (absenceCount >= 6) {
            type = 'warning';
            template = settings.absenceWarning6Template || settings.attendanceAbsentTemplate;
          }

          if (template) {
            const message = WhatsAppService.formatMessage(template, student, { absences: absenceCount });
            newNotifications.push({
              studentId: student.id,
              type,
              content: message,
              date: new Date().toISOString(),
              status: useGateway ? 'pending' : 'manual',
              id: Math.random().toString(36).substring(2, 15)
            });
          }
        }
      }
    });

    // Staff
    staff.forEach(member => {
      const dayOfWeek = new Date(selectedDate).getDay();
      const isWorkingDay = (member.workingDays || [0,1,2,3,4,5,6]).includes(dayOfWeek);
      if (!isWorkingDay) return;

      const existing = attendanceRecords.find(r => r.entityId === member.id && r.date === selectedDate && r.type === 'staff');
      if (!existing) {
        newRecords.push({
          entityId: member.id,
          type: 'staff',
          status: 'absent',
          date: selectedDate,
          createdAt: new Date().toISOString()
        });
      }
    });

    if (newRecords.length > 0) {
      localDb.addMany('attendanceRecords', newRecords);
      if (newNotifications.length > 0) {
        localDb.addMany('parentNotifications', newNotifications);
      }
    }

    // Mark today as checked
    localDb.update('schools', school.id, { lastAbsenceCheckDate: selectedDate });
    
    alert(`تمت العملية بنجاح. تم تسجيل ${newRecords.length} حالة غياب.`);
  };

  const sendSummaryToGroup = async () => {
    const absentStudents = students.filter(s => {
      const record = dailyRecords.find(r => r.entityId === s.id && r.type === 'student');
      return record && record.status === 'absent';
    });

    const violationStudents = students.filter(s => {
      const record = dailyRecords.find(r => r.entityId === s.id && r.type === 'student');
      return record && (record.status === 'violation' || record.status === 'dismissed');
    });

    if (absentStudents.length === 0 && violationStudents.length === 0) {
      alert('لا يوجد غياب أو مخالفات لهذا اليوم.');
      return;
    }

    const absentNames = absentStudents.map(s => `• ${s.name} (${s.grade})`);
    const violationNames = violationStudents.map(s => {
      const record = dailyRecords.find(r => r.entityId === s.id && r.type === 'student');
      return `• ${s.name} (${s.grade}) - ${record?.reason || 'مخالفة'}`;
    });

    const result = await WhatsAppService.sendSummary(
      school.id,
      absentNames,
      violationNames
    );

    if (result && result.success) {
      if (result.url) {
        window.open(result.url, '_blank');
      }
    } else {
      alert('فشل في إرسال التقرير، يرجى التحقق من الإعدادات.');
    }
  };

  const dailyRecords = useMemo(() => {
    return attendanceRecords.filter(r => r.date === selectedDate);
  }, [attendanceRecords, selectedDate]);

  const absenceReportData = useMemo(() => {
    // 1. Group students by grade
    const gradesMap = new Map<string, Student[]>();
    students.forEach(s => {
      const list = gradesMap.get(s.grade) || [];
      list.push(s);
      gradesMap.set(s.grade, list);
    });

    const report: { 
      grade: string; 
      sections: { name: string; absentees: (Student & { record?: AttendanceRecord })[] }[] 
    }[] = [];

    // 2. For each grade, sort alphabetically and distribute to sections
    GRADES.forEach(grade => {
      const gradeStudents = (gradesMap.get(grade) || []).sort((a, b) => a.name.localeCompare(b.name, 'ar'));
      if (gradeStudents.length === 0) return;

      const sections = [];
      const studentsPerSection = 45;
      const sectionCount = Math.ceil(gradeStudents.length / studentsPerSection);

      for (let i = 0; i < sectionCount; i++) {
        const start = i * studentsPerSection;
        const end = start + studentsPerSection;
        const sectionStudents = gradeStudents.slice(start, end);
        
        const absentees = sectionStudents
          .map(s => {
            const record = dailyRecords.find(r => r.entityId === s.id && r.type === 'student');
            return { ...s, record };
          })
          .filter(s => s.record && s.record.status === 'absent');

        if (absentees.length > 0) {
          sections.push({
            name: ABJAD_ALPHABET[i % ABJAD_ALPHABET.length],
            absentees
          });
        }
      }

      if (sections.length > 0) {
        report.push({ grade, sections });
      }
    });

    return report;
  }, [students, dailyRecords]);

  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      const matchesGrade = s.grade === selectedGrade;
      const matchesSearch = s.name.includes(searchTerm);
      return matchesGrade && matchesSearch;
    }).sort((a, b) => a.name.localeCompare(b.name, 'ar'));
  }, [students, selectedGrade, searchTerm]);

  const filteredStaff = useMemo(() => {
    return staff.filter(s => s.name.includes(searchTerm))
      .sort((a, b) => a.name.localeCompare(b.name, 'ar'));
  }, [staff, searchTerm]);

  // Handle countdown for scan feedback
  useEffect(() => {
    if (scanCountdown > 0) {
      const timer = setInterval(() => {
        setScanCountdown(prev => prev - 1);
      }, 1000);
      return () => clearInterval(timer);
    } else if (scanCountdown === 0 && lastScanned) {
      setLastScanned(null);
    }
  }, [scanCountdown, lastScanned]);

  const updateAttendance = (entityId: string, type: 'student' | 'staff', status: AttendanceStatus, scanTime?: string, reason?: string) => {
    const existing = dailyRecords.find(r => r.entityId === entityId && r.type === type);
    const person = type === 'student' ? students.find(s => s.id === entityId) : staff.find(s => s.id === entityId);
    
    if (existing) {
      localDb.update('attendanceRecords', existing.id, { 
        status, 
        scanTime: scanTime || existing.scanTime,
        reason: reason !== undefined ? reason : existing.reason
      });
    } else {
      localDb.add('attendanceRecords', {
        entityId,
        type,
        status,
        date: selectedDate,
        scanTime,
        reason,
        createdAt: new Date().toISOString()
      });
    }

    if (person) {
      setLastScanned({
        name: person.name,
        type,
        id: entityId,
        time: format(new Date(), 'HH:mm:ss'),
        status
      });
      setScanCountdown(5);

      // Trigger WhatsApp Notification for Students
      if (type === 'student' && (status === 'absent' || status === 'violation' || status === 'dismissed')) {
        let notificationType: 'absence' | 'warning' | 'summons' | 'expulsion' | 'violation' = status === 'absent' ? 'absence' : 'violation';
        let absencesCount = 0;

        if (status === 'absent') {
          absencesCount = attendanceRecords.filter(r => 
            r.entityId === entityId && 
            r.type === 'student' && 
            r.status === 'absent' &&
            r.date !== selectedDate
          ).length + 1;

          if (absencesCount >= 12) notificationType = 'expulsion';
          else if (absencesCount >= 10) notificationType = 'summons';
          else if (absencesCount >= 6) notificationType = 'warning';
        }

        WhatsAppService.sendNotification(
          school.id, 
          entityId, 
          notificationType,
          { 
            reason: reason || 'غير محدد',
            time: scanTime ? format(new Date(scanTime), 'HH:mm') : format(new Date(), 'HH:mm'),
            absences: absencesCount
          }
        ).then(res => {
          if (res && res.mode === 'manual' && res.url) {
            window.open(res.url, '_blank');
          }
        });
      }
    }
  };

  const handleFingerprintScan = (fid: string) => {
    if (!fid) return;
    
    setFingerprintStatus('scanning');
    
    // Simulate sensor delay
    setTimeout(() => {
      const now = new Date().toISOString();
      const student = students.find(s => s.fingerprintId === fid);
      const staffMember = staff.find(s => s.fingerprintId === fid);

      if (student) {
        setFingerprintStatus('success');
        updateAttendance(student.id, 'student', 'present', now);
      } else if (staffMember) {
        setFingerprintStatus('success');
        updateAttendance(staffMember.id, 'staff', 'present', now);
      } else {
        setFingerprintStatus('error');
        setLastScanned({ name: 'بصمة غير مسجلة', type: 'student', time: '', status: 'absent' });
        setScanCountdown(3);
      }
      
      // Return to idle after feedback
      setTimeout(() => setFingerprintStatus('idle'), 2000);
    }, 800);
  };

  const registerFingerprint = () => {
    if (!isRegisteringFingerprint || !tempFingerprintId) return;
    
    const collection = isRegisteringFingerprint.type === 'student' ? 'students' : 'staff';
    localDb.update(collection, isRegisteringFingerprint.id, { fingerprintId: tempFingerprintId });
    
    alert('تم تسجيل البصمة بنجاح');
    setIsRegisteringFingerprint(null);
    setTempFingerprintId('');
  };

  const handleExport = (type: 'student' | 'staff') => {
    const data = type === 'student' 
      ? students.map(s => {
          const record = dailyRecords.find(r => r.entityId === s.id && r.type === 'student');
          return {
            'معرف الطالب': s.id,
            'باركود الطالب': s.barcode,
            'اسم الطالب': s.name,
            'المرحلة': s.grade,
            'الحالة': record ? STATUS_CONFIG[record.status].label : 'غير مؤشر',
            'وقت المسح': record?.scanTime ? format(new Date(record.scanTime), 'HH:mm:ss') : '',
            'التاريخ': selectedDate,
            'ملاحظات': record?.reason || ''
          };
        })
      : staff.map(s => {
          const record = dailyRecords.find(r => r.entityId === s.id && r.type === 'staff');
          return {
            'معرف الموظف': s.id,
            'اسم الموظف': s.name,
            'الدور': s.role,
            'الحالة': record ? STATUS_CONFIG[record.status].label : 'غير مؤشر',
            'وقت المسح': record?.scanTime ? format(new Date(record.scanTime), 'HH:mm:ss') : '',
            'التاريخ': selectedDate,
            'ملاحظات': record?.reason || ''
          };
        });

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Attendance");
    XLSX.writeFile(wb, `attendance_${type}_${selectedDate}.xlsx`);
  };

  const handleExportTemplate = () => {
    const data = students.map(s => ({
      'معرف الطالب': s.id,
      'باركود الطالب': s.barcode,
      'اسم الطالب': s.name,
      'المرحلة': s.grade,
      'الحالة': 'حاضر',
      'التاريخ': selectedDate,
      'ملاحظات': ''
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "AttendanceTemplate");
    XLSX.writeFile(wb, `attendance_template_${selectedDate}.xlsx`);
  };

  const handleImport = async (type: 'student' | 'staff', event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]) as any[];

        const newRecords: any[] = [];
        const statusMap: Record<string, AttendanceStatus> = {
          'حاضر': 'present',
          'غائب': 'absent',
          'متأخر': 'late',
          'مجاز': 'excused',
          'طرد': 'dismissed',
          'مخالفة': 'violation'
        };

        rows.forEach(row => {
          const id = row['معرف الطالب'] || row['معرف الموظف'];
          const statusLabel = row['الحالة'];
          const status = statusMap[statusLabel];
          const rowDate = row['التاريخ'] || selectedDate;

          if (id && status) {
            // Check if person exists
            const personExists = type === 'student' 
              ? students.some(s => s.id === id)
              : staff.some(s => s.id === id);

            if (personExists) {
              newRecords.push({
                entityId: id,
                type,
                status,
                date: rowDate,
                reason: row['ملاحظات'] || '',
                createdAt: new Date().toISOString()
              });
            }
          }
        });

        if (newRecords.length > 0) {
          // Add records sequentially or as batch
          for (const record of newRecords) {
             const existing = attendanceRecords.find(r => r.entityId === record.entityId && r.date === record.date && r.type === record.type);
             if (existing) {
                await localDb.update('attendanceRecords', existing.id, { status: record.status, reason: record.reason });
             } else {
                await localDb.add('attendanceRecords', record);
             }
          }
          alert(`تم استيراد ${newRecords.length} سجل بنجاح`);
        } else {
          alert('لم يتم العثور على سجلات صالحة للاستيراد');
        }
      } catch (err) {
        console.error(err);
        alert('حدث خطأ أثناء استيراد الملف');
      }
    };
    reader.readAsBinaryString(file);
    event.target.value = ''; // Reset input
  };

  useEffect(() => {
    if (showNotificationModal) {
      const settings = WhatsAppService.getSettings(school.id);
      let template = '';
      switch (showNotificationModal.type) {
        case 'absence': template = settings?.attendanceAbsentTemplate || ''; break;
        case 'warning': template = settings?.absenceWarning6Template || ''; break;
        case 'summons': template = settings?.absenceSummons10Template || ''; break;
        case 'expulsion': template = settings?.absenceExpulsion12Template || ''; break;
        case 'violation': template = settings?.violationTemplate || ''; break;
      }
      
      if (template) {
        const count = attendanceRecords.filter(r => 
          r.entityId === showNotificationModal.student.id && 
          r.status === 'absent'
        ).length;
        setNotificationContent(WhatsAppService.formatMessage(template, showNotificationModal.student, { absences: count }));
      } else {
        setNotificationContent('');
      }
    }
  }, [showNotificationModal, school.id, students, attendanceRecords]);

  const sendNotification = async () => {
    if (!showNotificationModal) return;
    
    const absenceCount = attendanceRecords.filter(r => 
      r.entityId === showNotificationModal.student.id && 
      r.type === 'student' && 
      r.status === 'absent'
    ).length;

    const res = await WhatsAppService.sendNotification(
      school.id, 
      showNotificationModal.student.id, 
      showNotificationModal.type,
      { absences: absenceCount },
      notificationContent
    );

    if (res && res.mode === 'manual' && res.url) {
      window.open(res.url, '_blank');
    }

    setShowNotificationModal(null);
    setNotificationContent('');
  };

  return (
    <div className="space-y-6">
      {/* Shift and Auto Check Status Bar */}
      {school.shiftStartTime && school.shiftEndTime && (
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-6 rounded-[2rem] text-white flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl shadow-blue-100">
          <div className="flex items-center gap-6">
            <div className="bg-white/20 p-4 rounded-2xl backdrop-blur-sm">
              <Clock className="w-8 h-8 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-black">الدوام الرسمي: {school.shiftStartTime} - {school.shiftEndTime}</h3>
              <div className="flex items-center gap-3 mt-1">
                <span className={`w-2 h-2 rounded-full ${school.autoAbsenceCheckEnabled ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`}></span>
                <p className="text-[10px] font-bold opacity-80">
                  {school.autoAbsenceCheckEnabled 
                    ? 'نظام معالجة الغياب التلقائي نشط' 
                    : 'المعالجة التلقائية للغياب معطلة - يرجى الضغط على زر إنهاء الدوام يدوياً'}
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
             <div className="text-left md:text-right">
                <p className="text-[10px] font-black opacity-60 uppercase tracking-widest">حالة اليوم المختار</p>
                <p className="font-black text-sm">
                  {school.lastAbsenceCheckDate === selectedDate 
                    ? 'تمت معالجة غيابات هذا اليوم بنجاح' 
                    : 'بانتظار انتهاء الدوام للمعالجة'}
                </p>
             </div>
             {school.lastAbsenceCheckDate !== selectedDate && (
               <button 
                 onClick={autoFillAbsences}
                 className="bg-white text-blue-600 px-6 py-3 rounded-2xl font-black text-sm shadow-lg hover:bg-blue-50 transition-all flex items-center gap-2"
               >
                 <CheckCircle2 className="w-5 h-5" />
                 إنهاء الدوام ومعالجة الغياب
               </button>
             )}
          </div>
        </div>
      )}

      {/* Header Tabs */}
      <div className="flex flex-wrap gap-2 p-1 bg-white border border-gray-100 rounded-3xl shadow-sm">
        <button
          onClick={() => setActiveTab('students')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 px-6 rounded-2xl font-black transition-all ${
            activeTab === 'students' ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' : 'text-gray-500 hover:bg-gray-50'
          }`}
        >
          <Users className="w-5 h-5" />
          حضور الطلاب
        </button>
        <button
          onClick={() => setActiveTab('staff')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 px-6 rounded-2xl font-black transition-all ${
            activeTab === 'staff' ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' : 'text-gray-500 hover:bg-gray-50'
          }`}
        >
          <UserCheck className="w-5 h-5" />
          حضور الكادر
        </button>
        <button
          onClick={() => setActiveTab('fingerprint')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 px-6 rounded-2xl font-black transition-all ${
            activeTab === 'fingerprint' ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' : 'text-gray-500 hover:bg-gray-50'
          }`}
        >
          <Fingerprint className="w-5 h-5" />
          مستشعر البصمة الذكي
        </button>
        <button
          onClick={() => setActiveTab('reports')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 px-6 rounded-2xl font-black transition-all ${
            activeTab === 'reports' ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' : 'text-gray-500 hover:bg-gray-50'
          }`}
        >
          <Bell className="w-5 h-5" />
          التنبيهات والتقارير
        </button>
        <button
          onClick={() => setActiveTab('data')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 px-6 rounded-2xl font-black transition-all ${
            activeTab === 'data' ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' : 'text-gray-500 hover:bg-gray-50'
          }`}
        >
          <FileSpreadsheet className="w-5 h-5" />
          إدارة البيانات
        </button>
      </div>

      {/* Date and Search Section */}
      <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex items-center gap-4 w-full md:w-auto">
          <CalendarIcon className="text-gray-400 w-6 h-6" />
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 font-black outline-none focus:ring-2 focus:ring-blue-500"
          />
          <h2 className="text-lg font-black text-gray-900">
            {format(new Date(selectedDate), 'EEEE, d MMMM yyyy', { locale: ar })}
          </h2>
        </div>

        <div className="flex gap-3 w-full md:w-auto">
          {activeTab === 'students' && (
            <select
              value={selectedGrade}
              onChange={(e) => setSelectedGrade(e.target.value)}
              className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 font-black outline-none focus:ring-2 focus:ring-blue-500"
            >
              {GRADES.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          )}
          <div className="relative flex-1 md:w-64">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="بحث بالاسم..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl pr-10 pl-4 py-2 outline-none focus:ring-2 focus:ring-blue-500 font-bold"
            />
          </div>
          {activeTab === 'students' && (
            <div className="flex gap-2">
              <button
                onClick={autoFillAbsences}
                className="bg-red-50 text-red-600 px-4 py-2 rounded-xl text-xs font-black hover:bg-red-100 border border-red-100 flex items-center gap-2"
              >
                <XCircle className="w-4 h-4" />
                تسجيل غياب للكل
              </button>
              <button
                onClick={sendSummaryToGroup}
                className="bg-emerald-50 text-emerald-600 px-4 py-2 rounded-xl text-xs font-black hover:bg-emerald-100 border border-emerald-100 flex items-center gap-2"
              >
                <Share2 className="w-4 h-4" />
                إرسال تقرير إجمالي
              </button>
            </div>
          )}
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === 'students' && (
            <motion.div 
              initial="hidden"
              animate="visible"
              variants={{
                hidden: { opacity: 0 },
                visible: { opacity: 1, transition: { staggerChildren: 0.05 } }
              }}
              className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6"
            >
              {filteredStudents.map(student => {
                const record = dailyRecords.find(r => r.entityId === student.id && r.type === 'student');
                const status = record?.status;
                
                return (
                  <motion.div 
                    key={student.id} 
                    variants={{
                      hidden: { opacity: 0, scale: 0.95 },
                      visible: { opacity: 1, scale: 1 }
                    }}
                    whileHover={{ y: -5 }}
                    className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4 hover:shadow-md transition-all relative overflow-hidden"
                  >
                {status && (
                  <div className={`absolute top-0 right-0 h-1 w-full ${STATUS_CONFIG[status].dot}`}></div>
                )}
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="w-12 h-12 rounded-2xl bg-gray-100 overflow-hidden text-gray-400 flex items-center justify-center">
                        {student.photo ? <img src={student.photo} alt={student.name} className="w-full h-full object-cover" /> : <Users className="w-6 h-6" />}
                      </div>
                      {status && (
                        <div className={`absolute -top-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${STATUS_CONFIG[status].dot} shadow-sm animate-in zoom-in duration-300`}></div>
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-black text-gray-900">{student.name}</h4>
                        {status && (
                          <span className={`px-2 py-0.5 rounded-full text-[8px] font-black border ${STATUS_CONFIG[status].bg} ${STATUS_CONFIG[status].text} ${STATUS_CONFIG[status].border}`}>
                            {STATUS_CONFIG[status].label}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 font-bold">{student.grade}</p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button 
                      onClick={() => setEditingReason({ 
                        id: student.id, 
                        name: student.name, 
                        reason: record?.reason || '' 
                      })}
                      className="p-2 text-gray-400 hover:bg-gray-50 rounded-xl"
                      title="إضافة ملاحظة/سبب"
                    >
                      <FileText className="w-5 h-5" />
                    </button>
                    <button 
                      onClick={() => {
                        const record = dailyRecords.find(r => r.entityId === student.id && r.type === 'student');
                        const status = record?.status;
                        setShowNotificationModal({ 
                          student, 
                          type: status === 'violation' || status === 'dismissed' ? 'violation' : 'absence' 
                        });
                      }}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-xl"
                      title="تبليغ عن غياب/مخالفة"
                    >
                      <MessageSquare className="w-5 h-5" />
                    </button>
                    <button 
                      onClick={() => {
                        const count = attendanceRecords.filter(r => r.entityId === student.id && r.status === 'absent').length;
                        let type: 'warning' | 'summons' | 'expulsion' = 'warning';
                        if (count >= 12) type = 'expulsion';
                        else if (count >= 10) type = 'summons';
                        setShowNotificationModal({ student, type });
                      }}
                      className="p-2 text-yellow-500 hover:bg-yellow-50 rounded-xl"
                      title="إرسال تنبيه/استدعاء/إنذار"
                    >
                      <AlertCircle className="w-5 h-5" />
                    </button>
                    {canModify && (
                      <button 
                        onClick={() => setIsRegisteringFingerprint({ id: student.id, name: student.name, type: 'student' })}
                        className="p-2 text-blue-500 hover:bg-blue-50 rounded-xl"
                        title="تسجيل بصمة"
                      >
                        <Fingerprint className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                </div>

                {record?.reason && (
                  <div className="p-3 bg-gray-50 rounded-2xl border border-gray-100 flex items-start gap-2">
                    <FileText className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                    <p className="text-[10px] font-bold text-gray-600 line-clamp-2">{record.reason}</p>
                  </div>
                )}

                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => updateAttendance(student.id, 'student', 'present')}
                    className={`flex flex-col items-center justify-center p-3 rounded-2xl border transition-all ${
                      record?.status === 'present' ? 'bg-emerald-600 border-emerald-600 text-white shadow-lg' : 'bg-gray-50 border-gray-100 text-gray-400'
                    }`}
                  >
                    <CheckCircle2 className="w-6 h-6 mb-1" />
                    <span className="text-[10px] font-black">حاضر</span>
                  </button>
                  <button
                    onClick={() => updateAttendance(student.id, 'student', 'absent')}
                    className={`flex flex-col items-center justify-center p-3 rounded-2xl border transition-all ${
                      record?.status === 'absent' ? 'bg-red-600 border-red-600 text-white shadow-lg' : 'bg-gray-50 border-gray-100 text-gray-400'
                    }`}
                  >
                    <XCircle className="w-6 h-6 mb-1" />
                    <span className="text-[10px] font-black">غائب</span>
                  </button>
                  <button
                    onClick={() => updateAttendance(student.id, 'student', 'late')}
                    className={`flex flex-col items-center justify-center p-3 rounded-2xl border transition-all ${
                      record?.status === 'late' ? 'bg-yellow-500 border-yellow-500 text-white shadow-lg' : 'bg-gray-50 border-gray-100 text-gray-400'
                    }`}
                  >
                    <Clock className="w-6 h-6 mb-1" />
                    <span className="text-[10px] font-black">متأخر</span>
                  </button>
                  <button
                    onClick={() => updateAttendance(student.id, 'student', 'excused')}
                    className={`flex flex-col items-center justify-center p-3 rounded-2xl border transition-all ${
                      record?.status === 'excused' ? 'bg-gray-600 border-gray-600 text-white shadow-lg' : 'bg-gray-50 border-gray-100 text-gray-400'
                    }`}
                  >
                    <CheckCircle2 className="w-6 h-6 mb-1" />
                    <span className="text-[10px] font-black">مجاز</span>
                  </button>
                  <button
                    onClick={() => updateAttendance(student.id, 'student', 'dismissed')}
                    className={`flex flex-col items-center justify-center p-3 rounded-2xl border transition-all ${
                      record?.status === 'dismissed' ? 'bg-blue-600 border-blue-600 text-white shadow-lg' : 'bg-gray-50 border-gray-100 text-gray-400'
                    }`}
                  >
                    <XCircle className="w-6 h-6 mb-1" />
                    <span className="text-[10px] font-black">طرد</span>
                  </button>
                  <button
                    onClick={() => updateAttendance(student.id, 'student', 'violation')}
                    className={`flex flex-col items-center justify-center p-3 rounded-2xl border transition-all ${
                      record?.status === 'violation' ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg' : 'bg-gray-50 border-gray-100 text-gray-400'
                    }`}
                  >
                    <AlertCircle className="w-6 h-6 mb-1" />
                    <span className="text-[10px] font-black">مخالفة</span>
                  </button>
                </div>
              </motion.div>
            );
          })}
            </motion.div>
          )}

          {activeTab === 'staff' && (
            <motion.div 
              initial="hidden"
              animate="visible"
              variants={{
                hidden: { opacity: 0 },
                visible: { opacity: 1, transition: { staggerChildren: 0.05 } }
              }}
              className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6"
            >
              {filteredStaff.map(member => {
                const record = dailyRecords.find(r => r.entityId === member.id && r.type === 'staff');
                const status = record?.status;
                const dayOfWeek = new Date(selectedDate).getDay();
                const isWorkingDay = (member.workingDays || [0,1,2,3,4,5]).includes(dayOfWeek);

                return (
                  <motion.div 
                    key={member.id} 
                    variants={{
                      hidden: { opacity: 0, scale: 0.95 },
                      visible: { opacity: 1, scale: 1 }
                    }}
                    whileHover={{ y: -5 }}
                    className={`bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4 hover:shadow-md transition-all relative overflow-hidden ${!isWorkingDay ? 'opacity-60' : ''}`}
                  >
                {status && (
                  <div className={`absolute top-0 right-0 h-1 w-full ${STATUS_CONFIG[status].dot}`}></div>
                )}
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
                        <UserCheck className="w-6 h-6" />
                      </div>
                      {status && (
                        <div className={`absolute -top-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${STATUS_CONFIG[status].dot} shadow-sm animate-in zoom-in duration-300`}></div>
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-black text-gray-900">{member.name}</h4>
                        {status && (
                          <span className={`px-2 py-0.5 rounded-full text-[8px] font-black border ${STATUS_CONFIG[status].bg} ${STATUS_CONFIG[status].text} ${STATUS_CONFIG[status].border}`}>
                            {STATUS_CONFIG[status].label}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 font-bold">{member.role}</p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button 
                      onClick={() => setEditingReason({ 
                        id: member.id, 
                        name: member.name, 
                        reason: record?.reason || '' 
                      })}
                      className="p-2 text-gray-400 hover:bg-gray-50 rounded-xl"
                      title="إضافة ملاحظة/سبب"
                    >
                      <FileText className="w-5 h-5" />
                    </button>
                    {canModify && (
                      <button 
                        onClick={() => setIsRegisteringFingerprint({ id: member.id, name: member.name, type: 'staff' })}
                        className="p-2 text-emerald-500 hover:bg-emerald-50 rounded-xl"
                        title="تسجيل بصمة"
                      >
                        <Fingerprint className="w-5 h-5" />
                      </button>
                    )}
                    {!isWorkingDay && <span className="text-[10px] font-black text-gray-400 px-2 py-1 bg-gray-100 rounded-lg">خارج وقت الدوام</span>}
                  </div>
                </div>

                {record?.reason && (
                  <div className="p-3 bg-gray-50 rounded-2xl border border-gray-100 flex items-start gap-2">
                    <FileText className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                    <p className="text-[10px] font-bold text-gray-600 line-clamp-2">{record.reason}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => updateAttendance(member.id, 'staff', 'present')}
                    className={`flex items-center justify-center gap-2 py-3 rounded-2xl border transition-all ${
                      record?.status === 'present' ? 'bg-emerald-600 border-emerald-600 text-white shadow-lg' : 'bg-gray-50 border-gray-100 text-gray-400'
                    }`}
                  >
                    <CheckCircle2 className="w-5 h-5" />
                    <span className="text-sm font-black">حاضر</span>
                  </button>
                  <button
                    onClick={() => updateAttendance(member.id, 'staff', 'absent')}
                    className={`flex items-center justify-center gap-2 py-3 rounded-2xl border transition-all ${
                      record?.status === 'absent' ? 'bg-red-600 border-red-600 text-white shadow-lg' : 'bg-gray-50 border-gray-100 text-gray-400'
                    }`}
                  >
                    <XCircle className="w-5 h-5" />
                    <span className="text-sm font-black">غائب</span>
                  </button>
                </div>
                
                {record?.status === 'absent' && member.deductionAmount > 0 && (
                  <div className="p-3 bg-red-50 rounded-2xl flex items-center justify-between text-red-600">
                    <span className="text-xs font-black">مبلغ الاستقطاع لهذا اليوم:</span>
                    <span className="font-black">{(member.deductionAmount).toLocaleString()} د.ع</span>
                  </div>
                )}
                  </motion.div>
                );
              })}
            </motion.div>
          )}

        {activeTab === 'fingerprint' && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-8"
          >
            {/* Virtual Fingerprint Hub */}
            <div className="bg-white p-12 rounded-[3rem] border border-gray-100 shadow-sm flex flex-col items-center justify-center text-center space-y-8 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8">
                <div className="flex items-center gap-2 text-blue-600 bg-blue-50 px-4 py-2 rounded-2xl border border-blue-100">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-ping"></div>
                  <span className="text-xs font-black">المستشعر جاهز</span>
                </div>
              </div>

              <div className="relative group cursor-pointer" onClick={() => setIsFingerprintActive(true)}>
                <div className={`w-48 h-48 rounded-[3rem] flex items-center justify-center transition-all duration-500 ${
                  fingerprintStatus === 'idle' ? 'bg-gray-100 text-gray-400 group-hover:bg-blue-50 group-hover:text-blue-500' :
                  fingerprintStatus === 'scanning' ? 'bg-blue-100 text-blue-600 animate-pulse' :
                  fingerprintStatus === 'success' ? 'bg-emerald-100 text-emerald-600 scale-105' :
                  'bg-red-100 text-red-600'
                }`}>
                  <Fingerprint className={`w-24 h-24 ${fingerprintStatus === 'scanning' ? 'animate-bounce' : ''}`} />
                </div>
                
                {fingerprintStatus === 'scanning' && (
                  <motion.div 
                    initial={{ top: '0%' }}
                    animate={{ top: '100%' }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    className="absolute left-0 right-0 h-1 bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.8)] z-10"
                  />
                )}
              </div>

              <div>
                <h3 className="text-3xl font-black text-gray-900">
                  {fingerprintStatus === 'idle' ? 'ضع البصمة للمسح' :
                   fingerprintStatus === 'scanning' ? 'جاري التحقق من الهوية...' :
                   fingerprintStatus === 'success' ? 'تم التعرف بنجاح' :
                   'بصمة غير معروفة'}
                </h3>
                <p className="text-gray-500 font-bold max-w-sm mt-3">
                  يقوم النظام بالتعرف التلقائي على الطالب أو الموظف من خلال قاعدة بيانات البصمات المسجلة.
                </p>
              </div>

              <div className="w-full max-w-md">
                <div className="relative group">
                  <Keyboard className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-blue-500 transition-colors" />
                  <input 
                    type="password"
                    autoFocus
                    placeholder="قم بمحاكاة جهاز البصمة هنا..."
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleFingerprintScan(e.currentTarget.value);
                        e.currentTarget.value = '';
                      }
                    }}
                    className="w-full bg-gray-50 border-2 border-dashed border-gray-200 rounded-3xl pr-12 pl-6 py-6 font-black text-center text-xl outline-none focus:border-blue-500 focus:ring-8 focus:ring-blue-50 transition-all placeholder:text-gray-300"
                  />
                </div>
                <p className="text-[10px] text-gray-400 mt-4 font-bold italic">
                  * ملاحظة: هذا المستشعر مبرمج للتعرف التلقائي الفوري لكافة أقسام المدرسة
                </p>
              </div>
            </div>

            {/* Quick Registration / Information */}
            <div className="space-y-6">
              <div className="bg-gradient-to-br from-gray-900 to-slate-800 p-8 rounded-[3rem] text-white shadow-xl relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-full opacity-10">
                  <Fingerprint className="w-64 h-64 -translate-x-10 -translate-y-10 rotate-12" />
                </div>
                <h4 className="text-xl font-black mb-6 flex items-center gap-3 relative z-10">
                  <Zap className="text-yellow-400 w-6 h-6" />
                  التسجيل السريع للبصمة
                </h4>
                <div className="space-y-4 relative z-10">
                  <p className="text-sm font-bold text-gray-300">
                    يمكن للمسؤول تسجيل بصمة جديدة فوراً للموظفين أو الطلاب غير المسجلين:
                  </p>
                  <div className="flex flex-col gap-3">
                    <button 
                      onClick={() => setActiveTab('students')}
                      className="bg-white/10 hover:bg-white/20 p-4 rounded-2xl flex items-center justify-between transition-all group"
                    >
                      <div className="flex items-center gap-3">
                        <Users className="w-5 h-5 text-blue-400" />
                        <span className="font-black text-sm">تسجيل بصمة طالب</span>
                      </div>
                      <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                    </button>
                    <button 
                      onClick={() => setActiveTab('staff')}
                      className="bg-white/10 hover:bg-white/20 p-4 rounded-2xl flex items-center justify-between transition-all group"
                    >
                      <div className="flex items-center gap-3">
                        <UserCheck className="w-5 h-5 text-emerald-400" />
                        <span className="font-black text-sm">تسجيل بصمة موظف</span>
                      </div>
                      <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                    </button>
                  </div>
                </div>
              </div>

              {lastScanned && (
                <motion.div 
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={`p-8 rounded-[3rem] border-2 shadow-sm flex items-center gap-6 ${
                    lastScanned.status === 'absent' ? 'bg-red-50 border-red-200' : 'bg-emerald-50 border-emerald-200'
                  }`}
                >
                  <div className={`w-16 h-16 rounded-3xl flex items-center justify-center ${
                    lastScanned.status === 'absent' ? 'bg-red-600 text-white' : 'bg-emerald-600 text-white'
                  }`}>
                    {lastScanned.status === 'absent' ? <XCircle className="w-8 h-8" /> : <CheckCircle2 className="w-8 h-8" />}
                  </div>
                  <div>
                    <h4 className="text-2xl font-black text-gray-900">{lastScanned.name}</h4>
                    <div className="flex items-center gap-2 mt-1">
                      <Clock className="w-4 h-4 text-gray-400" />
                      <span className="text-sm font-black text-gray-500">{lastScanned.time}</span>
                      <span className={`px-3 py-1 rounded-full text-[10px] font-black mr-2 ${
                        lastScanned.status === 'absent' ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'
                      }`}>
                        {lastScanned.status === 'absent' ? 'خطأ في المسح' : 'تم الحضور'}
                      </span>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}

        {activeTab === 'reports' && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-6"
          >
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
            <div className="flex bg-gray-100 p-1 rounded-2xl">
              <button 
                onClick={() => setReportType('daily')}
                className={`px-6 py-2 rounded-xl font-black text-sm transition-all ${reportType === 'daily' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'}`}
              >تقرير يومي</button>
              <button 
                onClick={() => setReportType('monthly')}
                className={`px-6 py-2 rounded-xl font-black text-sm transition-all ${reportType === 'monthly' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'}`}
              >تقرير شهري واستقطاعات</button>
              <button 
                onClick={() => setReportType('notifications')}
                className={`px-6 py-2 rounded-xl font-black text-sm transition-all ${reportType === 'notifications' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'}`}
              >سجل التنبيهات</button>
              <button 
                onClick={() => setReportType('details')}
                className={`px-6 py-2 rounded-xl font-black text-sm transition-all ${reportType === 'details' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'}`}
              >سجل الملاحظات والأسباب</button>
              <button 
                onClick={() => setReportType('summary')}
                className={`px-6 py-2 rounded-xl font-black text-sm transition-all ${reportType === 'summary' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'}`}
              >سجل الحضور العام المنظم</button>
            </div>

            {reportType === 'monthly' && (
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 font-black outline-none focus:ring-2 focus:ring-blue-500"
              />
            )}
          </div>

          {reportType === 'daily' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                <div>
                  <h3 className="text-lg font-black text-gray-900">إحصائيات الغياب اليومي</h3>
                  <p className="text-xs text-gray-500 font-bold">تاريخ: {format(new Date(selectedDate), 'yyyy-MM-dd')}</p>
                </div>
                <button
                  onClick={handlePrintDailyReport}
                  className="bg-gray-900 text-white px-6 py-3 rounded-2xl font-black text-sm flex items-center gap-2 hover:bg-black transition-all shadow-lg"
                >
                  <Printer className="w-5 h-5" />
                  طباعة تقرير الغيابات التفصيلي
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
              <div className="bg-emerald-50 p-6 rounded-3xl border border-emerald-100 text-center space-y-2">
                <h4 className="text-emerald-600 font-black text-xs">حاضرون</h4>
                <p className="text-2xl font-black text-emerald-700">
                  {dailyRecords.filter(r => r.status === 'present').length}
                </p>
              </div>
              <div className="bg-red-50 p-6 rounded-3xl border border-red-100 text-center space-y-2">
                <h4 className="text-red-600 font-black text-xs">غائبون</h4>
                <p className="text-2xl font-black text-red-700">
                  {dailyRecords.filter(r => r.status === 'absent').length}
                </p>
              </div>
              <div className="bg-amber-50 p-6 rounded-3xl border border-amber-100 text-center space-y-2">
                <h4 className="text-amber-600 font-black text-xs">متأخرون</h4>
                <p className="text-2xl font-black text-amber-700">
                  {dailyRecords.filter(r => r.status === 'late').length}
                </p>
              </div>
              <div className="bg-blue-50 p-6 rounded-3xl border border-blue-100 text-center space-y-2">
                <h4 className="text-blue-600 font-black text-xs">طرد</h4>
                <p className="text-2xl font-black text-blue-700">
                  {dailyRecords.filter(r => r.status === 'dismissed').length}
                </p>
              </div>
              <div className="bg-indigo-50 p-6 rounded-3xl border border-indigo-100 text-center space-y-2">
                <h4 className="text-indigo-600 font-black text-xs">مخالفة</h4>
                <p className="text-2xl font-black text-indigo-700">
                  {dailyRecords.filter(r => r.status === 'violation').length}
                </p>
              </div>
              <div className="bg-gray-100 p-6 rounded-3xl border border-gray-200 text-center space-y-2">
                <h4 className="text-gray-600 font-black text-xs">نسبة الحضور</h4>
                <p className="text-2xl font-black text-gray-700">
                  {students.length + staff.length > 0 
                    ? Math.round((dailyRecords.filter(r => r.status === 'present').length / (students.length + staff.length)) * 100) 
                    : 0}%
                </p>
              </div>
            </div>
          </div>
          )}

          {reportType === 'summary' && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden"
            >
              <div className="p-6 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-black text-gray-900">سجل الحضور اليومي المنظم - {format(new Date(selectedDate), 'EEEE, d MMMM yyyy', { locale: ar })}</h3>
                  <p className="text-xs text-gray-500 font-bold">جميع الطلاب المسجلين وحالاتهم الرقمية</p>
                </div>
                <div className="flex items-center gap-4">
                  <button
                    onClick={sendSummaryToGroup}
                    className="bg-emerald-600 text-white px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2 hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100"
                  >
                    <Share2 className="w-4 h-4" />
                    إرسال للمجموعة
                  </button>
                  <div className="flex gap-4">
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 bg-emerald-500 rounded-full"></div>
                      <span className="text-[10px] font-black">حضور</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                      <span className="text-[10px] font-black">غياب</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                      <span className="text-[10px] font-black">طرد/مخالفة</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-right">
                  <thead>
                    <tr className="bg-gray-100 text-gray-600">
                      <th className="px-6 py-4 text-xs font-black text-right">ت</th>
                      <th className="px-6 py-4 text-xs font-black text-right">الاسم</th>
                      <th className="px-6 py-4 text-xs font-black text-right">الصف</th>
                      <th className="px-6 py-4 text-xs font-black text-right">الحالة</th>
                      <th className="px-6 py-4 text-xs font-black text-right">وقت التسجيل</th>
                      <th className="px-6 py-4 text-xs font-black text-right">ملاحظات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {students.map((student, idx) => {
                      const record = dailyRecords.find(r => r.entityId === student.id && r.type === 'student');

                      return (
                        <tr key={student.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4 text-xs font-bold text-gray-400">{idx + 1}</td>
                          <td className="px-6 py-4 text-sm font-black text-gray-900">{student.name}</td>
                          <td className="px-6 py-4">
                            <span className="text-xs font-bold text-gray-500 bg-gray-100 px-2 py-1 rounded-lg">
                              {student.grade}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            {record ? (
                              <span className={`px-3 py-1 rounded-full text-[10px] font-black border ${STATUS_CONFIG[record.status].bg} ${STATUS_CONFIG[record.status].text} ${STATUS_CONFIG[record.status].border}`}>
                                {STATUS_CONFIG[record.status].label}
                              </span>
                            ) : (
                              <span className="px-3 py-1 rounded-full text-[10px] font-black border bg-gray-50 text-gray-400 border-gray-100">
                                غير مؤشر
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-[10px] font-mono font-bold text-gray-500">
                            {record?.scanTime ? format(new Date(record.scanTime), 'HH:mm:ss') : record?.createdAt ? format(new Date(record.createdAt), 'HH:mm:ss') : '---'}
                          </td>
                          <td className="px-6 py-4 text-[10px] font-bold text-gray-500 max-w-xs truncate">
                            {record?.reason || '---'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}

          {reportType === 'monthly' && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm"
            >
              <h3 className="text-xl font-black text-gray-900 mb-6 flex items-center gap-2">
                <CalendarIcon className="w-6 h-6 text-blue-600" />
                تقرير الاستقطاعات والحضور للكادر - شهر {format(new Date(selectedMonth), 'MMMM yyyy', { locale: ar })}
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-right border-collapse">
                  <thead>
                    <tr className="bg-gray-50 text-gray-500 text-sm border-b border-gray-100">
                      <th className="p-4 rounded-tr-2xl">الموظف</th>
                      <th className="p-4">أيام الغياب</th>
                      <th className="p-4">أيام الحضور</th>
                      <th className="p-4">مبلغ الاستقطاع (اليومي)</th>
                      <th className="p-4">إجمالي الاستقطاع</th>
                      <th className="p-4 rounded-tl-2xl">صافي الراتب المتوقع</th>
                    </tr>
                  </thead>
                  <tbody>
                    {staff.map(member => {
                      const monthlyRecords = attendanceRecords.filter(r => 
                        r.entityId === member.id && 
                        r.type === 'staff' && 
                        r.date.startsWith(selectedMonth)
                      );
                      const absences = monthlyRecords.filter(r => r.status === 'absent').length;
                      const present = monthlyRecords.filter(r => r.status === 'present').length;
                      const totalDeduction = absences * (member.deductionAmount || 0);

                      return (
                        <tr key={member.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                          <td className="p-4">
                            <div className="font-black text-gray-900">{member.name}</div>
                            <div className="text-[10px] text-gray-400 font-bold">{member.role}</div>
                          </td>
                          <td className="p-4 font-black text-red-600">{absences} أيام</td>
                          <td className="p-4 font-black text-emerald-600">{present} أيام</td>
                          <td className="p-4 font-bold text-gray-500">{(member.deductionAmount || 0).toLocaleString()} د.ع</td>
                          <td className="p-4 font-black text-red-600">{totalDeduction.toLocaleString()} د.ع</td>
                          <td className="p-4 font-black text-blue-600">{(member.salary - totalDeduction).toLocaleString()} د.ع</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}

          {reportType === 'notifications' && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm"
            >
              <h3 className="text-xl font-black text-gray-900 mb-6 flex items-center gap-2">
                <MessageSquare className="w-6 h-6 text-blue-600" />
                سجل التنبيهات المرسلة لأولياء الأمور
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-right border-collapse">
                  <thead>
                    <tr className="bg-gray-50 text-gray-500 text-sm border-b border-gray-100">
                      <th className="p-4 rounded-tr-2xl">تاريخ الإرسال</th>
                      <th className="p-4">اسم الطالب</th>
                      <th className="p-4">نوع التنبيه</th>
                      <th className="p-4">نص الرسالة</th>
                      <th className="p-4 rounded-tl-2xl">الحالة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(localDb.getAll('parentNotifications') as ParentNotification[]).sort((a,b) => b.date.localeCompare(a.date)).map(notif => {
                      const student = students.find(s => s.id === notif.studentId);
                      return (
                        <tr key={notif.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                          <td className="p-4 text-xs font-bold text-gray-400">{format(new Date(notif.date), 'yyyy/MM/dd HH:mm')}</td>
                          <td className="p-4 font-black">{student?.name || '---'}</td>
                          <td className="p-4">
                            <span className={`px-3 py-1 rounded-lg text-xs font-black ${
                              notif.type === 'absence' ? 'bg-red-50 text-red-600' : 
                              notif.type === 'summons' ? 'bg-yellow-50 text-yellow-600' : 'bg-blue-50 text-blue-600'
                            }`}>
                              {notif.type === 'absence' ? 'غياب' : notif.type === 'summons' ? 'استدعاء' : 'إنذار'}
                            </span>
                          </td>
                          <td className="p-4 text-xs text-gray-500 font-bold max-w-xs truncate">{notif.content}</td>
                          <td className="p-4">
                            <span className="flex items-center gap-1 text-emerald-600 font-black text-xs">
                              <CheckCircle2 className="w-4 h-4" />
                              مرسلة
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}

          {reportType === 'details' && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm"
            >
              <h3 className="text-xl font-black text-gray-900 mb-6 flex items-center gap-2">
                <FileText className="w-6 h-6 text-blue-600" />
                سجل الملاحظات والأسباب للتاريخ المحدد
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-right border-collapse">
                  <thead>
                    <tr className="bg-gray-50 text-gray-500 text-sm border-b border-gray-100">
                      <th className="p-4 rounded-tr-2xl">الاسم</th>
                      <th className="p-4">النوع</th>
                      <th className="p-4">الحالة</th>
                      <th className="p-4">السبب/الملاحظة</th>
                      <th className="p-4 rounded-tl-2xl">وقت المسح</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dailyRecords.filter(r => r.reason || r.status !== 'present').map(record => {
                      const person = record.type === 'student' ? students.find(s => s.id === record.entityId) : staff.find(s => s.id === record.entityId);
                      return (
                        <tr key={record.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                          <td className="p-4 font-black">{person?.name || '---'}</td>
                          <td className="p-4 text-xs font-bold text-gray-400">{record.type === 'student' ? 'طالب' : 'موظف'}</td>
                          <td className="p-4">
                             <span className={`px-2 py-1 rounded-lg text-[10px] font-black ${
                                record.status === 'absent' ? 'bg-red-50 text-red-600' : 
                                record.status === 'late' ? 'bg-yellow-50 text-yellow-600' : 
                                record.status === 'excused' ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-600'
                             }`}>
                                {record.status === 'absent' ? 'غائب' : record.status === 'late' ? 'متأخر' : record.status === 'excused' ? 'مجاز' : 'حاضر'}
                             </span>
                          </td>
                          <td className="p-4 font-bold text-gray-600">{record.reason || '---'}</td>
                          <td className="p-4 text-xs font-bold text-gray-400">{record.scanTime ? format(new Date(record.scanTime), 'HH:mm:ss') : '---'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}
        </motion.div>
      )}

      {activeTab === 'data' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="grid grid-cols-1 md:grid-cols-2 gap-8"
            >
              {/* Students Data Center */}
              <div className="bg-white p-8 rounded-[3rem] border border-gray-100 shadow-sm space-y-8 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
                   <Users className="w-32 h-32 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-gray-900 mb-2">بيانات حضور الطلاب</h3>
                  <p className="text-sm font-bold text-gray-500">تصدير واستيراد سجلات الحضور الخاصة بالطلاب لهذا اليوم أو كقالب عام.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <button
                    onClick={() => handleExport('student')}
                    className="flex flex-col items-center justify-center gap-3 p-8 rounded-[2rem] bg-blue-50 border-2 border-blue-100 text-blue-700 hover:bg-blue-100 transition-all group"
                  >
                    <Download className="w-8 h-8 group-hover:bounce" />
                    <span className="font-black">تصدير الحضور الحالي</span>
                  </button>
                  <label className="flex flex-col items-center justify-center gap-3 p-8 rounded-[2rem] bg-emerald-50 border-2 border-emerald-100 text-emerald-700 hover:bg-emerald-100 transition-all cursor-pointer group">
                    <Upload className="w-8 h-8 group-hover:bounce" />
                    <span className="font-black">استيراد سجل الحضور</span>
                    <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={(e) => handleImport('student', e)} />
                  </label>
                  <button 
                    onClick={handleExportTemplate}
                    className="sm:col-span-2 flex items-center justify-center gap-3 p-6 rounded-[2rem] bg-indigo-50 border-2 border-indigo-100 text-indigo-700 hover:bg-indigo-100 transition-all font-black"
                  >
                    <FileSpreadsheet className="w-6 h-6" />
                    تصدير قالب أسماء الطلاب للحضور
                  </button>
                </div>

                <div className="bg-amber-50 rounded-2xl p-4 border border-amber-100">
                  <p className="text-[10px] font-black text-amber-700">ملاحظة: عند الاستيراد، يجب التأكد من تطابق "معرف الطالب" مع الموجود في النظام لتحديث الحالة بشكل صحيح.</p>
                </div>
              </div>

              {/* Staff Data Center */}
              <div className="bg-white p-8 rounded-[3rem] border border-gray-100 shadow-sm space-y-8 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
                   <UserCheck className="w-32 h-32 text-purple-600" />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-gray-900 mb-2">بيانات حضور الكادر</h3>
                  <p className="text-sm font-bold text-gray-500">تصدير واستيراد سجلات الحضور الخاصة بالهيئة التدريسية والإدارية.</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => handleExport('staff')}
                    className="flex flex-col items-center justify-center gap-3 p-8 rounded-[2rem] bg-purple-50 border-2 border-purple-100 text-purple-700 hover:bg-purple-100 transition-all group"
                  >
                    <Download className="w-8 h-8 group-hover:bounce" />
                    <span className="font-black">تصدير (Excel)</span>
                  </button>
                  <label className="flex flex-col items-center justify-center gap-3 p-8 rounded-[2rem] bg-fuchsia-50 border-2 border-fuchsia-100 text-fuchsia-700 hover:bg-fuchsia-100 transition-all cursor-pointer group">
                    <Upload className="w-8 h-8 group-hover:bounce" />
                    <span className="font-black">استيراد (Excel)</span>
                    <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={(e) => handleImport('staff', e)} />
                  </label>
                </div>

                <div className="bg-blue-50 rounded-2xl p-4 border border-blue-100">
                  <p className="text-[10px] font-black text-blue-700">ملاحظة: يمكنك تصدير الملف أولاً لاستخدامه كقالب ثم إعادة رفعه بعد تعديل الحالة في ملف الإكسل.</p>
                </div>
              </div>
            </motion.div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Notification Modal */}
      <AnimatePresence>
        {showNotificationModal && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowNotificationModal(null)}
              className="absolute inset-0 bg-gray-900/60 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden relative z-10"
            >
              <div className="p-8 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                <div className="flex items-center gap-4">
                  <div className={`p-4 rounded-3xl shadow-lg ${
                    showNotificationModal.type === 'absence' ? 'bg-red-500 text-white shadow-red-100' : 
                    showNotificationModal.type === 'warning' ? 'bg-amber-500 text-white shadow-amber-100' : 
                    showNotificationModal.type === 'summons' ? 'bg-orange-600 text-white shadow-orange-100' :
                    showNotificationModal.type === 'expulsion' ? 'bg-rose-600 text-white shadow-rose-100' :
                    'bg-indigo-600 text-white shadow-indigo-100'
                  }`}>
                    {showNotificationModal.type === 'violation' ? <AlertCircle className="w-6 h-6" /> : <MessageSquare className="w-6 h-6" />}
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-gray-900">
                      {showNotificationModal.type === 'absence' ? 'إرسال تبليغ غياب' : 
                       showNotificationModal.type === 'warning' ? 'إرسال تنبيه تجاوز غياب' :
                       showNotificationModal.type === 'summons' ? 'إرسال استدعاء ولي أمر' :
                       showNotificationModal.type === 'expulsion' ? 'إرسال إنذار فصل نهائي' :
                       'إرسال إشعار مخالفة'}
                    </h3>
                    <p className="text-sm text-gray-500 font-bold">{showNotificationModal.student.name}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowNotificationModal(null)}
                  className="p-3 hover:bg-gray-200 rounded-2xl transition-colors text-gray-400"
                >
                  <XCircle className="w-8 h-8" />
                </button>
              </div>
              
              <div className="p-8 space-y-6">
                <div className="p-5 bg-blue-50 rounded-[1.5rem] border border-blue-100 flex items-center gap-4">
                  <div className="bg-blue-600 p-2 rounded-xl text-white">
                    <AlertCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs text-blue-700 font-bold mb-1">سيتم إرسال التنبيه إلى الرقم:</p>
                    <p className="font-black text-blue-900 tracking-wider" dir="ltr">{WhatsAppService.formatPhone(showNotificationModal.student.phone)}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="block text-sm font-black text-gray-700 pr-2 uppercase tracking-widest">نص الرسالة</label>
                  <textarea
                    value={notificationContent}
                    onChange={(e) => setNotificationContent(e.target.value)}
                    placeholder="اكتب التنبيه هنا بصيغة ودية ومناسبة..."
                    className="w-full bg-gray-50 border border-gray-200 rounded-[2rem] p-6 outline-none focus:ring-4 focus:ring-blue-100 font-bold transition-all resize-none"
                    rows={4}
                  />
                  <div className="flex flex-wrap gap-2">
                    {[
                      { label: 'نموذج غياب', content: `نود إعلامكم بغياب الطالب ${showNotificationModal.student.name} عن المدرسة لهذا اليوم.` },
                      { label: 'نموذج استدعاء', content: `يرجى حضور ولي أمر الطالب ${showNotificationModal.student.name} لمراجعة إدارة المدرسة في أقرب وقت.` },
                      { label: 'نموذج إنذار', content: `إنذار للطالب ${showNotificationModal.student.name} بسبب السلوك غير المنضبط.` }
                    ].map((template) => (
                      <button 
                        key={template.label}
                        onClick={() => setNotificationContent(template.content)}
                        className="text-[10px] font-black bg-white border border-gray-100 text-gray-600 px-4 py-2 rounded-xl hover:bg-blue-50 hover:text-blue-600 transition-all shadow-sm"
                      >
                        {template.label}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={sendNotification}
                  disabled={!notificationContent}
                  className="w-full bg-blue-600 text-white py-5 rounded-[2rem] font-black text-xl hover:bg-blue-700 shadow-2xl shadow-blue-200 transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed group"
                >
                  إرسال التنبيه الآن
                  <ArrowRight className="w-5 h-5 flip-h group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Reason Modal */}
      <AnimatePresence>
        {editingReason && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setEditingReason(null)}
              className="absolute inset-0 bg-gray-900/60 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl p-8 relative z-10 overflow-hidden"
            >
              <div className="mb-6">
                <h3 className="text-2xl font-black text-gray-900">إضافة ملاحظة / سبب</h3>
                <p className="text-xs text-gray-500 font-bold mt-1">يتم عرض هذا السبب في التقارير المطبوعة</p>
              </div>

              <div className="flex items-center gap-4 mb-6 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center text-blue-600">
                  <UserCheck className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm font-black text-gray-900">{editingReason.name}</p>
                </div>
              </div>
              
              <textarea
                autoFocus
                value={editingReason.reason}
                onChange={(e) => setEditingReason({ ...editingReason, reason: e.target.value })}
                className="w-full bg-gray-50 border border-gray-200 rounded-3xl p-5 outline-none focus:ring-4 focus:ring-blue-100 font-bold mb-8 transition-all resize-none"
                rows={4}
                placeholder="مثال: إجازة مرضية، ظرف عائلي، عذر شرعي..."
              />
              
              <div className="flex gap-4">
                <button
                  onClick={() => {
                    const record = dailyRecords.find(r => r.entityId === editingReason.id);
                    const type = students.find(s => s.id === editingReason.id) ? 'student' : 'staff';
                    updateAttendance(editingReason.id, type, record?.status || 'absent', undefined, editingReason.reason);
                    setEditingReason(null);
                  }}
                  className="flex-1 bg-blue-600 text-white py-4 rounded-2xl font-black text-lg hover:bg-blue-700 shadow-xl shadow-blue-100 transition-all active:scale-[0.98]"
                >
                  حفظ السبب
                </button>
                <button
                  onClick={() => setEditingReason(null)}
                  className="px-8 bg-gray-100 text-gray-600 py-4 rounded-2xl font-black text-lg hover:bg-gray-200 transition-all active:scale-[0.98]"
                >
                  إلغاء
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Fingerprint Registration Modal */}
      <AnimatePresence>
        {isRegisteringFingerprint && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsRegisteringFingerprint(null)}
              className="absolute inset-0 bg-gray-900/60 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white w-full max-w-md rounded-[3rem] shadow-2xl p-10 relative z-10 text-center"
            >
              <div className="w-24 h-24 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
                <Fingerprint className="w-12 h-12" />
              </div>
              <h3 className="text-2xl font-black text-gray-900 mb-2">تسجيل بصمة جديدة</h3>
              <p className="text-gray-500 font-bold mb-8">
                جاري التسجيل لـ: <span className="text-blue-600">{isRegisteringFingerprint.name}</span>
              </p>

              <div className="space-y-6">
                <div className="relative">
                  <Keyboard className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input 
                    type="password"
                    autoFocus
                    placeholder="ضع البصمة للمسح..."
                    value={tempFingerprintId}
                    onChange={(e) => setTempFingerprintId(e.target.value)}
                    className="w-full bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl pr-12 pl-6 py-4 font-black outline-none focus:border-blue-500 text-center text-xl transition-all"
                  />
                </div>
                
                <div className="flex gap-4">
                  <button
                    onClick={registerFingerprint}
                    disabled={!tempFingerprintId}
                    className="flex-1 bg-blue-600 text-white py-4 rounded-2xl font-black shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all disabled:opacity-50"
                  >
                    تأكيد التسجيل
                  </button>
                  <button
                    onClick={() => setIsRegisteringFingerprint(null)}
                    className="px-6 bg-gray-100 text-gray-600 py-4 rounded-2xl font-black hover:bg-gray-200"
                  >
                    إلغاء
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="hidden">
        <div ref={dailyReportRef} className="p-12 bg-white text-right" dir="rtl">
          <div className="text-center mb-10 pb-8 border-b-2 border-gray-900">
            <h1 className="text-3xl font-black mb-2">{school.name}</h1>
            <p className="text-xl font-bold text-gray-600 mb-4">كشف غيابات الطلاب اليومي التفصيلي</p>
            <div className="flex justify-center gap-12 text-sm font-black text-gray-500">
              <p>اليوم: {format(new Date(selectedDate), 'EEEE', { locale: ar })}</p>
              <p>التاريخ: {format(new Date(selectedDate), 'yyyy / MM / dd')}</p>
              <p>العام الدراسي: {new Date().getFullYear()} - {new Date().getFullYear() + 1}</p>
            </div>
          </div>

          {absenceReportData.length > 0 ? (
            absenceReportData.map((gradeData, gIdx) => (
              <div key={gIdx} className="space-y-8 mb-12">
                {gradeData.sections.map((section, sIdx) => (
                  <div key={`${gIdx}-${sIdx}`} className="page-break-after-always mb-16 last:mb-0">
                    <div className="flex justify-between items-center mb-4 bg-gray-100 p-4 rounded-xl border border-gray-900">
                      <h2 className="text-xl font-black">الصف: {gradeData.grade}</h2>
                      <h3 className="text-xl font-black">الشعبة: ( {section.name} )</h3>
                      <p className="text-sm font-bold">عدد الغائبين: {section.absentees.length} طالب</p>
                    </div>

                    <table className="w-full border-collapse border-2 border-gray-900">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="border border-gray-900 p-3 w-16 text-center font-black">ت</th>
                          <th className="border border-gray-900 p-3 text-right font-black">اسم الطالب الرباعي</th>
                          <th className="border border-gray-900 p-3 w-32 text-center font-black">الحالة</th>
                          <th className="border border-gray-900 p-3 text-right font-black">الملاحظات / سبب الغياب</th>
                        </tr>
                      </thead>
                      <tbody>
                        {section.absentees.map((st, idx) => (
                          <tr key={st.id}>
                            <td className="border border-gray-900 p-3 text-center font-bold">{idx + 1}</td>
                            <td className="border border-gray-900 p-3 font-black text-lg">{st.name}</td>
                            <td className="border border-gray-900 p-3 text-center font-bold text-red-600">غائب</td>
                            <td className="border border-gray-900 p-3 text-sm font-bold text-gray-500">
                              {st.record?.reason || 'لم يتم ذكر السبب'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    
                    <div className="mt-12 flex justify-between px-4">
                      <div className="text-center w-56">
                        <p className="font-black text-sm mb-12">معاون شؤون الطلاب</p>
                        <div className="border-t-2 border-gray-200 w-full mx-auto"></div>
                        <p className="text-[10px] font-bold text-gray-400 mt-2">التوقيع</p>
                      </div>
                      <div className="text-center w-56">
                        <p className="font-black text-sm mb-12">منظم السجل</p>
                        <div className="border-t-2 border-gray-200 w-full mx-auto"></div>
                        <p className="text-[10px] font-bold text-gray-400 mt-2">التوقيع</p>
                      </div>
                      <div className="text-center w-56">
                        <p className="font-black text-sm mb-12">مدير المدرسة</p>
                        <p className="text-xs font-bold text-gray-400 -mt-8 mb-8">{school.principalName}</p>
                        <div className="border-t-2 border-gray-200 w-full mx-auto"></div>
                        <p className="text-[10px] font-bold text-gray-400 mt-2">التوقيع</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ))
          ) : (
            <div className="text-center py-40 border-4 border-dashed border-gray-100 rounded-[4rem]">
              <XCircle className="w-24 h-24 text-gray-200 mx-auto mb-6" />
              <p className="text-3xl font-black text-gray-300">لا يوجد غيابات مسجلة لتاريخ اليوم</p>
            </div>
          )}

          <div className="mt-20 pt-8 border-t border-gray-100 flex justify-between items-center text-[10px] font-bold text-gray-400">
            <p>نظام إدارة المدارس الرقمي - تم استخراج التقرير آلياً والمطابقة مع السجل الإلكتروني</p>
            <p dir="ltr">Report Generated: {format(new Date(), 'yyyy-MM-dd HH:mm')}</p>
          </div>
        </div>
      </div>

      {/* Custom Scrollbar Styles */}
      <style>{`
        .flip-h { transform: scaleX(-1); }
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #f1f1f1; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
      `}</style>
    </div>
  );
}
