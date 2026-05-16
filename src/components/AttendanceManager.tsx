import { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { School, Student, Staff, AttendanceRecord, AttendanceStatus, ParentNotification, Holiday } from '../types';
import { localDb } from '../services/localDb';
import { WhatsAppService } from '../services/WhatsAppService';
import { useReactToPrint } from 'react-to-print';
import { toast } from './Toast';
import { 
  Info,
  ArrowLeftRight,
  CheckCircle2, 
  XCircle, 
  Clock, 
  AlertCircle, 
  AlertTriangle,
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
  FileSpreadsheet,
  Coffee,
  Trash2
} from 'lucide-react';
import { format, startOfDay, endOfDay, isSameDay } from 'date-fns';
import { formatCurrency } from '../lib/utils';
import * as XLSX from 'xlsx';
import { ar } from 'date-fns/locale';

interface AttendanceManagerProps {
  school: School;
  students: Student[];
  staff: Staff[];
  attendanceRecords: AttendanceRecord[];
  holidays: Holiday[];
  canModify?: boolean;
  initialMode?: 'scanner' | 'reports';
}

const GRADES = [
  "الأول الابتدائي", "الثاني الابتدائي", "الثالث الابتدائي", "الرابع الابتدائي", "الخامس الابتدائي", "السادس الابتدائي",
  "الأول المتوسط", "الثاني المتوسط", "الثالث المتوسط",
  "الرابع العلمي", "الرابع الأدبي", "الخامس العلمي", "الخامس الأدبي", "السادس العلمي", "السادس الأدبي"
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

function StatusStat({ label, value, color }: { label: string, value: string | number, color: 'emerald' | 'rose' | 'amber' | 'blue' | 'indigo' | 'slate' }) {
  const colors = {
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-100 shadow-emerald-100',
    rose: 'bg-rose-50 text-rose-700 border-rose-100 shadow-rose-100',
    amber: 'bg-amber-50 text-amber-700 border-amber-100 shadow-amber-100',
    blue: 'bg-blue-50 text-blue-700 border-blue-100 shadow-blue-100',
    indigo: 'bg-indigo-50 text-indigo-700 border-indigo-100 shadow-indigo-100',
    slate: 'bg-slate-50 text-slate-700 border-slate-200 shadow-slate-100'
  };

  return (
    <div className={`p-4 rounded-2xl border text-center space-y-2 shadow-lg transition-all hover:scale-105 ${colors[color]}`}>
      <h4 className="font-black text-xs opacity-80">{label}</h4>
      <p className="text-lg font-black text-slate-900 tracking-tight">{value}</p>
    </div>
  );
}

function ReportCard({ title, description, icon, color, onClick }: { title: string, description: string, icon: React.ReactNode, color: 'blue' | 'indigo' | 'amber' | 'emerald' | 'slate', onClick: () => void }) {
  const colors = {
    blue: 'text-blue-600 bg-blue-50 border-blue-100 hover:bg-blue-100/50',
    indigo: 'text-indigo-600 bg-indigo-50 border-indigo-100 hover:bg-indigo-100/50',
    amber: 'text-amber-600 bg-amber-50 border-amber-100 hover:bg-amber-100/50',
    emerald: 'text-emerald-600 bg-emerald-50 border-emerald-100 hover:bg-emerald-100/50',
    slate: 'text-slate-600 bg-slate-50 border-slate-200 hover:bg-slate-100/50'
  };

  return (
    <button
      onClick={onClick}
      className={`p-4 rounded-2xl border-2 flex flex-col items-center text-center gap-3 transition-all active:scale-95 group ${colors[color]}`}
    >
      <div className="p-4 bg-white rounded-3xl shadow-xl group-hover:scale-110 transition-transform">
        {icon}
      </div>
      <div>
        <h3 className="text-xl font-black mb-2">{title}</h3>
        <p className="text-xs font-bold opacity-60 leading-relaxed">{description}</p>
      </div>
      <div className="mt-4 w-full py-2 bg-white/50 rounded-2xl font-black text-sm group-hover:bg-white transition-colors">
        فتح التقرير الآن
      </div>
    </button>
  );
}

export default function AttendanceManager({ school, students, staff, attendanceRecords, holidays, canModify = true, initialMode = 'scanner' }: AttendanceManagerProps) {
  const [activeTab, setActiveTab] = useState<'students' | 'staff' | 'fingerprint' | 'reports' | 'data'>(initialMode === 'reports' ? 'reports' : 'students');
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
  const [reportType, setReportType] = useState<'daily' | 'monthly' | 'notifications' | 'details' | 'summary' | 'absence-list'>(initialMode === 'reports' ? 'absence-list' : 'daily');
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [editingReason, setEditingReason] = useState<{ id: string; name: string; reason: string } | null>(null);
  const [isRegisteringFingerprint, setIsRegisteringFingerprint] = useState<{ id: string, name: string, type: 'student' | 'staff' } | null>(null);
  const [tempFingerprintId, setTempFingerprintId] = useState('');
  const [isPreviewing, setIsPreviewing] = useState(initialMode === 'reports');
  const [confirmingAutoFill, setConfirmingAutoFill] = useState(false);
  const [confirmingClearRecords, setConfirmingClearRecords] = useState(false);

  const isSelectedDateHoliday = useMemo(() => {
    return holidays.some(h => h.date === selectedDate);
  }, [holidays, selectedDate]);

  const toggleHoliday = () => {
    const existing = holidays.find(h => h.date === selectedDate);
    if (existing) {
      localDb.delete('holidays', existing.id);
    } else {
      localDb.add('holidays', {
        schoolId: school.id,
        date: selectedDate,
        createdAt: new Date().toISOString()
      });
      // Also clear any "absent" records recorded for today to be safe
      const todayAbsences = dailyRecords.filter(r => r.status === 'absent');
      todayAbsences.forEach(r => localDb.delete('attendanceRecords', r.id));
    }
  };

  const clearDailyRecords = () => {
    dailyRecords.forEach(r => localDb.delete('attendanceRecords', r.id));
    setConfirmingClearRecords(false);
  };

const dailyReportRef = useRef<HTMLDivElement>(null);
  const handlePrintDailyReport = useReactToPrint({
    contentRef: dailyReportRef,
    documentTitle: `تقرير_الغياب_${selectedDate}`
  });

  const autoFillAbsences = () => {
    setConfirmingAutoFill(true);
  };
  
  const executeAutoFillAbsences = () => {
    setConfirmingAutoFill(false);
    
    const dayOfWeek = new Date(selectedDate).getDay();
    // 5 = Friday, 6 = Saturday
    if (dayOfWeek === 5 || dayOfWeek === 6 || isSelectedDateHoliday) {
      toast.info('اليوم عطلة رسمية ولن يتم تسجيل غيابات أو إرسال إشعارات.');
      return;
    }
    
    // Create a set of entityIds that already have records for today for O(1) lookup
    const existingEntityIds = new Set(dailyRecords.map(r => r.entityId));
    
    const newRecords: any[] = [];
    const newNotifications: any[] = [];
    const settings = WhatsAppService.getSettings(school.id);
    const useGateway = settings?.isEnabled && settings?.useGateway;

    // To optimize absence counting, we'll build a map of total absences per student once
    const totalAbsenceCounts = new Map<string, number>();
    attendanceRecords.forEach(r => {
      if (r.type === 'student' && r.status === 'absent') {
        totalAbsenceCounts.set(r.entityId, (totalAbsenceCounts.get(r.entityId) || 0) + 1);
      }
    });
    // Students
    students.forEach(student => {
      if (!existingEntityIds.has(student.id)) {
        newRecords.push({
          entityId: student.id,
          type: 'student',
          status: 'absent',
          date: selectedDate,
          createdAt: new Date().toISOString()
        });

        if (settings?.isEnabled && student.phone) {
          // Use our pre-calculated map for O(1) access
          const absenceCount = (totalAbsenceCounts.get(student.id) || 0) + 1;

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

      if (!existingEntityIds.has(member.id)) {
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
    
    toast.success(`تمت العملية بنجاح. تم تسجيل ${newRecords.length} حالة غياب.`);
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
      toast.info('لا يوجد غياب أو مخالفات لهذا اليوم.');
      return;
    }

    const absentStudentsByGrade = absentStudents.reduce((acc, student) => {
      if (!acc[student.grade]) acc[student.grade] = [];
      acc[student.grade].push(student);
      return acc;
    }, {} as Record<string, Student[]>);

    const absentNames: string[] = [];
    Object.keys(absentStudentsByGrade).sort().forEach(grade => {
      absentNames.push(`\n*الصف: ${grade}*`);
      absentStudentsByGrade[grade].forEach(s => {
        absentNames.push(`• ${s.name}`);
      });
      });

    const violationStudentsByGrade = violationStudents.reduce((acc, student) => {
      if (!acc[student.grade]) acc[student.grade] = [];
      acc[student.grade].push(student);
      return acc;
    }, {} as Record<string, Student[]>);

    const violationNames: string[] = [];
    Object.keys(violationStudentsByGrade).sort().forEach(grade => {
      violationNames.push(`\n*الصف: ${grade}*`);
      violationStudentsByGrade[grade].forEach(s => {
        const record = dailyRecords.find(r => r.entityId === s.id && r.type === 'student');
        violationNames.push(`• ${s.name} - ${record?.reason || 'مخالفة'}`);
      });
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
      toast.error('فشل في إرسال التقرير، يرجى التحقق من الإعدادات.');
    }
  };

  const dailyRecords = useMemo(() => {
    return attendanceRecords.filter(r => r.date === selectedDate);
  }, [attendanceRecords, selectedDate]);

  const handlePrintAbsenceReport = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const todayStr = format(new Date(selectedDate), 'yyyy/MM/dd', { locale: ar });

    let sectionsHtml = '';
    absenceReportData.forEach(gradeData => {
      gradeData.sections.forEach(section => {
        if (section.absentees.length > 0) {
          sectionsHtml += `
            <div class="print-page">
              <div class="header">
                <div class="school-info">
                  <h2>${school.name}</h2>
                  <p>${school.address || ''}</p>
                </div>
                <h1>كشف غيابات الطلاب اليومي</h1>
                <p class="meta">التاريخ: ${todayStr} | الصف: ${gradeData.grade} | الشعبة: ${section.name}</p>
              </div>
              
              <table>
                <thead>
                  <tr>
                    <th style="width: 60px;">ت</th>
                    <th>اسم الطالب الرباعي</th>
                    <th style="width: 150px;">رقم هاتف ولي الأمر</th>
                    <th style="width: 120px;">حالة المراسلة</th>
                    <th>ملاحظات</th>
                  </tr>
                </thead>
                <tbody>
                  ${section.absentees.map((s, idx) => `
                    <tr>
                      <td style="text-align: center; font-weight: bold;">${idx + 1}</td>
                      <td>${s.name}</td>
                      <td style="text-align: center; direction: ltr;">${s.phone || '-'}</td>
                      <td style="text-align: center; font-size: 10px; color: #666;">
                        ${s.record?.messageSent ? 'تم التبليغ' : 'انتظار التبليغ'}
                      </td>
                      <td></td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>

              <div class="summary-box">
                <span>إجمالي عدد الغائبين في الشعبة: ${section.absentees.length} طالب</span>
              </div>

              <div class="signatures">
                <div class="sig">
                  <p>توقيع معاون شؤون الطلاب</p>
                  <div class="line"></div>
                </div>
                <div class="sig">
                  <p>توقيع مدير المدرسة</p>
                  <div class="line"></div>
                </div>
              </div>
              
              <div class="footer-print">
                نظام الإدارة المدرسية الذكي - تاريخ الطباعة: ${format(new Date(), 'yyyy/MM/dd HH:mm')}
              </div>
            </div>
          `;
        }
      });
    });

    printWindow.document.write(`
      <html dir="rtl">
        <head>
          <title>كشف غيابات - ${todayStr}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;700;900&display=swap');
            * { box-sizing: border-box; }
            body { 
              font-family: 'Cairo', sans-serif; 
              padding: 0; 
              margin: 0;
              background: #fff;
            }
            .print-page { 
              page-break-after: always; 
              padding: 40px;
              min-height: 100vh;
              position: relative;
              border: 1px solid #eee;
            }
            .header { 
              text-align: center; 
              margin-bottom: 30px; 
              border-bottom: 4px double #000; 
              padding-bottom: 20px;
              position: relative;
            }
            .school-info {
              position: absolute;
              right: 0;
              top: 0;
              text-align: right;
            }
            .school-info h2 { margin: 0; font-size: 18px; color: #333; }
            .school-info p { margin: 2px 0; font-size: 12px; color: #666; }
            
            h1 { margin: 10px 0; font-size: 28px; font-weight: 900; color: #000; }
            .meta { font-size: 16px; font-weight: bold; color: #444; background: #f9f9f9; display: inline-block; padding: 5px 20px; border-radius: 10px; }
            
            table { width: 100%; border-collapse: collapse; margin-top: 20px; table-layout: fixed; }
            th, td { border: 2px solid #000; padding: 10px; text-align: right; overflow: hidden; word-wrap: break-word; }
            th { background-color: #f2f2f2; font-weight: 900; font-size: 14px; }
            td { font-size: 14px; font-weight: bold; }
            
            .summary-box {
              margin-top: 20px;
              padding: 10px;
              border: 2px solid #000;
              display: inline-block;
              font-weight: 900;
              font-size: 14px;
            }

            .signatures { 
              margin-top: 60px; 
              display: flex; 
              justify-content: space-around; 
              font-weight: bold; 
            }
            .sig { text-align: center; width: 250px; }
            .sig p { margin-bottom: 40px; font-size: 16px; }
            .sig .line { border-bottom: 2px solid #000; width: 100%; }
            
            .footer-print {
              position: absolute;
              bottom: 20px;
              left: 40px;
              right: 40px;
              border-top: 1px solid #ccc;
              padding-top: 10px;
              font-size: 10px;
              color: #999;
              display: flex;
              justify-content: space-between;
            }

            @media print {
              .print-page { border: none; padding: 20px; }
              @page { margin: 0.5cm; }
            }
          </style>
        </head>
        <body>
          ${sectionsHtml || '<div style="display:flex; height:100vh; align-items:center; justify-content:center; flex-direction:column;"><h2 style="font-size:40px; color:#ccc;">لا يوجد غيابات مسجلة</h2><p>تأكد من اختيار التاريخ الصحيح أو تسجيل الغيابات أولاً</p></div>'}
          <script>
            window.onload = () => {
              window.print();
              setTimeout(() => { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const absenceReportData = useMemo(() => {
    // Create lookup map for daily records
    const dailyRecordsMap = new Map<string, AttendanceRecord>();
    dailyRecords.forEach(r => {
      if (r.type === 'student') dailyRecordsMap.set(r.entityId, r);
      });

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
            const record = dailyRecordsMap.get(s.id);
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
    const dayOfWeek = new Date(selectedDate).getDay();
    if ((dayOfWeek === 5 || dayOfWeek === 6 || isSelectedDateHoliday) && status === 'absent') {
      toast.info('اليوم عطلة رسمية ولن يتم تسجيل غيابات.');
      return;
    }

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
    
    toast.success('تم تسجيل البصمة بنجاح');
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
          const operations = newRecords.map(record => {
            const existing = attendanceRecords.find(r => r.entityId === record.entityId && r.date === record.date && r.type === record.type);
            if (existing) {
              return { type: 'update', id: existing.id, data: { status: record.status, reason: record.reason } as any };
            } else {
              return { type: 'add', data: record };
            }
          }) as any[];
          
          await localDb.batch('attendanceRecords', operations);
          toast.success(`تم استيراد ${newRecords.length} سجل بنجاح`);
        } else {
          toast.info('لم يتم العثور على سجلات صالحة للاستيراد');
        }
      } catch (err) {
        console.error(err);
        toast.error('حدث خطأ أثناء استيراد الملف');
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
    <div className="space-y-2">
      {/* Shift and Auto Check Status Bar */}
      {school.shiftStartTime && school.shiftEndTime && (
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-4 rounded-2xl text-white flex flex-col md:flex-row items-center justify-between gap-3 shadow-xl shadow-blue-100">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-4 rounded-2xl backdrop-blur-sm">
              <Clock className="w-6 h-6 text-white" />
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
        {isSelectedDateHoliday && (
          <div className="w-full bg-amber-50 border border-amber-200 p-4 rounded-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-500 mb-2">
            <div className="p-2 bg-amber-100 text-amber-600 rounded-xl">
              <Coffee className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-black text-amber-900">هذا اليوم محدد كعطلة رسمية</h4>
              <p className="text-xs font-bold text-amber-700">لن يتم تسجيل غيابات تلقائية أو إرسال إشعارات غياب لهذا اليوم.</p>
            </div>
          </div>
        )}
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
          onClick={() => {
            setActiveTab('reports');
            setReportType('daily');
          }}
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
      
      {isSelectedDateHoliday && (
        <div className="bg-amber-50 border-2 border-amber-200 p-6 rounded-3xl flex items-center justify-between shadow-sm animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-amber-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-amber-200 rotate-3">
              <Coffee className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-2xl font-black text-amber-900 leading-none">اليوم عطلة رسمية</h3>
              <p className="text-amber-700 font-bold mt-2">لا يتم تسجيل غيابات أو إرسال إشعارات تلقائية في هذا اليوم</p>
            </div>
          </div>
          <button 
            onClick={toggleHoliday}
            className="px-6 py-3 bg-amber-600 text-white rounded-2xl font-black shadow-lg shadow-amber-200 hover:bg-amber-700 transition-all hover:scale-105 active:scale-95"
          >
            إلغاء العطلة وتفعيل الدوام
          </button>
        </div>
      )}

      {/* Date and Search Section */}
      <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm flex flex-col md:flex-row gap-2 items-center justify-between">
        <div className="flex items-center gap-2 w-full md:w-auto">
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
          <button
            onClick={toggleHoliday}
            className={`px-4 py-2 rounded-xl text-xs font-black border transition-all flex items-center gap-2 shadow-sm ${
              isSelectedDateHoliday 
                ? 'bg-amber-600 text-white border-amber-600 shadow-amber-100' 
                : 'bg-white text-amber-600 border-amber-100 hover:bg-amber-50'
            }`}
          >
            <Coffee className="w-4 h-4" />
            {isSelectedDateHoliday ? 'إلغاء يوم العطلة' : 'تحديد اليوم عطلة'}
          </button>
          <button
            onClick={() => setConfirmingClearRecords(true)}
            className="px-4 py-2 rounded-xl text-xs font-black border border-red-100 text-red-600 bg-white hover:bg-red-50 transition-all flex items-center gap-2 shadow-sm"
          >
            <Trash2 className="w-4 h-4" />
            تصفير سجل اليوم
          </button>
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

      
        <div
          key={activeTab}
        >
          {activeTab === 'students' && (
            <motion.div 
              initial="hidden"
              animate="visible"
              variants={{
                hidden: { opacity: 0, y: 20 },
                visible: { opacity: 1, y: 0 }
              }}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"
            >
              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-right border-collapse">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="px-3 py-1.5 min-h-[38px] text-xs font-black text-gray-500 w-16 text-center">#</th>
                      <th className="px-3 py-1.5 min-h-[38px] text-xs font-black text-gray-500 max-w-[200px]">الطالب</th>
                      <th className="px-3 py-1.5 min-h-[38px] text-xs font-black text-gray-500">حالة الحضور اليومية</th>
                      <th className="px-3 py-1.5 min-h-[38px] text-xs font-black text-gray-500">ملاحظات</th>
                      <th className="px-3 py-1.5 min-h-[38px] text-xs font-black text-gray-500 w-32 text-center">إجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filteredStudents.map((student, idx) => {
                      const record = dailyRecords.find(r => r.entityId === student.id && r.type === 'student');
                      const status = record?.status;
                      
                      return (
                        <tr key={student.id} className="hover:bg-blue-50/20 transition-colors group">
                          <td className="px-3 py-1.5 min-h-[38px] text-center">
                            <span className="w-6 h-6 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center text-xs font-black text-gray-400 mx-auto">
                              {idx + 1}
                            </span>
                          </td>
                          <td className="px-3 py-1.5 min-h-[38px]">
                            <div className="flex items-center gap-3">
                              <div className="w-6 h-6 rounded-xl bg-gray-100 overflow-hidden text-gray-400 flex items-center justify-center shrink-0">
                                {student.photo ? <img src={student.photo} alt={student.name} className="w-full h-full object-cover" /> : <Users className="w-5 h-5" />}
                              </div>
                              <div>
                                <h4 className="font-black text-gray-900 text-sm">{student.name}</h4>
                                <span className="text-[10px] text-gray-500 font-bold">{student.grade}</span>
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-1.5 min-h-[38px]">
                            <div className="flex flex-wrap gap-1.5 items-center">
                              {[
                                { id: 'present', label: 'حاضر', color: 'emerald', icon: CheckCircle2 },
                                { id: 'absent', label: 'غائب', color: 'red', icon: XCircle },
                                { id: 'late', label: 'متأخر', color: 'yellow', icon: Clock },
                                { id: 'excused', label: 'مجاز', color: 'gray', icon: Info },
                                { id: 'violation', label: 'مخالف', color: 'indigo', icon: AlertCircle },
                              ].map(option => {
                                const isActive = status === option.id;
                                const Icon = option.icon;
                                return (
                                  <button
                                    key={option.id}
                                    onClick={() => updateAttendance(student.id, 'student', option.id as any)}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black transition-all ${
                                      isActive 
                                        ? `bg-${option.color}-600 text-white shadow-md shadow-${option.color}-200 scale-105` 
                                        : `bg-gray-50 text-gray-500 border border-gray-100 hover:bg-${option.color}-50 hover:text-${option.color}-600 hover:border-${option.color}-200`
                                    }`}
                                  >
                                    {isActive ? <Icon className="w-3.5 h-3.5" /> : null}
                                    {option.label}
                                  </button>
    );
                              })}
                            </div>
                          </td>
                          <td className="px-3 py-1.5 min-h-[38px] max-w-[150px]">
                            {record?.reason ? (
                              <div className="truncate text-[10px] font-bold text-gray-500 bg-gray-50 px-3 py-1.5 rounded-lg inline-block border border-gray-100" title={record.reason}>
                                {record.reason}
                              </div>
                            ) : (
                              <span className="text-[10px] text-gray-300 font-bold px-2">-</span>
                            )}
                          </td>
                          <td className="px-3 py-1.5 min-h-[38px]">
                            <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button 
                                onClick={() => setEditingReason({ 
                                  id: student.id, 
                                  name: student.name, 
                                  reason: record?.reason || '' 
                                })}
                                className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                title="إضافة ملاحظة"
                              >
                                <FileText className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={() => {
                                  let type: 'warning' | 'summons' | 'expulsion' | 'absence' | 'violation' = 
                                    (status === 'violation' || status === 'dismissed') ? 'violation' : 'absence';
                                  setShowNotificationModal({ student, type });
                                }}
                                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="إشعار يومي"
                              >
                                <MessageSquare className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={() => {
                                  const count = attendanceRecords.filter(r => r.entityId === student.id && r.status === 'absent').length;
                                  let type: 'warning' | 'summons' | 'expulsion' = 'warning';
                                  if (count >= 12) type = 'expulsion';
                                  else if (count >= 10) type = 'summons';
                                  setShowNotificationModal({ student, type });
                                }}
                                className="p-1.5 text-gray-400 hover:text-yellow-600 hover:bg-yellow-50 rounded-lg transition-colors"
                                title="إنذارات متقدمة"
                              >
                                <AlertCircle className="w-4 h-4" />
                              </button>
                              {canModify && (
                                <button 
                                  onClick={() => setIsRegisteringFingerprint({ id: student.id, name: student.name, type: 'student' })}
                                  className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                                  title="تسجيل بصمة"
                                >
                                  <Fingerprint className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
    );
                    })}
                  </tbody>
                </table>
              </div>
              {filteredStudents.length === 0 && (
                <div className="text-center py-20 text-gray-400">
                  <div className="w-10 h-10 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border-2 border-dashed border-gray-200">
                     <Users className="w-6 h-6 text-gray-300" />
                  </div>
                  <p className="font-bold">لا يوجد طلاب متطابقين مع البحث</p>
                </div>
              )}
            </motion.div>
          )}


          {activeTab === 'staff' && (
            <motion.div 
              initial="hidden"
              animate="visible"
              variants={{
                hidden: { opacity: 0, y: 20 },
                visible: { opacity: 1, y: 0 }
              }}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"
            >
              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-right border-collapse">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="px-3 py-1.5 min-h-[38px] text-xs font-black text-gray-500 w-16 text-center">#</th>
                      <th className="px-3 py-1.5 min-h-[38px] text-xs font-black text-gray-500 max-w-[200px]">الكادر</th>
                      <th className="px-3 py-1.5 min-h-[38px] text-xs font-black text-gray-500">حالة الدوام اليومية</th>
                      <th className="px-3 py-1.5 min-h-[38px] text-xs font-black text-gray-500">ملاحظات</th>
                      <th className="px-3 py-1.5 min-h-[38px] text-xs font-black text-gray-500">استقطاع غياب</th>
                      <th className="px-3 py-1.5 min-h-[38px] text-xs font-black text-gray-500 w-32 text-center">إجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filteredStaff.map((member, idx) => {
                      const record = dailyRecords.find(r => r.entityId === member.id && r.type === 'staff');
                      const status = record?.status;
                      const dayOfWeek = new Date(selectedDate).getDay();
                      const isWorkingDay = (member.workingDays || [0,1,2,3,4,5]).includes(dayOfWeek);
                      
                      return (
                        <tr key={member.id} className={`hover:bg-blue-50/20 transition-colors group ${!isWorkingDay ? 'bg-gray-50/50 grayscale-[0.2]' : ''}`}>
                          <td className="px-3 py-1.5 min-h-[38px] text-center">
                            <span className="w-6 h-6 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center text-xs font-black text-gray-400 mx-auto">
                              {idx + 1}
                            </span>
                          </td>
                          <td className="px-3 py-1.5 min-h-[38px]">
                            <div className="flex items-center gap-3">
                              <div className="w-6 h-6 rounded-xl bg-blue-50 overflow-hidden text-blue-600 flex items-center justify-center shrink-0">
                                {member.photo ? <img src={member.photo} alt={member.name} className="w-full h-full object-cover" /> : <UserCheck className="w-5 h-5" />}
                              </div>
                              <div>
                                <h4 className="font-black text-gray-900 text-sm">{member.name}</h4>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className="text-[10px] text-gray-500 font-bold">{member.role}</span>
                                  {!isWorkingDay && <span className="text-[8px] bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded font-black">إجازة/عطلة</span>}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-1.5 min-h-[38px]">
                            <div className="flex flex-wrap gap-2 items-center">
                              {[
                                { id: 'present', label: 'حاضر', color: 'emerald', icon: CheckCircle2 },
                                { id: 'absent', label: 'غائب', color: 'red', icon: XCircle },
                              ].map(option => {
                                const isActive = status === option.id;
                                const Icon = option.icon;
                                return (
                                  <button
                                    key={option.id}
                                    onClick={() => updateAttendance(member.id, 'staff', option.id as any)}
                                    className={`flex items-center justify-center min-w-[80px] gap-1.5 px-4 py-2 rounded-xl text-xs font-black transition-all ${
                                      isActive 
                                        ? `bg-${option.color}-600 text-white shadow-lg shadow-${option.color}-200 scale-105` 
                                        : `bg-gray-50 text-gray-500 border border-gray-100 hover:bg-${option.color}-50 hover:text-${option.color}-600 focus:outline-none`
                                    }`}
                                  >
                                    <Icon className="w-4 h-4" />
                                    {option.label}
                                  </button>
    );
                              })}
                            </div>
                          </td>
                          <td className="px-3 py-1.5 min-h-[38px] max-w-[150px]">
                            {record?.reason ? (
                              <div className="truncate text-[10px] font-bold text-gray-500 bg-gray-50 px-3 py-1.5 rounded-lg inline-block border border-gray-100" title={record.reason}>
                                {record.reason}
                              </div>
                            ) : (
                              <span className="text-[10px] text-gray-300 font-bold px-2">-</span>
                            )}
                          </td>
                          <td className="px-3 py-1.5 min-h-[38px]">
                            {status === 'absent' && member.deductionAmount > 0 ? (
                               <span className="text-xs font-black text-rose-600 bg-rose-50 px-3 py-1.5 rounded-lg border border-rose-100 inline-flex">
                                  {member.deductionAmount.toLocaleString()} د.ع
                               </span>
                            ) : (
                               <span className="text-gray-300">-</span>
                            )}
                          </td>
                          <td className="px-3 py-1.5 min-h-[38px]">
                            <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button 
                                onClick={() => setEditingReason({ 
                                  id: member.id, 
                                  name: member.name, 
                                  reason: record?.reason || '' 
                                })}
                                className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors shrink-0"
                                title="إضافة ملاحظة/عذر"
                              >
                                <FileText className="w-4 h-4" />
                              </button>
                              {canModify && (
                                <button 
                                  onClick={() => setIsRegisteringFingerprint({ id: member.id, name: member.name, type: 'staff' })}
                                  className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-colors shrink-0"
                                  title="تسجيل جهاز البصمة"
                                >
                                  <Fingerprint className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
    );
                    })}
                  </tbody>
                </table>
              </div>
              {filteredStaff.length === 0 && (
                <div className="text-center py-20 text-gray-400">
                  <div className="w-10 h-10 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border-2 border-dashed border-gray-200">
                     <UserCheck className="w-6 h-6 text-gray-300" />
                  </div>
                  <p className="font-bold">لا يوجد كادر متطابق مع البحث</p>
                </div>
              )}
            </motion.div>
          )}

        {activeTab === 'fingerprint' && (
          <div
            className="grid grid-cols-1 lg:grid-cols-2 gap-2"
          >
            {/* Virtual Fingerprint Hub */}
            <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col items-center justify-center text-center space-y-2 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-5">
                <div className="flex items-center gap-2 text-blue-600 bg-blue-50 px-4 py-2 rounded-2xl border border-blue-100">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-ping"></div>
                  <span className="text-xs font-black">المستشعر جاهز</span>
                </div>
              </div>

              <div className="relative group cursor-pointer" onClick={() => setIsFingerprintActive(true)}>
                <div className={`w-48 h-48 rounded-2xl flex items-center justify-center transition-all duration-500 ${
                  fingerprintStatus === 'idle' ? 'bg-gray-100 text-gray-400 group-hover:bg-blue-50 group-hover:text-blue-500' :
                  fingerprintStatus === 'scanning' ? 'bg-blue-100 text-blue-600 animate-pulse' :
                  fingerprintStatus === 'success' ? 'bg-emerald-100 text-emerald-600 scale-105' :
                  'bg-red-100 text-red-600'
                }`}>
                  <Fingerprint className={`w-10 h-10 ${fingerprintStatus === 'scanning' ? 'animate-bounce' : ''}`} />
                </div>
                
                {fingerprintStatus === 'scanning' && (
                  <div
                    className="absolute left-0 right-0 h-1 bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.8)] z-10"
                  />
                )}
              </div>

              <div>
                <h3 className="text-lg font-black text-slate-900 tracking-tight text-gray-900">
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
                    className="w-full bg-gray-50 border-2 border-dashed border-gray-200 rounded-3xl pr-12 pl-6 py-6 font-black text-center text-xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-50 transition-all placeholder:text-gray-300"
                  />
                </div>
                <p className="text-[10px] text-gray-400 mt-4 font-bold italic">
                  * ملاحظة: هذا المستشعر مبرمج للتعرف التلقائي الفوري لكافة أقسام المدرسة
                </p>
              </div>
            </div>

            {/* Quick Registration / Information */}
            <div className="space-y-2">
              <div className="bg-gradient-to-br from-gray-900 to-slate-800 p-5 rounded-2xl text-white shadow-xl relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-full opacity-10">
                  <Fingerprint className="w-64 h-64 -translate-x-10 -translate-y-10 rotate-12" />
                </div>
                <h4 className="text-xl font-black mb-6 flex items-center gap-3 relative z-10">
                  <Zap className="text-yellow-400 w-6 h-6" />
                  التسجيل السريع للبصمة
                </h4>
                <div className="space-y-2 relative z-10">
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
                <div
                  className={`p-5 rounded-2xl border-2 shadow-sm flex items-center gap-3 ${
                    lastScanned.status === 'absent' ? 'bg-red-50 border-red-200' : 'bg-emerald-50 border-emerald-200'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-3xl flex items-center justify-center ${
                    lastScanned.status === 'absent' ? 'bg-red-600 text-white' : 'bg-emerald-600 text-white'
                  }`}>
                    {lastScanned.status === 'absent' ? <XCircle className="w-6 h-6" /> : <CheckCircle2 className="w-6 h-6" />}
                  </div>
                  <div>
                    <h4 className="text-lg font-black text-gray-900">{lastScanned.name}</h4>
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
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'reports' && (
          <div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3"
          >
            {/* Report Type Selection Cards */}
            <ReportCard 
              title="تقرير الحضور اليومي"
              description="إحصائيات الغياب والحضور الشاملة لليوم المحدد."
              icon={<FileText className="w-6 h-6" />}
              color="blue"
              onClick={() => {
                setReportType('daily');
                setIsPreviewing(true);
              }}
            />
            <ReportCard 
              title="تقرير الاستقطاعات الشهري"
              description="حساب أيام غياب الكادر وتجهيز ملف الرواتب."
              icon={<CalendarIcon className="w-6 h-6" />}
              color="indigo"
              onClick={() => {
                setReportType('monthly');
                setIsPreviewing(true);
              }}
            />
            <ReportCard 
              title="سجل التنبيهات"
              description="مراجعة كافة الرسائل المرسلة لأولياء الأمور."
              icon={<MessageSquare className="w-6 h-6" />}
              color="amber"
              onClick={() => {
                setReportType('notifications');
                setIsPreviewing(true);
              }}
            />
            <ReportCard 
              title="قائمة الغيابات للطباعة"
              description="تقرير نهائي بأسماء الغائبين مرتب حسب الصفوف للطباعة."
              icon={<Printer className="w-6 h-6" />}
              color="slate"
              onClick={() => {
                setReportType('absence-list');
                setIsPreviewing(true);
              }}
            />
            <ReportCard 
              title="سجل الملاحظات والأسباب"
              description="عرض مبررات الغياب والملاحظات المسجلة."
              icon={<Info className="w-6 h-6" />}
              color="emerald"
              onClick={() => {
                setReportType('details');
                setIsPreviewing(true);
              }}
            />
            <ReportCard 
              title="سجل الحضور المنظم"
              description="عرض البيانات بشكل ورقي منظم لجميع الطلاب."
              icon={<FileSpreadsheet className="w-6 h-6" />}
              color="slate"
              onClick={() => {
                setReportType('summary');
                setIsPreviewing(true);
              }}
            />
          </div>
        )}

      
        {isPreviewing && (
          <div className="integrated-page">
            <div className="modal-content">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-white relative z-50 sticky top-0 shadow-sm px-12">
                <div className="flex items-center gap-3 text-right leading-relaxed">
                  <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl text-slate-800 shadow-sm">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-900 tracking-tight text-slate-900 tracking-tight leading-relaxed">
                      {reportType === 'daily' ? 'تقرير الحضور اليومي' : 
                       reportType === 'monthly' ? 'تقرير الاستقطاعات الشهري' :
                       reportType === 'notifications' ? 'سجل التنبيهات' :
                       reportType === 'details' ? 'سجل الملاحظات والأسباب' :
                       reportType === 'absence-list' ? 'كشف غياب الطلاب المخصص للطباعة' :
                       'سجل الحضور العام المنظم'}
                    </h3>
                    <p className="text-sm font-bold text-slate-400 mt-1 leading-relaxed">
                      تاريخ التقرير: {reportType === 'monthly' ? format(new Date(selectedMonth), 'MMMM yyyy', { locale: ar }) : format(new Date(selectedDate), 'yyyy-MM-dd')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {reportType === 'monthly' && (
                    <input
                      type="month"
                      value={selectedMonth}
                      onChange={(e) => setSelectedMonth(e.target.value)}
                      className="bg-slate-50 border border-slate-200 rounded-2xl px-3 py-1.5 min-h-[38px] font-black outline-none focus:ring-4 focus:ring-blue-100 transition-all ml-4"
                    />
                  )}
                  {reportType === 'daily' && (
                     <button
                        onClick={handlePrintDailyReport}
                        className="bg-slate-900 text-white px-8 py-2 rounded-xl font-black text-sm flex items-center gap-3 hover:bg-black transition-all shadow-xl shadow-slate-200"
                      >
                        <Printer className="w-5 h-5" />
                        طباعة السجل
                      </button>
                  )}
                  {reportType === 'absence-list' && (
                     <button
                        onClick={handlePrintAbsenceReport}
                        className="theme-bg text-white px-8 py-2 rounded-xl font-black text-sm flex items-center gap-3 hover:scale-105 transition-all shadow-xl theme-shadow"
                      >
                        <Printer className="w-5 h-5" />
                        إرسال إلى الطابعة
                      </button>
                  )}
                  <button 
                    onClick={() => setIsPreviewing(false)} 
                    className="p-4 hover:bg-rose-50 rounded-2xl transition-all text-slate-300 hover:text-rose-500 border border-slate-50"
                  >
                    <ArrowLeftRight className="w-6 h-6 rotate-45" />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 bg-slate-50/30 custom-scrollbar">
                <div className="w-full mx-auto">
                  {reportType === 'daily' && (
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                        <StatusStat label="حاضرون" value={dailyRecords.filter(r => r.status === 'present').length} color="emerald" />
                        <StatusStat label="غائبون" value={dailyRecords.filter(r => r.status === 'absent').length} color="rose" />
                        <StatusStat label="متأخرون" value={dailyRecords.filter(r => r.status === 'late').length} color="amber" />
                        <StatusStat label="طرد" value={dailyRecords.filter(r => r.status === 'dismissed').length} color="blue" />
                        <StatusStat label="مخالفة" value={dailyRecords.filter(r => r.status === 'violation').length} color="indigo" />
                        <StatusStat label="نسبة الحضور" value={`${students.length + staff.length > 0 ? Math.round((dailyRecords.filter(r => r.status === 'present').length / (students.length + staff.length)) * 100) : 0}%`} color="slate" />
                      </div>

                      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                        <table className="w-full text-right border-collapse">
                          <thead>
                            <tr className="bg-slate-50 text-slate-500 border-b border-slate-100">
                              <th className="p-4 font-black">الاسم</th>
                              <th className="p-4 font-black">النوع</th>
                              <th className="p-4 font-black text-center">الحالة</th>
                              <th className="p-4 font-black text-center">وقت المسح</th>
                              <th className="p-4 font-black">ملاحظات</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50">
                            {[...students, ...staff].map(person => {
                              const type = students.includes(person as Student) ? 'student' : 'staff';
                              const record = dailyRecords.find(r => r.entityId === person.id && r.type === type);
                              return (
                                <tr key={person.id} className="hover:bg-slate-50/50 transition-colors">
                                  <td className="p-4 text-sm font-black text-slate-900">{person.name}</td>
                                  <td className="p-4 text-xs font-bold text-slate-400">{type === 'student' ? 'طالب' : 'موظف'}</td>
                                  <td className="p-4 text-center">
                                    <span className={`px-4 py-1.5 rounded-full text-[10px] font-black border ${record ? STATUS_CONFIG[record.status].bg : 'bg-slate-50 text-slate-400 border-slate-100'}`}>
                                      {record ? STATUS_CONFIG[record.status].label : 'غير مؤشر'}
                                    </span>
                                  </td>
                                  <td className="p-4 text-center text-xs font-mono font-bold text-slate-400">
                                    {record?.scanTime ? format(new Date(record.scanTime), 'HH:mm:ss') : '---'}
                                  </td>
                                  <td className="p-4 text-xs font-bold text-slate-500 max-w-xs truncate">{record?.reason || '---'}</td>
                                </tr>
    );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {reportType === 'summary' && (
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-xl overflow-hidden">
                      <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                        <div>
                          <h3 className="text-lg font-black text-slate-900 leading-relaxed">سجل الحضور اليومي المنظم الشامل</h3>
                          <p className="text-sm font-bold text-slate-400">تاريخ: {format(new Date(selectedDate), 'EEEE, d MMMM yyyy', { locale: ar })}</p>
                        </div>
                        <button
                          onClick={sendSummaryToGroup}
                          className="bg-emerald-600 text-white px-8 py-2 rounded-2xl font-black text-sm flex items-center gap-3 hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-100 active:scale-95"
                        >
                          <Share2 className="w-5 h-5" />
                          إرسال للمجموعة
                        </button>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-right">
                          <thead className="bg-slate-100 text-slate-600">
                            <tr>
                              <th className="p-4 font-black w-20 text-center">ت</th>
                              <th className="p-4 font-black">الاسم الرباعي</th>
                              <th className="p-4 font-black text-center">الصف</th>
                              <th className="p-4 font-black text-center">الحالة الرقمية</th>
                              <th className="p-4 font-black text-center">التوقيت</th>
                              <th className="p-4 font-black">الملاحظات</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50">
                            {students.sort((a,b) => a.name.localeCompare(b.name, 'ar')).map((student, idx) => {
                              const record = dailyRecords.find(r => r.entityId === student.id && r.type === 'student');
                              return (
                                <tr key={student.id} className="hover:bg-slate-50 transition-colors">
                                  <td className="p-4 text-xs font-bold text-slate-400 text-center">{idx + 1}</td>
                                  <td className="p-4 text-sm font-black text-slate-900">{student.name}</td>
                                  <td className="p-4 text-center">
                                    <span className="text-[10px] font-black text-indigo-500 bg-indigo-50 px-3 py-1 rounded-lg border border-indigo-100">
                                      {student.grade}
                                    </span>
                                  </td>
                                  <td className="p-4 text-center">
                                    {record ? (
                                      <span className={`px-4 py-1.5 rounded-full text-[10px] font-black border ${STATUS_CONFIG[record.status].bg} ${STATUS_CONFIG[record.status].text} ${STATUS_CONFIG[record.status].border}`}>
                                        {STATUS_CONFIG[record.status].label}
                                      </span>
                                    ) : (
                                      <span className="px-4 py-1.5 rounded-full text-[10px] font-black bg-slate-50 text-slate-300 border border-slate-100">غير مؤشر</span>
                                    )}
                                  </td>
                                  <td className="p-4 text-center text-[11px] font-mono font-bold text-slate-400">
                                    {record?.scanTime ? format(new Date(record.scanTime), 'HH:mm:ss') : '---'}
                                  </td>
                                  <td className="p-4 text-xs font-bold text-slate-500">{record?.reason || '---'}</td>
                                </tr>
    );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {reportType === 'monthly' && (
                    <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xl overflow-hidden">
                      <div className="flex items-center gap-3 mb-12 border-b border-slate-100 pb-4">
                        <div className="p-5 bg-blue-50 text-blue-600 rounded-2xl">
                          <CalendarIcon className="w-6 h-6" />
                        </div>
                        <div>
                          <h3 className="text-lg font-black text-slate-900 tracking-tight text-slate-900">سجل الاستقطاعات والغياب الشهري للكادر</h3>
                          <p className="text-sm font-bold text-slate-400 mt-1">شهر: {format(new Date(selectedMonth), 'MMMM yyyy', { locale: ar })}</p>
                        </div>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-right border-collapse">
                          <thead>
                            <tr className="bg-slate-50 text-slate-600 font-black border-b border-slate-100">
                              <th className="p-4 rounded-tr-2xl">الموظف</th>
                              <th className="p-4 text-center">أيام الغياب</th>
                              <th className="p-4 text-center">أيام الحضور</th>
                              <th className="p-4 text-center">الاستقطاع اليومي</th>
                              <th className="p-4 text-center">إجمالي الاستقطاع</th>
                              <th className="p-4 rounded-tl-2xl text-center">صافي الراتب المتوقع</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50">
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
                                <tr key={member.id} className="hover:bg-slate-50 transition-colors">
                                  <td className="p-4">
                                    <div className="font-black text-slate-900 text-lg">{member.name}</div>
                                    <div className="text-[10px] text-slate-400 font-bold">{member.role}</div>
                                  </td>
                                  <td className="p-4 text-center font-black text-rose-600 bg-rose-50/30">{absences} أيام</td>
                                  <td className="p-4 text-center font-black text-emerald-600">{present} أيام</td>
                                  <td className="p-4 text-center font-bold text-slate-500">{formatCurrency(member.deductionAmount || 0)}</td>
                                  <td className="p-4 text-center font-black text-rose-700">{formatCurrency(totalDeduction)}</td>
                                  <td className="p-4 text-center font-black text-indigo-600 text-xl">{formatCurrency(member.salary - totalDeduction)}</td>
                                </tr>
    );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {reportType === 'absence-list' && (
                    <div className="space-y-2 pb-4">
                      {absenceReportData.map((gradeData, gIdx) => (
                        <div key={gIdx} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden anim-fade-in" style={{ animationDelay: `${gIdx * 0.1}s` }}>
                          <div className="theme-bg p-5 flex justify-between items-center text-white">
                            <h4 className="text-lg font-black">{gradeData.grade}</h4>
                            <div className="bg-white/20 px-6 py-2 rounded-full font-bold text-sm">
                              {gradeData.sections.reduce((sum, s) => sum + s.absentees.length, 0)} غائب
                            </div>
                          </div>
                          
                          <div className="p-5 space-y-2">
                            {gradeData.sections.map((section, sIdx) => (
                              <div key={sIdx} className="border border-slate-50 rounded-2xl p-4 bg-slate-50/30">
                                <div className="flex items-center justify-between mb-6 border-b border-slate-100 pb-4">
                                  <h5 className="text-xl font-black text-slate-700">شعبة: ( {section.name} )</h5>
                                  <span className="text-xs font-bold text-slate-400">عدد الطلاب: {section.absentees.length}</span>
                                </div>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                                  {section.absentees.length > 0 ? (
                                    section.absentees.map((st, stIdx) => (
                                      <div key={stIdx} className="bg-white p-4 rounded-xl border border-slate-100 flex items-center justify-between shadow-sm group">
                                        <div className="flex items-center gap-3">
                                          <div className="w-6 h-6 rounded-lg bg-rose-50 text-rose-500 flex items-center justify-center font-black text-xs">
                                            {stIdx + 1}
                                          </div>
                                          <span className="font-bold text-slate-800">{st.name}</span>
                                        </div>
                                      </div>
                                    ))
                                  ) : (
                                    <div className="col-span-full py-2 text-center text-slate-300 font-bold italic">لا يوجد غياب في هذه الشعبة</div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                      
                      {absenceReportData.every(g => g.sections.every(s => s.absentees.length === 0)) && (
                        <div className="text-center py-20">
                          <div className="w-40 h-40 bg-emerald-50 text-emerald-300 rounded-full flex items-center justify-center mx-auto mb-6">
                            <CheckCircle2 className="w-20 h-20" />
                          </div>
                          <h4 className="text-lg font-black text-slate-400">لا يوجد غيابات مسجلة لهذا اليوم</h4>
                        </div>
                      )}
                    </div>
                  )}

                  {reportType === 'notifications' && (
                    <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xl overflow-hidden">
                      <div className="flex items-center gap-3 mb-12 border-b border-slate-100 pb-4">
                        <div className="p-5 bg-amber-50 text-amber-600 rounded-2xl">
                          <MessageSquare className="w-6 h-6" />
                        </div>
                        <div>
                          <h3 className="text-lg font-black text-slate-900 tracking-tight text-slate-900">سجل الاتصالات والتنبيهات الموثق</h3>
                          <p className="text-sm font-bold text-slate-400 mt-1">تتبع كافة الإشعارات المرسلة لأولياء الأمور عبر النظام</p>
                        </div>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-right border-collapse">
                          <thead className="bg-slate-50 text-slate-600">
                            <tr className="border-b border-slate-100 font-black">
                              <th className="p-4 rounded-tr-2xl">تاريخ الإرسال</th>
                              <th className="p-4">اسم الطالب</th>
                              <th className="p-4 text-center">نوع التنبيه</th>
                              <th className="p-4">محتوى الرسالة</th>
                              <th className="p-4 rounded-tl-2xl text-center">الحالة</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50">
                            {(localDb.getAll('parentNotifications') as ParentNotification[]).sort((a,b) => b.date.localeCompare(a.date)).map(notif => {
                              const student = students.find(s => s.id === notif.studentId);
                              return (
                                <tr key={notif.id} className="hover:bg-amber-50/20 transition-all">
                                  <td className="p-4 text-[11px] font-black text-slate-400 bg-slate-50/50">{format(new Date(notif.date), 'yyyy/MM/dd HH:mm')}</td>
                                  <td className="p-4 font-black text-slate-900">{student?.name || '---'}</td>
                                  <td className="p-4 text-center">
                                    <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black ${
                                      notif.type === 'absence' ? 'bg-rose-50 text-rose-600 border border-rose-100' : 
                                      notif.type === 'summons' ? 'bg-amber-50 text-amber-600 border border-amber-100' : 
                                      'bg-indigo-50 text-indigo-600 border border-indigo-100'
                                    }`}>
                                      {notif.type === 'absence' ? 'تبليغ غياب' : notif.type === 'summons' ? 'استدعاء ولي أمر' : 'إنذار رسمي'}
                                    </span>
                                  </td>
                                  <td className="p-4 text-[10px] font-bold text-slate-500 leading-relaxed max-w-sm">{notif.content}</td>
                                  <td className="p-4 text-center">
                                    <span className="flex items-center justify-center gap-2 text-emerald-600 font-black text-xs bg-emerald-50 py-2 rounded-xl border border-emerald-100">
                                      <CheckCircle2 className="w-4 h-4" />
                                      مرسلة ومؤكدة
                                    </span>
                                  </td>
                                </tr>
    );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {reportType === 'details' && (
                    <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xl overflow-hidden">
                      <div className="flex items-center gap-3 mb-12 border-b border-slate-100 pb-4">
                        <div className="p-5 bg-emerald-50 text-emerald-600 rounded-2xl">
                          <Info className="w-6 h-6" />
                        </div>
                        <div>
                          <h3 className="text-lg font-black text-slate-900 tracking-tight text-slate-900">سجل التبريرات والملاحظات الميدانية</h3>
                          <p className="text-sm font-bold text-slate-400 mt-1">عرض الأسباب والملاحظات المسجلة للحضور والغياب اليومي</p>
                        </div>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-right border-collapse">
                          <thead className="bg-slate-50 text-slate-600">
                            <tr className="border-b border-slate-100 font-black">
                              <th className="p-4 rounded-tr-2xl">الاسم</th>
                              <th className="p-4 text-center">النوع</th>
                              <th className="p-4 text-center">الحالة</th>
                              <th className="p-4">العذر / الملاحظة</th>
                              <th className="p-4 rounded-tl-2xl text-center">توقيت المسح</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50">
                            {dailyRecords.filter(r => r.reason || r.status !== 'present').map(record => {
                              const person = record.type === 'student' ? students.find(s => s.id === record.entityId) : staff.find(s => s.id === record.entityId);
                              return (
                                <tr key={record.id} className="hover:bg-slate-50 transition-colors">
                                  <td className="p-4 font-black text-slate-900">{person?.name || '---'}</td>
                                  <td className="p-4 text-center text-xs font-bold text-slate-400">{record.type === 'student' ? 'طالب' : 'موظف'}</td>
                                  <td className="p-4 text-center">
                                     <span className={`px-4 py-1.5 rounded-full text-[10px] font-black border ${STATUS_CONFIG[record.status].bg} ${STATUS_CONFIG[record.status].text} ${STATUS_CONFIG[record.status].border}`}>
                                        {STATUS_CONFIG[record.status].label}
                                     </span>
                                  </td>
                                  <td className="p-4 font-bold text-slate-600 bg-slate-50/30">{record.reason || '---'}</td>
                                  <td className="p-4 text-center text-xs font-mono font-bold text-slate-400">{record.scanTime ? format(new Date(record.scanTime), 'HH:mm:ss') : '---'}</td>
                                </tr>
    );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      

      {activeTab === 'data' && (
            <div
              className="grid grid-cols-1 md:grid-cols-2 gap-2"
            >
              {/* Students Data Center */}
              <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-2 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                   <Users className="w-32 h-32 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-gray-900 mb-2">بيانات حضور الطلاب</h3>
                  <p className="text-sm font-bold text-gray-500">تصدير واستيراد سجلات الحضور الخاصة بالطلاب لهذا اليوم أو كقالب عام.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    onClick={() => handleExport('student')}
                    className="flex flex-col items-center justify-center gap-3 p-5 rounded-2xl bg-blue-50 border-2 border-blue-100 text-blue-700 hover:bg-blue-100 transition-all group"
                  >
                    <Download className="w-6 h-6 group-hover:bounce" />
                    <span className="font-black">تصدير الحضور الحالي</span>
                  </button>
                  <label className="flex flex-col items-center justify-center gap-3 p-5 rounded-2xl bg-emerald-50 border-2 border-emerald-100 text-emerald-700 hover:bg-emerald-100 transition-all cursor-pointer group">
                    <Upload className="w-6 h-6 group-hover:bounce" />
                    <span className="font-black">استيراد سجل الحضور</span>
                    <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={(e) => handleImport('student', e)} />
                  </label>
                  <button 
                    onClick={handleExportTemplate}
                    className="sm:col-span-2 flex items-center justify-center gap-3 p-4 rounded-2xl bg-indigo-50 border-2 border-indigo-100 text-indigo-700 hover:bg-indigo-100 transition-all font-black"
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
              <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-2 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                   <UserCheck className="w-32 h-32 text-purple-600" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-gray-900 mb-2">بيانات حضور الكادر</h3>
                  <p className="text-sm font-bold text-gray-500">تصدير واستيراد سجلات الحضور الخاصة بالهيئة التدريسية والإدارية.</p>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleExport('staff')}
                    className="flex flex-col items-center justify-center gap-3 p-5 rounded-2xl bg-purple-50 border-2 border-purple-100 text-purple-700 hover:bg-purple-100 transition-all group"
                  >
                    <Download className="w-6 h-6 group-hover:bounce" />
                    <span className="font-black">تصدير (Excel)</span>
                  </button>
                  <label className="flex flex-col items-center justify-center gap-3 p-5 rounded-2xl bg-fuchsia-50 border-2 border-fuchsia-100 text-fuchsia-700 hover:bg-fuchsia-100 transition-all cursor-pointer group">
                    <Upload className="w-6 h-6 group-hover:bounce" />
                    <span className="font-black">استيراد (Excel)</span>
                    <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={(e) => handleImport('staff', e)} />
                  </label>
                </div>

                <div className="bg-blue-50 rounded-2xl p-4 border border-blue-100">
                  <p className="text-[10px] font-black text-blue-700">ملاحظة: يمكنك تصدير الملف أولاً لاستخدامه كقالب ثم إعادة رفعه بعد تعديل الحالة في ملف الإكسل.</p>
                </div>
              </div>
            </div>
          )}
        </div>
      

      {/* Notification Modal */}
      
        {showNotificationModal && (
          <div className="integrated-page">
            <div className="modal-content">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-white relative z-50 sticky top-0 shadow-sm px-12">
                <div className="flex items-center gap-3 text-right leading-relaxed">
                  <div className={`p-5 rounded-2xl shadow-xl text-white ${
                    showNotificationModal.type === 'absence' ? 'bg-rose-500 shadow-rose-100' : 
                    showNotificationModal.type === 'warning' ? 'bg-amber-500 shadow-amber-100' : 
                    showNotificationModal.type === 'summons' ? 'bg-orange-600 shadow-orange-100' :
                    showNotificationModal.type === 'expulsion' ? 'bg-red-600 shadow-red-100' :
                    'bg-indigo-600 shadow-indigo-100'
                  }`}>
                    {showNotificationModal.type === 'violation' ? <AlertCircle className="w-6 h-6" /> : <MessageSquare className="w-6 h-6" />}
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-900 tracking-tight text-slate-900 tracking-tight leading-relaxed">
                      {showNotificationModal.type === 'absence' ? 'مركز تبليغات الغياب والالتزام' : 
                       showNotificationModal.type === 'warning' ? 'نظام التنبيهات والتحذيرات' :
                       showNotificationModal.type === 'summons' ? 'استدعاء ولي الأمر الرسمي' :
                       showNotificationModal.type === 'expulsion' ? 'تبليغ قرار الفصل النهائي' :
                       'مركز رصد ومعالجة المخالفات'}
                    </h3>
                    <p className="text-sm font-bold text-slate-400 mt-1 leading-relaxed">الطالب: {showNotificationModal.student.name} — {showNotificationModal.student.grade}</p>
                  </div>
                </div>
                  <button 
                    onClick={() => setShowNotificationModal(null)}
                    className="p-4 bg-slate-50 hover:bg-rose-50 rounded-2xl transition-all text-slate-300 hover:text-rose-500 border border-slate-50"
                  >
                    <ArrowLeftRight className="w-6 h-6 rotate-45" />
                  </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-4 lg:p-5 custom-scrollbar w-full bg-slate-50/20 custom-scrollbar">
                <div className="max-w-5xl mx-auto w-full /space-y-2">
                  <div className="p-4 bg-white rounded-2xl border border-slate-200 flex flex-col md:flex-row items-center gap-2 shadow-sm">
                    <div className="bg-indigo-50 p-4 rounded-2xl text-indigo-600">
                      <Share2 className="w-6 h-6" />
                    </div>
                    <div className="text-center md:text-right flex-1 leading-relaxed">
                      <p className="text-xs text-slate-400 font-black uppercase tracking-widest mb-2 leading-relaxed">سيتم إرسال التنبيه آلياً إلى الرقم المسجل:</p>
                      <p className="font-black text-slate-900 text-xl tracking-widest transition-all" dir="ltr">{WhatsAppService.formatPhone(showNotificationModal.student.phone)}</p>
                      <p className="text-[10px] text-indigo-500 font-bold mt-2 leading-relaxed">يرجى التأكد من تشغيل تطبيق WhatsApp لاستلام التنبيهات</p>
                    </div>
                  </div>

                  <div className="bg-white p-4 lg:p-14 rounded-3xl border border-slate-100 space-y-2 shadow-xl text-right">
                    <div className="space-y-2">
                      <label className="block text-sm font-black text-slate-700 pr-6 uppercase tracking-widest leading-relaxed">صياغة نص الرسالة الرسمية</label>
                      <textarea
                        value={notificationContent}
                        onChange={(e) => setNotificationContent(e.target.value)}
                        placeholder="يرجى كتابة نص الرسالة هنا..."
                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 outline-none focus:ring-2 focus:ring-slate-100 font-bold transition-all resize-none text-xl leading-relaxed text-slate-800 shadow-inner min-h-[300px]"
                      />
                    </div>

                    <div className="space-y-2">
                      <p className="text-xs font-black text-slate-400 px-6 uppercase tracking-[0.2em] leading-relaxed">القوالب الجاهزة للإرسال السريع</p>
                      <div className="flex flex-wrap gap-2 justify-end">
                        {[
                          { label: 'سجل غياب', content: `نود إعلامكم بغياب الطالب ( ${showNotificationModal.student.name} ) عن الدوام المدرسي لتاريخ اليوم ${selectedDate}. نرجو تزويدنا بالعذر الرسمي لاستمرار الدوام.` },
                          { label: 'استدعاء ولي أمر', content: `إلى ولي أمر الطالب ( ${showNotificationModal.student.name} )، يرجى الحضور لمقر إدارة المدرسة يوم غد في الساعة التاسعة صباحاً لمناقشة موضوع غياب الطالب المتكرر.` },
                          { label: 'تنبيه مخالفة', content: `تم تسجيل مخالفة رسمية للطالب ( ${showNotificationModal.student.name} ) لتاريخ اليوم. يرجى توجيه الطالب للالتزام بالضوابط المدرسية لتجنب العقوبات الإدارية.` }
                        ].map((template) => (
                          <button 
                            key={template.label}
                            onClick={() => setNotificationContent(template.content)}
                            className="text-xs font-black bg-slate-50 border border-slate-100 text-slate-600 px-8 py-5 rounded-xl hover:bg-indigo-600 hover:text-white hover:border-indigo-600 transition-all shadow-sm hover:shadow-xl active:scale-95"
                          >
                            {template.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-white border-t border-slate-100 flex items-center justify-center sticky bottom-0 z-50">
                <button
                  onClick={sendNotification}
                  disabled={!notificationContent}
                  className="w-full max-w-2xl bg-slate-900 text-white py-2 px-6 rounded-2xl font-bold text-lg shadow-xl shadow-slate-900/20 transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed group active:scale-95"
                >
                  تأكيد وإرسال التنبيه الآن
                  <ArrowRight className="w-6 h-6 flip-h group-hover:translate-x-2 transition-transform" />
                </button>
              </div>
            </div>
          </div>
        )}
      

      
        {editingReason && (
          <div className="integrated-page">
            <div className="modal-content">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-white relative z-50 sticky top-0 shadow-sm px-12">
                <div className="flex items-center gap-3 text-right leading-relaxed">
                  <div className="theme-bg p-4 rounded-2xl text-white shadow-xl theme-shadow">
                    <UserCheck className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-900 tracking-tight text-slate-900 tracking-tight leading-relaxed">إضافة ملاحظة / سبب</h3>
                    <p className="text-sm font-bold text-slate-400 mt-1 leading-relaxed">تخصيص سبب للغياب أو الخروج المبكر لـ: {editingReason.name}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setEditingReason(null)} 
                  className="p-4 hover:bg-rose-50 rounded-2xl transition-all text-slate-300 hover:text-rose-500 border border-slate-50"
                >
                  <ArrowLeftRight className="w-6 h-6 rotate-45" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 lg:p-5 custom-scrollbar w-full bg-slate-50/20 custom-scrollbar">
                <div className="max-w-[1200px] mx-auto space-y-2">
                  <div className="bg-white p-4 lg:p-14 rounded-3xl border border-slate-100 shadow-xl space-y-2 text-right">
                    <div className="flex items-center gap-3 mb-10 p-5 bg-blue-50/50 rounded-2xl border border-blue-100/50">
                      <div className="w-10 h-10 bg-white rounded-3xl shadow-sm flex items-center justify-center text-blue-600">
                        <UserCheck className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="text-lg font-black text-slate-900">{editingReason.name}</p>
                        <p className="text-sm font-bold text-slate-400 mt-1">تحديد مبررات الغياب لعرضها في التقارير</p>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <label className="block text-sm font-black text-indigo-600 pr-8 uppercase tracking-widest leading-relaxed">تفاصيل السبب أو العذر الشرعي</label>
                      <textarea
                        autoFocus
                        value={editingReason.reason}
                        onChange={(e) => setEditingReason({ ...editingReason, reason: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 outline-none focus:ring-2 focus:ring-indigo-100/50 font-black text-lg text-slate-900 transition-all min-h-[300px] leading-relaxed shadow-inner"
                        placeholder="مثال: إجازة مرضية، ظرف عائلي، عذر شرعي..."
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-white border-t border-slate-100 flex items-center justify-center sticky bottom-0 z-50">
                <div className="w-full max-w-4xl flex gap-2">
                  <button
                    onClick={() => {
                      const record = dailyRecords.find(r => r.entityId === editingReason.id);
                      const type = students.find(s => s.id === editingReason.id) ? 'student' : 'staff';
                      updateAttendance(editingReason.id, type, record?.status || 'absent', undefined, editingReason.reason);
                      setEditingReason(null);
                    }}
                    className="flex-1 theme-bg text-white py-8 rounded-2xl font-black text-xl hover:scale-[1.02] active:scale-[0.98] shadow-2xl theme-shadow transition-all"
                  >
                    حفظ وتوثيق السبب
                  </button>
                  <button
                    onClick={() => setEditingReason(null)}
                    className="px-16 bg-slate-100 text-slate-400 py-8 rounded-2xl font-black text-xl hover:bg-rose-50 hover:text-rose-500 transition-all active:scale-[0.98]"
                  >
                    إلغاء
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      

      
        {isRegisteringFingerprint && (
          <div className="integrated-page">
            <div className="modal-content">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-white relative z-50 sticky top-0 shadow-sm px-12">
                <div className="flex items-center gap-3 text-right leading-relaxed">
                  <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl text-slate-800 shadow-sm">
                    <Fingerprint className="w-6 h-6 animate-pulse" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-900 tracking-tight text-slate-900 tracking-tight leading-relaxed">نظام تسجيل البصمة الحيوية</h3>
                    <p className="text-sm font-bold text-slate-400 mt-1 leading-relaxed">ربط الهوية الرقمية لـ: {isRegisteringFingerprint.name}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsRegisteringFingerprint(null)} 
                  className="p-4 hover:bg-rose-50 rounded-2xl transition-all text-slate-300 hover:text-rose-500 border border-slate-50"
                >
                  <ArrowLeftRight className="w-6 h-6 rotate-45" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 lg:p-5 custom-scrollbar w-full bg-slate-50/20 custom-scrollbar flex items-center justify-center">
                <div className="max-w-2xl w-full bg-white p-5 rounded-3xl border border-slate-100 shadow-2xl text-center space-y-2">
                  <div className="w-40 h-40 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto shadow-inner group">
                    <Fingerprint className="w-10 h-10 animate-pulse group-hover:scale-110 transition-transform" />
                  </div>
                  
                  <div className="space-y-2">
                    <h3 className="text-4xl font-black text-slate-900 tracking-tight leading-relaxed underline decoration-blue-500/30 underline-offset-8">انتظار إدخال البصمة</h3>
                    <p className="text-xl font-bold text-slate-500 leading-relaxed">الرجاء تمرير الرمز المرتبط بالبصمة أو الرقم التعريفي</p>
                  </div>

                  <div className="relative group max-w-md mx-auto">
                    <Keyboard className="absolute right-8 top-1/2 -translate-y-1/2 text-slate-300 w-6 h-6 group-focus-within:text-blue-500 transition-colors" />
                    <input 
                      type="password"
                      autoFocus
                      placeholder="ضع البصمة للمسح الآن..."
                      value={tempFingerprintId}
                      onChange={(e) => setTempFingerprintId(e.target.value)}
                      className="w-full bg-slate-50 border-4 border-dashed border-slate-200 rounded-2xl pr-20 pl-8 py-10 font-black text-4xl outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-50/50 text-center transition-all shadow-inner tracking-[0.5em]"
                    />
                  </div>

                  <div className="flex flex-col gap-3 pt-6">
                    <button
                      onClick={registerFingerprint}
                      disabled={!tempFingerprintId}
                      className="w-full theme-bg text-white py-8 rounded-2xl font-black text-xl shadow-2xl theme-shadow hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:scale-100 flex items-center justify-center gap-3"
                    >
                      <span>إتمام عملية الربط</span>
                      <CheckCircle2 className="w-6 h-6" />
                    </button>
                    <button
                      onClick={() => setIsRegisteringFingerprint(null)}
                      className="w-full bg-slate-100 text-slate-400 py-6 rounded-2xl font-black text-xl hover:bg-rose-50 hover:text-rose-500 transition-all flex items-center justify-center gap-2"
                    >
                      إلغاء العملية
                      <ArrowLeftRight className="w-6 h-6 rotate-45" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      

      <div className="hidden">
        <div ref={dailyReportRef} className="p-4 bg-white text-right" dir="rtl">
          <div className="text-center mb-10 pb-4 border-b-2 border-gray-900">
            {school.logo && (
              <div className="flex justify-center mb-3">
                <img src={school.logo} alt="شعار المدرسة" className="h-16 object-contain grayscale" />
              </div>
            )}
            <h1 className="text-lg font-black text-slate-900 tracking-tight mb-2">{school.name}</h1>
            <p className="text-xl font-bold text-gray-600 mb-4">كشف غيابات الطلاب اليومي التفصيلي</p>
            <div className="flex justify-center gap-3 text-sm font-black text-gray-500">
              <p>اليوم: {format(new Date(selectedDate), 'EEEE', { locale: ar })}</p>
              <p>التاريخ: {format(new Date(selectedDate), 'yyyy / MM / dd')}</p>
              <p>العام الدراسي: {school.academicYear || `${new Date().getFullYear()} - ${new Date().getFullYear() + 1}`}</p>
            </div>
          </div>

          {absenceReportData.length > 0 ? (
            absenceReportData.map((gradeData, gIdx) => (
              <div key={gIdx} className="space-y-2 mb-12">
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
            <div className="text-center py-20 border-4 border-dashed border-gray-100 rounded-3xl">
              <XCircle className="w-10 h-10 text-gray-200 mx-auto mb-6" />
              <p className="text-lg font-black text-slate-900 tracking-tight text-gray-300">لا يوجد غيابات مسجلة لتاريخ اليوم</p>
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
      
      {/* Confirmation Modals */}
      {confirmingAutoFill && (
        <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8 text-center space-y-6">
              <div className="w-24 h-24 bg-amber-50 rounded-full mx-auto flex items-center justify-center text-amber-500 mb-6">
                <AlertTriangle className="w-12 h-12" />
              </div>
              <h3 className="text-3xl font-black text-slate-900 tracking-tight">التسجيل التلقائي للغياب</h3>
              <p className="text-lg text-slate-500 font-bold leading-relaxed">
                هل أنت متأكد من تسجيل جميع الحالات غير المؤشرة للطلاب والموظفين كغائبين لهذا اليوم؟
                <br />
                <span className="text-sm font-medium">سيتم تسجيل الغياب وإرسال رسائل الواتساب بناءً على إعداداتك.</span>
              </p>
              
              <div className="flex flex-col gap-3 pt-4">
                <button 
                  onClick={executeAutoFillAbsences}
                  className="w-full bg-amber-500 text-white py-4 rounded-2xl font-black text-lg shadow-xl shadow-amber-200 hover:bg-amber-600 active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  <CheckCircle2 className="w-6 h-6" />
                  نعم، تسجيل الغيابات المتبقية
                </button>
                <button 
                  onClick={() => setConfirmingAutoFill(false)}
                  className="w-full bg-slate-100 text-slate-600 py-4 rounded-2xl font-black text-lg hover:bg-slate-200 active:scale-95 transition-all"
                >
                  إلغاء الأمر
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {confirmingClearRecords && (
        <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8 text-center space-y-6">
              <div className="w-24 h-24 bg-red-50 rounded-full mx-auto flex items-center justify-center text-red-500 mb-6">
                <Trash2 className="w-12 h-12" />
              </div>
              <h3 className="text-3xl font-black text-slate-900 tracking-tight">تصفير سجل اليوم</h3>
              <p className="text-lg text-slate-500 font-bold leading-relaxed">
                هل أنت متأكد من حذف كافة سجلات الحضور والغياب لهذا اليوم؟
                <br />
                <span className="text-sm font-medium text-red-600">هذا الإجراء سيقوم بحذف كافة السجلات المسجلة (حاضر، غائب، بصمة) لهذا اليوم فقط.</span>
              </p>
              
              <div className="flex flex-col gap-3 pt-4">
                <button 
                  onClick={clearDailyRecords}
                  className="w-full bg-red-600 text-white py-4 rounded-2xl font-black text-lg shadow-xl shadow-red-200 hover:bg-red-700 active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  <Trash2 className="w-6 h-6" />
                  تأكيد الحذف النهائي
                </button>
                <button 
                  onClick={() => setConfirmingClearRecords(false)}
                  className="w-full bg-slate-100 text-slate-600 py-4 rounded-2xl font-black text-lg hover:bg-slate-200 active:scale-95 transition-all"
                >
                  تراجع
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
